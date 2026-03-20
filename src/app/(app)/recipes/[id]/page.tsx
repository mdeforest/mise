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

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-secondary">Loading...</p></main>
  if (!recipe) return <main className="flex min-h-screen items-center justify-center"><p className="text-secondary">Recipe not found.</p></main>

  const hasEmptyFields = !recipe.ingredients.length || !recipe.steps.length

  return (
    <main className="mx-auto max-w-lg pb-8">
      <div className="px-4 pt-6">
        <button onClick={() => router.back()} className="mb-4 text-sm font-medium text-primary">← Back</button>
      </div>

      <h1 className="mb-2 pl-6 font-display text-6xl leading-tight text-on-surface">{recipe.title}</h1>
      {recipe.sourceUrl && (
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="mb-4 block pl-6 text-sm font-medium text-primary no-underline">
          View original
        </a>
      )}

      {hasEmptyFields && (
        <div className="mx-4 mb-4 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          Some fields may be missing from this recipe.
        </div>
      )}

      <section className="mb-6 px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-secondary">Servings</h2>
          {recipe.servings && (
            <span className="text-sm text-secondary">
              {scaleQuantity(Number(recipe.servings), scale)} servings
            </span>
          )}
        </div>
        <ScaleControl value={scale} onChange={setScale} />
      </section>

      {recipe.ingredients.length > 0 && (
        <section className="mb-4 px-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-secondary">Ingredients</h2>
          <div className="rounded-xl bg-surface-low px-4 py-3">
            <ul className="flex flex-col gap-4">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="text-on-surface">
                  {ing.quantity === null ? (
                    <span className="text-secondary">~ </span>
                  ) : (
                    <span className="font-medium">{scaleQuantity(Number(ing.quantity), scale)}{ing.unit ? ` ${ing.unit}` : ''} </span>
                  )}
                  {ing.name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="mb-6 px-4">
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
          className="w-full rounded-full bg-secondary-container py-3 font-medium text-on-secondary-container active:opacity-70"
        >
          Add to Shopping List
        </button>
      </div>

      {recipe.steps.length > 0 && (
        <section className="px-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-secondary">Instructions</h2>
          <div className="rounded-xl bg-surface-low px-4 py-4">
            <ol className="flex flex-col gap-8">
              {recipe.steps.map((step) => (
                <li key={step.id} className="relative pl-2">
                  {/* Wayfinder numeral: text-surface-high against bg-surface-low is intentionally near-invisible */}
                  <span
                    className="absolute -top-4 -left-2 font-display text-8xl leading-none text-surface-high select-none pointer-events-none"
                    aria-hidden="true"
                  >
                    {step.order}
                  </span>
                  <p className="relative text-on-surface leading-relaxed">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </main>
  )
}
