-- Store scraped website data for brand books
CREATE TABLE IF NOT EXISTS scraped_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_book_id UUID REFERENCES brand_books(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  scraped_text TEXT,
  images JSONB DEFAULT '[]',
  fonts JSONB DEFAULT '[]',
  colors JSONB DEFAULT '{}',
  additional_pages JSONB DEFAULT '[]',
  raw_html TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up by brand book
CREATE INDEX IF NOT EXISTS idx_scraped_data_brand_book ON scraped_data(brand_book_id);
