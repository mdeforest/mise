'use client'

const SCALES = [0.5, 1, 2, 3] as const
export type Scale = typeof SCALES[number]

interface ScaleControlProps {
  value: Scale
  onChange: (scale: Scale) => void
}

const LABELS: Record<Scale, string> = { 0.5: '½x', 1: '1x', 2: '2x', 3: '3x' }

export function ScaleControl({ value, onChange }: ScaleControlProps) {
  return (
    <div className="flex gap-2">
      {SCALES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors
            ${s === value ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600'}`}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  )
}

/** Format a scaled quantity as a human-readable string. Returns '' for null quantities. */
export function scaleQuantity(quantity: number | null, scale: number): string {
  if (quantity === null) return ''
  const scaled = quantity * scale
  if (scaled === 0.5) return '½'
  if (scaled === 1.5) return '1½'
  if (scaled === 0.25) return '¼'
  if (Number.isInteger(scaled)) return String(scaled)
  return scaled.toFixed(1).replace(/\.0$/, '')
}
