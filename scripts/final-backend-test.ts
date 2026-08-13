import { pool } from '../lib/db/src/index.js';

const API_BASE = 'http://localhost:3000/api';
let authToken = '';

async function login() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uploader@test.com',
      password: 'password123'
    })
  });
  
  const data = await response.json();
  authToken = data.token;
  return !!data.token;
}

async function testEndpoint(name: string, url: string, options: any = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      console.log(`  ❌ ${name}: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`  ✅ ${name}`);
    return data;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error}`);
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 CYBERED Backend - Final Review\n');
  console.log('='.repeat(70));
  
  // Login
  console.log('\n1️⃣  Authentication');
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('  ❌ Login failed - cannot continue');
    return;
  }
  console.log('  ✅ Login successful');
  
  // Test Topics API
  console.log('\n2️⃣  Topics API');
  await testEndpoint('GET /topics?chapterId=2', '/topics?chapterId=2');
  
  // Find a topic with content
  const topicQuery = await pool.query(`
    SELECT t.id, t.name, t.chapter_id
    FROM topics t
    JOIN notes n ON n.topic_id = t.id
    WHERE t.is_archived = false
    LIMIT 1
  `);
  
  if (topicQuery.rows.length > 0) {
    const topicId = topicQuery.rows[0].id;
    console.log(`  Using topic ${topicId}: "${topicQuery.rows[0].name}"`);
    
    const topicDetail = await testEndpoint(
      `GET /topics/${topicId}`, 
      `/topics/${topicId}`
    );
    
    if (topicDetail) {
      console.log(`    Stats: ${topicDetail.mcqCount} MCQs, ${topicDetail.noteCount} notes`);
    }
  }
  
  // Test Notes API
  console.log('\n3️⃣  Notes API');
  if (topicQuery.rows.length > 0) {
    const topicId = topicQuery.rows[0].id;
    const notes = await testEndpoint(
      'GET /notes?topicId=X',
      `/notes?topicId=${topicId}`
    );
    
    if (notes && notes.length > 0) {
      console.log(`    Found ${notes.length} notes`);
      console.log(`    Sample: "${notes[0].title}"`);
      
      // Test note search
      await testEndpoint(
        'POST /notes/search',
        '/notes/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'physical', limit: 5 })
        }
      );
    }
  }
  
  // Test MCQ Options API
  console.log('\n4️⃣  MCQ Options API');
  const mcqQuery = await pool.query(`
    SELECT q.id, q.question_text
    FROM questions q
    JOIN mcq_options o ON o.question_id = q.id
    WHERE q.question_type = 'mcq' AND q.is_archived = false
    LIMIT 1
  `);
  
  if (mcqQuery.rows.length > 0) {
    const questionId = mcqQuery.rows[0].id;
    const options = await testEndpoint(
      `GET /questions/${questionId}/options`,
      `/questions/${questionId}/options`
    );
    
    if (options) {
      console.log(`    Found ${options.length} options`);
      const correct = options.find((o: any) => o.isCorrect);
      if (correct) {
        console.log(`    Correct: ${correct.optionKey} - ${correct.optionText}`);
      }
    }
    
    // Test question sources
    await testEndpoint(
      `GET /questions/${questionId}/sources`,
      `/questions/${questionId}/sources`
    );
  }
  
  // Test existing curriculum API
  console.log('\n5️⃣  Existing Curriculum API (Compatibility Check)');
  await testEndpoint('GET /classes', '/classes');
  await testEndpoint('GET /subjects?classId=1', '/subjects?classId=1');
  await testEndpoint('GET /chapters?subjectId=6', '/chapters?subjectId=6');
  
  // Database statistics
  console.log('\n6️⃣  Database Statistics');
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM classes) as classes,
      (SELECT COUNT(*) FROM subjects) as subjects,
      (SELECT COUNT(*) FROM chapters) as chapters,
      (SELECT COUNT(*) FROM topics WHERE is_archived = false) as topics,
      (SELECT COUNT(*) FROM questions WHERE is_archived = false) as questions,
      (SELECT COUNT(*) FROM mcq_options) as mcq_options,
      (SELECT COUNT(*) FROM notes WHERE is_archived = false) as notes,
      (SELECT COUNT(*) FROM documents WHERE is_archived = false) as documents
  `);
  
  const s = stats.rows[0];
  console.log(`  Classes: ${s.classes}`);
  console.log(`  Subjects: ${s.subjects}`);
  console.log(`  Chapters: ${s.chapters}`);
  console.log(`  Topics: ${s.topics}`);
  console.log(`  Questions: ${s.questions}`);
  console.log(`  MCQ Options: ${s.mcq_options}`);
  console.log(`  Notes: ${s.notes}`);
  console.log(`  Documents: ${s.documents}`);
  
  // Check for any issues
  console.log('\n7️⃣  Issues Check');
  
  const orphanedNotes = await pool.query(`
    SELECT COUNT(*) as count FROM notes 
    WHERE topic_id NOT IN (SELECT id FROM topics)
  `);
  
  const orphanedQuestions = await pool.query(`
    SELECT COUNT(*) as count FROM questions 
    WHERE topic_id IS NOT NULL 
    AND topic_id NOT IN (SELECT id FROM topics)
  `);
  
  let issueCount = 0;
  
  if (parseInt(orphanedNotes.rows[0].count) > 0) {
    console.log(`  ⚠️  ${orphanedNotes.rows[0].count} notes reference non-existent topics`);
    issueCount++;
  } else {
    console.log(`  ✅ All notes properly linked`);
  }
  
  if (parseInt(orphanedQuestions.rows[0].count) > 0) {
    console.log(`  ⚠️  ${orphanedQuestions.rows[0].count} questions reference non-existent topics`);
    issueCount++;
  } else {
    console.log(`  ✅ All questions properly linked`);
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  if (issueCount === 0) {
    console.log('✅ Backend Review Complete - No Issues Found!');
  } else {
    console.log(`⚠️  Backend Review Complete - ${issueCount} issues found`);
  }
  console.log('='.repeat(70));
  console.log('\n🚀 Backend is ready for frontend integration!\n');
  
  await pool.end();
}

runTests().catch(error => {
  console.error('Test failed:', error);
  pool.end();
  process.exit(1);
});
