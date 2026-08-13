// Quick backend verification script
const API_BASE = 'http://localhost:3000/api';

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
  return data.token;
}

async function verify() {
  console.log('\n🔍 Backend Verification\n');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Health check
    console.log('\n✓ Testing health endpoint...');
    const healthRes = await fetch(`${API_BASE}/healthz`);
    const health = await healthRes.json();
    console.log(`  Status: ${health.status}`);
    
    // Test 2: Login
    console.log('\n✓ Testing authentication...');
    const token = await login();
    console.log(`  Token: ${token.substring(0, 20)}...`);
    
    // Test 3: Get topics
    console.log('\n✓ Testing topics API...');
    const topicsRes = await fetch(`${API_BASE}/topics?chapterId=2`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const topics = await topicsRes.json();
    console.log(`  Found ${topics.length} topics in chapter 2`);
    
    if (topics.length > 0) {
      const topic = topics[0];
      console.log(`  Sample: "${topic.name}" (${topic.mcqCount} MCQs, ${topic.noteCount} notes)`);
    }
    
    // Test 4: Get notes
    if (topics.length > 0) {
      console.log('\n✓ Testing notes API...');
      const notesRes = await fetch(`${API_BASE}/notes?topicId=${topics[0].id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const notes = await notesRes.json();
      console.log(`  Found ${notes.length} notes for topic "${topics[0].name}"`);
    }
    
    // Test 5: Get MCQ options
    console.log('\n✓ Testing MCQ options API...');
    const questionsRes = await fetch(`${API_BASE}/questions/4/options`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (questionsRes.ok) {
      const options = await questionsRes.json();
      console.log(`  Found ${options.length} options for question 4`);
      if (options.length > 0) {
        const correct = options.find((o: any) => o.isCorrect);
        console.log(`  Correct answer: ${correct?.optionKey} - ${correct?.optionText}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Backend verification complete!\n');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

verify();
