-- Task 1A: Domain-based organization creation
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;

-- Task 1B: User onboarding profile questions
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_usage TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Task 1D: Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);

-- Add client_id to brand_books and campaigns
ALTER TABLE brand_books ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Task 4: Campaign outputs table
CREATE TABLE IF NOT EXISTS campaign_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  generated_by UUID REFERENCES users(id) NOT NULL,
  output_content JSONB NOT NULL DEFAULT '{}',
  output_type TEXT NOT NULL DEFAULT 'full_campaign',
  ai_model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  status TEXT NOT NULL DEFAULT 'generating',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_outputs_campaign ON campaign_outputs(campaign_id);
