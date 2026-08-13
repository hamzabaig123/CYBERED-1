import { pool } from '../lib/db/src/index.js';

async function checkRelationships() {
  console.log('\n📊 Checking Database Relationships\n');
  console.log('='.repeat(60));
  
  try {
    // Check topics
    const topicsResult = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.chapter_id,
        t.parent_id,
        COUNT(DISTINCT q.id) as question_count,
        COUNT(DISTINCT n.id) as note_count
      FROM topics t
      LEFT JOIN questions q ON q.topic_id = t.id AND q.is_archived = false
      LEFT JOIN notes n ON n.topic_id = t.id AND n.is_archived = false
      WHERE t.is_archived = false
      GROUP BY t.id, t.name, t.chapter_id, t.parent_id
      ORDER BY t.id
      LIMIT 10
    `);
    
    console.log('\n📁 Topics with content:');
    topicsResult.rows.forEach((topic: any) => {
      const hasContent = parseInt(topic.question_count) > 0 || parseInt(topic.note_count) > 0;
      const icon = hasContent ? '✅' : '⚪';
      console.log(`  ${icon} ${topic.name} (ID: ${topic.id})`);
      console.log(`     Questions: ${topic.question_count}, Notes: ${topic.note_count}`);
      console.log(`     Chapter: ${topic.chapter_id}, Parent: ${topic.parent_id || 'root'}`);
    });
    
    // Check questions without topic_id
    const orphanQuestions = await pool.query(`
      SELECT COUNT(*) as count
      FROM questions
      WHERE topic_id IS NULL AND is_archived = false
    `);
    console.log(`\n📝 Questions without topic_id: ${orphanQuestions.rows[0].count}`);
    
    // Check notes
    const notesResult = await pool.query(`
      SELECT 
        n.id,
        n.title,
        n.topic_id,
        t.name as topic_name
      FROM notes n
      JOIN topics t ON t.id = n.topic_id
      WHERE n.is_archived = false
      LIMIT 5
    `);
    
    console.log(`\n📝 Notes (${notesResult.rows.length} found):`);
    notesResult.rows.forEach((note: any) => {
      console.log(`  ✅ "${note.title}"`);
      console.log(`     Topic: ${note.topic_name} (ID: ${note.topic_id})`);
    });
    
    // Check MCQ options
    const mcqResult = await pool.query(`
      SELECT 
        q.id as question_id,
        q.question_text,
        q.topic_id,
        COUNT(o.id) as option_count,
        COUNT(CASE WHEN o.is_correct THEN 1 END) as correct_count
      FROM questions q
      LEFT JOIN mcq_options o ON o.question_id = q.id
      WHERE q.question_type = 'mcq' AND q.is_archived = false
      GROUP BY q.id, q.question_text, q.topic_id
      HAVING COUNT(o.id) > 0
      LIMIT 5
    `);
    
    console.log(`\n🎯 MCQs with options (${mcqResult.rows.length} found):`);
    mcqResult.rows.forEach((mcq: any) => {
      console.log(`  ✅ Q${mcq.question_id}: "${mcq.question_text.substring(0, 50)}..."`);
      console.log(`     Options: ${mcq.option_count}, Correct: ${mcq.correct_count}, Topic: ${mcq.topic_id}`);
    });
    
    // Summary
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM topics WHERE is_archived = false) as total_topics,
        (SELECT COUNT(*) FROM topics WHERE parent_id IS NULL AND is_archived = false) as root_topics,
        (SELECT COUNT(*) FROM questions WHERE is_archived = false) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE topic_id IS NOT NULL AND is_archived = false) as linked_questions,
        (SELECT COUNT(*) FROM notes WHERE is_archived = false) as total_notes,
        (SELECT COUNT(*) FROM mcq_options) as total_options
    `);
    
    const s = summary.rows[0];
    console.log('\n📊 Summary:');
    console.log('='.repeat(60));
    console.log(`  Topics: ${s.total_topics} (${s.root_topics} root)`);
    console.log(`  Questions: ${s.total_questions} (${s.linked_questions} linked to topics)`);
    console.log(`  Notes: ${s.total_notes}`);
    console.log(`  MCQ Options: ${s.total_options}`);
    
    if (parseInt(s.total_questions) > parseInt(s.linked_questions)) {
      console.log(`\n⚠️  Warning: ${parseInt(s.total_questions) - parseInt(s.linked_questions)} questions not linked to topics`);
    }
    
    console.log('\n✅ Relationship check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkRelationships();
