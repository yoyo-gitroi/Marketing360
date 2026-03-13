import type { SupabaseClient } from '@supabase/supabase-js'

interface PromptRow {
  system_prompt: string
  user_prompt_template: string
  model: string
  max_tokens: number
  temperature: number
  version: number
  is_active: boolean
}

interface PromptConfig {
  systemPrompt: string
  userPromptTemplate: string
  model: string
  maxTokens: number
  temperature: number
  version: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadPrompt(
  supabase: SupabaseClient<any>,
  promptKey: string
): Promise<PromptConfig> {
  const { data, error } = await supabase
    .from('prompt_registry')
    .select('system_prompt, user_prompt_template, model, max_tokens, temperature, version')
    .eq('prompt_key', promptKey)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    throw new Error(
      `Prompt not found for key "${promptKey}": ${error?.message ?? 'no data'}`
    )
  }

  const row = data as PromptRow

  return {
    systemPrompt: row.system_prompt,
    userPromptTemplate: row.user_prompt_template,
    model: row.model,
    maxTokens: row.max_tokens,
    temperature: row.temperature,
    version: row.version,
  }
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match
  })
}
