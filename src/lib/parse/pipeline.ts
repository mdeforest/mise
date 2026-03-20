import { extractJsonLd } from './jsonld'
import { parseWithGemini } from './gemini'
import type { ParsedRecipe } from '@/types/recipe'

export type PipelineInput =
  | { type: 'url'; url: string }
  | { type: 'text'; content: string }

export type PipelineResult =
  | { recipe: ParsedRecipe; error: null }
  | { recipe: null; error: 'input_too_long' | 'fetch_failed' | 'parse_failed' | 'service_error' }

const MAX_INPUT_LENGTH = 50_000

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  let html: string

  if (input.type === 'url') {
    try {
      const res = await fetch(input.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipePaste/1.0)' },
        signal: AbortSignal.timeout(10_000),
      })
      html = await res.text()
    } catch {
      return { recipe: null, error: 'fetch_failed' }
    }
  } else {
    html = input.content
  }

  if (html.length > MAX_INPUT_LENGTH) {
    return { recipe: null, error: 'input_too_long' }
  }

  // Step 1: JSON-LD
  const jsonLdResult = extractJsonLd(html)
  if (jsonLdResult) return { recipe: jsonLdResult, error: null }

  // Step 2: Gemini
  try {
    const geminiResult = await parseWithGemini(html)
    if (geminiResult) return { recipe: geminiResult, error: null }
    return { recipe: null, error: 'parse_failed' }
  } catch {
    return { recipe: null, error: 'service_error' }
  }
}
