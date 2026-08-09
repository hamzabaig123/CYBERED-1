import { db, classesTable } from "@workspace/db";

async function main() {
  const classes = await db.select().from(classesTable);
  console.log(JSON.stringify(classes, null, 2));
}

main().catch(console.error);
