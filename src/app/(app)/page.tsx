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
    <main className="mx-auto max-w-lg pt-8 pb-6">
      <h1 className="mb-6 pl-6 font-display text-4xl text-on-surface">Mise</h1>
      <div className="mb-6 px-4">
        <input
          type="search"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full bg-surface-highest px-5 py-3 text-on-surface placeholder:text-secondary outline-none focus:bg-surface-lowest focus:outline-2 focus:outline-offset-0 focus:outline-ghost-border/20 transition-colors"
        />
      </div>
      <div className="rounded-xl bg-surface-low px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-secondary">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-secondary">
            {recipes.length === 0 ? 'No recipes yet — add one!' : 'No results.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => <RecipeCard key={r.id} {...r} />)}
          </div>
        )}
      </div>
    </main>
  )
}
