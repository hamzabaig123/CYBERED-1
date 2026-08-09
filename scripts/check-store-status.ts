import { db, bookStoresTable } from "@workspace/db";

async function main() {
  const stores = await db.select().from(bookStoresTable);
  console.log(JSON.stringify(stores, null, 2));
}

main().catch(console.error);
