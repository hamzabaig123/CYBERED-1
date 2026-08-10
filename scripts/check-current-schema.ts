import { pool } from '../lib/db/src/index.js';

async function checkSchema() {
  try {
    console.log('📊 Checking current database schema...\n');
    
    // Check what tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Existing tables:');
    tables.rows.forEach((row: any) => {
      console.log(`  • ${row.table_name}`);
    });
    
    console.log('\n📋 Topics table structure:');
    const topicsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'topics'
      ORDER BY ordinal_position
    `);
    
    if (topicsColumns.rows.length > 0) {
      topicsColumns.rows.forEach((row: any) => {
        console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})`);
      });
    } else {
      console.log('  Topics table does not exist');
    }
    
    console.log('\n📋 Sections table structure:');
    const sectionsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sections'
      ORDER BY ordinal_position
    `);
    
    if (sectionsColumns.rows.length > 0) {
      sectionsColumns.rows.forEach((row: any) => {
        console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})`);
      });
    } else {
      console.log('  Sections table does not exist');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
