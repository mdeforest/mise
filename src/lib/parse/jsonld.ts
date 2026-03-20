import type { ParsedRecipe } from '@/types/recipe'

interface SchemaRecipe {
  '@type': string
  name?: string
  recipeYield?: string | number
  recipeIngredient?: string[]
  recipeInstructions?: Array<{ text: string } | string> | string
  image?: string | string[] | { url: string }
}

/**
 * Safely parse a fraction string like "1/2" or "3" into a number.
 * Only accepts digits, forward slash, and decimal point — no code execution.
 */
function parseFraction(raw: string): number | null {
  const trimmed = raw.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed)
  const parts = trimmed.split('/')
  if (parts.length === 2) {
    const num = parseFloat(parts[0])
    const den = parseFloat(parts[1])
    if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den
  }
  return null
}

function parseIngredient(raw: string): { name: string; quantity: number | null; unit: string | null } {
  // Match patterns like "2 cups flour", "1/2 tsp salt", "200g pasta"
  const match = raw.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.+)$/)
  if (!match) return { name: raw, quantity: null, unit: null }
  const quantity = parseFraction(match[1])
  const unit = match[2] ?? null
  const name = match[3]
  return { name, quantity, unit }
}

function extractImage(image: SchemaRecipe['image']): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return typeof image[0] === 'string' ? image[0] : (image[0] as { url: string }).url
  return (image as { url: string }).url ?? null
}

function extractSteps(instructions: SchemaRecipe['recipeInstructions']): Array<{ order: number; text: string }> {
  if (!instructions) return []
  if (typeof instructions === 'string') return [{ order: 1, text: instructions }]
  return instructions.map((step, i) => ({
    order: i + 1,
    text: typeof step === 'string' ? step : step.text,
  }))
}

/**
 * Flatten a JSON-LD value into a list of typed objects.
 * Handles bare objects, arrays, and @graph wrappers (used by sites like Serious Eats).
 */
function flattenItems(data: unknown): SchemaRecipe[] {
  if (Array.isArray(data)) return data.flatMap(flattenItems)
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>
    if ('@graph' in obj && Array.isArray(obj['@graph'])) return flattenItems(obj['@graph'])
    return [obj as unknown as SchemaRecipe]
  }
  return []
}

export function extractJsonLd(html: string): ParsedRecipe | null {
  // Accept both double and single quotes around the type attribute value
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]) as unknown
      const items = flattenItems(data)
      const recipe = items.find((item) => item['@type'] === 'Recipe')

      if (!recipe) continue
      if (!recipe.name || !recipe.recipeIngredient?.length || !recipe.recipeInstructions) continue

      const steps = extractSteps(recipe.recipeInstructions)
      if (!steps.length) continue

      return {
        title: recipe.name,
        servings: recipe.recipeYield ? parseFloat(String(recipe.recipeYield)) || null : null,
        thumbnailUrl: extractImage(recipe.image),
        ingredients: recipe.recipeIngredient.map(parseIngredient),
        steps,
      }
    } catch {
      continue
    }
  }

  return null
}
