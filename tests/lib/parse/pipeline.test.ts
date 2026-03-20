import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/parse/jsonld', () => ({ extractJsonLd: vi.fn() }))
vi.mock('@/lib/parse/gemini', () => ({ parseWithGemini: vi.fn() }))

import { runPipeline } from '@/lib/parse/pipeline'
import { extractJsonLd } from '@/lib/parse/jsonld'
import { parseWithGemini } from '@/lib/parse/gemini'

const mockExtract = extractJsonLd as ReturnType<typeof vi.fn>
const mockGemini = parseWithGemini as ReturnType<typeof vi.fn>

const MOCK_RECIPE = {
  title: 'Test Recipe',
  servings: 2,
  thumbnailUrl: null,
  ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
  steps: [{ order: 1, text: 'Mix.' }],
}

beforeEach(() => vi.clearAllMocks())

describe('runPipeline', () => {
  it('returns JSON-LD result and skips Gemini when JSON-LD succeeds', async () => {
    mockExtract.mockReturnValue(MOCK_RECIPE)
    const result = await runPipeline({ type: 'text', content: '<html>...</html>' })
    expect(result.recipe).toEqual(MOCK_RECIPE)
    expect(mockGemini).not.toHaveBeenCalled()
  })

  it('falls back to Gemini when JSON-LD returns null', async () => {
    mockExtract.mockReturnValue(null)
    mockGemini.mockResolvedValue(MOCK_RECIPE)
    const result = await runPipeline({ type: 'text', content: 'some text' })
    expect(result.recipe).toEqual(MOCK_RECIPE)
    expect(mockGemini).toHaveBeenCalled()
  })

  it('returns error when both JSON-LD and Gemini fail', async () => {
    mockExtract.mockReturnValue(null)
    mockGemini.mockResolvedValue(null)
    const result = await runPipeline({ type: 'text', content: 'garbage' })
    expect(result.recipe).toBeNull()
    expect(result.error).toBe('parse_failed')
  })

  it('rejects input exceeding 50000 characters', async () => {
    const result = await runPipeline({ type: 'text', content: 'x'.repeat(50001) })
    expect(result.error).toBe('input_too_long')
    expect(mockGemini).not.toHaveBeenCalled()
  })
})
