-- ============================================================
-- Disable Row Level Security on all tables.
--
-- Auth is now handled by NextAuth.js (Google OAuth + JWT).
-- All DB operations use the service role key from API routes.
-- RLS is no longer needed and was causing infinite recursion
-- and blocking operations for users without proper users rows.
-- ============================================================

-- Drop all existing policies first, then disable RLS

-- organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Users can view members of their organization" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- org_members
DROP POLICY IF EXISTS "Org members can view members" ON org_members;
DROP POLICY IF EXISTS "Org members can manage members" ON org_members;
ALTER TABLE org_members DISABLE ROW LEVEL SECURITY;

-- brand_books
DROP POLICY IF EXISTS "Org members can view brand books" ON brand_books;
DROP POLICY IF EXISTS "Org members can create brand books" ON brand_books;
DROP POLICY IF EXISTS "Org members can update brand books" ON brand_books;
DROP POLICY IF EXISTS "Org members can delete brand books" ON brand_books;
ALTER TABLE brand_books DISABLE ROW LEVEL SECURITY;

-- brand_book_sections
DROP POLICY IF EXISTS "Org members can view brand book sections" ON brand_book_sections;
DROP POLICY IF EXISTS "Org members can create brand book sections" ON brand_book_sections;
DROP POLICY IF EXISTS "Org members can update brand book sections" ON brand_book_sections;
DROP POLICY IF EXISTS "Org members can delete brand book sections" ON brand_book_sections;
ALTER TABLE brand_book_sections DISABLE ROW LEVEL SECURITY;

-- campaigns
DROP POLICY IF EXISTS "Org members can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Org members can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Org members can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Org members can delete campaigns" ON campaigns;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

-- campaign_stages
DROP POLICY IF EXISTS "Org members can view campaign stages" ON campaign_stages;
DROP POLICY IF EXISTS "Org members can create campaign stages" ON campaign_stages;
DROP POLICY IF EXISTS "Org members can update campaign stages" ON campaign_stages;
DROP POLICY IF EXISTS "Org members can delete campaign stages" ON campaign_stages;
ALTER TABLE campaign_stages DISABLE ROW LEVEL SECURITY;

-- prompt_registry
DROP POLICY IF EXISTS "Authenticated users can view active prompts" ON prompt_registry;
ALTER TABLE prompt_registry DISABLE ROW LEVEL SECURITY;

-- llm_call_log
DROP POLICY IF EXISTS "Org members can view llm call logs" ON llm_call_log;
DROP POLICY IF EXISTS "Org members can create llm call logs" ON llm_call_log;
DROP POLICY IF EXISTS "Org members can update llm call logs" ON llm_call_log;
DROP POLICY IF EXISTS "Org members can delete llm call logs" ON llm_call_log;
ALTER TABLE llm_call_log DISABLE ROW LEVEL SECURITY;

-- file_uploads
DROP POLICY IF EXISTS "Org members can view file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Org members can create file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Org members can update file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Org members can delete file uploads" ON file_uploads;
ALTER TABLE file_uploads DISABLE ROW LEVEL SECURITY;
