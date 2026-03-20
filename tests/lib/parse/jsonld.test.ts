import { describe, it, expect } from 'vitest'
import { extractJsonLd } from '@/lib/parse/jsonld'

const COMPLETE_HTML = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Pasta Carbonara",
  "recipeYield": "4",
  "recipeIngredient": ["200g spaghetti", "100g pancetta", "2 eggs"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Boil pasta." },
    { "@type": "HowToStep", "text": "Fry pancetta." }
  ],
  "image": "https://example.com/pasta.jpg"
}
</script>
</head></html>
`

const INCOMPLETE_HTML = `
<html><head>
<script type="application/ld+json">
{ "@type": "Recipe", "name": "Pasta", "recipeIngredient": ["200g pasta"] }
</script>
</head></html>
`

const NO_RECIPE_HTML = `<html><body><p>Just text</p></body></html>`

describe('extractJsonLd', () => {
  it('returns parsed recipe when JSON-LD is complete', () => {
    const result = extractJsonLd(COMPLETE_HTML)
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Pasta Carbonara')
    expect(result!.servings).toBe(4)
    expect(result!.ingredients).toHaveLength(3)
    expect(result!.steps).toHaveLength(2)
    expect(result!.thumbnailUrl).toBe('https://example.com/pasta.jpg')
  })

  it('returns null when recipeInstructions is missing', () => {
    expect(extractJsonLd(INCOMPLETE_HTML)).toBeNull()
  })

  it('returns null when no Recipe JSON-LD is present', () => {
    expect(extractJsonLd(NO_RECIPE_HTML)).toBeNull()
  })

  it('parses ingredient strings into name/quantity/unit', () => {
    const result = extractJsonLd(COMPLETE_HTML)
    expect(result!.ingredients[0]).toMatchObject({ name: expect.any(String) })
  })
})
