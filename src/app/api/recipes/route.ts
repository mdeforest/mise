import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.select({
    id: recipes.id,
    title: recipes.title,
    sourceUrl: recipes.sourceUrl,
    thumbnailUrl: recipes.thumbnailUrl,
    createdAt: recipes.createdAt,
  })
    .from(recipes)
    .where(eq(recipes.userId, userId))
    .orderBy(desc(recipes.createdAt))

  return NextResponse.json(result)
}
