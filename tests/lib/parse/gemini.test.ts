import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return {
      getGenerativeModel: vi.fn(() => ({
        generateContent: mockGenerateContent,
      })),
    }
  }),
}))

import { parseWithGemini } from '@/lib/parse/gemini'

beforeEach(() => {
  mockGenerateContent.mockClear()
})

describe('parseWithGemini', () => {
  it('returns a ParsedRecipe on successful parse', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          title: 'Pasta Carbonara',
          servings: 4,
          ingredients: [{ name: 'spaghetti', quantity: 200, unit: 'g' }],
          steps: [{ order: 1, text: 'Boil pasta.' }],
        }),
      },
    })

    const result = await parseWithGemini('some recipe text')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Pasta Carbonara')
    expect(result!.ingredients).toHaveLength(1)
    expect(result!.steps).toHaveLength(1)
  })

  it('returns null when Gemini returns empty ingredients and steps', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ title: 'Unknown', servings: null, ingredients: [], steps: [] }),
      },
    })
    const result = await parseWithGemini('gibberish')
    expect(result).toBeNull()
  })

  it('returns null on API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'))
    const result = await parseWithGemini('some text')
    expect(result).toBeNull()
  })
})
