# RAG 2.0 Implementation Plan

## Current State
- **Partial RAG 2.0 code exists** in `lib/textbooks/src/rag/` (39 files)
- **pgvector schema** exists in `0009_rag_v2.sql` and `lib/db/src/schema/rag.ts`
- **Stub implementations** - key functions have `// logic here` comments
- **Old RAG still live** - chat route uses `chatWithBook()` from `geminiClient.ts`
- **Gemini File Search** is the currently active path
- **Old JSONB embedding system** still present in `embeddings.ts`/`rag-search.ts`

## Implementation Steps

### Step 1: Complete rag_chunks Migration
- **File**: `lib/textbooks/src/rag/indexer/index-document.ts`
- **Status**: STUB - has `IndexingState` enum and `DocumentIndexer` class but no real logic
- **Action**: Implement actual chunking → embedding → storage pipeline
- **Dependencies**: `semantic-chunker.ts`, `metadata-enricher.ts`, `embedding-service.ts`

### Step 2: Replace Old Embedding Generation
- **Files**: `lib/textbooks/src/embeddings.ts`, `lib/textbooks/src/rag/indexer/index-document.ts`
- **Status**: Old `embeddings.ts` uses `embedding_json` JSONB field
- **Action**: Wire Gemini text-embedding-004 into the new `embedding-service.ts`
- **Key**: Must batch embeddings to handle 200MB PDF content

### Step 3: Build pgvector Retrieval Engine
- **File**: `lib/textbooks/src/rag/retrieval/vector-search.ts`
- **Status**: EXISTS and looks complete
- **Action**: Verify it works with HNSW index, test cosine similarity

### Step 4: Build BM25/FTS Retrieval Engine
- **File**: `lib/textbooks/src/rag/retrieval/lexical-search.ts`
- **Status**: EXISTS and looks complete
- **Action**: Uses `plainto_tsquery` with `ts_rank` - verify FTS index exists

### Step 5: Add RRF (Reciprocal Rank Fusion)
- **File**: `lib/textbooks/src/rag/retrieval/rrf.ts`
- **Status**: EXISTS and looks complete
- **Action**: Verify RRF correctly combines vector + lexical results

### Step 6: Add Reranker
- **File**: `lib/textbooks/src/rag/retrieval/reranker.ts`
- **Status**: EXISTS but uses basic prompt-based reranking
- **Action**: Improve with structured output, add timeout handling

### Step 7: Add Metadata/Curriculum Filters
- **File**: `lib/textbooks/src/rag/retrieval/filters.ts`
- **Status**: Need to review
- **Action**: Verify filters support class_id, subject_id, chapter_id, topic_id

### Step 8: Add Parent/Neighbor Expansion
- **File**: `lib/textbooks/src/rag/chunking/chunk-expander.ts`
- **Status**: Need to review
- **Action**: After initial retrieval, expand with parent chunks for more context

### Step 9: Build Grounded Context & Evidence Checks
- **Files**: `lib/textbooks/src/rag/context/context-builder.ts`, `citation-builder.ts`
- **Status**: Need to review
- **Action**: Assemble final context string with citations, implement evidence confidence scoring

### Step 10: Wire `/ai/chat` to New RAG Engine
- **File**: `artifacts/api-server/src/routes/ai-chat.ts`
- **Status**: Currently calls `chatWithBook()` which uses Gemini File Search
- **Action**: Add dual-path support - new pgvector RAG vs Gemini File Search fallback
- **Key**: Add feature flag `USE_CUSTOM_RAG=1` to switch

### Step 11: Keep Gemini File Search as Fallback
- **File**: `artifacts/api-server/src/ai/geminiClient.ts`
- **Action**: Preserve existing `chatWithBook()` function, only use when custom RAG fails

### Step 12: Test Both Paths
- **Action**: Upload PDF → run through new pipeline → verify chunks stored with embeddings → test chat

### Step 13: Migrate Existing Textbook Data
- **File**: `lib/textbooks/src/scripts/migrate-rag-data.ts`
- **Status**: EXISTS - need to review
- **Action**: Migrate existing `rag_chunks` data from old format if needed

### Step 14: Remove Old JSONB RAG
- **Files**: Old `rag-search.ts`, `embeddings.ts` old code paths
- **Action**: Remove after verifying new pipeline works

## Key Files to Modify

### Core RAG Pipeline
1. `lib/textbooks/src/rag/indexer/index-document.ts` - **IMPLEMENT STUB**
2. `lib/textbooks/src/rag/embeddings/embedding-service.ts` - **WIRE GEMINI**
3. `lib/textbooks/src/rag/retrieval/filters.ts` - **VERIFY/ADD**
4. `lib/textbooks/src/rag/chunking/chunk-expander.ts` - **VERIFY/ADD**
5. `lib/textbooks/src/rag/context/context-builder.ts` - **IMPLEMENT**
6. `lib/textbooks/src/rag/generation/grounded-answer.ts` - **IMPLEMENT**

### API Integration
7. `artifacts/api-server/src/routes/ai-chat.ts` - **ADD RAG PIPELINE PATH**
8. `artifacts/api-server/src/routes/ai.ts` (if exists) - **CHECK**
9. `artifacts/api-server/src/ai/geminiClient.ts` - **KEEP AS FALLBACK**

## Database Migrations
- ✅ `0009_rag_v2.sql` exists and creates `rag_chunks` with vector + HNSW
- Need to verify migration is applied to live DB

## Verification Requirements
- [ ] `pnpm run typecheck` passes for all projects
- [ ] `pnpm build` succeeds for API server
- [ ] Upload PDF → worker processes → chunks stored with embeddings
- [ ] Chat endpoint returns citations from pgvector RAG
- [ ] Both RAG paths (custom + Gemini File Search) work

## Rollback Plan
If issues found:
1. Toggle `USE_CUSTOM_RAG=0` to revert to Gemini File Search
2. Old RAG files remain intact until Step 14
