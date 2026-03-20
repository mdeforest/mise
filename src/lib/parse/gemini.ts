import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ParsedRecipe } from '@/types/recipe'

const PROMPT = `Extract the recipe from the following text or HTML. Return ONLY valid JSON in this exact shape:
{
  "title": "string",
  "servings": number | null,
  "ingredients": [{ "name": "string", "quantity": number | null, "unit": string | null }],
  "steps": [{ "order": number, "text": "string" }]
}
Quantities should be numbers (e.g. 2, 0.5). If quantity is not a number (e.g. "a pinch", "to taste"), set quantity and unit to null and include the full phrase in "name".
Return ONLY the JSON object, no markdown, no explanation.

TEXT:
`

export async function parseWithGemini(content: string): Promise<ParsedRecipe | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent(PROMPT + content)
    const text = result.response.text().trim()

    // Strip markdown code fences if present
    const json = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(json) as {
      title: string
      servings: number | null
      ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>
      steps: Array<{ order: number; text: string }>
    }

    if (!parsed.ingredients?.length && !parsed.steps?.length) return null

    return {
      title: parsed.title,
      servings: parsed.servings,
      thumbnailUrl: null,
      ingredients: parsed.ingredients ?? [],
      steps: parsed.steps ?? [],
    }
  } catch (err) {
    console.error('[gemini] parseWithGemini failed:', err)
    return null
  }
}
