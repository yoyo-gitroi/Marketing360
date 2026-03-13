import type { SupabaseClient } from '@supabase/supabase-js'

interface SectionRow {
  section_key: string
  final_content: Record<string, unknown>
  user_input: Record<string, unknown>
}

interface StageRow {
  stage_key: string
  final_content: Record<string, unknown>
  user_input: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildSectionContext(
  supabase: SupabaseClient<any>,
  brandBookId: string,
  sectionKeys: string[]
): Promise<Record<string, Record<string, unknown>>> {
  const { data, error } = await supabase
    .from('brand_book_sections')
    .select('section_key, final_content, user_input')
    .eq('brand_book_id', brandBookId)
    .in('section_key', sectionKeys)

  if (error) {
    throw new Error(`Failed to fetch brand book sections: ${error.message}`)
  }

  const rows = (data ?? []) as SectionRow[]
  const context: Record<string, Record<string, unknown>> = {}

  for (const section of rows) {
    const content =
      section.final_content && Object.keys(section.final_content).length > 0
        ? section.final_content
        : section.user_input
    context[section.section_key] = content
  }

  return context
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildCampaignContext(
  supabase: SupabaseClient<any>,
  campaignId: string,
  stageKeys: string[]
): Promise<Record<string, Record<string, unknown>>> {
  const { data, error } = await supabase
    .from('campaign_stages')
    .select('stage_key, final_content, user_input')
    .eq('campaign_id', campaignId)
    .in('stage_key', stageKeys)

  if (error) {
    throw new Error(`Failed to fetch campaign stages: ${error.message}`)
  }

  const rows = (data ?? []) as StageRow[]
  const context: Record<string, Record<string, unknown>> = {}

  for (const stage of rows) {
    const content =
      stage.final_content && Object.keys(stage.final_content).length > 0
        ? stage.final_content
        : stage.user_input
    context[stage.stage_key] = content
  }

  return context
}
