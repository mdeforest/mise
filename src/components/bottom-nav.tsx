'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, PlusCircleIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { HomeIcon as HomeIconSolid, PlusCircleIcon as PlusCircleIconSolid, ShoppingCartIcon as ShoppingCartIconSolid } from '@heroicons/react/24/solid'

const NAV_ITEMS = [
  { href: '/', label: 'Home', Icon: HomeIcon, ActiveIcon: HomeIconSolid },
  { href: '/add', label: 'Add', Icon: PlusCircleIcon, ActiveIcon: PlusCircleIconSolid },
  { href: '/shopping-list', label: 'List', Icon: ShoppingCartIcon, ActiveIcon: ShoppingCartIconSolid },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-lowest">
      <ul className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon, ActiveIcon }) => {
          const active = pathname === href
          const Ico = active ? ActiveIcon : Icon
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors
                  ${active ? 'text-primary' : 'text-secondary'}`}
              >
                <Ico className="h-6 w-6" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
