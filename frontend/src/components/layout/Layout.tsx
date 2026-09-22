import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'

interface LayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 md:ml-60 min-w-0 h-full">
        <TopBar
          title={title}
          subtitle={subtitle}
          onToggleMobileMenu={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 pb-20 md:pb-5">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}

