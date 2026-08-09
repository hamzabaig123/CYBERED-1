import { db, fileAssetsTable } from "@workspace/db";
import { gte } from "drizzle-orm";

async function main() {
  const assets = await db
    .select()
    .from(fileAssetsTable)
    .where(gte(fileAssetsTable.id, 14))
    .orderBy(fileAssetsTable.id);
  
  console.log(JSON.stringify(assets, null, 2));
}

main().catch(console.error);
