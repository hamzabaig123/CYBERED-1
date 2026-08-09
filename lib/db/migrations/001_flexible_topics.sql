-- Migration: Flexible Topic Tree (chapters -> self-referencing topics)
-- This script replaces the fixed chapters table with a flexible topics table

----------------------------------------
-- STEP 1: Create the topics table
----------------------------------------
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  parent_id INTEGER REFERENCES topics(id),
  name VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for parent_id for efficient tree traversal
CREATE INDEX IF NOT EXISTS idx_topics_parent_id ON topics(parent_id);

-- Create index for subject_id filter (fast "all topics in subject" queries)
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);

----------------------------------------
-- STEP 2: Migrate existing chapters to topics
----------------------------------------
-- Insert all chapters as top-level topics (parentId = NULL)
INSERT INTO topics (subject_id, parent_id, name, order_index, is_archived, created_at, updated_at)
SELECT 
  chapter_id AS subject_id,  -- Note: chapters.chapter_id contains the subject ID
  NULL AS parent_id,          -- Top-level topics
  name,
  order_index,
  is_archived,
  created_at,
  updated_at
FROM chapters
ON CONFLICT DO NOTHING;

-- If chapters table uses different column names, use this alternative:
-- INSERT INTO topics (subject_id, parent_id, name, order_index, is_archived, created_at, updated_at)
-- SELECT 
--   chapter_id AS subject_id,
--   NULL AS parent_id,
--   name,
--   COALESCE(order_index, 0) AS order_index,
--   COALESCE(is_archived, false) AS is_archived,
--   COALESCE(created_at, NOW()) AS created_at,
--   COALESCE(updated_at, NOW()) AS updated_at
-- FROM chapters
-- ON CONFLICT DO NOTHING;

----------------------------------------
-- STEP 3: Update sections table to reference topics
----------------------------------------
-- First, create a mapping of old chapter IDs to new topic IDs
-- This assumes chapters.id = topics.id for migrated records
-- You may need to adjust based on your actual data

ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id);

-- Populate topic_id based on chapter_id match
UPDATE sections s
SET topic_id = t.id
FROM chapters c
JOIN topics t ON t.name = c.name AND t.subject_id = c.subject_id
WHERE s.chapter_id = c.id
  AND s.topic_id IS NULL;

-- Optional: After verifying migration, you can drop the chapter_id column
-- ALTER TABLE sections DROP COLUMN IF EXISTS chapter_id;

----------------------------------------
-- STEP 4: Update questions table to reference topics
----------------------------------------
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id);

-- Populate topic_id based on chain: question -> section -> chapter -> topic
UPDATE questions q
SET topic_id = t.id
FROM sections s
JOIN topics t ON t.name = s.name AND t.subject_id = (
  SELECT c.subject_id FROM chapters c WHERE c.id = s.chapter_id
)
WHERE q.section_id = s.id
  AND q.topic_id IS NULL;

----------------------------------------
-- STEP 5: Create helper view for topic hierarchy
----------------------------------------
CREATE OR REPLACE VIEW topic_hierarchy AS
SELECT 
  t1.id AS topic_id,
  t1.name AS topic_name,
  t1.subject_id,
  t1.parent_id,
  t1.order_index,
  ARRAY[t1.id] AS path,
  ARRAY[t1.name] AS path_names,
  t1.is_archived,
  t1.created_at,
  0 AS depth
FROM topics t1
WHERE t1.parent_id IS NULL

UNION ALL

SELECT 
  t2.id AS topic_id,
  t2.name AS topic_name,
  t2.subject_id,
  t2.parent_id,
  t2.order_index,
  th.path || t2.id AS path,
  th.path_names || t2.name AS path_names,
  t2.is_archived,
  t2.created_at,
  th.depth + 1
FROM topics t2
JOIN topic_hierarchy th ON t2.parent_id = th.topic_id;

----------------------------------------
-- STEP 6: Create helper function for getting all descendants
----------------------------------------
-- Usage: SELECT * FROM get_topic_descendants(123);
-- Returns all descendant topics (including self) for a given topic ID

CREATE OR REPLACE FUNCTION get_topic_descendants(topic_id_param INTEGER)
RETURNS TABLE(
  id INTEGER,
  name VARCHAR(255),
  subject_id INTEGER,
  parent_id INTEGER,
  order_index INTEGER,
  is_archived BOOLEAN,
  depth INTEGER,
  path INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE topic_tree AS (
    SELECT 
      id, name, subject_id, parent_id, order_index, is_archived,
      0 AS depth,
      ARRAY[id] AS path
    FROM topics
    WHERE id = topic_id_param
    
    UNION ALL
    
    SELECT 
      t.id, t.name, t.subject_id, t.parent_id, t.order_index, t.is_archived,
      tt.depth + 1,
      tt.path || t.id
    FROM topics t
    JOIN topic_tree tt ON t.parent_id = tt.id
  )
  SELECT * FROM topic_tree
  ORDER BY depth, order_index;
END;
$$ LANGUAGE plpgsql;

----------------------------------------
-- STEP 7: Create trigger for updated_at
----------------------------------------
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_topics_updated_at
BEFORE UPDATE ON topics
FOR EACH ROW
EXECUTE FUNCTION update_topics_updated_at();

----------------------------------------
-- STEP 8: Drop old chapters table (optional - only after verification)
----------------------------------------
-- WARNING: Uncomment these lines only after verifying the migration is correct
-- DROP TABLE IF EXISTS chapters CASCADE;

----------------------------------------
-- MIGRATION COMPLETE
----------------------------------------
-- Next steps:
-- 1. Update your API code to use topicsTable instead of chaptersTable
-- 2. Update sections table to drop chapter_id column (after verifying topic_id is populated)
-- 3. Update questions table to drop section_id if you want to reference topics directly
-- 4. Test the new hierarchical topic structure