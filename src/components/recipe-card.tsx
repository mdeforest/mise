import Link from 'next/link'
import Image from 'next/image'

interface RecipeCardProps {
  id: string
  title: string
  sourceUrl: string | null
  thumbnailUrl: string | null
}

function getDomain(url: string | null): string | null {
  if (!url) return null
  try { return new URL(url).hostname.replace('www.', '') } catch { return null }
}

export function RecipeCard({ id, title, sourceUrl, thumbnailUrl }: RecipeCardProps) {
  return (
    <Link href={`/recipes/${id}`} className="flex items-center gap-3 rounded-lg bg-surface-lowest p-3 shadow-[0_8px_32px_rgba(27,28,26,0.05)] active:opacity-70">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-high">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-display font-normal text-on-surface">{title}</p>
        {getDomain(sourceUrl) && (
          <p className="text-xs text-secondary">{getDomain(sourceUrl)}</p>
        )}
      </div>
    </Link>
  )
}
