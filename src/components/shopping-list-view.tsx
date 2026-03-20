'use client'
import { useShoppingList } from '@/hooks/use-shopping-list'
import { scaleQuantity } from '@/components/scale-control'

export function ShoppingListView() {
  const { items, toggle, clearChecked, clearAll } = useShoppingList()

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  if (items.length === 0) {
    return <p className="pt-12 text-center text-secondary">Your shopping list is empty.</p>
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {checked.length > 0 && (
          <button onClick={clearChecked}
            className="rounded-full px-4 py-2 text-sm font-medium text-primary active:opacity-70">
            Clear checked ({checked.length})
          </button>
        )}
        <button onClick={clearAll}
          className="rounded-full bg-error-container px-4 py-2 text-sm font-medium text-on-error-container active:opacity-70">
          Clear all
        </button>
      </div>

      <ul className="flex flex-col gap-1">
        {unchecked.map((item) => (
          <li key={item.id}>
            <button onClick={() => toggle(item.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-surface-lowest p-4 text-left active:opacity-70">
              <div className="h-6 w-6 shrink-0 rounded-full border-2 border-secondary" />
              <span className="text-on-surface">
                {item.quantity !== null && (
                  <span className="font-medium">{scaleQuantity(item.quantity, 1)}{item.unit ? ` ${item.unit}` : ''} </span>
                )}
                {item.quantity === null && <span className="text-secondary">~ </span>}
                {item.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {checked.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-secondary">Checked</p>
          <ul className="flex flex-col gap-1">
            {checked.map((item) => (
              <li key={item.id}>
                <button onClick={() => toggle(item.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-low p-4 text-left active:opacity-70">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                    <svg className="h-3 w-3 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="line-through text-secondary">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
