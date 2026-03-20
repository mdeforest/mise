import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { shoppingListItems } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await db.select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.userId, userId))
    .orderBy(asc(shoppingListItems.order))

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Array<{
    id: string
    recipeId: string | null
    name: string
    quantity: number | null
    unit: string | null
    checked: boolean
    order: number
  }>

  // Full list replacement
  await db.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId))

  if (body.length) {
    await db.insert(shoppingListItems).values(
      body.map((item) => ({
        id: item.id,
        userId,
        recipeId: item.recipeId,
        name: item.name,
        quantity: item.quantity?.toString() ?? null,
        unit: item.unit,
        checked: item.checked,
        order: item.order,
      }))
    )
  }

  return new NextResponse(null, { status: 204 })
}
