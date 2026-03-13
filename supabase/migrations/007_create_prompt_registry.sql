CREATE TABLE prompt_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER DEFAULT 4096,
  temperature FLOAT DEFAULT 0.7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(prompt_key, version)
);
CREATE INDEX idx_prompt_registry_key ON prompt_registry(prompt_key);
CREATE INDEX idx_prompt_registry_active ON prompt_registry(is_active);
