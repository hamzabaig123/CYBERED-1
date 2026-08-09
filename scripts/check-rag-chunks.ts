import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT 
      fa.id,
      fa.original_filename,
      fa.subject_id,
      fa.chunks_count,
      fa.embeddings_generated,
      COUNT(tc.id) as actual_chunks
    FROM file_assets fa
    LEFT JOIN textbook_chunks tc ON fa.id = tc.file_asset_id
    WHERE fa.is_textbook = true
    GROUP BY fa.id, fa.original_filename, fa.subject_id, fa.chunks_count, fa.embeddings_generated
    ORDER BY fa.id
  `);
  
  console.log(JSON.stringify(result.rows, null, 2));
}

main().catch(console.error);
