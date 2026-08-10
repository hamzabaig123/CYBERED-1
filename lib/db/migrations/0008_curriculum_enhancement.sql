-- Migration: Enhanced Curriculum System
-- Transforms the curriculum into: Class → Subject → Chapter → Topic → Questions/Notes/PDFs
-- This migration enhances the existing structure without breaking it

----------------------------------------
-- STEP 1: Add metadata columns to existing tables
----------------------------------------

-- Add icon and color theme to subjects
ALTER TABLE subjects 
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📚',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS code TEXT;

-- Add chapter number to chapters for better organization
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS chapter_number INTEGER;

-- Create index on chapter_number for sorting
CREATE INDEX IF NOT EXISTS idx_chapters_chapter_number ON chapters(chapter_number);

----------------------------------------
-- STEP 2: Update topics table to use chapter_id instead of subject_id
----------------------------------------

-- The old topics table has subject_id, but we want: Class → Subject → Chapter → Topic
-- So topics should belong to chapters, not directly to subjects

-- Add chapter_id column
ALTER TABLE topics ADD COLUMN IF NOT EXISTS chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE;

-- Add description column
ALTER TABLE topics ADD COLUMN IF NOT EXISTS description TEXT;

-- For existing topics, we need to map them to chapters
-- Since the old structure had topics directly under subjects, we'll need to either:
-- 1. Create a default chapter for each subject, or
-- 2. Let the admin reorganize manually
-- For now, let's create a default "General" chapter for subjects that have topics but no chapters

-- Create default chapters for subjects that have topics but no chapters
INSERT INTO chapters (subject_id, name, description, order_index, chapter_number)
SELECT DISTINCT 
  t.subject_id,
  'General Topics' as name,
  'Auto-created chapter for existing topics' as description,
  0 as order_index,
  1 as chapter_number
FROM topics t
WHERE NOT EXISTS (
  SELECT 1 FROM chapters c WHERE c.subject_id = t.subject_id
)
AND t.subject_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Now assign topics to their subject's first chapter (or the default "General Topics" chapter)
UPDATE topics t
SET chapter_id = (
  SELECT c.id 
  FROM chapters c 
  WHERE c.subject_id = t.subject_id 
  ORDER BY c.order_index, c.id 
  LIMIT 1
)
WHERE chapter_id IS NULL AND subject_id IS NOT NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_topics_chapter_id ON topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_id ON topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_topics_order_index ON topics(order_index);

-- Note: We'll keep subject_id for now for backwards compatibility
-- It can be removed later once the migration is verified

----------------------------------------
-- STEP 3: Migrate sections to topics (if sections table exists)
----------------------------------------

-- Insert sections as top-level topics under their chapters
-- We need to get subject_id from the chapter
INSERT INTO topics (subject_id, chapter_id, parent_id, name, order_index, is_archived, created_at, updated_at)
SELECT 
  c.subject_id,
  s.chapter_id,
  NULL as parent_id,
  s.name,
  s.order_index,
  s.is_archived,
  s.created_at,
  s.updated_at
FROM sections s
JOIN chapters c ON c.id = s.chapter_id
WHERE NOT EXISTS (
  SELECT 1 FROM topics t 
  WHERE t.chapter_id = s.chapter_id 
  AND t.name = s.name
)
ON CONFLICT DO NOTHING;

----------------------------------------
-- STEP 4: Create MCQ options table (proper normalization)
----------------------------------------

CREATE TABLE IF NOT EXISTS mcq_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique option keys per question
  CONSTRAINT mcq_options_unique_key UNIQUE(question_id, option_key)
);

CREATE INDEX IF NOT EXISTS idx_mcq_options_question_id ON mcq_options(question_id);
CREATE INDEX IF NOT EXISTS idx_mcq_options_is_correct ON mcq_options(is_correct) WHERE is_correct = TRUE;

----------------------------------------
-- STEP 5: Migrate existing MCQ data to options table
----------------------------------------

-- Migrate option A
INSERT INTO mcq_options (question_id, option_key, option_text, is_correct)
SELECT 
  id as question_id,
  'A' as option_key,
  option_a as option_text,
  (correct_option = 'A') as is_correct
FROM questions
WHERE question_type = 'mcq' 
  AND option_a IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM mcq_options mo 
    WHERE mo.question_id = questions.id AND mo.option_key = 'A'
  )
ON CONFLICT DO NOTHING;

-- Migrate option B
INSERT INTO mcq_options (question_id, option_key, option_text, is_correct)
SELECT 
  id, 'B', option_b, (correct_option = 'B')
FROM questions
WHERE question_type = 'mcq' 
  AND option_b IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM mcq_options mo WHERE mo.question_id = questions.id AND mo.option_key = 'B')
ON CONFLICT DO NOTHING;

-- Migrate option C
INSERT INTO mcq_options (question_id, option_key, option_text, is_correct)
SELECT 
  id, 'C', option_c, (correct_option = 'C')
FROM questions
WHERE question_type = 'mcq' 
  AND option_c IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM mcq_options mo WHERE mo.question_id = questions.id AND mo.option_key = 'C')
ON CONFLICT DO NOTHING;

-- Migrate option D
INSERT INTO mcq_options (question_id, option_key, option_text, is_correct)
SELECT 
  id, 'D', option_d, (correct_option = 'D')
FROM questions
WHERE question_type = 'mcq' 
  AND option_d IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM mcq_options mo WHERE mo.question_id = questions.id AND mo.option_key = 'D')
ON CONFLICT DO NOTHING;

----------------------------------------
-- STEP 6: Add topic_id to questions table
----------------------------------------

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);

-- Migrate questions from section_id to topic_id
-- (Assuming sections were migrated to topics in step 3)
UPDATE questions q
SET topic_id = t.id
FROM topics t
JOIN sections s ON s.chapter_id = t.chapter_id AND s.name = t.name
WHERE q.section_id = s.id
  AND q.topic_id IS NULL
  AND EXISTS (SELECT 1 FROM sections WHERE id = q.section_id);

----------------------------------------
-- STEP 7: Create question_sources table for proper references
----------------------------------------

CREATE TABLE IF NOT EXISTS question_sources (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'textbook', 'board_paper', 'past_paper', 'coaching', 'teacher_created', 'ai_generated'
  source_name TEXT, -- e.g., "Sindh Board", "Physics XI Textbook"
  source_year INTEGER,
  page_number INTEGER,
  board TEXT, -- e.g., "Sindh Board", "Federal Board"
  paper_type TEXT, -- e.g., "Annual", "Supply"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_sources_question_id ON question_sources(question_id);
CREATE INDEX IF NOT EXISTS idx_question_sources_type ON question_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_question_sources_year ON question_sources(source_year);

----------------------------------------
-- STEP 8: Create notes table
----------------------------------------

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'rich_text', 'markdown'
  tags JSONB DEFAULT '[]'::JSONB,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON notes(is_archived) WHERE is_archived = FALSE;

-- Full-text search on notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content_tsv tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_notes_content_tsv ON notes USING gin(content_tsv);

----------------------------------------
-- STEP 9: Create documents table (for PDFs and other files)
----------------------------------------

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL, -- Path in object storage
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  page_count INTEGER,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Either topic_id or note_id must be set
  CONSTRAINT documents_has_parent CHECK (topic_id IS NOT NULL OR note_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_documents_topic_id ON documents(topic_id);
CREATE INDEX IF NOT EXISTS idx_documents_note_id ON documents(note_id);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

----------------------------------------
-- STEP 10: Create document_pages table (for PDF processing)
----------------------------------------

CREATE TABLE IF NOT EXISTS document_pages (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT,
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT document_pages_unique_page UNIQUE(document_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_document_pages_document_id ON document_pages(document_id);
CREATE INDEX IF NOT EXISTS idx_document_pages_page_number ON document_pages(page_number);
CREATE INDEX IF NOT EXISTS idx_document_pages_content_tsv ON document_pages USING gin(content_tsv);

----------------------------------------
-- STEP 11: Create document_chunks table (for RAG integration)
----------------------------------------

CREATE TABLE IF NOT EXISTS document_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_length INTEGER NOT NULL,
  embedding_json JSONB,
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT document_chunks_unique_chunk UNIQUE(document_id, page_number, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_page_number ON document_chunks(page_number);
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_tsv ON document_chunks USING gin(content_tsv);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_json ON document_chunks USING gin(embedding_json);

----------------------------------------
-- STEP 12: Create curriculum_statistics view (for dashboards)
----------------------------------------

CREATE OR REPLACE VIEW curriculum_statistics AS
SELECT 
  c.id as class_id,
  c.name as class_name,
  s.id as subject_id,
  s.name as subject_name,
  ch.id as chapter_id,
  ch.name as chapter_name,
  COUNT(DISTINCT t.id) as topic_count,
  COUNT(DISTINCT q.id) FILTER (WHERE q.question_type = 'mcq') as mcq_count,
  COUNT(DISTINCT q.id) FILTER (WHERE q.question_type = 'short') as short_question_count,
  COUNT(DISTINCT q.id) FILTER (WHERE q.question_type = 'long') as long_question_count,
  COUNT(DISTINCT n.id) as note_count,
  COUNT(DISTINCT d.id) as document_count
FROM classes c
LEFT JOIN subjects s ON s.class_id = c.id
LEFT JOIN chapters ch ON ch.subject_id = s.id
LEFT JOIN topics t ON t.chapter_id = ch.id
LEFT JOIN questions q ON q.topic_id = t.id
LEFT JOIN notes n ON n.topic_id = t.id
LEFT JOIN documents d ON d.topic_id = t.id
GROUP BY c.id, c.name, s.id, s.name, ch.id, ch.name;

----------------------------------------
-- STEP 13: Create helper functions
----------------------------------------

-- Function to get topic breadcrumb path
CREATE OR REPLACE FUNCTION get_topic_path(topic_id_param INTEGER)
RETURNS TABLE(
  topic_id INTEGER,
  topic_name TEXT,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE topic_path AS (
    SELECT 
      t.id as topic_id,
      t.name as topic_name,
      0 as depth
    FROM topics t
    WHERE t.id = topic_id_param
    
    UNION ALL
    
    SELECT 
      t.id,
      t.name,
      tp.depth + 1
    FROM topics t
    JOIN topic_path tp ON tp.parent_id = t.id
  )
  SELECT * FROM topic_path
  ORDER BY depth DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all descendants of a topic
CREATE OR REPLACE FUNCTION get_topic_descendants(topic_id_param INTEGER)
RETURNS TABLE(
  topic_id INTEGER,
  topic_name TEXT,
  parent_id INTEGER,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE topic_tree AS (
    SELECT 
      t.id as topic_id,
      t.name as topic_name,
      t.parent_id,
      0 as depth
    FROM topics t
    WHERE t.id = topic_id_param
    
    UNION ALL
    
    SELECT 
      t.id,
      t.name,
      t.parent_id,
      tt.depth + 1
    FROM topics t
    JOIN topic_tree tt ON t.parent_id = tt.topic_id
  )
  SELECT * FROM topic_tree
  ORDER BY depth, topic_name;
END;
$$ LANGUAGE plpgsql;

----------------------------------------
-- STEP 14: Create triggers for updated_at
----------------------------------------

-- Topics trigger
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_topics_updated_at ON topics;
CREATE TRIGGER trigger_update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_topics_updated_at();

-- Notes trigger
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notes_updated_at ON notes;
CREATE TRIGGER trigger_update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();

-- Documents trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_documents_updated_at ON documents;
CREATE TRIGGER trigger_update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- MCQ options trigger
CREATE OR REPLACE FUNCTION update_mcq_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mcq_options_updated_at ON mcq_options;
CREATE TRIGGER trigger_update_mcq_options_updated_at
  BEFORE UPDATE ON mcq_options
  FOR EACH ROW
  EXECUTE FUNCTION update_mcq_options_updated_at();

----------------------------------------
-- STEP 15: Add comments for documentation
----------------------------------------

COMMENT ON TABLE topics IS 'Self-referencing topics table allowing unlimited nesting within chapters';
COMMENT ON TABLE mcq_options IS 'Normalized storage of MCQ options with proper correct answer marking';
COMMENT ON TABLE question_sources IS 'Tracks the source/reference for each question (textbook, past paper, etc.)';
COMMENT ON TABLE notes IS 'Rich text notes attached to topics for study material';
COMMENT ON TABLE documents IS 'PDF and other document files attached to topics or notes';
COMMENT ON TABLE document_pages IS 'Extracted text content from document pages for search';
COMMENT ON TABLE document_chunks IS 'Chunked document content with embeddings for RAG-based retrieval';

COMMENT ON COLUMN subjects.icon IS 'Emoji or icon identifier for the subject';
COMMENT ON COLUMN subjects.color IS 'Hex color code for UI theming';
COMMENT ON COLUMN subjects.code IS 'Short code for the subject (e.g., PHY, CHEM, MATH)';

----------------------------------------
-- MIGRATION COMPLETE
----------------------------------------
-- Summary of changes:
-- 1. Enhanced subjects with icon, color, code
-- 2. Added chapter_number to chapters
-- 3. Created/enhanced topics table with self-referencing structure
-- 4. Created mcq_options table for proper MCQ normalization
-- 5. Migrated existing MCQ data to options table
-- 6. Added topic_id to questions
-- 7. Created question_sources for proper referencing
-- 8. Created notes table for study material
-- 9. Created documents table for PDF storage
-- 10. Created document_pages for PDF text extraction
-- 11. Created document_chunks for RAG integration
-- 12. Added helpful views and functions
-- 13. Set up all necessary indexes and triggers
--
-- Next steps:
-- 1. Run this migration: psql -d cybered -f 0008_curriculum_enhancement.sql
-- 2. Update schema.ts files with new table definitions
-- 3. Build API routes for CRUD operations
-- 4. Create frontend components for curriculum management
