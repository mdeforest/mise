import { ShoppingListView } from '@/components/shopping-list-view'

export default function ShoppingListPage() {
  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-stone-900">Shopping List</h1>
      <ShoppingListView />
    </main>
  )
}
