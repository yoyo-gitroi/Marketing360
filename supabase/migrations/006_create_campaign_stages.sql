CREATE TABLE campaign_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  stage_key TEXT NOT NULL,
  stage_number INTEGER NOT NULL,
  user_input JSONB NOT NULL DEFAULT '{}',
  ai_generated JSONB DEFAULT '{}',
  final_content JSONB DEFAULT '{}',
  ai_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, stage_key)
);
CREATE INDEX idx_campaign_stages_campaign_id ON campaign_stages(campaign_id);
