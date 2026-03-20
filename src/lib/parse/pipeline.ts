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
 * Strips non-text HTML elements and returns plain text trimmed to MAX_INPUT_LENGTH.
 * Prefers content inside <main> or <article> to avoid stripping recipe text that
 * lives outside those containers on Next.js / SPA sites (where most content is in
 * __NEXT_DATA__ script tags and the visible HTML is a thin scaffold).
 */
function trimToRecipeText(html: string): string {
  // On Next.js / SPA pages the bulk of content lives in <script> tags.
  // Prefer the rendered <main> or <article> subtree when present so we don't
  // hand Gemini a nearly-empty string after stripping scripts.
  const mainMatch = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html)
    ?? /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html)
  const source = mainMatch ? mainMatch[1] : html

  const stripped = source
    // Remove elements that never contain readable recipe text
    .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
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
