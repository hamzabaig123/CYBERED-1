#!/usr/bin/env node
/**
 * Batch upload script for Class 11 textbooks
 * 
 * This script uploads all textbooks from the local directory to CYBERED,
 * processes them, and triggers Gemini File Search indexing.
 * 
 * Usage: tsx scripts/upload-books.ts
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const API_BASE = "http://localhost:3000/api";
const BOOKS_DIR = "C:\\Users\\hamza\\class 11 book";

// Book to subject mapping
const BOOK_MAPPINGS = [
  { 
    file: "Math XI Class XI (English Medium) STBB.pdf", 
    subjectName: "Mathematics",
    description: "Class XI Mathematics (English Medium)"
  },
  { 
    file: "Physics XI Class XI (English Medium) STBB.pdf", 
    subjectName: "Physics",
    description: "Class XI Physics (English Medium)"
  },
  { 
    file: "English XI Class XI (English Medium) STBB.pdf", 
    subjectName: "English",
    description: "Class XI English (English Medium)"
  },
  { 
    file: "Gulzar-E-Urdu XI Class XI (Urdu Medium) STBB.pdf", 
    subjectName: "Urdu",
    description: "Class XI Urdu (Urdu Medium) - Gulzar-E-Urdu"
  },
  // Islamiyat - needs clarification on subject mapping
  // Uncomment once you decide where it should go
  // { 
  //   file: "Islamiyat XI- XII Class XI (Sindhi Medium) STBB.pdf", 
  //   subjectName: "Islamiyat",
  //   description: "Class XI-XII Islamiyat (Sindhi Medium)"
  // },
];

interface Subject {
  id: number;
  name: string;
  classId: number;
}

interface UploadResponse {
  assetId: number;
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

interface BookStore {
  id: number;
  subjectId: number;
  geminiStoreName: string;
  status: string;
}

async function getAuthToken(): Promise<string> {
  // For this script, we'll need a valid JWT token
  // You can either:
  // 1. Pass it as an environment variable: AUTH_TOKEN=your_token
  // 2. Or login programmatically below
  
  if (process.env.AUTH_TOKEN) {
    return process.env.AUTH_TOKEN;
  }

  // Login to get token (replace with your actual credentials)
  const loginEmail = process.env.LOGIN_EMAIL || "nasreen.qayoom@gmail.com";
  const loginPassword = process.env.LOGIN_PASSWORD;

  if (!loginPassword) {
    throw new Error("Either AUTH_TOKEN or LOGIN_PASSWORD environment variable must be set");
  }

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: loginEmail, password: loginPassword }),
  });

  if (!loginRes.ok) {
    const error = await loginRes.text();
    throw new Error(`Login failed: ${error}`);
  }

  const loginData = await loginRes.json();
  return loginData.token;
}

async function findSubject(token: string, subjectName: string): Promise<Subject | null> {
  const res = await fetch(`${API_BASE}/subjects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch subjects: ${await res.text()}`);
  }

  const subjects: Subject[] = await res.json();
  return subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase()) || null;
}

async function createSubject(token: string, subjectName: string, classId: number): Promise<Subject> {
  console.log(`Creating new subject: ${subjectName}`);
  
  const res = await fetch(`${API_BASE}/subjects`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: subjectName, classId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create subject: ${await res.text()}`);
  }

  return await res.json();
}

async function uploadBook(
  token: string, 
  filePath: string, 
  subjectId: number,
  description: string
): Promise<number> {
  const filename = basename(filePath);
  const fileBuffer = readFileSync(filePath);
  const sizeBytes = fileBuffer.length;

  console.log(`  📤 Uploading ${filename} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)...`);

  // Step 1: Get upload URL
  const uploadUrlRes = await fetch(`${API_BASE}/files/upload-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subjectId,
      filename,
      contentType: "application/pdf",
      sizeBytes,
      isTextbook: true,
    }),
  });

  if (!uploadUrlRes.ok) {
    throw new Error(`Failed to get upload URL: ${await uploadUrlRes.text()}`);
  }

  const uploadData: UploadResponse = await uploadUrlRes.json();

  // Step 2: Upload file to storage (direct upload since we're local)
  console.log(`  📦 Uploading file to storage...`);
  const directUploadRes = await fetch(
    `${API_BASE}/files/direct-upload?storageKey=${encodeURIComponent(uploadData.storageKey)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/pdf",
      },
      body: fileBuffer,
    }
  );

  if (!directUploadRes.ok) {
    throw new Error(`Failed to upload file: ${await directUploadRes.text()}`);
  }

  // Step 3: Mark upload as complete
  console.log(`  ✅ Marking upload complete...`);
  const completeRes = await fetch(`${API_BASE}/files/${uploadData.assetId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sizeBytes }),
  });

  if (!completeRes.ok) {
    throw new Error(`Failed to complete upload: ${await completeRes.text()}`);
  }

  return uploadData.assetId;
}

async function indexBookForAI(token: string, subjectId: number, assetId: number): Promise<void> {
  console.log(`  🔍 Creating Gemini book store and indexing...`);

  // Check if book store already exists
  const storeRes = await fetch(`${API_BASE}/subjects/${subjectId}/book-store`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let store: BookStore | null = null;
  if (storeRes.ok) {
    const storeData = await storeRes.json();
    store = storeData.store;
  }

  // Create store if it doesn't exist
  if (!store) {
    console.log(`  📚 Creating new book store...`);
    const createStoreRes = await fetch(`${API_BASE}/subjects/${subjectId}/book-store`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ textbookTitle: "Class XI Textbook" }),
    });

    if (!createStoreRes.ok) {
      throw new Error(`Failed to create book store: ${await createStoreRes.text()}`);
    }

    store = await createStoreRes.json();
  }

  console.log(`  ✅ Book store ready: ${store.geminiStoreName}`);
  console.log(`  📄 Asset uploaded with ID: ${assetId}`);
  console.log(`     Status: Queued for background processing`);
  console.log(`     The system will automatically index this book.`);
  console.log(`     Check progress in the UI: /subjects/${subjectId}/library`);
}

async function main() {
  console.log("🚀 CYBERED Book Upload Script\n");
  console.log("=" .repeat(60));

  try {
    // Get authentication token
    console.log("🔐 Authenticating...");
    const token = await getAuthToken();
    console.log("✅ Authenticated\n");

    // Get Class 11 ID (assuming it's 1, or fetch from API)
    const classId = 1;

    // Process each book
    for (let i = 0; i < BOOK_MAPPINGS.length; i++) {
      const book = BOOK_MAPPINGS[i];
      const filePath = `${BOOKS_DIR}\\${book.file}`;

      console.log(`\n📖 Book ${i + 1}/${BOOK_MAPPINGS.length}: ${book.subjectName}`);
      console.log("-".repeat(60));

      // Find or create subject
      let subject = await findSubject(token, book.subjectName);
      if (!subject) {
        subject = await createSubject(token, book.subjectName, classId);
      }
      console.log(`  📚 Subject ID: ${subject.id} (${subject.name})`);

      // Upload book
      const assetId = await uploadBook(token, filePath, subject.id, book.description);
      console.log(`  📄 Asset ID: ${assetId}`);

      // Index for AI
      await indexBookForAI(token, subject.id, assetId);

      console.log(`  ✅ Book uploaded and indexing started!\n`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 All books uploaded successfully!");
    console.log("\n📋 Next steps:");
    console.log("  1. Wait 5-15 minutes for indexing to complete");
    console.log("  2. Check status at: http://localhost:5000");
    console.log("  3. Test with questions once status shows 'ready'");
    console.log("\n💡 To check indexing status:");
    console.log("  - Go to each subject's Library page");
    console.log("  - Look for 'Indexing Status' badge");
    console.log("  - Green = Ready to use");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
