import "dotenv/config";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting RAG data migration from textbook_chunks to rag_chunks...");

  try {
    // We execute a raw SQL query to handle the JSONB to vector(768) conversion easily within Postgres
    const result = await db.execute(sql`
      INSERT INTO rag_chunks (
        file_asset_id,
        subject_id,
        chunk_type,
        content,
        content_hash,
        embedding,
        embedding_status,
        page_number,
        section_title,
        char_count
      )
      SELECT 
        file_asset_id,
        subject_id,
        chunk_type,
        content,
        -- Need to generate a hash or use a placeholder if digest is not available
        encode(sha256(content::bytea), 'hex') as content_hash,
        embedding_json::text::vector as embedding,
        'completed' as embedding_status,
        page_number,
        section_title,
        content_length
      FROM textbook_chunks
      WHERE embedding_json IS NOT NULL 
        AND embedding_json::text != '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]' -- avoid empty vectors
      ON CONFLICT (content_hash, file_asset_id) DO NOTHING;
    `);

    console.log(`Migration completed successfully! Inserted ${result.rowCount} chunks.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

main();
