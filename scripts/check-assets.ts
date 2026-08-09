import { db, fileAssetsTable } from "@workspace/db";

async function main() {
  const assets = await db
    .select()
    .from(fileAssetsTable)
    .orderBy(fileAssetsTable.id);
  
  console.log(JSON.stringify(assets, null, 2));
}

main().catch(console.error);
