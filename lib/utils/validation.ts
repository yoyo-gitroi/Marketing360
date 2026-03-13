import { z } from 'zod';

// ---------- Enums ----------

export const campaignObjectiveEnum = z.enum([
  'brand_awareness',
  'lead_generation',
  'sales_conversion',
  'customer_retention',
  'product_launch',
  'event_promotion',
  'reputation_management',
  'market_expansion',
]);

export const campaignTypeEnum = z.enum([
  'digital',
  'print',
  'social_media',
  'email',
  'influencer',
  'content_marketing',
  'paid_search',
  'display',
  'video',
  'integrated',
  'experiential',
]);

// ---------- Brand Book ----------

export const brandBookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_name: z.string().optional(),
});

export type BrandBook = z.infer<typeof brandBookSchema>;

// ---------- Campaign Brief (US-5.2) ----------

export const campaignBriefSchema = z.object({
  campaign_objective: campaignObjectiveEnum,
  kpis: z.array(z.string().min(1)).min(1, 'At least one KPI is required'),
  campaign_type: campaignTypeEnum,
  budget_total: z.number().positive('Budget must be a positive number'),
  budget_currency: z.string().default('USD'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  target_audience: z.string().optional(),
  target_channels: z.array(z.string()).optional(),
  key_messages: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  constraints: z.string().optional(),
  notes: z.string().optional(),
});

export type CampaignBrief = z.infer<typeof campaignBriefSchema>;

// ---------- Brand Identity ----------

export const brandIdentitySchema = z.object({
  brand_name: z.string().min(1, 'Brand name is required'),
  tagline: z.string().min(1, 'Tagline is required'),
  brand_story_origin: z.string().min(1, 'Brand story / origin is required'),
  mission_statement: z.string().min(1, 'Mission statement is required'),
  vision_statement: z.string().min(1, 'Vision statement is required'),
  brand_promise: z.string().min(1, 'Brand promise is required'),
});

export type BrandIdentity = z.infer<typeof brandIdentitySchema>;

// ---------- Generic Section Input ----------

export const sectionInputSchema = z.record(z.string(), z.unknown());

export type SectionInput = z.infer<typeof sectionInputSchema>;
