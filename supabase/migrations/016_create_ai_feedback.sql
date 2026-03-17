-- AI Feedback table for RLHF (thumbs up/down on hypotheses and ideas)
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  stage_key TEXT NOT NULL,
  item_index INTEGER NOT NULL,
  item_title TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('hypothesis', 'idea')),
  feedback TEXT NOT NULL CHECK (feedback IN ('thumbs_up', 'thumbs_down')),
  feedback_note TEXT,
  persona TEXT,
  hypothesis_title TEXT,
  ai_model TEXT,
  prompt_version INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, stage_key, item_type, item_index, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_campaign ON ai_feedback(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type ON ai_feedback(item_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_feedback ON ai_feedback(feedback);
