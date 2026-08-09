import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
// @ts-ignore
import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.USER_EMAIL || "nasreen.qayoom@gmail.com";
  const newPassword = process.env.NEW_PASSWORD || "password";

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const result = await db
    .update(usersTable)
    .set({ passwordHash: hashedPassword })
    .where(eq(usersTable.email, email));

  console.log(`✅ Password reset for ${email} to: ${newPassword}`);
}

main().catch(console.error);
