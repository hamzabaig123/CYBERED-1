import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const result = await db
    .update(usersTable)
    .set({ role: "admin" })
    .where(eq(usersTable.email, "uploader@test.com"));

  console.log("✅ Promoted uploader@test.com to admin");
}

main().catch(console.error);
