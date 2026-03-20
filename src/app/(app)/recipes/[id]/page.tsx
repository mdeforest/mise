'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ScaleControl, scaleQuantity } from '@/components/scale-control'
import { useShoppingList } from '@/hooks/use-shopping-list'
import type { Recipe } from '@/types/recipe'
import type { Scale } from '@/components/scale-control'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [scale, setScale] = useState<Scale>(1)
  const [loading, setLoading] = useState(true)
  const { addIngredients } = useShoppingList()

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: Recipe | null) => { setRecipe(data); setLoading(false) })
  }, [id])

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-stone-400">Loading...</p></main>
  if (!recipe) return <main className="flex min-h-screen items-center justify-center"><p className="text-stone-400">Recipe not found.</p></main>

  const hasEmptyFields = !recipe.ingredients.length || !recipe.steps.length

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-8">
      <button onClick={() => router.back()} className="mb-4 text-sm text-stone-500">← Back</button>

      <h1 className="mb-1 text-2xl font-bold text-stone-900">{recipe.title}</h1>
      {recipe.sourceUrl && (
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="mb-4 block text-sm text-emerald-600 underline">
          View original
        </a>
      )}

      {hasEmptyFields && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Some fields may be missing from this recipe.
        </div>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-stone-700">Servings</h2>
          {recipe.servings && (
            <span className="text-sm text-stone-500">
              {scaleQuantity(Number(recipe.servings), scale)} servings
            </span>
          )}
        </div>
        <ScaleControl value={scale} onChange={setScale} />
      </section>

      {recipe.ingredients.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-3 font-semibold text-stone-700">Ingredients</h2>
          <ul className="flex flex-col gap-2">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="text-stone-800">
                {ing.quantity === null ? (
                  <span className="text-stone-400">~ </span>
                ) : (
                  <span className="font-medium">{scaleQuantity(Number(ing.quantity), scale)}{ing.unit ? ` ${ing.unit}` : ''} </span>
                )}
                {ing.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        onClick={() => addIngredients(recipe.ingredients.map((ing) => ({
          id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          recipeId: recipe.id,
          name: ing.name,
          quantity: ing.quantity !== null ? Number(ing.quantity) * scale : null,
          unit: ing.unit,
          checked: false,
          order: ing.order,
        })))}
        className="mb-6 w-full rounded-xl bg-stone-100 py-3 font-medium text-stone-700 active:opacity-70"
      >
        Add to Shopping List
      </button>

      {recipe.steps.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-stone-700">Instructions</h2>
          <ol className="flex flex-col gap-4">
            {recipe.steps.map((step) => (
              <li key={step.id} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                  {step.order}
                </span>
                <p className="text-stone-800 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  )
}
