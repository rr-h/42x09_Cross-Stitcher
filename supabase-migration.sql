-- Cross-Stitcher Pattern Sync Database Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- ============================================================================
-- TABLE: patterns
-- Stores pattern definitions for cross-device sync
-- ============================================================================

CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  palette JSONB NOT NULL,
  targets_b64 TEXT NOT NULL,
  meta JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS patterns_user_id_updated_at_idx
  ON patterns(user_id, updated_at DESC);

-- Enable Row Level Security
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid duplicate policy errors)
DROP POLICY IF EXISTS "Users can read own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can insert own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can update own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can delete own patterns" ON patterns;

-- RLS Policies for patterns table
CREATE POLICY "Users can read own patterns"
  ON patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON patterns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
  ON patterns FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: pattern_progress
-- Stores user progress for each pattern
-- ============================================================================

CREATE TABLE IF NOT EXISTS pattern_progress (
  pattern_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stitched_state_b64 TEXT NOT NULL,
  placed_colors_b64 TEXT NOT NULL,
  palette_counts JSONB NOT NULL,
  last_selected_palette_index INTEGER,
  viewport JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pattern_id, user_id)
);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS pattern_progress_user_id_updated_at_idx
  ON pattern_progress(user_id, updated_at DESC);

-- Enable Row Level Security
ALTER TABLE pattern_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid duplicate policy errors)
DROP POLICY IF EXISTS "Users can read own progress" ON pattern_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON pattern_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON pattern_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON pattern_progress;

-- RLS Policies for pattern_progress table
CREATE POLICY "Users can read own progress"
  ON pattern_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON pattern_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON pattern_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON pattern_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Automatically update timestamps on updates
-- ============================================================================

DROP TRIGGER IF EXISTS update_patterns_updated_at ON patterns;
CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pattern_progress_updated_at ON pattern_progress;
CREATE TRIGGER update_pattern_progress_updated_at
  BEFORE UPDATE ON pattern_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run these to verify the migration was successful:
-- SELECT * FROM patterns LIMIT 1;
-- SELECT * FROM pattern_progress LIMIT 1;
