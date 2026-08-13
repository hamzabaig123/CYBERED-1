export * from "./storage";
export * from "./search";
export * from "./pipeline";
export * from "./extract";
export * from "./virusScan";

// --- Frozen: DIY pgvector RAG pipeline (Option B in MIGRATION_PLAN.md) ---
// The following modules are preserved for a future custom pgvector/embeddings pipeline.
// They are NOT currently wired into the live API — the live path uses Gemini File Search.
// Re-enable these exports (and the ai-rag.ts route + rag-processor-job.ts worker)
// only if Option B is actively being built:
//   export * from "./rag-processor";
//   export * from "./rag-indexer";
//   export * from "./rag-search";
//   export * from "./embeddings";
