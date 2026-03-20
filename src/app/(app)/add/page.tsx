import { ImportForm } from '@/components/import-form'

export default function AddPage() {
  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Add Recipe</h1>
      <ImportForm />
    </main>
  )
}
