# Marketing 360 App — PRD & Architecture

**Status:** Draft
**Author:** Yash (AI PM, Agentic.it)
**Last Updated:** 2026-03-13
**Scope:** Full-stack web application with two agentic systems (Brand Book Creator + Campaign Creator) for marketing agencies. Covers auth, data model, multi-step form flows, LLM processing, PDF generation, and campaign orchestration. Does NOT cover billing, analytics dashboards, or white-labeling.

---

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-03-13 | Yash | Initial draft from Avalok's process + Campaign 360 Framework |

---

## Assumptions & Inferences

> **Assumed:** Tech stack is Next.js 14+ (App Router) + Supabase (Auth, Postgres, Storage). **Basis:** Yash's existing stack at Agentic.it. **Override if:** Different stack preferred.

> **Assumed:** LLM calls use Anthropic Claude API (claude-sonnet-4-20250514 for processing, claude-opus-4-6 for final brand story / campaign hypothesis generation). **Basis:** Primary LLM in Yash's workflow. **Override if:** Need multi-model support.

> **Assumed:** PDF generation uses server-side rendering (Puppeteer or react-pdf). **Basis:** Brand book output needs professional formatting. **Override if:** Client-side PDF is acceptable.

> **Assumed:** Multi-tenant — each agency is an "organization" with multiple users. **Basis:** "marketing agency logs in" implies team access. **Override if:** single-user only.

> **Assumed:** Prompts are stored in DB and versioned so they can be iterated without code deploys. **Basis:** Yash explicitly wants "prompt storage and data processing." **Override if:** Hardcoded prompts are acceptable.

> **Assumed:** Campaign Creator is a multi-step wizard (not a single-form submission). **Basis:** "multi step process" from Yash + Avalok's 6-stage process. **Override if:** Single-step preferred.

---

## Problem Statement

Marketing agencies currently build brand books and campaign strategies manually — pulling information from scattered founder interviews, competitor research, social media audits, and category reports. The process depends heavily on senior creative talent (like Avalok) who carry the methodology in their heads. There is no structured system that captures the full input framework, runs it through a consistent creative process, and produces professional deliverables. This app replaces that with a guided, AI-assisted workflow that any strategist at the agency can use to produce brand books and 360° campaign plans at a consistent quality bar.

---

## System Context

```
┌─────────────────────────────────────────────────────────────┐
│                     MARKETING 360 APP                        │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  Next.js  │───▶│  Supabase    │    │  Anthropic API    │  │
│  │  Frontend │    │  - Auth      │    │  (Claude Sonnet/  │  │
│  │  (App     │    │  - Postgres  │    │   Opus)           │  │
│  │   Router) │    │  - Storage   │    └───────────────────┘  │
│  └──────────┘    │  - Edge Fn   │              ▲             │
│       │          └──────────────┘              │             │
│       │                 │            ┌─────────┴──────────┐  │
│       │                 │            │  LLM Orchestrator   │  │
│       │                 │            │  (Next.js API       │  │
│       │                 │            │   Routes / Edge)    │  │
│       ▼                 ▼            └────────────────────┘  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  PDF Gen  │    │  File Upload │    │  Prompt Registry   │  │
│  │  Service  │    │  (Supabase   │    │  (Supabase DB)     │  │
│  │  (Puppeteer│   │   Storage)   │    └───────────────────┘  │
│  │  /react-  │    └──────────────┘                           │
│  │   pdf)    │                                               │
│  └──────────┘                                                │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**

```
User Input (Forms) → Supabase Postgres (raw data)
                   → LLM Orchestrator (processes section by section)
                   → Supabase Postgres (generated content)
                   → PDF Generator (renders final document)
                   → Supabase Storage (stores PDF)
                   → User (downloads/views PDF)

Brand Book PDF → Campaign Creator (as structured input, not raw PDF re-parse)
```

**Auth:** Supabase Auth with email/password + optional Google OAuth. Row-Level Security (RLS) on all tables — users only see their organization's data.

**Key architectural note:** When a Brand Book is "passed" to Campaign Creator, the system passes the structured data from the brand_books table — NOT the PDF. The PDF is an output artifact. The structured data is the working input.

---

## Design Goals

**Modularity:** Brand Book and Campaign are independent systems that share a data layer. Either can be used standalone. Campaign can accept a brand book from the DB OR a manually uploaded PDF (parsed via LLM).

**Progressive Save:** Every form step auto-saves to Supabase. Users can leave mid-flow and resume. No data loss on browser close.

**Prompt Versioning:** All LLM prompts are stored in `prompt_registry` table with version numbers. Changing a prompt does not require a code deploy. Old versions are retained for audit.

**Structured Over Freeform:** Forms use structured fields (dropdowns, tagged inputs, structured text areas) wherever possible. Freeform text is a last resort. This produces cleaner LLM inputs and more consistent outputs.

**Human-in-the-Loop:** LLM outputs are ALWAYS presented for review before being finalized. The user can edit, regenerate, or override any AI-generated section.

**Error & Logging Convention:**
- `fatal` — LLM call fails after 3 retries, PDF generation crashes
- `error` — single section generation fails, file upload fails
- `warning` — LLM output flagged as low-confidence, missing optional field
- `info` — step completed, section generated, PDF exported

Required log fields: timestamp (ISO 8601), severity, step_id (e.g., `BB-3` for brand book step 3), org_id, user_id, message.

---

## Data Model

### Core Tables

```sql
-- Organizations (multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Books
CREATE TABLE brand_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL, -- e.g., "Hampi Pure Brand Book"
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
    -- Values: draft, in_progress, review, approved, archived
  current_step INTEGER DEFAULT 1,
  pdf_url TEXT, -- Supabase Storage URL after generation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Book Sections (one row per section per brand book)
CREATE TABLE brand_book_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_book_id UUID REFERENCES brand_books(id) ON DELETE CASCADE NOT NULL,
  section_key TEXT NOT NULL,
    -- Values: brand_identity, mission_vision, values_pillars,
    --   visual_identity, typography, color_palette, imagery,
    --   voice_tone, messaging, target_audience, personas,
    --   product_info, competitive_landscape, pricing_packaging,
    --   existing_campaigns, social_presence, digital_assets,
    --   legal_compliance, content_guidelines, content_pillars,
    --   founder_interview, competition_india, competition_global,
    --   usp_positioning, brand_story_draft
  user_input JSONB NOT NULL DEFAULT '{}',  -- raw form data
  ai_generated JSONB DEFAULT '{}',         -- LLM output
  final_content JSONB DEFAULT '{}',        -- user-approved version
  ai_status TEXT DEFAULT 'pending',
    -- Values: pending, generating, generated, approved, error
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_book_id, section_key)
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  brand_book_id UUID REFERENCES brand_books(id), -- nullable if uploaded PDF
  name TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
    -- Values: draft, brief_complete, research_complete,
    --   hypothesis_ready, ideation_complete, feasibility_checked,
    --   output_ready, approved, archived
  current_stage INTEGER DEFAULT 1,
  uploaded_brand_book_url TEXT, -- if PDF uploaded instead of DB link
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Stages (one row per stage per campaign)
CREATE TABLE campaign_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  stage_key TEXT NOT NULL,
    -- Values: campaign_brief, brand_reference, market_research,
    --   customer_intelligence, platform_channel, historical_data,
    --   resources_execution, hypothesis, ideation, feasibility,
    --   campaign_output
  stage_number INTEGER NOT NULL,
  user_input JSONB NOT NULL DEFAULT '{}',
  ai_generated JSONB DEFAULT '{}',
  final_content JSONB DEFAULT '{}',
  ai_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, stage_key)
);

-- Prompt Registry (versioned prompts)
CREATE TABLE prompt_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL,
    -- e.g., 'brand_book.brand_story', 'brand_book.usp_reframe',
    --   'campaign.hypothesis', 'campaign.ideation', 'campaign.tagline'
  version INTEGER NOT NULL DEFAULT 1,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,  -- uses {{variable}} placeholders
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER DEFAULT 4096,
  temperature FLOAT DEFAULT 0.7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(prompt_key, version)
);

-- LLM Call Log (audit trail)
CREATE TABLE llm_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  prompt_key TEXT NOT NULL,
  prompt_version INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL, -- 'success', 'error', 'timeout'
  error_message TEXT,
  related_entity_type TEXT, -- 'brand_book' or 'campaign'
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Uploads
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'pptx', 'image', 'doc'
  storage_path TEXT NOT NULL, -- Supabase Storage path
  related_entity_type TEXT, -- 'brand_book', 'campaign', 'general'
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security

```sql
-- All tables get org-scoped RLS
ALTER TABLE brand_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org brand books"
  ON brand_books FOR ALL
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Same pattern for: campaigns, campaign_stages, brand_book_sections,
--   file_uploads, llm_call_log
```

---

## Out of Scope

- Billing / subscription management
- Analytics dashboard (campaign performance tracking)
- White-labeling / custom domains
- Real-time collaboration (Google Docs-style)
- Integration with Meta Ads Library, Amazon, or other external research APIs (manual input for now)
- Automated competitor scraping
- Email / Slack notifications
- Mobile-native apps (responsive web only)

---

## Phases & Epics

### Phase 1 — Foundation + Brand Book Creator
**Rationale:** The brand book is the upstream input to everything. Building it first establishes the data model, auth, file handling, and LLM orchestration patterns that Phase 2 reuses. An agency can start getting value from brand book creation alone.

- **Epic 1:** Auth & Organization Setup
- **Epic 2:** Brand Book — Form Flow (Data Collection)
- **Epic 3:** Brand Book — LLM Processing Pipeline
- **Epic 4:** Brand Book — PDF Generation & Export

### Phase 2 — Campaign Creator
**Rationale:** Campaign Creator depends on brand book data and reuses the same form → LLM → output pattern. The multi-stage wizard is more complex, with a hypothesis stage and ideation room that are unique to campaigns.

- **Epic 5:** Campaign — Brief & Brand Reference (Stages 1-2)
- **Epic 6:** Campaign — Research & Intelligence (Stages 3-6)
- **Epic 7:** Campaign — Hypothesis & Ideation (Stages 7-8) — *The Avalok stages*
- **Epic 8:** Campaign — Feasibility & Output (Stages 9-10)

### Phase 3 — Polish & Prompt Management
**Rationale:** Once both systems work end-to-end, add the prompt management UI and refinement features.

- **Epic 9:** Prompt Registry UI (view, edit, version prompts)
- **Epic 10:** Dashboard & Project Management (list all brand books, campaigns, status)

---

## User Stories

---

### Epic 1 — Auth & Organization Setup

---

#### US-1.1 — Agency signs up and creates organization

**As a** marketing agency owner
**I want to** sign up with email/password or Google OAuth and create an organization
**So that** my team has a shared workspace for all brand books and campaigns

**Priority:** Must Have
**Depends on:** None
**Constraints:** Supabase Auth handles the auth flow. Organization is created in a post-signup trigger. Slug must be unique and URL-safe.

**Input:**
```json
{
  "email": "yash@agency.com",
  "password": "...",
  "full_name": "Yash",
  "org_name": "SLATE Studio"
}
```

**Output:**
```json
{
  "user_id": "uuid",
  "org_id": "uuid",
  "org_slug": "slate-studio",
  "role": "owner"
}
```

**Acceptance Criteria:**

✅ **Positive:** User signs up, org is created, user is assigned role `owner`. Redirect to dashboard.
✅ **Positive:** Google OAuth creates user + org in one flow.

❌ **Negative:** Duplicate email returns "Account already exists" with login link.
❌ **Negative:** Duplicate org slug appends a random 4-char suffix.

⚠️ **Non-functional:** Signup-to-dashboard in <3s.

---

#### US-1.2 — Invite team members to organization

**As an** agency owner
**I want to** invite team members by email
**So that** my strategists and creatives can create brand books and campaigns under our org

**Priority:** Should Have
**Depends on:** US-1.1
**Constraints:** Invite via Supabase Auth magic link or email invite. Invited user joins the existing org, not a new one.

**Acceptance Criteria:**

✅ **Positive:** Owner sends invite email. Recipient signs up and is auto-assigned to the org with role `member`.

❌ **Negative:** Invite to already-registered user shows "User already in an organization" error.

---

### Epic 2 — Brand Book — Form Flow (Data Collection)

The brand book form is divided into 8 steps, mapping to the 360 Framework's structure + Avalok's research process. Each step auto-saves to `brand_book_sections`.

**Step Map:**

| Step | Section Key | Form Content | Source Framework |
|------|-------------|-------------|-----------------|
| 1 | `brand_identity` | Brand name, tagline, brand story/origin, mission, vision, brand promise | 360 Framework A5-A10 |
| 2 | `values_pillars` | Core values, brand pillars, differentiation statement | 360 Framework A11-A13 |
| 3 | `visual_identity` | Logo upload, color palette (primary/secondary/tertiary with hex codes, usage %, emotional meaning), typography (primary/secondary font, hierarchy), photography style, iconography | 360 Framework A14-A25 |
| 4 | `voice_tone` | Brand voice attributes (3-5 adjectives), do's/don'ts, formality scale, tone by channel, tone by audience, key messages, elevator pitch, boilerplate | 360 Framework A26-A33 |
| 5 | `target_audience` | Primary TG demographics, secondary TG, psychographics (lifestyle, pain points, aspirations), up to 3 personas, top search keywords, sentiment, hierarchy of use | 360 Framework A34-A44 + Avalok's customer interview methodology |
| 6 | `product_info` | Product description, key features/ingredients, certifications, core USP, competitors (direct + positioning), pricing, packaging | 360 Framework A45-A53 |
| 7 | `brand_history` | Existing campaigns (what worked / didn't), social media presence data, platform strategy, asset library links, legal/compliance notes | 360 Framework A54-A63 |
| 8 | `research_synthesis` | Founder interview notes (freeform), India competition notes, US/Global competition notes, own USP reframing thoughts, brand story draft ideas | Avalok's process Steps 1-6 |

---

#### US-2.1 — Create a new Brand Book project

**As a** brand strategist at the agency
**I want to** create a new brand book project with a name and client name
**So that** I have a container to fill in all brand identity data

**Priority:** Must Have
**Depends on:** US-1.1
**Constraints:** Creating a project initializes all 8 `brand_book_sections` rows with empty `user_input`. Status set to `draft`.

**Input:**
```json
{
  "name": "Hampi Pure Brand Book",
  "client_name": "Hampi Pure"
}
```

**Output:**
```json
{
  "brand_book_id": "uuid",
  "status": "draft",
  "current_step": 1,
  "sections": [
    { "section_key": "brand_identity", "ai_status": "pending" },
    { "section_key": "values_pillars", "ai_status": "pending" },
    ...
  ]
}
```

**Acceptance Criteria:**

✅ **Positive:** Brand book created with 8 empty sections. User lands on Step 1 form.

❌ **Negative:** Empty name returns validation error "Brand book name is required."

---

#### US-2.2 — Fill out a brand book step with auto-save

**As a** brand strategist
**I want to** fill out form fields for any step, with data auto-saving as I type
**So that** I never lose work and can come back to any step at any time

**Priority:** Must Have
**Depends on:** US-2.1
**Constraints:** Debounced auto-save (2s after last keystroke). Save to `brand_book_sections.user_input` as JSONB. User can navigate between steps freely — not forced to go sequentially. `current_step` tracks the furthest step reached.

**Input (example for Step 1 — brand_identity):**
```json
{
  "brand_name": "Hampi Pure",
  "tagline": "The Old Way. Pure Today.",
  "brand_story_origin": "During COVID, founder returned home and rediscovered...",
  "mission_statement": "To replace refined, chemical-laden oils in every Indian home...",
  "vision_statement": "Make pure wood-pressed oils the everyday choice...",
  "brand_promise": "Traditional wisdom, modern purity"
}
```

**Acceptance Criteria:**

✅ **Positive:** Data saves on 2s debounce. Green "Saved" indicator appears. Page reload restores all fields.
✅ **Positive:** User can jump from Step 1 to Step 5 and back. All data persists.

❌ **Negative:** If Supabase save fails (network), show "Save failed — retrying..." with exponential backoff (3 retries). If all retries fail, show "Offline — changes saved locally" and queue for sync.

⚠️ **Non-functional:** Auto-save round trip <500ms. Local state managed via React state, not localStorage.

---

#### US-2.3 — Upload existing brand book (PDF/PPTX) for auto-extraction

**As a** brand strategist
**I want to** upload an existing brand book PDF or PPTX and have the system extract data into the form fields
**So that** I don't have to manually re-enter information that already exists in a document

**Priority:** Should Have
**Depends on:** US-2.1
**Constraints:** File uploaded to Supabase Storage. LLM (Claude) parses the document and maps content to the 8 section structures. Extracted data is placed into form fields as pre-fills — user reviews and confirms. Max file size: 25MB.

**Input:**
```json
{
  "brand_book_id": "uuid",
  "file": "<uploaded_file.pdf>"
}
```

**Output:**
```json
{
  "extracted_sections": {
    "brand_identity": { "brand_name": "Nike", "tagline": "Just Do It", ... },
    "values_pillars": { "core_values": ["Innovation", "Sustainability"], ... },
    ...
  },
  "confidence": {
    "brand_identity": 0.92,
    "values_pillars": 0.85,
    ...
  }
}
```

**Acceptance Criteria:**

✅ **Positive:** PDF uploaded, LLM extracts data, form fields pre-populated. Sections with confidence <0.7 are highlighted yellow for review.

❌ **Negative:** Corrupted file returns "Could not parse this file. Please check the format and try again."
❌ **Negative:** File >25MB returns "File too large. Maximum 25MB."

---

#### US-2.4 — Step 5 special: Founder Interview Question Bank

**As a** brand strategist filling out the Target Audience section
**I want to** see Avalok's founder interview questions as guided prompts
**So that** I capture the deep insights needed for a strong brand book even if I'm not a senior strategist

**Priority:** Should Have
**Depends on:** US-2.2
**Constraints:** This is a UI enhancement to Step 5 and Step 8. Display the question bank as expandable guidance panels. Questions sourced from Avalok's methodology:

**Question Bank (stored in DB, editable):**
```
FOUNDER INTERVIEW PROMPTS:
- Where did you get the idea for this brand?
- Take me to the first moment. What was that feeling?
- What did you see in the market that made you believe this was possible?
- Was this a personal need or a business opportunity?
- What factors led you to decide this is what you want to create?
- When talking to customers, who do you think your target audience is?
- What has worked in your conversations with customers?
- Has there been something you've said or shown that drives sales?
- What brands do you look up to? Who do you aspire to be?
- What campaigns or content have worked for you?
- What campaigns or content have NOT worked?
- What negative reactions have you received?
- What do you think is missing from your brand right now?
- Where do you need help?
- How do you want to differentiate yourself?
```

**Acceptance Criteria:**

✅ **Positive:** Question bank appears as a collapsible sidebar/panel on relevant steps. User can copy questions or use them as prompts while filling the form.

---

### Epic 3 — Brand Book — LLM Processing Pipeline

---

#### US-3.1 — Generate AI content for a brand book section

**As a** brand strategist who has filled out a section
**I want to** click "Generate with AI" and have the system produce polished brand book content for that section
**So that** raw inputs are transformed into professional, presentation-ready copy

**Priority:** Must Have
**Depends on:** US-2.2
**Constraints:** Each section has its own prompt in `prompt_registry`. The prompt template receives the `user_input` JSONB + relevant context from other sections (e.g., brand story generation needs both `brand_identity` and `research_synthesis` inputs). Output stored in `brand_book_sections.ai_generated`. User reviews before it becomes `final_content`.

**Prompt Key Pattern:** `brand_book.{section_key}` — e.g., `brand_book.brand_identity`, `brand_book.usp_positioning`

**Input:**
```json
{
  "brand_book_id": "uuid",
  "section_key": "brand_identity",
  "user_input": { ... },
  "context_sections": {
    "research_synthesis": { ... },
    "values_pillars": { ... }
  }
}
```

**Output:**
```json
{
  "ai_generated": {
    "about_us_oneliner": "Hampi Pure is India's wood-pressed oil brand...",
    "about_us_long": "Born from the ancient...",
    "mission_statement": "We believe health is deeply connected...",
    "aim_statement": "To replace refined, chemical-laden oils...",
    "brand_story": "During the stillness of COVID..."
  },
  "ai_status": "generated"
}
```

**Acceptance Criteria:**

✅ **Positive:** LLM generates content. Stored in `ai_generated` column. Displayed in a side-by-side view: user input on left, AI output on right. User can edit the AI output inline.
✅ **Positive:** User clicks "Approve" → `ai_generated` content is copied to `final_content`, `ai_status` set to `approved`.

❌ **Negative:** LLM call fails after 3 retries → `ai_status` set to `error`, error message displayed, user can retry manually.
❌ **Negative:** If `user_input` for required fields is empty, show "Please fill in [field names] before generating."

⚠️ **Non-functional:** Generation <15s for any single section. Log every call to `llm_call_log`.

---

#### US-3.2 — USP Reframing (Avalok's creative judgment)

**As a** brand strategist
**I want to** get AI suggestions for reframing the brand's USP beyond what the client provided
**So that** I can find a stronger positioning (like Avalok turning "traditional knowledge" into a core differentiator)

**Priority:** Should Have
**Depends on:** US-3.1
**Constraints:** This is a special LLM call using prompt `brand_book.usp_reframe`. It takes ALL section data as context and produces 3 alternative USP framings with rationale. Inspired by Avalok's approach: "I don't always listen to them. I figure out a better positioning."

**Output:**
```json
{
  "reframings": [
    {
      "usp": "Custodians of Traditional Wisdom — Ancient knowledge, modern purity",
      "rationale": "The brand's strongest emotional hook is the wisdom map and generational knowledge. Elevating this from a sub-theme to THE core story creates a category of one.",
      "what_changes": "Brand story leads with wisdom, not just product quality"
    },
    {
      "usp": "Cloudy is the New Clean",
      "rationale": "Owning the visual 'flaw' of unrefined oil turns a perceived negative into a trust signal...",
      "what_changes": "Product education becomes the lead content pillar"
    },
    {
      "usp": "...",
      "rationale": "...",
      "what_changes": "..."
    }
  ]
}
```

**Acceptance Criteria:**

✅ **Positive:** 3 reframings presented as cards. User can select one, edit it, or ignore all and keep the original.

---

#### US-3.3 — Generate complete brand book (all sections end-to-end)

**As a** brand strategist who has filled all sections
**I want to** click "Generate Full Brand Book" to process all sections in sequence
**So that** I get a complete, coherent brand book where all sections reference each other consistently

**Priority:** Must Have
**Depends on:** US-3.1
**Constraints:** Processes sections in dependency order: brand_identity → values_pillars → target_audience → product_info → research_synthesis → voice_tone → visual_identity → content_pillars. Each section's output feeds into the next section's context. Progress bar shows which section is being generated.

**Acceptance Criteria:**

✅ **Positive:** All sections generated in sequence. Progress indicator updates per section. Total time <2 minutes.

❌ **Negative:** If one section fails, remaining sections still attempt generation. Failed section marked `error`, others proceed with available context.

---

### Epic 4 — Brand Book — PDF Generation & Export

---

#### US-4.1 — Generate brand book PDF

**As a** brand strategist with all sections approved
**I want to** generate a professionally formatted PDF of the brand book
**So that** I can present it to the client or use it as the input for a campaign

**Priority:** Must Have
**Depends on:** US-3.3
**Constraints:** PDF generated server-side using Puppeteer rendering an HTML template. Template stored as a React component. Includes: cover page, table of contents, all sections with proper typography, color swatches rendered visually, logo placement examples, persona cards. Stored in Supabase Storage. URL saved to `brand_books.pdf_url`.

**Acceptance Criteria:**

✅ **Positive:** PDF generated, downloadable link provided. Brand book status updated to `review`.
✅ **Positive:** PDF is professional quality — not a raw data dump. Sections have headers, proper spacing, visual elements for color palette and typography.

❌ **Negative:** If PDF generation fails, log error, show "PDF generation failed. Please try again." Brand book data is not affected.

⚠️ **Non-functional:** PDF generation <30s. Max PDF size ~15MB.

---

### Epic 5 — Campaign — Brief & Brand Reference (Stages 1-2)

---

#### US-5.1 — Create a new Campaign project

**As a** brand strategist
**I want to** create a new campaign, either linked to an existing brand book OR by uploading a brand book PDF
**So that** I have the brand context needed to start campaign planning

**Priority:** Must Have
**Depends on:** US-4.1
**Constraints:** If linked to a DB brand book, all brand data is auto-populated into Stage 2 (Brand Reference). If PDF uploaded, it's parsed via LLM (same as US-2.3) and structured data is created. Campaign initializes all 11 stage rows in `campaign_stages`.

**Input:**
```json
{
  "name": "Hampi Pure Launch Campaign",
  "client_name": "Hampi Pure",
  "brand_book_id": "uuid" // OR
  "uploaded_brand_book": "<file>"
}
```

**Acceptance Criteria:**

✅ **Positive:** Campaign created. If brand book linked, Stage 2 auto-populated. User lands on Stage 1 (Campaign Brief) form.

---

#### US-5.2 — Fill Campaign Brief (Stage 1)

**As a** campaign strategist
**I want to** fill in the campaign brief with objective, KPIs, scope, budget, and context
**So that** the campaign has clear constraints and goals before research begins

**Priority:** Must Have
**Depends on:** US-5.1
**Constraints:** Form fields map to Campaign 360 Framework rows 6-15. Auto-save pattern same as US-2.2.

**Form Fields:**
```json
{
  "campaign_objective": "enum: awareness | conversion | retention | launch | branding",
  "kpis": [{ "metric": "text", "target": "text" }],
  "campaign_type": "enum: product_launch | seasonal | brand_awareness | performance | event",
  "target_markets": ["text"],
  "campaign_duration": { "start_date": "date", "end_date": "date", "phases": "number" },
  "budget_total": "number",
  "budget_breakdown": { "production": "number", "media": "number", "influencer": "number", "other": "number" },
  "problem_statement": "text",
  "sentiment_territory": "text",
  "brand_face": "text",
  "creative_direction_hints": "text"
}
```

**Acceptance Criteria:**

✅ **Positive:** All fields save. Campaign status updates to `brief_complete` when user marks this stage done.

❌ **Negative:** Budget breakdown must sum to ≤ budget_total. Validation error if exceeded.

---

#### US-5.3 — Brand Reference auto-population (Stage 2)

**As a** campaign strategist
**I want to** see all brand book data pre-populated in Stage 2 as a read-only reference
**So that** I have the brand filter available while planning the campaign

**Priority:** Must Have
**Depends on:** US-5.1
**Constraints:** If brand book is linked, Stage 2 pulls `final_content` from all `brand_book_sections`. Displayed as read-only cards. User can add campaign-specific overrides (e.g., "For this campaign, our TG is narrower: 18-23 instead of 18-40").

**Acceptance Criteria:**

✅ **Positive:** Brand reference displayed as collapsible cards per section. Override fields available for TG, tone, and visual adjustments.

---

### Epic 6 — Campaign — Research & Intelligence (Stages 3-6)

---

#### US-6.1 — Market Research inputs (Stage 3)

**As a** campaign strategist
**I want to** enter market research findings — industry trends, competitor campaigns, category regulations, seasonal/cultural trends
**So that** the campaign hypothesis is grounded in real market data

**Priority:** Must Have
**Depends on:** US-5.2
**Constraints:** Form fields map to Campaign 360 Framework rows 23-30. Includes structured fields for competitor analysis (name, positioning, key campaigns, what worked/didn't) with support for up to 10 competitors.

**Form Fields (key ones):**
```json
{
  "industry_trends": "text",
  "market_size_notes": "text",
  "consumer_behavior_shifts": "text",
  "competitors": [{
    "name": "text",
    "positioning": "text",
    "key_campaigns": "text",
    "what_worked": "text",
    "what_didnt": "text",
    "meta_ads_observations": "text"
  }],
  "india_competition_notes": "text",
  "us_global_competition_notes": "text",
  "category_regulations": "text",
  "seasonal_cultural_opportunities": "text"
}
```

**Acceptance Criteria:**

✅ **Positive:** All fields save. Competitor entries are dynamically addable (+ Add Competitor button).

---

#### US-6.2 — Customer Intelligence inputs (Stage 4)

**As a** campaign strategist
**I want to** enter keyword research, sentiment analysis, review analysis, and behavioral data
**So that** the campaign speaks the customer's language and addresses real triggers

**Priority:** Must Have
**Depends on:** US-5.2

**Form Fields:**
```json
{
  "marketplace_keywords": [{ "keyword": "text", "volume": "text", "intent": "text" }],
  "google_keywords": [{ "keyword": "text", "volume": "text" }],
  "customer_sentiment": "text",
  "own_review_themes": "text",
  "competitor_review_themes": "text",
  "hierarchy_of_use": [{ "rank": "number", "use_case": "text", "frequency": "text" }],
  "purchase_triggers": ["text"],
  "purchase_barriers": ["text"],
  "customer_interview_notes": "text"
}
```

---

#### US-6.3 — Platform, Historical & Resource inputs (Stages 5-7)

**As a** campaign strategist
**I want to** enter platform best practices, historical campaign data, influencer landscape, and resource/timeline constraints
**So that** the campaign plan is grounded in what's executable

**Priority:** Must Have
**Depends on:** US-5.2

**Covers 360 Framework rows 39-62 across three form panels within this step.**

---

### Epic 7 — Campaign — Hypothesis & Ideation (Stages 7-8) — *The Avalok Stages*

This is the creative core that differentiates the app. These stages don't exist in most campaign planning tools.

---

#### US-7.1 — AI-generated Campaign Hypothesis (Stage 7)

**As a** campaign strategist who has completed research stages
**I want to** have AI synthesize all inputs into a clear campaign hypothesis
**So that** I have a creative insight that bridges research and ideas (like Avalok's Blue Condoms insight)

**Priority:** Must Have
**Depends on:** US-6.1, US-6.2, US-6.3
**Constraints:** Uses prompt `campaign.hypothesis`. The prompt receives: campaign brief, brand reference, all research inputs, customer intelligence. Outputs 2-3 hypotheses, each with: the insight, the emotional territory, the audience reframe (if different from brand TG), and the "flip" (the non-obvious angle).

**Prompt Design (stored in prompt_registry):**
```
SYSTEM: You are a senior creative strategist at a top Indian agency.
Your job is to find the NON-OBVIOUS angle. The hypothesis that makes
everyone in the room go "oh, I never thought of it that way."

Rules:
- Never lead with the product feature. Lead with the human truth.
- The hypothesis must be testable through creative execution.
- If the brand says X, consider whether NOT-X is actually more
  interesting (Avalok's reframing principle).
- Each hypothesis must include: the insight, the emotional territory,
  a recommended TG reframe, and the "flip" (the contrarian angle).

USER: [All campaign data injected here via template variables]
```

**Output:**
```json
{
  "hypotheses": [
    {
      "title": "The Flip: Women Don't Care About Condoms",
      "insight": "Women aren't making the connection between post-sex discomfort and condom materials...",
      "emotional_territory": "Revelation + Self-care",
      "tg_reframe": "Women 22-35 who are sexually active and health-conscious but have never questioned their condom",
      "the_flip": "Don't sell condoms TO women. Sell a revelation ABOUT condoms.",
      "execution_direction": "Start with the problem (discomfort), not the product (condom)"
    },
    { ... },
    { ... }
  ]
}
```

**Acceptance Criteria:**

✅ **Positive:** 2-3 hypotheses generated. Each displayed as a card with all fields. User selects one as the "working hypothesis" or writes their own.
✅ **Positive:** Selected hypothesis is saved and flows into the ideation stage.

❌ **Negative:** If research data is too thin (<3 research stages filled), show warning: "Your research inputs are limited. The hypothesis quality depends on research depth. Consider filling more research stages." Still allows generation.

⚠️ **Non-functional:** Generation <20s. Uses claude-opus-4-6 for this step (highest quality needed).

---

#### US-7.2 — Ideation Room (Stage 8)

**As a** campaign strategist with a working hypothesis
**I want to** generate multiple campaign ideas from different creative perspectives
**So that** I have divergent options to choose from (Avalok's ideation room methodology)

**Priority:** Must Have
**Depends on:** US-7.1
**Constraints:** Uses prompt `campaign.ideation`. The system generates ideas from 3 different "persona lenses" (simulating Avalok's diverse ideation room): a Gen Z creative, a brand strategist, and a cultural commentator. Each generates 2-3 ideas. User can also add their own ideas manually.

**Output:**
```json
{
  "idea_sets": [
    {
      "persona": "Gen Z Creative",
      "persona_description": "Digital-native, meme-fluent, skeptical of brands, values authenticity",
      "ideas": [
        {
          "title": "Ban the Itch Campaign",
          "format": "Social-first satirical campaign",
          "hook": "We're starting a petition to ban uncomfortable condoms",
          "hero_content": "Mock-documentary about women's post-sex discomfort",
          "surround": "Petition website, TikTok series, meme templates",
          "why_it_works": "Gen Z responds to satirical activism formats"
        },
        { ... }
      ]
    },
    {
      "persona": "Brand Strategist",
      "ideas": [...]
    },
    {
      "persona": "Cultural Commentator",
      "ideas": [...]
    }
  ]
}
```

**Acceptance Criteria:**

✅ **Positive:** 6-9 ideas generated across 3 personas. User can star/shortlist ideas, combine elements, or add manual ideas.
✅ **Positive:** User selects final idea(s) and they flow into the feasibility stage.

---

#### US-7.3 — Brand Filter check on selected ideas

**As a** campaign strategist who selected campaign ideas
**I want to** run the selected ideas through the brand book filter
**So that** I know if the ideas fit within the brand universe (Avalok: "Brand book is a filter, not a funnel")

**Priority:** Should Have
**Depends on:** US-7.2
**Constraints:** Uses prompt `campaign.brand_filter`. Takes the selected ideas + brand book data and evaluates: tone alignment, visual compatibility, audience fit, brand pillar alignment. Returns a compatibility score and specific flags.

**Output per idea:**
```json
{
  "idea_title": "Ban the Itch Campaign",
  "overall_fit": 0.78,
  "flags": [
    { "dimension": "tone", "score": 0.6, "note": "Satire is edgier than brand's usual warm tone — consider softening" },
    { "dimension": "audience", "score": 0.9, "note": "Strong fit with primary TG" },
    { "dimension": "visual", "score": 0.8, "note": "Will need custom visual language for satire format" },
    { "dimension": "pillars", "score": 0.85, "note": "Aligns with education and transparency pillars" }
  ],
  "recommendation": "Proceed with tone adjustment — soften satire to 'playful provocation' rather than 'full mockumentary'"
}
```

---

### Epic 8 — Campaign — Feasibility & Output (Stages 9-10)

---

#### US-8.1 — Budget & Feasibility Assessment (Stage 9)

**As a** campaign strategist with selected ideas
**I want to** estimate production costs, timeline, and resource needs
**So that** I can validate the idea is executable within constraints

**Priority:** Must Have
**Depends on:** US-7.2
**Constraints:** Form with cost line items. AI can suggest cost estimates based on the idea type (e.g., "Hero film production: ₹8-15L typical for this format"). Uses `campaign.cost_estimate` prompt.

**Form Fields:**
```json
{
  "production_cost": { "estimate": "number", "notes": "text" },
  "talent_cost": { "estimate": "number", "notes": "text" },
  "influencer_cost": { "estimate": "number", "notes": "text" },
  "distribution_cost": { "estimate": "number", "notes": "text" },
  "other_costs": [{ "item": "text", "estimate": "number" }],
  "total_estimated": "formula: sum of above",
  "budget_available": "auto-filled from Stage 1",
  "budget_delta": "formula: available - estimated",
  "timeline_feasible": "boolean",
  "timeline_notes": "text",
  "resource_gaps": ["text"],
  "go_no_go": "enum: go | conditional_go | no_go"
}
```

---

#### US-8.2 — Generate Campaign Output Document (Stage 10)

**As a** campaign strategist who has completed all stages
**I want to** generate the final campaign plan document with tagline, scripts, distribution strategy, and timeline
**So that** I have a presentation-ready campaign plan

**Priority:** Must Have
**Depends on:** US-8.1
**Constraints:** Uses multiple prompts in sequence: `campaign.tagline`, `campaign.hero_script`, `campaign.surround_plan`, `campaign.distribution`, `campaign.timeline`. Each generates one section. Full output assembled into a campaign deck.

**Output Structure:**
```json
{
  "tagline_options": ["text", "text", "text"],
  "selected_tagline": "text",
  "hero_content": {
    "format": "text",
    "script_brief": "text",
    "duration": "text",
    "key_scenes": ["text"]
  },
  "surround_campaign": [{
    "channel": "text",
    "format": "text",
    "content_brief": "text"
  }],
  "influencer_plan": [{
    "tier": "text",
    "count": "number",
    "content_type": "text",
    "estimated_cost": "number"
  }],
  "distribution_strategy": {
    "organic": "text",
    "paid": "text",
    "on_ground": "text"
  },
  "execution_timeline": [{
    "phase": "text",
    "dates": "text",
    "deliverables": ["text"],
    "poc": "text"
  }],
  "final_budget": { ... }
}
```

**Acceptance Criteria:**

✅ **Positive:** All output sections generated. Presented in a deck-like view (slide-by-slide). User can edit each section. Export as PDF.

❌ **Negative:** If any section generation fails, other sections proceed. Failed section shows retry button.

---

### Epic 9 — Prompt Registry UI

---

#### US-9.1 — View and edit prompts

**As an** agency admin
**I want to** view all prompts, edit them, and create new versions
**So that** I can fine-tune the AI output quality without code changes

**Priority:** Could Have (Phase 3)
**Depends on:** US-3.1
**Constraints:** Only users with role `admin` or `owner` can access. Editing a prompt creates a new version — old version is retained. Active version is toggled explicitly.

---

### Epic 10 — Dashboard & Project Management

---

#### US-10.1 — Dashboard with all projects

**As a** agency team member
**I want to** see all brand books and campaigns in a dashboard with status, last updated, and quick actions
**So that** I can manage my workload and pick up where I left off

**Priority:** Must Have
**Depends on:** US-2.1, US-5.1

**Acceptance Criteria:**

✅ **Positive:** Dashboard shows two tabs: Brand Books and Campaigns. Each shows: name, client, status, last updated, created by. Click to open. Filter by status.

---

## Known Gaps & Risks

| Gap | Description | Severity | Resolution Path |
|-----|-------------|----------|-----------------|
| G-1 | No real competitor research API integration — all manual input | Medium | Phase 4: Integrate Meta Ads Library API, Amazon Product API |
| G-2 | Cost estimation for production is LLM-guessed, not from a real cost database | Medium | Build a cost reference table from Avalok's historical data |
| G-3 | PDF template design not specified — needs a designer | High | Create HTML template with brand-book-appropriate styling before Phase 1 launch |
| G-4 | Ideation room is AI-simulated, not actual multi-user collaboration | Low | Phase 4: Add real-time collaboration for brainstorming |
| G-5 | No integration with project management tools (Asana, ClickUp) | Low | Phase 4: API integrations |
| G-6 | Prompt quality for hypothesis and ideation is critical and untested | High | Build eval framework before launch — test with 5 real brand cases |
| G-7 | Campaign domain variation (B2B vs B2C vs D2C) from 360 Framework not yet reflected in form logic | Medium | Add conditional form fields based on campaign_type selection |
| G-8 | Avalok's "algorithm consumption" research method is not automatable | Low | Keep as manual input; add reference links/tips in the UI |

---

## Definition of Done

### Story-Level DoD
```
- [ ] All acceptance criteria pass (positive, negative, non-functional)
- [ ] Error paths return structured log output per the logging convention
- [ ] Input/output contracts match the data model
- [ ] Auto-save works (for form stories)
- [ ] RLS policies verified — user cannot access other org's data
- [ ] LLM calls logged to llm_call_log (for AI stories)
```

### PRD-Level DoD
```
- [ ] All stories in the phase pass their story-level DoD
- [ ] End-to-end flow tested: Create brand book → Fill all steps → Generate AI content → Approve → Generate PDF → Create campaign from brand book → Complete all stages → Generate output
- [ ] Deployed to Vercel (or equivalent)
- [ ] Supabase migrations applied and tested
- [ ] Prompt registry seeded with v1 prompts for all prompt_keys
- [ ] Load tested with 5 concurrent users completing full flows
```

---

## File & Folder Structure (for Claude Code)

```
marketing-360/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── brand-books/
│   │   │   ├── page.tsx          # List all brand books
│   │   │   ├── new/page.tsx      # Create new
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Brand book editor (step wizard)
│   │   │       ├── preview/page.tsx
│   │   │       └── pdf/page.tsx
│   │   ├── campaigns/
│   │   │   ├── page.tsx          # List all campaigns
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Campaign editor (stage wizard)
│   │   │       └── output/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── team/page.tsx
│   │       └── prompts/page.tsx  # Prompt registry UI
│   ├── api/
│   │   ├── ai/
│   │   │   ├── generate-section/route.ts
│   │   │   ├── generate-hypothesis/route.ts
│   │   │   ├── generate-ideation/route.ts
│   │   │   ├── brand-filter/route.ts
│   │   │   ├── extract-pdf/route.ts
│   │   │   └── generate-campaign-output/route.ts
│   │   ├── pdf/
│   │   │   └── generate/route.ts
│   │   └── upload/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── brand-book/
│   │   ├── StepWizard.tsx
│   │   ├── steps/
│   │   │   ├── BrandIdentityStep.tsx
│   │   │   ├── ValuesPillarsStep.tsx
│   │   │   ├── VisualIdentityStep.tsx
│   │   │   ├── VoiceToneStep.tsx
│   │   │   ├── TargetAudienceStep.tsx
│   │   │   ├── ProductInfoStep.tsx
│   │   │   ├── BrandHistoryStep.tsx
│   │   │   └── ResearchSynthesisStep.tsx
│   │   ├── AIGenerateButton.tsx
│   │   ├── SideBySideReview.tsx
│   │   ├── FounderQuestionBank.tsx
│   │   └── USPReframer.tsx
│   ├── campaign/
│   │   ├── StageWizard.tsx
│   │   ├── stages/
│   │   │   ├── CampaignBriefStage.tsx
│   │   │   ├── BrandReferenceStage.tsx
│   │   │   ├── MarketResearchStage.tsx
│   │   │   ├── CustomerIntelStage.tsx
│   │   │   ├── PlatformChannelStage.tsx
│   │   │   ├── HistoricalDataStage.tsx
│   │   │   ├── ResourcesStage.tsx
│   │   │   ├── HypothesisStage.tsx   # ← Avalok's creative core
│   │   │   ├── IdeationRoomStage.tsx  # ← Avalok's ideation room
│   │   │   ├── FeasibilityStage.tsx
│   │   │   └── CampaignOutputStage.tsx
│   │   ├── HypothesisCard.tsx
│   │   ├── IdeaCard.tsx
│   │   └── BrandFilterResults.tsx
│   └── shared/
│       ├── AutoSaveForm.tsx
│       ├── ProgressIndicator.tsx
│       ├── FileUpload.tsx
│       └── AIStatusBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   ├── middleware.ts          # Auth middleware
│   │   └── types.ts              # Generated types
│   ├── ai/
│   │   ├── orchestrator.ts       # LLM call wrapper with retry, logging
│   │   ├── prompt-loader.ts      # Loads prompt from registry, interpolates variables
│   │   └── section-context.ts    # Builds context from related sections
│   ├── pdf/
│   │   └── generator.ts          # Puppeteer PDF generation
│   └── utils/
│       ├── auto-save.ts          # Debounced save hook
│       └── validation.ts         # Form validation schemas (zod)
├── supabase/
│   └── migrations/
│       ├── 001_create_organizations.sql
│       ├── 002_create_users.sql
│       ├── 003_create_brand_books.sql
│       ├── 004_create_brand_book_sections.sql
│       ├── 005_create_campaigns.sql
│       ├── 006_create_campaign_stages.sql
│       ├── 007_create_prompt_registry.sql
│       ├── 008_create_llm_call_log.sql
│       ├── 009_create_file_uploads.sql
│       ├── 010_rls_policies.sql
│       └── 011_seed_prompts.sql  # v1 prompts for all prompt_keys
├── prompts/                       # Prompt templates (also seeded to DB)
│   ├── brand-book/
│   │   ├── brand_identity.md
│   │   ├── values_pillars.md
│   │   ├── usp_reframe.md
│   │   └── ...
│   └── campaign/
│       ├── hypothesis.md
│       ├── ideation.md
│       ├── brand_filter.md
│       ├── tagline.md
│       ├── hero_script.md
│       └── ...
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── .env.local                    # SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
```

---

## Prompt Registry Seed Data

These are the prompt_keys that need v1 prompts before launch:

| prompt_key | Purpose | Model |
|-----------|---------|-------|
| `brand_book.brand_identity` | Generate about us, mission, aim from raw inputs | claude-sonnet-4-20250514 |
| `brand_book.values_pillars` | Generate values, pillars, differentiation statement | claude-sonnet-4-20250514 |
| `brand_book.voice_tone` | Generate brand voice guide, messaging matrix | claude-sonnet-4-20250514 |
| `brand_book.target_audience` | Generate persona cards, audience summary | claude-sonnet-4-20250514 |
| `brand_book.brand_story` | Generate full brand narrative (needs all context) | claude-opus-4-6 |
| `brand_book.usp_reframe` | 3 alternative USP framings (Avalok's method) | claude-opus-4-6 |
| `brand_book.content_pillars` | Generate content pillar strategy for social media | claude-sonnet-4-20250514 |
| `brand_book.pdf_extract` | Extract structured data from uploaded PDF/PPTX | claude-sonnet-4-20250514 |
| `campaign.hypothesis` | Generate 2-3 campaign hypotheses from all inputs | claude-opus-4-6 |
| `campaign.ideation` | Generate ideas from 3 persona lenses | claude-opus-4-6 |
| `campaign.brand_filter` | Evaluate idea fit against brand book | claude-sonnet-4-20250514 |
| `campaign.cost_estimate` | Suggest cost ranges for campaign elements | claude-sonnet-4-20250514 |
| `campaign.tagline` | Generate 3-5 tagline options | claude-opus-4-6 |
| `campaign.hero_script` | Generate hero content script brief | claude-sonnet-4-20250514 |
| `campaign.surround_plan` | Generate surround campaign plan | claude-sonnet-4-20250514 |
| `campaign.distribution` | Generate distribution strategy | claude-sonnet-4-20250514 |
| `campaign.timeline` | Generate execution timeline from scope | claude-sonnet-4-20250514 |
