-- Migration: RAG 2.0 Knowledge Engine
-- Creates pgvector tables and migrates existing data

-- Enable pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create RAG Chunks table
CREATE TABLE IF NOT EXISTS rag_chunks (
  id SERIAL PRIMARY KEY,
  file_asset_id INTEGER NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
  
  class_id INTEGER REFERENCES classes(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  chapter_id INTEGER REFERENCES chapters(id),
  topic_id INTEGER REFERENCES topics(id),
  
  parent_chunk_id INTEGER REFERENCES rag_chunks(id),
  chunk_type VARCHAR(50) NOT NULL DEFAULT 'paragraph',
  chunk_depth INTEGER NOT NULL DEFAULT 0,
  
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  
  embedding vector(768),
  embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-004',
  embedding_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  page_number INTEGER,
  page_start INTEGER,
  page_end INTEGER,
  
  chapter_title TEXT,
  section_title TEXT,
  topic_title TEXT,
  
  language VARCHAR(10) DEFAULT 'en',
  document_type VARCHAR(50) DEFAULT 'textbook',
  board VARCHAR(50),
  academic_year INTEGER,
  
  token_count INTEGER,
  char_count INTEGER NOT NULL,
  
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(content_hash, file_asset_id)
);

-- HNSW Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw 
ON rag_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_file_asset ON rag_chunks(file_asset_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_subject ON rag_chunks(subject_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_content_tsv ON rag_chunks USING gin(content_tsv);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_rag_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rag_chunks_updated_at ON rag_chunks;
CREATE TRIGGER rag_chunks_updated_at
  BEFORE UPDATE ON rag_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_chunks_updated_at();

-- Optional: Migrate existing embeddings from textbook_chunks
-- INSERT INTO rag_chunks (
--   file_asset_id, subject_id, chunk_type, content, content_hash, 
--   embedding, embedding_status, page_number, section_title, char_count
-- )
-- SELECT 
--   file_asset_id, subject_id, chunk_type, content, 
--   encode(digest(content, 'sha256'), 'hex'), -- Requires pgcrypto
--   embedding_json::text::vector, 'completed', page_number, section_title, content_length
-- FROM textbook_chunks
-- WHERE embedding_json IS NOT NULL AND embedding_json::text != '[0,0,0,0...]';
