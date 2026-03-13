CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_file_uploads_org_id ON file_uploads(org_id);
CREATE INDEX idx_file_uploads_entity ON file_uploads(related_entity_type, related_entity_id);
