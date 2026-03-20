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
      const text = await res.text()
      let message = 'Something went wrong.'
      try { message = (JSON.parse(text) as { error: string }).error ?? message } catch { /* non-JSON error */ }
      setError(message)
      setLoading(false)
      return
    }

    const data = await res.json() as { id: string }
    router.push(`/recipes/${data.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full bg-surface-low p-1">
        {(['url', 'text'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setValue('') }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors
              ${tab === t ? 'bg-surface-lowest text-on-surface shadow-sm' : 'text-secondary'}`}
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
          className="w-full rounded-xl bg-surface-highest px-4 py-3 text-on-surface placeholder:text-secondary outline-none focus:bg-surface-lowest focus:outline-2 focus:outline-offset-0 focus:outline-ghost-border/20 transition-colors"
        />
      ) : (
        <textarea
          placeholder="Paste the recipe text here..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          className="w-full rounded-xl bg-surface-highest px-4 py-3 text-on-surface placeholder:text-secondary outline-none focus:bg-surface-lowest focus:outline-2 focus:outline-offset-0 focus:outline-ghost-border/20 transition-colors"
        />
      )}

      {error && <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</p>}

      <button
        onClick={handleImport}
        disabled={loading || !value.trim()}
        className="w-full rounded-full bg-linear-to-br from-primary to-primary-container py-4 text-base font-medium text-on-primary transition-opacity disabled:opacity-50 active:opacity-80"
      >
        {loading ? 'Importing...' : 'Import Recipe'}
      </button>
    </div>
  )
}
