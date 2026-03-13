CREATE TABLE brand_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_step INTEGER DEFAULT 1,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_brand_books_org_id ON brand_books(org_id);
CREATE INDEX idx_brand_books_status ON brand_books(status);
