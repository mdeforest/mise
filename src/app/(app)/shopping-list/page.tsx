import { ShoppingListView } from '@/components/shopping-list-view'

export default function ShoppingListPage() {
  return (
    <main className="mx-auto max-w-lg pt-8 pb-6">
      <h1 className="mb-6 pl-6 font-display text-4xl text-on-surface">Shopping List</h1>
      <div className="rounded-xl bg-surface-low px-4 py-4">
        <ShoppingListView />
      </div>
    </main>
  )
}
