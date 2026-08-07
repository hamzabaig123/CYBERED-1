import { Router, type IRouter } from "express";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import { db, usersTable, totpCredentialsTable, totpBackupCodesTable, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { signToken } from "../middlewares/auth";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

// Encryption helpers for storing TOTP secrets at rest
const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
const TOTP_CHALLENGE_EXPIRY = "10m";

// POST /auth/2fa/enroll
router.post("/auth/2fa/enroll", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  // Check if already enrolled
  const [existing] = await db
    .select()
    .from(totpCredentialsTable)
    .where(and(eq(totpCredentialsTable.userId, user.id), isNull(totpCredentialsTable.enabledAt)));

  let secret: string;
  if (existing) {
    // Re-use pending enrollment
    secret = decrypt(existing.encryptedSecret);
  } else {
    // Revoke any previously completed enrollment first if re-enrolling
    await db
      .delete(totpCredentialsTable)
      .where(eq(totpCredentialsTable.userId, user.id));

    secret = authenticator.generateSecret();
    await db.insert(totpCredentialsTable).values({
      userId: user.id,
      encryptedSecret: encrypt(secret),
    });
  }

  const provisioningUri = authenticator.keyuri(user.email, "CyberEd", secret);
  const qrCode = await QRCode.toDataURL(provisioningUri);

  res.json({ provisioningUri, qrCode, secret });
});

// POST /auth/2fa/confirm  
router.post("/auth/2fa/confirm", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "TOTP code required" });
    return;
  }

  const [pending] = await db
    .select()
    .from(totpCredentialsTable)
    .where(and(eq(totpCredentialsTable.userId, user.id), isNull(totpCredentialsTable.enabledAt)));

  if (!pending) {
    res.status(400).json({ error: "No pending 2FA enrollment. Start enrollment first." });
    return;
  }

  const secret = decrypt(pending.encryptedSecret);
  const isValid = authenticator.verify({ token: code, secret });

  if (!isValid) {
    res.status(400).json({ error: "Invalid TOTP code" });
    return;
  }

  // Activate 2FA
  await db
    .update(totpCredentialsTable)
    .set({ enabledAt: new Date() })
    .where(eq(totpCredentialsTable.id, pending.id));

  // Generate backup codes
  const rawCodes: string[] = [];
  const codeInserts = Array.from({ length: 8 }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    rawCodes.push(raw);
    const codeHash = crypto.createHash("sha256").update(raw).digest("hex");
    return { userId: user.id, codeHash };
  });

  // Clear old backup codes and insert new
  await db.delete(totpBackupCodesTable).where(eq(totpBackupCodesTable.userId, user.id));
  await db.insert(totpBackupCodesTable).values(codeInserts);

  req.log.info({ userId: user.id }, "2FA enabled");
  res.json({ backupCodes: rawCodes });
});

// POST /auth/2fa/verify (step 2 during login)
router.post("/auth/2fa/verify", async (req, res): Promise<void> => {
  const { totpChallenge, code } = req.body;

  if (!totpChallenge || !code) {
    res.status(400).json({ error: "totpChallenge and code are required" });
    return;
  }

  // Verify the challenge JWT
  let payload: { userId: number; pending2fa: true } | null = null;
  try {
    payload = jwt.verify(totpChallenge, JWT_SECRET) as { userId: number; pending2fa: true };
  } catch {
    res.status(401).json({ error: "Invalid or expired 2FA challenge" });
    return;
  }

  if (!payload.pending2fa) {
    res.status(401).json({ error: "Invalid challenge token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const [totpCred] = await db
    .select()
    .from(totpCredentialsTable)
    .where(and(eq(totpCredentialsTable.userId, user.id)));

  if (!totpCred || !totpCred.enabledAt) {
    res.status(401).json({ error: "2FA not enabled for this user" });
    return;
  }

  const secret = decrypt(totpCred.encryptedSecret);
  let isValid = authenticator.verify({ token: code, secret });

  // Try backup codes if TOTP fails
  if (!isValid) {
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const [backupCode] = await db
      .select()
      .from(totpBackupCodesTable)
      .where(and(
        eq(totpBackupCodesTable.userId, user.id),
        eq(totpBackupCodesTable.codeHash, codeHash),
        isNull(totpBackupCodesTable.usedAt)
      ));
    if (backupCode) {
      await db
        .update(totpBackupCodesTable)
        .set({ usedAt: new Date() })
        .where(eq(totpBackupCodesTable.id, backupCode.id));
      isValid = true;
    }
  }

  if (!isValid) {
    res.status(401).json({ error: "Invalid 2FA code" });
    return;
  }

  // Issue real tokens
  const token = signToken(user.id, user.role);
  const refreshTokenRaw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshTokenRaw).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash,
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || req.socket.remoteAddress || null,
    expiresAt,
  });

  req.log.info({ userId: user.id }, "2FA verified, session issued");

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

// POST /auth/2fa/disable
router.post("/auth/2fa/disable", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "TOTP code required to disable 2FA" });
    return;
  }

  const [totpCred] = await db
    .select()
    .from(totpCredentialsTable)
    .where(and(eq(totpCredentialsTable.userId, user.id)));

  if (!totpCred || !totpCred.enabledAt) {
    res.status(400).json({ error: "2FA is not enabled" });
    return;
  }

  const secret = decrypt(totpCred.encryptedSecret);
  const isValid = authenticator.verify({ token: code, secret });

  if (!isValid) {
    res.status(401).json({ error: "Invalid TOTP code" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(totpCredentialsTable).where(eq(totpCredentialsTable.userId, user.id));
    await tx.delete(totpBackupCodesTable).where(eq(totpBackupCodesTable.userId, user.id));
  });

  req.log.info({ userId: user.id }, "2FA disabled");
  res.sendStatus(204);
});

export { JWT_SECRET, TOTP_CHALLENGE_EXPIRY };
export default router;
