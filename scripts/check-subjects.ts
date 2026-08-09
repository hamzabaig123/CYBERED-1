import { db, subjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.classId, 2)); // Class 11
  
  console.log(JSON.stringify(subjects, null, 2));
}

main().catch(console.error);
