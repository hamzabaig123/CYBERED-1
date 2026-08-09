# CYBERED Book Upload Scripts

## Quick Start: Upload All Class 11 Books

### Prerequisites
1. PostgreSQL is running
2. Backend API server is running (`npm start` in `artifacts/api-server`)
3. You have valid login credentials

### Option 1: Upload via Script (Recommended)

```bash
# Set your password
$env:LOGIN_PASSWORD="your_password_here"

# Run the upload script
npx tsx scripts/upload-books.ts
```

The script will:
1. Authenticate with your credentials
2. Create subjects if they don't exist
3. Upload all 5 books (Math, Physics, English, Urdu, Islamiyat*)
4. Start Gemini File Search indexing for each book
5. Show progress and next steps

**Note:** Islamiyat is currently commented out in the script. 
- Uncomment lines 27-31 in `upload-books.ts` once you decide on the subject mapping
- It's marked as Sindhi Medium specifically
- Consider adding it as an 8th subject or mapping to existing Islamic Studies

### Option 2: Upload via UI (Manual)

1. Go to http://localhost:5000
2. Login with your credentials
3. For each subject:
   - Navigate to Subject → Library
   - Click "Upload Textbook"
   - Select the PDF from `C:\Users\hamza\class 11 book\`
   - Wait for upload and indexing to complete

### Option 3: Upload Single Book (Testing)

Test with the smallest book first (English or Urdu):

```bash
$env:LOGIN_PASSWORD="your_password_here"
$env:TEST_BOOK="English"

npx tsx scripts/upload-single-book.ts
```

## Subject Mapping

| Book File | Subject | Status |
|-----------|---------|--------|
| Math XI Class XI (English Medium) STBB.pdf | Mathematics | ✅ Ready |
| Physics XI Class XI (English Medium) STBB.pdf | Physics | ✅ Ready |
| English XI Class XI (English Medium) STBB.pdf | English | ✅ Ready |
| Gulzar-E-Urdu XI Class XI (Urdu Medium) STBB.pdf | Urdu | ✅ Ready |
| Islamiyat XI- XII Class XI (Sindhi Medium) STBB.pdf | Islamiyat (TBD) | ⚠️ Needs decision |

### Missing Books (to add later)
- Chemistry XI
- Sindhi XI
- Computer Science XI

## Indexing Times

Expect these approximate indexing times:
- **Small books** (~50-100 pages): 2-5 minutes
- **Medium books** (~100-300 pages): 5-10 minutes
- **Large books** (300+ pages, scanned PDFs 100MB+): 10-20 minutes

The script will start indexing and return immediately. Check progress in the UI.

## Checking Indexing Status

### Via UI
1. Go to http://localhost:5000
2. Navigate to Subject → Library
3. Look for the "Indexing Status" badge:
   - 🟡 **Pending** - Queued for processing
   - 🔵 **Processing** - Currently indexing
   - 🟢 **Ready** - Indexed and ready to use
   - 🔴 **Failed** - Error occurred

### Via API
```bash
# Check book store status for a subject
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/books/{subjectId}/store-status
```

## Testing After Upload

Once indexing shows "Ready", test with real questions:

### Test Questions by Subject

**Mathematics:**
- "Explain the concept of derivatives"
- "What is the quotient rule?"
- "Show me the worked example on differentiation"

**Physics:**
- "Explain Newton's laws of motion"
- "What is the formula for kinetic energy?"
- "Describe the concept of work and power"

**English:**
- "What are the main themes in the prescribed poems?"
- "Explain the essay writing techniques"
- "What is a metaphor? Give examples"

**Urdu:**
- "غزل کی تعریف کیا ہے؟"
- "نظم اور غزل میں کیا فرق ہے؟"

### Where to Test
1. **Ask Book Chat** - Conversational Q&A
2. **Explain from Book** - Detailed explanations
3. **AI Generated Questions** - Draft questions from book pages

## Troubleshooting

### Authentication Error
```
Error: Login failed: 401
```
**Solution:** Check your password in the environment variable

### Upload Failed
```
Error: Failed to upload file
```
**Solution:** 
- Ensure backend API is running
- Check that PostgreSQL is running
- Verify file paths are correct

### Indexing Failed
```
Status: failed
```
**Solution:**
- Check `GEMINI_API_KEY` in `.env` file
- Verify the API key has File API enabled
- Check backend logs for specific errors

### File Not Found
```
Error: ENOENT: no such file or directory
```
**Solution:** Verify book files exist at `C:\Users\hamza\class 11 book\`

## Advanced: Custom Upload

Edit `upload-books.ts` to:
- Add more books
- Change subject mappings
- Modify descriptions
- Skip certain books

Example:
```typescript
const BOOK_MAPPINGS = [
  { 
    file: "YourBook.pdf", 
    subjectName: "YourSubject",
    description: "Custom description"
  },
];
```

## API Endpoints Used

- `POST /api/auth/login` - Authentication
- `GET /api/subjects` - List subjects
- `POST /api/subjects` - Create subject
- `POST /api/files/upload-url` - Get upload URL
- `POST /api/files/direct-upload` - Upload file
- `POST /api/files/:assetId/complete` - Mark upload complete
- `GET /api/subjects/:subjectId/book-store` - Check book store status
- `POST /api/subjects/:subjectId/book-store` - Create book store

## Environment Variables

```bash
# Required: One of these
$env:AUTH_TOKEN="your_jwt_token"
$env:LOGIN_PASSWORD="your_password"

# Optional
$env:LOGIN_EMAIL="your_email@example.com"  # Default: nasreen.qayoom@gmail.com
$env:API_BASE="http://localhost:3000/api"  # Default: http://localhost:3000/api
```
