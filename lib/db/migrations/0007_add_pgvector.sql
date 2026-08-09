-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create textbook_chunks table for RAG
CREATE TABLE IF NOT EXISTS textbook_chunks (
  id SERIAL PRIMARY KEY,
  file_asset_id INTEGER NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  
  -- Chunk metadata
  chunk_type VARCHAR(50) NOT NULL DEFAULT 'page', -- 'page', 'section', 'paragraph'
  page_number INTEGER NOT NULL,
  section_title TEXT,
  
  -- Content
  content TEXT NOT NULL,
  content_length INTEGER NOT NULL,
  
  -- Embedding (768 dimensions for Gemini text-embedding-004)
  embedding vector(768),
  
  -- Full-text search
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT textbook_chunks_content_length_check CHECK (content_length > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_textbook_chunks_file_asset ON textbook_chunks(file_asset_id);
CREATE INDEX IF NOT EXISTS idx_textbook_chunks_subject ON textbook_chunks(subject_id);
CREATE INDEX IF NOT EXISTS idx_textbook_chunks_page ON textbook_chunks(page_number);
CREATE INDEX IF NOT EXISTS idx_textbook_chunks_embedding ON textbook_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_textbook_chunks_content_tsv ON textbook_chunks USING gin(content_tsv);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_textbook_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS textbook_chunks_updated_at ON textbook_chunks;
CREATE TRIGGER textbook_chunks_updated_at
  BEFORE UPDATE ON textbook_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_textbook_chunks_updated_at();

-- Add processing metadata to file_assets table
ALTER TABLE file_assets 
  ADD COLUMN IF NOT EXISTS chunks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embeddings_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP;

-- Create index on rag_indexed_at
CREATE INDEX IF NOT EXISTS idx_file_assets_rag_indexed ON file_assets(rag_indexed_at) WHERE rag_indexed_at IS NOT NULL;

-- Add comment
COMMENT ON TABLE textbook_chunks IS 'Stores chunked textbook content with vector embeddings for RAG-based search and retrieval';
