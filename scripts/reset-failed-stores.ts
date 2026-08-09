import { db, bookStoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  // Reset all error stores to pending for retry
  const result = await db
    .update(bookStoresTable)
    .set({ 
      status: "pending",
      errorMessage: null 
    })
    .where(eq(bookStoresTable.status, "error"));
  
  console.log("Reset failed stores to pending status");
  
  const stores = await db.select().from(bookStoresTable);
  console.log(JSON.stringify(stores, null, 2));
}

main().catch(console.error);
