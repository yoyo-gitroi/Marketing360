-- ============================================================
-- Row Level Security Policies
-- All tables are org-scoped via the authenticated user's org_id
-- ============================================================

-- Helper: the current user's org_id
-- Used in policies: (SELECT org_id FROM users WHERE id = auth.uid())

-- ============================================================
-- organizations
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own organization"
  ON organizations FOR UPDATE
  USING (id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- users
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their organization"
  ON users FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert themselves"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- brand_books
-- ============================================================
ALTER TABLE brand_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view brand books"
  ON brand_books FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can create brand books"
  ON brand_books FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update brand books"
  ON brand_books FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete brand books"
  ON brand_books FOR DELETE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- brand_book_sections (join through brand_books for org_id)
-- ============================================================
ALTER TABLE brand_book_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view brand book sections"
  ON brand_book_sections FOR SELECT
  USING (brand_book_id IN (
    SELECT id FROM brand_books WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Org members can create brand book sections"
  ON brand_book_sections FOR INSERT
  WITH CHECK (brand_book_id IN (
    SELECT id FROM brand_books WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Org members can update brand book sections"
  ON brand_book_sections FOR UPDATE
  USING (brand_book_id IN (
    SELECT id FROM brand_books WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Org members can delete brand book sections"
  ON brand_book_sections FOR DELETE
  USING (brand_book_id IN (
    SELECT id FROM brand_books WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

-- ============================================================
-- campaigns
-- ============================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view campaigns"
  ON campaigns FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update campaigns"
  ON campaigns FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete campaigns"
  ON campaigns FOR DELETE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- campaign_stages (join through campaigns for org_id)
-- ============================================================
ALTER TABLE campaign_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view campaign stages"
  ON campaign_stages FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Org members can create campaign stages"
  ON campaign_stages FOR INSERT
  WITH CHECK (campaign_id IN (
    SELECT id FROM campaigns WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Org members can update campaign stages"
  ON campaign_stages FOR UPDATE
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Org members can delete campaign stages"
  ON campaign_stages FOR DELETE
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  ));

-- ============================================================
-- prompt_registry (read-only for authenticated users)
-- ============================================================
ALTER TABLE prompt_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active prompts"
  ON prompt_registry FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- llm_call_log
-- ============================================================
ALTER TABLE llm_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view llm call logs"
  ON llm_call_log FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can create llm call logs"
  ON llm_call_log FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update llm call logs"
  ON llm_call_log FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete llm call logs"
  ON llm_call_log FOR DELETE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- file_uploads
-- ============================================================
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view file uploads"
  ON file_uploads FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can create file uploads"
  ON file_uploads FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can update file uploads"
  ON file_uploads FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Org members can delete file uploads"
  ON file_uploads FOR DELETE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
