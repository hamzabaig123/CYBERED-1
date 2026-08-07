import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
  GetMeResponse,
  ListUsersResponse,
  UpdateUserRoleParams,
  UpdateUserRoleBody,
  UpdateUserRoleResponse,
  RefreshInput,
  ForgotPasswordBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "@workspace/api-zod";
import { signToken, requireAuth, requireAdmin } from "../middlewares/auth";
import crypto from "crypto";
import { refreshTokensTable, passwordResetTokensTable, emailVerificationTokensTable, totpCredentialsTable } from "@workspace/db";
import { UAParser } from "ua-parser-js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";

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
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
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
    }
    await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Reset failed attempts on success
  await db
    .update(usersTable)
    .set({ failedLoginAttempts: "0", lockedUntil: null })
    .where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id }, "User logged in");

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
  const parsed = RefreshInput.safeParse(req.body);
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
  const sessionId = parseInt(req.params.sessionId);
  
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
  
  await db.transaction(async (tx) => {
    // 1. Update password
    await tx
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, resetToken.userId));
      
    // 2. Mark token as used
    await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, resetToken.id));
      
    // 3. Revoke all sessions (1e integration)
    await tx
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.userId, resetToken.userId));
  });

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

  res.sendStatus(204);
});

export default router;
