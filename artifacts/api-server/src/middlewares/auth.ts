import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const JWT_SECRET = process.env["SESSION_SECRET"] ?? "fallback-dev-secret-change-me";

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signToken(userId: number, role: string): string {
  return jwt.sign({ userId, role } as JwtPayload, JWT_SECRET, { expiresIn: "15m" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  (req as Request & { user: typeof user }).user = user;
  next();
}

export async function requireEditor(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    const user = (req as Request & { user: { role: string } }).user;
    if (!user || (user.role !== "editor" && user.role !== "admin")) {
      res.status(403).json({ error: "Forbidden: editor or admin role required" });
      return;
    }
    next();
  });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    const user = (req as Request & { user: { role: string } }).user;
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin role required" });
      return;
    }
    next();
  });
}

export { logger };

export function requireRecentAuth(maxAgeMinutes: number = 5) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, async () => {
      const user = (req as Request & { user: typeof usersTable.$inferSelect }).user;
      const { currentPassword } = req.body;

      if (!currentPassword) {
        res.status(403).json({ error: "Re-authentication required" });
        return;
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        res.status(403).json({ error: "Re-authentication required" });
        return;
      }
      next();
    });
  };
}
