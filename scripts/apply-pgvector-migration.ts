import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@workspace/db";
import { sql as drizzleSql } from "drizzle-orm";

async function main() {
  try {
    console.log("✅ Connected to database");
    
    const migrationPath = join(process.cwd(), "lib", "db", "migrations", "0007_add_pgvector.sql");
    const sqlContent = readFileSync(migrationPath, "utf-8");
    
    console.log("📝 Applying pgvector migration...");
    
    // Execute the raw SQL
    await db.execute(drizzleSql.raw(sqlContent));
    
    console.log("✅ Migration applied successfully!");
    console.log("\n📊 Checking pgvector installation:");
    
    const versionResult = await db.execute(drizzleSql.raw("SELECT extversion FROM pg_extension WHERE extname = 'vector'"));
    const versionRows = versionResult.rows as Array<{ extversion: string }>;
    if (versionRows.length > 0) {
      console.log(`   ✅ pgvector version: ${versionRows[0].extversion}`);
    } else {
      console.log("   ⚠️  pgvector extension not found");
    }
    
    const tableResult = await db.execute(drizzleSql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'textbook_chunks'
    `));
    
    const tableRows = tableResult.rows as Array<{ table_name: string }>;
    if (tableRows.length > 0) {
      console.log("   ✅ textbook_chunks table created");
      
      const countResult = await db.execute(drizzleSql.raw("SELECT COUNT(*) as count FROM textbook_chunks"));
      const countRows = countResult.rows as Array<{ count: string }>;
      console.log(`   📊 Current chunks: ${countRows[0].count}`);
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

main().catch(console.error);
