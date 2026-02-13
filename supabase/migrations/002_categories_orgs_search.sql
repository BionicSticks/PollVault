-- ============================================================================
-- PollVault: Categories, Organisations, Search & Duplicate Prevention
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE org_role AS ENUM ('member', 'admin');

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Categories for poll discovery
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  position INT NOT NULL DEFAULT 0
);

-- Tags for flexible labelling
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- Poll ↔ Tag join table
CREATE TABLE poll_tags (
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, tag_id)
);

-- Organisations for institutional polling
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organisation membership
CREATE TABLE org_members (
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  PRIMARY KEY (org_id, user_id)
);

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

ALTER TABLE polls ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE polls ADD COLUMN org_id UUID REFERENCES organisations(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Category/org lookups on polls
CREATE INDEX idx_polls_category_id ON polls(category_id);
CREATE INDEX idx_polls_org_id ON polls(org_id);

-- Tag lookups
CREATE INDEX idx_poll_tags_tag_id ON poll_tags(tag_id);

-- Trigram index for similarity search on poll titles
CREATE INDEX idx_polls_title_trgm ON polls USING gin (title gin_trgm_ops);

-- Full-text search index
ALTER TABLE polls ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX idx_polls_search ON polls USING gin (search_vector);

-- Organisation slug lookups
CREATE INDEX idx_organisations_slug ON organisations(slug);
CREATE INDEX idx_organisations_owner ON organisations(owner_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Check for similar poll titles (duplicate prevention)
CREATE OR REPLACE FUNCTION check_poll_similarity(p_title TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, similarity(p.title, p_title) AS similarity_score
  FROM polls p
  WHERE p.status = 'active'
    AND similarity(p.title, p_title) > 0.4
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read, admins can manage
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tags: everyone can read, admins can manage
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT USING (true);
CREATE POLICY "Admins can insert tags"
  ON tags FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update tags"
  ON tags FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Poll tags: everyone can read, poll creators can manage
CREATE POLICY "Poll tags are viewable by everyone"
  ON poll_tags FOR SELECT USING (true);
CREATE POLICY "Poll creators can add tags"
  ON poll_tags FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM polls WHERE id = poll_id AND creator_id = auth.uid())
  );
CREATE POLICY "Poll creators can remove tags"
  ON poll_tags FOR DELETE USING (
    EXISTS (SELECT 1 FROM polls WHERE id = poll_id AND creator_id = auth.uid())
  );

-- Organisations: everyone can read, authenticated users can create
CREATE POLICY "Organisations are viewable by everyone"
  ON organisations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create organisations"
  ON organisations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Org owners can update their organisation"
  ON organisations FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Org owners can delete their organisation"
  ON organisations FOR DELETE USING (auth.uid() = owner_id);

-- Org members: members can view, org admins/owners can manage
CREATE POLICY "Org members can view membership"
  ON org_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM organisations WHERE id = org_members.org_id AND owner_id = auth.uid())
  );
CREATE POLICY "Org owners and admins can add members"
  ON org_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organisations WHERE id = org_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role = 'admin')
  );
CREATE POLICY "Org owners and admins can remove members"
  ON org_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM organisations WHERE id = org_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role = 'admin')
  );

-- ============================================================================
-- SEED CATEGORIES
-- ============================================================================

INSERT INTO categories (name, slug, description, position) VALUES
  ('Politics',       'politics',       'Government, policy, and elections',          1),
  ('Technology',     'technology',     'Software, hardware, and digital trends',     2),
  ('Science',        'science',        'Research, discoveries, and the natural world', 3),
  ('Health',         'health',         'Medicine, wellness, and public health',      4),
  ('Sports',         'sports',         'Athletics, competitions, and fitness',       5),
  ('Entertainment',  'entertainment',  'Movies, music, TV, and pop culture',         6),
  ('Education',      'education',      'Learning, schools, and academic topics',     7),
  ('Environment',    'environment',    'Climate, sustainability, and ecology',       8),
  ('Economy',        'economy',        'Markets, finance, and economic policy',      9),
  ('Social Issues',  'social-issues',  'Equality, justice, and societal debates',   10);
