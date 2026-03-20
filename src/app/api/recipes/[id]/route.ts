import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes, ingredients, steps } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [recipe] = await db.select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .limit(1)

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ings = await db.select().from(ingredients)
    .where(eq(ingredients.recipeId, id))
    .orderBy(asc(ingredients.order))

  const stps = await db.select().from(steps)
    .where(eq(steps.recipeId, id))
    .orderBy(asc(steps.order))

  return NextResponse.json({ ...recipe, ingredients: ings, steps: stps })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await db.delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))

  return new NextResponse(null, { status: 204 })
}
