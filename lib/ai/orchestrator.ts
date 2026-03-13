import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

interface CallLLMParams {
  systemPrompt: string
  userPrompt: string
  model?: string
  maxTokens?: number
  temperature?: number
  orgId: string
  userId: string
  promptKey: string
  promptVersion: number
  relatedEntityType?: string
  relatedEntityId?: string
}

interface CallLLMResult {
  content: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

interface CallLLMError {
  error: string
  content: null
  inputTokens: 0
  outputTokens: 0
  latencyMs: number
}

export async function callLLM(
  params: CallLLMParams
): Promise<CallLLMResult | CallLLMError> {
  const {
    systemPrompt,
    userPrompt,
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096,
    temperature = 0.7,
  } = params

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const startTime = Date.now()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      })

      const latencyMs = Date.now() - startTime
      const textBlock = response.content.find((block) => block.type === 'text')
      const content = textBlock && textBlock.type === 'text' ? textBlock.text : ''

      return {
        content,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  const latencyMs = Date.now() - startTime
  return {
    error: lastError?.message ?? 'Unknown error after retries',
    content: null,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs,
  }
}

interface LogLLMCallDetails {
  orgId: string
  userId: string
  promptKey: string
  promptVersion: number
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status: string
  errorMessage?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logLLMCall(supabase: SupabaseClient<any>, details: LogLLMCallDetails) {
  const { error } = await supabase.from('llm_call_log').insert({
    org_id: details.orgId,
    user_id: details.userId,
    prompt_key: details.promptKey,
    prompt_version: details.promptVersion,
    input_tokens: details.inputTokens,
    output_tokens: details.outputTokens,
    latency_ms: details.latencyMs,
    status: details.status,
    error_message: details.errorMessage ?? null,
    related_entity_type: details.relatedEntityType ?? null,
    related_entity_id: details.relatedEntityId ?? null,
  })

  if (error) {
    console.error('Failed to log LLM call:', error)
  }
}
