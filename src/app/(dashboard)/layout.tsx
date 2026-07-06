import { Sidebar } from "@/components/Sidebar"
import { BottomNav } from "@/components/BottomNav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-[240px] pb-20 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
