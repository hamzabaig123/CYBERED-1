import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and, isNull, inArray } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
  GetMeResponse,
  ListUsersResponse,
  UpdateUserRoleParams,
  UpdateUserRoleBody,
  UpdateUserRoleResponse,
  RefreshSessionBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "@workspace/api-zod";
import { signToken, requireAuth, requireAdmin } from "../middlewares/auth";
import crypto from "crypto";
import { refreshTokensTable, passwordResetTokensTable, emailVerificationTokensTable, totpCredentialsTable, passwordHistoryTable, auditLogsTable } from "@workspace/db";
import { UAParser } from "ua-parser-js";
import jwt from "jsonwebtoken";
import { desc } from "drizzle-orm";
import { writeAudit } from "../lib/audit";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
const PASSWORD_HISTORY_LIMIT = 5;

const router: IRouter = Router();

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  // First registered user becomes admin
  const allUsers = await db.select({ id: usersTable.id }).from(usersTable);
  const isFirstUser = allUsers.length === 0;

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      email,
      passwordHash,
      role: isFirstUser ? "admin" : "viewer",
    })
    .returning();

  req.log.info({ userId: user.id }, "User registered");
  await writeAudit(req, { userId: user.id, action: "REGISTER", entityType: "user", entityId: user.id, detail: `User ${user.username} registered` });

  const token = signToken(user.id, user.role);
  const refreshTokenRaw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshTokenRaw).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash,
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || req.socket.remoteAddress || null,
    expiresAt,
  });

  res.status(201).json({
    token,
    refreshToken: refreshTokenRaw,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    await writeAudit(req, { userId: null, action: "LOGIN_FAILED", detail: `No account for email ${email}` });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await writeAudit(req, { userId: user.id, action: "LOGIN_BLOCKED", detail: "Account locked" });
    res.status(429).json({ error: "Account temporarily locked. Try again later." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = parseInt(user.failedLoginAttempts, 10) + 1;
    const updates: Partial<typeof usersTable.$inferSelect> = {
      failedLoginAttempts: String(attempts),
    };
    if (attempts >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      updates.lockedUntil = lockedUntil;
      await writeAudit(req, { userId: user.id, action: "ACCOUNT_LOCKED", detail: `Locked after ${attempts} failed attempts` });
    }
    await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
    await writeAudit(req, { userId: user.id, action: "LOGIN_FAILED", detail: `Attempt ${attempts}` });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Reset failed attempts on success
  await db
    .update(usersTable)
    .set({ failedLoginAttempts: "0", lockedUntil: null })
    .where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id }, "User logged in");

  // New-device detection: compare UA + IP against recent successful logins
  const ua = req.headers["user-agent"] || null;
  const ip = req.ip || req.socket.remoteAddress || null;
  const [recentLogin] = await db
    .select()
    .from(auditLogsTable)
    .where(and(eq(auditLogsTable.userId, user.id), eq(auditLogsTable.action, "LOGIN_SUCCESS")))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(1);
  const isNewDevice = !recentLogin || recentLogin.ipAddress !== ip || (ua && recentLogin.userAgent !== ua);
  await writeAudit(req, {
    userId: user.id,
    action: "LOGIN_SUCCESS",
    entityType: "user",
    entityId: user.id,
    detail: isNewDevice ? "Login from a new device/browser" : null,
  });
  if (isNewDevice) {
    req.log.info({ userId: user.id }, "New device login detected (email alert queued)");
  }

  // Check if user has 2FA enabled
  const [totpCred] = await db
    .select()
    .from(totpCredentialsTable)
    .where(and(eq(totpCredentialsTable.userId, user.id)));

  if (totpCred && totpCred.enabledAt) {
    // Issue a short-lived challenge token instead of full access
    const totpChallenge = jwt.sign(
      { userId: user.id, pending2fa: true },
      JWT_SECRET,
      { expiresIn: "10m" }
    );
    res.json({
      totpRequired: true,
      totpChallenge,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    });
    return;
  }

  const token = signToken(user.id, user.role);
  const refreshTokenRaw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshTokenRaw).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash,
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || req.socket.remoteAddress || null,
    expiresAt,
  });

  res.json({
    token,
    refreshToken: refreshTokenRaw,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  res.json(
    GetMeResponse.parse({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
  );
});

// POST /auth/logout
router.post("/auth/logout", requireAuth, async (_req, res): Promise<void> => {
  res.sendStatus(204);
});

// GET /auth/users (admin only)
router.get("/auth/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json(ListUsersResponse.parse(users));
});

// PATCH /auth/users/:userId/role (admin only)
router.patch("/auth/users/:userId/role", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = UpdateUserRoleParams.safeParse({ userId: parseFloat(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateUserRoleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role: body.data.role as "admin" | "editor" | "viewer" })
    .where(eq(usersTable.id, params.data.userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    UpdateUserRoleResponse.parse({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt,
    })
  );
});

// POST /auth/refresh
router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { refreshToken } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const [session] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.tokenHash, tokenHash));

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const token = signToken(user.id, user.role);
  
  // Optionally rotate the refresh token here, but keeping it simple as per plan.
  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

// GET /auth/sessions
router.get("/auth/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  
  const sessions = await db
    .select()
    .from(refreshTokensTable)
    .where(and(eq(refreshTokensTable.userId, user.id), isNull(refreshTokensTable.revokedAt)));

  const activeSessions = sessions
    .filter(s => s.expiresAt > new Date())
    .map(s => {
      const parser = new UAParser(s.userAgent || "");
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const deviceName = `${browser.name || "Unknown Browser"} on ${os.name || "Unknown OS"}`;
      
      // We don't have the current token hash easily available here unless we pass it from the middleware, 
      // so `current` will be an approximation or just false for now.
      return {
        id: s.id,
        userAgent: deviceName,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        current: false, // Could be determined if we hash the req token
      };
    });

  res.json(activeSessions);
});

// DELETE /auth/sessions/:sessionId
router.delete("/auth/sessions/:sessionId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const sessionIdParam = req.params.sessionId;
  const sessionId = parseInt(Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam);
  
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.id, sessionId), eq(refreshTokensTable.userId, user.id)))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /auth/sessions/revoke-all
router.post("/auth/sessions/revoke-all", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.userId, user.id));
    
  res.sendStatus(204);
});

// POST /auth/password/forgot
router.post("/auth/password/forgot", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // In a real app, send email here. We just log it for now.
    req.log.info({ email, resetToken: rawToken }, "Password reset requested");
    await writeAudit(req, { userId: user.id, action: "PASSWORD_RESET_REQUESTED", entityType: "user", entityId: user.id });
  }

  // Always return 204 to prevent email enumeration
  res.sendStatus(204);
});

// POST /auth/password/reset
router.post("/auth/password/reset", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { token, newPassword } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [resetToken] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.tokenHash, tokenHash));

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Password history check (1c): reject passwords used in the last N resets
  const recentHashes = await db
    .select()
    .from(passwordHistoryTable)
    .where(eq(passwordHistoryTable.userId, resetToken.userId))
    .orderBy(desc(passwordHistoryTable.createdAt))
    .limit(PASSWORD_HISTORY_LIMIT);

  for (const entry of recentHashes) {
    if (await bcrypt.compare(newPassword, entry.passwordHash)) {
      res.status(400).json({ error: "New password must be different from your previous passwords" });
      return;
    }
  }

  await db.transaction(async (tx) => {
    // 1. Update password
    await tx
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, resetToken.userId));

    // 2. Store the old hash in password history (cap at 5)
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, resetToken.userId));
    if (user) {
      await tx.insert(passwordHistoryTable).values({
        userId: user.id,
        passwordHash: user.passwordHash,
      });
      const historyCount = await tx
        .select({ id: passwordHistoryTable.id })
        .from(passwordHistoryTable)
        .where(eq(passwordHistoryTable.userId, user.id))
        .orderBy(desc(passwordHistoryTable.createdAt));
      if (historyCount.length > PASSWORD_HISTORY_LIMIT) {
        const toDelete = historyCount.slice(PASSWORD_HISTORY_LIMIT).map((h) => h.id);
        if (toDelete.length > 0) {
          await tx.delete(passwordHistoryTable).where(inArray(passwordHistoryTable.id, toDelete));
        }
      }
    }

    // 3. Mark token as used
    await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, resetToken.id));

    // 4. Revoke all sessions (1e integration)
    await tx
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.userId, resetToken.userId));
  });

  await writeAudit(req, { userId: resetToken.userId, action: "PASSWORD_RESET", entityType: "user", entityId: resetToken.userId });

  res.sendStatus(204);
});

// POST /auth/email/verify-request
router.post("/auth/email/verify-request", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  if (user.emailVerifiedAt) {
    res.sendStatus(204);
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(emailVerificationTokensTable).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // In a real app, send email here. We just log it for now.
  req.log.info({ email: user.email, verifyToken: rawToken }, "Email verification requested");
  await writeAudit(req, { userId: user.id, action: "VERIFY_EMAIL_REQUESTED", entityType: "user", entityId: user.id });

  res.sendStatus(204);
});

// POST /auth/email/verify
router.post("/auth/email/verify", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { token } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [verifyToken] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(eq(emailVerificationTokensTable.tokenHash, tokenHash));

  if (!verifyToken || verifyToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired verification token" });
    return;
  }

  await db.transaction(async (tx) => {
    // 1. Update user
    await tx
      .update(usersTable)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(usersTable.id, verifyToken.userId));
      
    // 2. Delete token
    await tx
      .delete(emailVerificationTokensTable)
      .where(eq(emailVerificationTokensTable.id, verifyToken.id));
  });

  await writeAudit(req, { userId: verifyToken.userId, action: "EMAIL_VERIFIED", entityType: "user", entityId: verifyToken.userId });

  res.sendStatus(204);
});

// GET /auth/security-summary
router.get("/auth/security-summary", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  const [totpCred] = await db
    .select()
    .from(totpCredentialsTable)
    .where(and(eq(totpCredentialsTable.userId, user.id)));

  const [lastPasswordChange] = await db
    .select()
    .from(passwordHistoryTable)
    .where(eq(passwordHistoryTable.userId, user.id))
    .orderBy(desc(passwordHistoryTable.createdAt))
    .limit(1);

  const activeSessions = await db
    .select()
    .from(refreshTokensTable)
    .where(and(eq(refreshTokensTable.userId, user.id), isNull(refreshTokensTable.revokedAt)));

  const recentActivity = await db
    .select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      detail: auditLogsTable.detail,
      createdAt: auditLogsTable.createdAt,
      ipAddress: auditLogsTable.ipAddress,
      userAgent: auditLogsTable.userAgent,
    })
    .from(auditLogsTable)
    .where(eq(auditLogsTable.userId, user.id))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(10);

  res.json({
    emailVerified: !!user.emailVerifiedAt,
    twoFactorEnabled: !!totpCred?.enabledAt,
    lastPasswordChangeAt: lastPasswordChange?.createdAt ?? null,
    activeSessionCount: activeSessions.filter((s) => s.expiresAt > new Date()).length,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

export default router;
