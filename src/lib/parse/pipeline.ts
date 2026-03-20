import { extractJsonLd } from './jsonld'
import { parseWithGemini } from './gemini'
import type { ParsedRecipe } from '@/types/recipe'

export type PipelineInput =
  | { type: 'url'; url: string }
  | { type: 'text'; content: string }

export type PipelineResult =
  | { recipe: ParsedRecipe; error: null }
  | { recipe: null; error: 'fetch_failed' | 'parse_failed' | 'service_error' }

const MAX_INPUT_LENGTH = 50_000

/**
 * Strips HTML boilerplate (scripts, styles, nav, header, footer) and returns
 * plain text. Falls back to truncation if the stripped text is still too long.
 */
function trimToRecipeText(html: string): string {
  // Remove elements that never contain recipe content
  const stripped = html
    .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Strip remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()

  return stripped.length <= MAX_INPUT_LENGTH
    ? stripped
    : stripped.slice(0, MAX_INPUT_LENGTH)
}

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

  // When content is too long, strip HTML noise and truncate if needed
  const content = html.length > MAX_INPUT_LENGTH ? trimToRecipeText(html) : html
  if (html.length > MAX_INPUT_LENGTH) {
    console.log(`[pipeline] oversized input: ${html.length} chars → trimmed to ${content.length} chars`)
  }

  // Step 1: JSON-LD (run against original HTML so tags are intact)
  const jsonLdResult = extractJsonLd(html)
  if (jsonLdResult) return { recipe: jsonLdResult, error: null }

  // Step 2: Gemini (use trimmed plain text if content was oversized)
  try {
    const geminiResult = await parseWithGemini(content)
    if (geminiResult) return { recipe: geminiResult, error: null }
    return { recipe: null, error: 'parse_failed' }
  } catch {
    return { recipe: null, error: 'service_error' }
  }
}
