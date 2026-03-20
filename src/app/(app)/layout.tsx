import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface pb-16">
      {children}
      <BottomNav />
    </div>
  )
}
