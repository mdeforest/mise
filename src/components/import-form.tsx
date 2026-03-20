'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'url' | 'text'

export function ImportForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('url')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!value.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: tab, value: value.trim() }),
    })

    if (res.status === 409) {
      const data = await res.json() as { duplicate: boolean; existingId: string }
      const choice = window.confirm(
        'You already saved this recipe.\n\nOK = View existing recipe\nCancel = Save a new copy'
      )
      if (choice) {
        router.push(`/recipes/${data.existingId}`)
      } else {
        const copyRes = await fetch('/api/parse?forceDuplicate=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: tab, value: value.trim() }),
        })
        if (copyRes.ok) {
          const copyData = await copyRes.json() as { id: string }
          router.push(`/recipes/${copyData.id}`)
        }
      }
      setLoading(false)
      return
    }

    if (!res.ok) {
      const data = await res.json() as { error: string }
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    const data = await res.json() as { id: string }
    router.push(`/recipes/${data.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-xl bg-stone-100 p-1">
        {(['url', 'text'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setValue('') }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors
              ${tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
          >
            {t === 'url' ? 'Paste URL' : 'Paste Text'}
          </button>
        ))}
      </div>

      {tab === 'url' ? (
        <input
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-emerald-500"
        />
      ) : (
        <textarea
          placeholder="Paste the recipe text here..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-emerald-500"
        />
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleImport}
        disabled={loading || !value.trim()}
        className="w-full rounded-xl bg-emerald-500 py-4 text-base font-semibold text-white transition-opacity disabled:opacity-50 active:opacity-80"
      >
        {loading ? 'Importing...' : 'Import Recipe'}
      </button>
    </div>
  )
}
