import { pool } from '../lib/db/src/index.js';
import { existsSync } from 'fs';
import { join } from 'path';

async function checkFileAssets() {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        subject_id,
        storage_key, 
        original_filename, 
        size_bytes, 
        mime_type,
        virus_scan_status,
        processing_status,
        page_count,
        full_text_key,
        error_message,
        created_at
      FROM file_assets 
      WHERE mime_type = 'application/pdf' 
      ORDER BY id
    `);

    console.log('\n📚 PDF File Assets in Database:\n');
    result.rows.forEach((asset: any) => {
      const fileExists = existsSync(asset.storage_key);
      const icon = fileExists ? '✅' : '❌';
      const sizeMB = (asset.size_bytes / (1024 * 1024)).toFixed(2);
      
      console.log(`${icon} ID: ${asset.id} (Subject ID: ${asset.subject_id})`);
      console.log(`  Filename: ${asset.original_filename}`);
      console.log(`  Storage Key: ${asset.storage_key}`);
      console.log(`  File Exists: ${fileExists ? 'YES' : 'NO (MISSING!)'}`);
      console.log(`  Size: ${sizeMB} MB`);
      console.log(`  Virus Scan: ${asset.virus_scan_status}`);
      console.log(`  Processing: ${asset.processing_status}`);
      console.log(`  Pages: ${asset.page_count || 'N/A'}`);
      console.log(`  Full Text: ${asset.full_text_key || 'N/A'}`);
      if (asset.error_message) {
        console.log(`  ❌ Error: ${asset.error_message}`);
      }
      console.log(`  Created: ${asset.created_at}`);
      console.log('');
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkFileAssets();
