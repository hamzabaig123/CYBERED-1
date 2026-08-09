# How to Test the RAG System in Your Website

## 🌐 Your Website URLs

- **Frontend (UI)**: http://localhost:5000
- **Backend (API)**: http://localhost:3000
- **Network Access**: http://192.168.0.102:5000 (from other devices)

## 📋 Step-by-Step Testing Guide

### Step 1: Login to Your Website

1. Open http://localhost:5000 in your browser
2. Login with your admin account:
   - **Email**: `uploader@test.com`
   - **Password**: `password123`
   
   Or use your main account:
   - **Email**: `nasreen.qayoom@gmail.com`
   - **Password**: (your password)

### Step 2: Check Which Subjects Have RAG Ready

Open your browser's **Developer Console** (F12) and run:

```javascript
// Check RAG status for Physics (subject ID 6)
fetch('http://localhost:3000/api/rag/status/6', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log('Physics RAG Status:', data));

// Check English (subject ID 2)
fetch('http://localhost:3000/api/rag/status/2', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log('English RAG Status:', data));
```

You should see:
```json
{
  "subjectId": 6,
  "ragReady": true,
  "totalChunks": 12960,
  "textbooks": [...]
}
```

### Step 3: Test RAG Search

In the browser console:

```javascript
// Search for "Newton's laws" in Physics textbook
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
.then(data => console.log('Search Results:', data));
```

**Expected Output:**
```json
{
  "results": [
    {
      "chunkId": 123,
      "content": "Newton's first law states...",
      "pageNumber": 74,
      "score": 0.89,
      "filename": "Physics XI Class XI (English Medium) STBB.pdf"
    },
    ...
  ],
  "count": 5
}
```

### Step 4: Test RAG Explanation

```javascript
// Get explanation using RAG
fetch('http://localhost:3000/api/rag/explain', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    questionText: "Explain Newton's first law of motion",
    subjectId: 6
  })
})
.then(r => r.json())
.then(data => console.log('RAG Explanation:', data));
```

**Expected Output:**
```json
{
  "explanation": "Newton's first law of motion states that an object at rest stays at rest, and an object in motion stays in motion with constant velocity, unless acted upon by an external force...",
  "citations": [
    {
      "page": 74,
      "filename": "Physics XI Class XI (English Medium) STBB.pdf",
      "snippet": "Newton's first law..."
    }
  ],
  "subjectId": 6,
  "method": "rag"
}
```

### Step 5: Test RAG Chat

```javascript
// Chat with Physics textbook
fetch('http://localhost:3000/api/rag/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subjectId: 6,
    messages: [
      { role: 'user', content: 'What is velocity?' }
    ]
  })
})
.then(r => r.json())
.then(data => console.log('RAG Chat:', data));
```

### Step 6: Test in Your UI Pages

#### Option A: Test in "Explain from Book" Tab

1. Go to any Physics question in your UI
2. Click the **"Explain from Book"** button
3. The system should now use RAG if available!

**Note**: You may need to update the UI to call `/api/rag/explain` instead of `/api/ai/explain`

#### Option B: Test in "Ask Book Chat" Tab

1. Navigate to the Book Chat page
2. Select **Physics** as the subject
3. Ask: "What is Newton's first law?"
4. Should get answer with page citations!

### Step 7: Verify Citations

When you get results with page numbers:

1. Check the cited page number (e.g., Page 74)
2. Open the actual PDF: `C:\Users\hamza\class 11 book\Physics XI Class XI (English Medium) STBB.pdf`
3. Navigate to page 74
4. Verify the content matches the citation!

## 🔧 Testing Different Subjects

### Physics (Subject ID: 6) ✅
- **Status**: 12,960 chunks indexed
- **Test Questions**:
  - "Explain Newton's laws"
  - "What is the difference between speed and velocity?"
  - "Define momentum"

### English (Subject ID: 2) ✅
- **Status**: 3,668 chunks indexed
- **Test Questions**:
  - "Summarize the first chapter"
  - "What is the theme of this lesson?"

### Urdu (Subject ID: 3) ✅
- **Status**: 351 chunks indexed
- **Test in Urdu or English**

### Islamiyat (Subject ID: 4) ✅
- **Status**: 13,578 chunks indexed
- **Test Questions**:
  - "What are the pillars of Islam?"

### Math (Subject ID: 5) ❌
- **Status**: Not indexed (corrupted PDF)
- **Action**: Need to re-upload Math textbook

## 🐛 Troubleshooting

### "No RAG-indexed content available"
**Solution**: The textbook is still being processed. Wait a few minutes and check status again.

### "Token expired" or 401 errors
**Solution**: Login again to get a fresh token.

### Citations show wrong pages
**Solution**: The page numbers in the PDF might be different from the physical book pages. This is normal for scanned textbooks.

### No results found
**Solution**: 
- Try simpler search terms
- Lower the `minScore` threshold
- Check if the subject has RAG content (`/api/rag/status/:subjectId`)

## 📱 Testing from Another Device

1. Make sure both devices are on the same network
2. Open http://192.168.0.102:5000 on the other device
3. Login and test as above

## 🎯 What to Look For

### ✅ Good Signs:
- Citations include specific page numbers
- Content matches the actual textbook
- Answers are grounded in book content
- No hallucinations or made-up information

### ⚠️ Issues to Report:
- Wrong page numbers
- Generic answers without citations
- Content not from the textbook
- API errors or timeouts

## 📊 Performance Expectations

- **Search Speed**: <100ms
- **Explanation Generation**: 2-5 seconds
- **Chat Response**: 3-8 seconds
- **Streaming**: Starts immediately, completes in 3-8 seconds

## 🔄 If You Need to Re-index

Run this in PowerShell:
```powershell
cd d:\CYBERED\CYBERED\artifacts\api-server
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cybered"
$env:GEMINI_API_KEY=(Get-Content .env | Select-String 'GEMINI_API_KEY' | ForEach-Object { $_ -replace 'GEMINI_API_KEY=', '' })
tsx src/jobs/rag-processor-job.ts
```

Wait for it to process all textbooks (shows progress in console).

---

**Happy Testing! 🚀**

If you find issues, check the browser console (F12) and the backend logs for error details.
