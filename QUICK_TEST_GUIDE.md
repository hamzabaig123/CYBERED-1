# 🚀 Quick RAG Testing Guide

## ✅ Servers Running

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3000
- **Network**: http://192.168.0.102:5000

## 🧪 Quick Browser Tests

### 1. Login First
Open http://localhost:5000 and login:
- Email: `uploader@test.com`
- Password: `password123`

### 2. Open Browser Console (F12)

### 3. Test RAG Search (Copy & Paste)

```javascript
// Test Physics search
fetch('http://localhost:3000/api/rag/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "Newton's laws of motion",
    subjectId: 6,
    topK: 5
  })
})
.then(r => r.json())
.then(data => console.log('✅ Search Results:', data));
```

**Expected**: Should find content from Page 74 of Physics textbook

### 4. Test RAG Explanation

```javascript
// Test Physics explanation
fetch('http://localhost:3000/api/rag/explain', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    questionText: "Explain the difference between speed and velocity",
    subjectId: 6
  })
})
.then(r => r.json())
.then(data => console.log('✅ Explanation with Citations:', data));
```

**Expected**: Detailed explanation with page citations

### 5. Test RAG Chat

```javascript
// Chat with Physics book
fetch('http://localhost:3000/api/rag/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subjectId: 6,
    messages: [
      { role: 'user', content: 'What is momentum? Give me a simple explanation.' }
    ]
  })
})
.then(r => r.json())
.then(data => console.log('✅ Chat Response:', data));
```

### 6. Check RAG Status

```javascript
// Check which subjects have RAG ready
[2, 3, 4, 6].forEach(subjectId => {
  fetch(`http://localhost:3000/api/rag/status/${subjectId}`, {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  })
  .then(r => r.json())
  .then(data => console.log(`Subject ${subjectId}:`, data.ragReady ? `✅ ${data.totalChunks} chunks` : '❌ Not ready'));
});
```

## 📊 Current Status

| Subject | Status | Chunks | Ready |
|---------|--------|--------|-------|
| Physics (6) | ✅ Indexed | 12,960 | Yes |
| English (2) | ✅ Indexed | 3,668 | Yes |
| Urdu (3) | ✅ Indexed | 351 | Yes |
| Islamiyat (4) | ✅ Indexed | 13,578 | Yes |
| Math (5) | ❌ Failed | 0 | No - Corrupted PDF |

**Total**: 30,557 chunks indexed across 4 subjects

## 🎯 Test Queries by Subject

### Physics (Subject ID: 6)
- "Newton's laws"
- "speed and velocity"
- "momentum and force"
- "measurement units"

### English (Subject ID: 2)
- "first chapter summary"
- "main theme"
- "character analysis"

### Islamiyat (Subject ID: 4)
- "pillars of Islam"
- "Quran verses"

### Urdu (Subject ID: 3)
- Test in Urdu or English

## 🔍 What to Look For

### ✅ Good Results:
- Specific page numbers in citations
- Content matches actual textbook
- No hallucinations
- Relevant answers

### ⚠️ Issues:
- Generic answers without citations
- Wrong page numbers
- API errors
- No results found

## 📁 Git Status

✅ **Committed**: All RAG system files
✅ **Pushed**: To GitHub repo `hamzabaig123/CYBERED-1`
✅ **Commit**: `edfc201` - "feat: Complete RAG system with pgvector for textbook search and AI Q&A"

## 📚 Documentation

- **Full Guide**: `HOW_TO_TEST_RAG.md`
- **System Details**: `RAG_SYSTEM_COMPLETE.md`
- **This Guide**: `QUICK_TEST_GUIDE.md`

---

**Happy Testing! 🎉**

Need help? Check the browser console (F12) for errors.
