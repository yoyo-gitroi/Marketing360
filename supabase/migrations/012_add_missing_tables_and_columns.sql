-- Add missing columns to brand_books
ALTER TABLE brand_books ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add missing columns to brand_book_sections
ALTER TABLE brand_book_sections ADD COLUMN IF NOT EXISTS step_number INTEGER;
ALTER TABLE brand_book_sections ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE brand_book_sections ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE brand_book_sections ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE brand_book_sections ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Add missing columns to campaign_stages
ALTER TABLE campaign_stages ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE campaign_stages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE campaign_stages ADD COLUMN IF NOT EXISTS content TEXT;

-- Create org_members table
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_key TEXT NOT NULL,
  active_version INTEGER NOT NULL DEFAULT 1,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, prompt_key)
);

-- Create prompt_versions table
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);

-- RLS for org_members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own org memberships"
  ON org_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read members of their org"
  ON org_members FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));

-- RLS for prompt_templates
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read prompt templates for their org"
  ON prompt_templates FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Admins can manage prompt templates"
  ON prompt_templates FOR ALL
  USING (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner')
  ));

-- RLS for prompt_versions
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read prompt versions for their org"
  ON prompt_versions FOR SELECT
  USING (prompt_id IN (
    SELECT pt.id FROM prompt_templates pt
    WHERE pt.org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  ));

CREATE POLICY "Admins can manage prompt versions"
  ON prompt_versions FOR ALL
  USING (prompt_id IN (
    SELECT pt.id FROM prompt_templates pt
    WHERE pt.org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner')
    )
  ));
