import { readFileSync } from 'fs';
import { pool } from '../lib/db/src/index.js';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running curriculum enhancement migration...\n');
    
    const migrationPath = join(process.cwd(), 'lib', 'db', 'migrations', '0008_curriculum_enhancement.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded');
    console.log('⚡ Executing SQL...\n');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Verifying tables...\n');
    
    // Verify new tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('topics', 'mcq_options', 'question_sources', 'notes', 'documents', 'document_pages', 'document_chunks')
      ORDER BY table_name
    `);
    
    console.log('Created tables:');
    tables.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
