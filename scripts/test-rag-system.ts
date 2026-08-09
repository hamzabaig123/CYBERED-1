/**
 * End-to-end test of the RAG system
 * Tests search and explanation generation
 */

import { searchTextbookChunks } from "@workspace/textbooks";
import { getGeminiClient, explainFromBookRAG } from "../artifacts/api-server/src/ai/geminiClient.js";

async function testSearch() {
  console.log("\n=== Testing RAG Search ===\n");
  
  const testQueries = [
    { query: "Newton's laws of motion", subjectId: 6, subject: "Physics" },
    { query: "speed and velocity", subjectId: 6, subject: "Physics" },
    { query: "measurement and units", subjectId: 6, subject: "Physics" },
  ];

  const client = getGeminiClient();

  for (const test of testQueries) {
    console.log(`\n📚 Query: "${test.query}" (${test.subject})`);
    console.log("-".repeat(60));

    try {
      const results = await searchTextbookChunks(test.query, client, {
        subjectId: test.subjectId,
        topK: 3,
        minScore: 0.1, // Lower threshold for testing
      });

      if (results.length === 0) {
        console.log("❌ No results found");
      } else {
        console.log(`✅ Found ${results.length} results:\n`);
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          console.log(`${i + 1}. Page ${result.pageNumber} (score: ${result.score.toFixed(3)})`);
          console.log(`   File: ${result.filename}`);
          console.log(`   Snippet: ${result.content.substring(0, 150)}...`);
          if (result.sectionTitle) {
            console.log(`   Section: ${result.sectionTitle}`);
          }
          console.log();
        }
      }
    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }
}

async function testExplanation() {
  console.log("\n=== Testing RAG Explanation ===\n");
  
  const question = "Explain what velocity means in physics";
  const subjectId = 6; // Physics

  console.log(`📝 Question: "${question}"`);
  console.log("-".repeat(60));

  try {
    const result = await explainFromBookRAG(subjectId, question);

    console.log(`\n✅ Explanation:\n`);
    console.log(result.explanation);
    
    if (result.citations.length > 0) {
      console.log(`\n📖 Citations (${result.citations.length}):\n`);
      for (const citation of result.citations) {
        console.log(`- Page ${citation.page}: ${citation.snippet.substring(0, 100)}...`);
      }
    } else {
      console.log("\n⚠️  No citations found");
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

async function main() {
  console.log("🔬 CYBERED RAG System Test");
  console.log("=".repeat(60));

  try {
    await testSearch();
    await testExplanation();

    console.log("\n" + "=".repeat(60));
    console.log("✅ RAG system test complete!");
    console.log("\nNext steps:");
    console.log("1. Test these queries in the UI");
    console.log("2. Verify citations point to correct pages");
    console.log("3. Try with different subjects (English, Urdu, Islamiyat)");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
