interface TopBarProps {
  title: string
  subtitle?: string
  onToggleMobileMenu?: () => void
}

export default function TopBar({ title, subtitle, onToggleMobileMenu }: TopBarProps) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <header className="h-14 bg-navy-800 border-b border-gray-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-40">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-gray-300 hover:text-white p-1 rounded hover:bg-navy-700 text-lg"
            aria-label="Open navigation menu"
          >
            ☰
          </button>
        )}
        <div>
          <h1 className="text-white font-semibold text-sm sm:text-base leading-none">{title}</h1>
          {subtitle && <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>


      <div className="flex items-center gap-4">
        {/* Demo badge */}
        <span className="demo-banner">⚠ DEMO DATA</span>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>

        {/* Time */}
        <div className="text-right hidden sm:block">
          <div className="text-white text-sm font-mono">{timeStr}</div>
          <div className="text-gray-500 text-[10px]">{dateStr}</div>
        </div>
      </div>
    </header>
  )
}
