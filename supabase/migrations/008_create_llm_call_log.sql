CREATE TABLE llm_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  prompt_key TEXT NOT NULL,
  prompt_version INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_llm_call_log_org_id ON llm_call_log(org_id);
CREATE INDEX idx_llm_call_log_entity ON llm_call_log(related_entity_type, related_entity_id);
