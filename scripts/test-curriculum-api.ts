import { pool } from '../lib/db/src/index.js';

const API_BASE = 'http://localhost:3000';
let authToken = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function login() {
  log('\n🔐 Logging in...', colors.cyan);
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uploader@test.com',
      password: 'password123'
    })
  });
  
  const data = await response.json();
  if (data.token) {
    authToken = data.token;
    log('✅ Login successful', colors.green);
    return true;
  } else {
    log('❌ Login failed', colors.red);
    return false;
  }
}

async function testTopicsAPI() {
  log('\n📁 Testing Topics API...', colors.cyan);
  
  try {
    // Get existing chapters
    const chaptersRes = await fetch(`${API_BASE}/chapters?subjectId=6`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const chapters = await chaptersRes.json();
    
    if (chapters.length === 0) {
      log('⚠️  No chapters found, skipping topics test', colors.yellow);
      return;
    }
    
    const chapterId = chapters[0].id;
    log(`Using chapter ID: ${chapterId}`, colors.blue);
    
    // Test: Create topic
    log('\n1️⃣  Creating new topic...', colors.cyan);
    const createRes = await fetch(`${API_BASE}/chapters/${chapterId}/topics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Topic - API Verification',
        description: 'This is a test topic created via API',
        orderIndex: 0
      })
    });
    const newTopic = await createRes.json();
    
    if (createRes.ok) {
      log(`✅ Topic created: ${newTopic.name} (ID: ${newTopic.id})`, colors.green);
      
      // Test: Get topic
      log('\n2️⃣  Fetching topic details...', colors.cyan);
      const getRes = await fetch(`${API_BASE}/topics/${newTopic.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const topic = await getRes.json();
      
      if (getRes.ok) {
        log(`✅ Topic fetched: MCQs: ${topic.mcqCount}, Notes: ${topic.noteCount}, Docs: ${topic.documentCount}`, colors.green);
      } else {
        log(`❌ Failed to fetch topic: ${JSON.stringify(topic)}`, colors.red);
      }
      
      // Test: List topics
      log('\n3️⃣  Listing all topics in chapter...', colors.cyan);
      const listRes = await fetch(`${API_BASE}/topics?chapterId=${chapterId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const topics = await listRes.json();
      
      if (listRes.ok) {
        log(`✅ Found ${topics.length} topics`, colors.green);
      } else {
        log(`❌ Failed to list topics`, colors.red);
      }
      
      // Test: Update topic
      log('\n4️⃣  Updating topic...', colors.cyan);
      const updateRes = await fetch(`${API_BASE}/topics/${newTopic.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: 'Updated description via API test'
        })
      });
      
      if (updateRes.ok) {
        log(`✅ Topic updated successfully`, colors.green);
      } else {
        log(`❌ Failed to update topic`, colors.red);
      }
      
      // Test: Archive topic
      log('\n5️⃣  Archiving topic...', colors.cyan);
      const archiveRes = await fetch(`${API_BASE}/topics/${newTopic.id}/archive`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (archiveRes.ok) {
        log(`✅ Topic archived successfully`, colors.green);
      } else {
        log(`❌ Failed to archive topic`, colors.red);
      }
      
    } else {
      log(`❌ Failed to create topic: ${JSON.stringify(newTopic)}`, colors.red);
    }
    
  } catch (error) {
    log(`❌ Topics API test failed: ${error}`, colors.red);
  }
}

async function testNotesAPI() {
  log('\n📝 Testing Notes API...', colors.cyan);
  
  try {
    // Get a topic to attach note to
    const result = await pool.query(`
      SELECT id FROM topics 
      WHERE is_archived = false 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      log('⚠️  No topics found, skipping notes test', colors.yellow);
      return;
    }
    
    const topicId = result.rows[0].id;
    log(`Using topic ID: ${topicId}`, colors.blue);
    
    // Test: Create note
    log('\n1️⃣  Creating new note...', colors.cyan);
    const createRes = await fetch(`${API_BASE}/topics/${topicId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Note - API Verification',
        content: 'This is a test note with some **markdown** content.\n\nIt has multiple paragraphs for testing.',
        noteType: 'markdown',
        tags: ['test', 'api', 'verification']
      })
    });
    const newNote = await createRes.json();
    
    if (createRes.ok) {
      log(`✅ Note created: ${newNote.title} (ID: ${newNote.id})`, colors.green);
      
      // Test: Get note
      log('\n2️⃣  Fetching note details...', colors.cyan);
      const getRes = await fetch(`${API_BASE}/notes/${newNote.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const note = await getRes.json();
      
      if (getRes.ok) {
        log(`✅ Note fetched: ${note.title}, Tags: ${note.tags.join(', ')}`, colors.green);
      } else {
        log(`❌ Failed to fetch note`, colors.red);
      }
      
      // Test: Search notes
      log('\n3️⃣  Searching notes...', colors.cyan);
      const searchRes = await fetch(`${API_BASE}/notes/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'test verification',
          limit: 10
        })
      });
      const searchResults = await searchRes.json();
      
      if (searchRes.ok) {
        log(`✅ Search found ${searchResults.length} notes`, colors.green);
      } else {
        log(`❌ Search failed`, colors.red);
      }
      
    } else {
      log(`❌ Failed to create note: ${JSON.stringify(newNote)}`, colors.red);
    }
    
  } catch (error) {
    log(`❌ Notes API test failed: ${error}`, colors.red);
  }
}

async function testMCQOptionsAPI() {
  log('\n🎯 Testing MCQ Options API...', colors.cyan);
  
  try {
    // Get an MCQ question
    const result = await pool.query(`
      SELECT id FROM questions 
      WHERE question_type = 'mcq' 
      AND is_archived = false 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      log('⚠️  No MCQ questions found, skipping MCQ options test', colors.yellow);
      return;
    }
    
    const questionId = result.rows[0].id;
    log(`Using question ID: ${questionId}`, colors.blue);
    
    // Test: Get existing options
    log('\n1️⃣  Fetching existing options...', colors.cyan);
    const getRes = await fetch(`${API_BASE}/questions/${questionId}/options`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const existingOptions = await getRes.json();
    
    if (getRes.ok) {
      log(`✅ Found ${existingOptions.length} existing options`, colors.green);
    }
    
    // Test: Add new option (only if less than 5 options)
    if (existingOptions.length < 5) {
      log('\n2️⃣  Adding new option...', colors.cyan);
      const createRes = await fetch(`${API_BASE}/questions/${questionId}/options`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          optionKey: 'E',
          optionText: 'Test option E',
          isCorrect: false
        })
      });
      
      if (createRes.ok) {
        const newOption = await createRes.json();
        log(`✅ Option added: ${newOption.optionKey}`, colors.green);
      } else {
        const error = await createRes.json();
        log(`⚠️  Option creation: ${error.error}`, colors.yellow);
      }
    }
    
  } catch (error) {
    log(`❌ MCQ Options API test failed: ${error}`, colors.red);
  }
}

async function testStatistics() {
  log('\n📊 Testing Statistics Queries...', colors.cyan);
  
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT id) as total_topics,
        COUNT(DISTINCT id) FILTER (WHERE parent_id IS NULL) as root_topics,
        COUNT(DISTINCT id) FILTER (WHERE parent_id IS NOT NULL) as subtopics
      FROM topics
      WHERE is_archived = false
    `);
    
    log(`✅ Topics Statistics:`, colors.green);
    log(`   Total Topics: ${stats.rows[0].total_topics}`, colors.blue);
    log(`   Root Topics: ${stats.rows[0].root_topics}`, colors.blue);
    log(`   Subtopics: ${stats.rows[0].subtopics}`, colors.blue);
    
    const noteStats = await pool.query(`
      SELECT COUNT(*) as total_notes FROM notes WHERE is_archived = false
    `);
    log(`   Total Notes: ${noteStats.rows[0].total_notes}`, colors.blue);
    
    const mcqStats = await pool.query(`
      SELECT COUNT(*) as total_options FROM mcq_options
    `);
    log(`   Total MCQ Options: ${mcqStats.rows[0].total_options}`, colors.blue);
    
  } catch (error) {
    log(`❌ Statistics query failed: ${error}`, colors.red);
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('🧪 CYBERED Curriculum API Test Suite', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    log('\n❌ Cannot proceed without authentication', colors.red);
    process.exit(1);
  }
  
  // Run all tests
  await testTopicsAPI();
  await testNotesAPI();
  await testMCQOptionsAPI();
  await testStatistics();
  
  log('\n' + '='.repeat(60), colors.cyan);
  log('✅ Test Suite Complete!', colors.green);
  log('='.repeat(60), colors.cyan);
  
  await pool.end();
  process.exit(0);
}

runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error}`, colors.red);
  pool.end();
  process.exit(1);
});
