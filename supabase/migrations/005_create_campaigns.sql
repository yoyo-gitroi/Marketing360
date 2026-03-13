CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  brand_book_id UUID REFERENCES brand_books(id),
  name TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_stage INTEGER DEFAULT 1,
  uploaded_brand_book_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_brand_book_id ON campaigns(brand_book_id);
