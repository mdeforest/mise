import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes, ingredients, steps, rateLimits } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { runPipeline } from '@/lib/parse/pipeline'

const RATE_LIMIT = 20
const WINDOW_MS = 60 * 60 * 1000

async function checkRateLimit(userId: string): Promise<boolean> {
  const now = new Date()
  const existing = await db.select().from(rateLimits).where(eq(rateLimits.userId, userId)).limit(1)

  if (!existing.length) {
    await db.insert(rateLimits).values({ userId, count: 1, windowStart: now })
    return true
  }

  const record = existing[0]
  const windowExpired = now.getTime() - record.windowStart.getTime() > WINDOW_MS

  if (windowExpired) {
    await db.update(rateLimits).set({ count: 1, windowStart: now }).where(eq(rateLimits.userId, userId))
    return true
  }

  if (record.count >= RATE_LIMIT) return false

  await db.update(rateLimits).set({ count: record.count + 1 }).where(eq(rateLimits.userId, userId))
  return true
}

async function extractOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    const html = await res.text()
    const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await checkRateLimit(userId)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many imports — try again later' }, { status: 429 })
  }

  const forceDuplicate = req.nextUrl.searchParams.get('forceDuplicate') === '1'
  const body = await req.json() as { type: 'url' | 'text'; value: string }

  // Check for duplicate URL before parsing (skip if user explicitly chose to save a copy)
  if (body.type === 'url' && !forceDuplicate) {
    const existing = await db.select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.userId, userId), eq(recipes.sourceUrl, body.value)))
      .limit(1)

    if (existing.length) {
      return NextResponse.json({ duplicate: true, existingId: existing[0].id }, { status: 409 })
    }
  }

  const input = body.type === 'url'
    ? { type: 'url' as const, url: body.value }
    : { type: 'text' as const, content: body.value }

  const result = await runPipeline(input)

  if (!result.recipe) {
    const messages: Record<string, string> = {
      fetch_failed: "Couldn't read this page — try pasting the recipe text instead.",
      parse_failed: "Couldn't read this page — try pasting the recipe text instead.",
      service_error: 'Something went wrong on our end — please try again in a moment.',
    }
    return NextResponse.json(
      { error: messages[result.error] ?? 'Unknown error' },
      { status: result.error === 'service_error' ? 502 : 422 }
    )
  }

  const parsed = result.recipe
  const thumbnailUrl = parsed.thumbnailUrl
    ?? (body.type === 'url' ? await extractOgImage(body.value) : null)

  const [recipe] = await db.insert(recipes).values({
    userId,
    title: parsed.title,
    servings: parsed.servings?.toString() ?? null,
    sourceUrl: body.type === 'url' ? body.value : null,
    thumbnailUrl,
  }).returning()

  if (parsed.ingredients.length) {
    await db.insert(ingredients).values(
      parsed.ingredients.map((ing, i) => ({
        recipeId: recipe.id,
        name: ing.name,
        quantity: ing.quantity?.toString() ?? null,
        unit: ing.unit,
        order: i,
      }))
    )
  }

  if (parsed.steps.length) {
    await db.insert(steps).values(
      parsed.steps.map((step) => ({
        recipeId: recipe.id,
        order: step.order,
        text: step.text,
      }))
    )
  }

  return NextResponse.json({ id: recipe.id }, { status: 201 })
}
