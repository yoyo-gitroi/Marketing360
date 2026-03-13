CREATE TABLE brand_book_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_book_id UUID REFERENCES brand_books(id) ON DELETE CASCADE NOT NULL,
  section_key TEXT NOT NULL,
  user_input JSONB NOT NULL DEFAULT '{}',
  ai_generated JSONB DEFAULT '{}',
  final_content JSONB DEFAULT '{}',
  ai_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_book_id, section_key)
);
CREATE INDEX idx_brand_book_sections_book_id ON brand_book_sections(brand_book_id);
