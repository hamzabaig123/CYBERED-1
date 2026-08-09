#!/usr/bin/env node
/**
 * Promote a user to admin role
 * Usage: DATABASE_URL="postgresql://..." tsx scripts/promote-to-admin.ts email@example.com
 */

import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function promoteToAdmin(email: string) {
  console.log(`Promoting user ${email} to admin...`);

  const [user] = await db
    .update(usersTable)
    .set({ role: "admin" })
    .where(eq(usersTable.email, email))
    .returning();

  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  console.log(`✅ User promoted successfully!`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Role: ${user.role}`);
  console.log(`\n⚠️  User must log out and log back in for changes to take effect.`);
}

const email = process.argv[2] || "nasreen.qayoom@gmail.com";
promoteToAdmin(email).then(() => process.exit(0)).catch(console.error);
