-- Pending invites table for team member invitations
CREATE TABLE IF NOT EXISTS pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_pending_invites_org_id ON pending_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(email);
