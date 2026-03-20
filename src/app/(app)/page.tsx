'use client'
import { useEffect, useState } from 'react'
import { RecipeCard } from '@/components/recipe-card'

interface RecipeSummary {
  id: string
  title: string
  sourceUrl: string | null
  thumbnailUrl: string | null
}

export default function HomePage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.ok ? r.json() : [])
      .then((data: RecipeSummary[]) => { setRecipes(data); setLoading(false) })
  }, [])

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-stone-900">My Recipes</h1>
      <input
        type="search"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-emerald-500"
      />
      {loading ? (
        <p className="text-center text-stone-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-stone-400">
          {recipes.length === 0 ? 'No recipes yet — add one!' : 'No results.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => <RecipeCard key={r.id} {...r} />)}
        </div>
      )}
    </main>
  )
}
