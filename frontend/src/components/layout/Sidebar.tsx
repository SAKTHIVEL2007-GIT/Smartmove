import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Overview', icon: '⬡' },
  { path: '/landing', label: 'Landing Page', icon: '🌟' },
  { path: '/map', label: 'SafeCity Map', icon: '🗺' },
  { path: '/ai-vision', label: 'AI Vision', icon: '👁' },
  { path: '/danger-zones', label: 'Danger Zones', icon: '⚠' },
  { path: '/repair', label: 'Repair Intelligence', icon: '🔧' },
  { path: '/routes', label: 'Safer Routes', icon: '↗' },
  { path: '/junction', label: 'Smart Junction', icon: '⛌' },
  { path: '/junction-display', label: 'Roadside Display', icon: '🚨' },
  { path: '/digital-twin', label: 'Digital Twin', icon: '◈' },
  { path: '/analytics', label: 'Analytics', icon: '📊' },
  { path: '/reports', label: 'Citizen Reports', icon: '📋' },
  { path: '/interventions', label: 'Intervention Impact', icon: '📈' },
  { path: '/privacy', label: 'Privacy & Ethics', icon: '🛡' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-navy-800 border-r border-gray-800 flex flex-col z-50 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-xs font-black shadow-lg shadow-accent/20">
              SC
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none tracking-tight">SafeCity Loop</div>
              <div className="text-gray-400 text-[10px] mt-0.5 font-medium">Urban Road Safety V2</div>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-gray-400 hover:text-white text-lg p-1 rounded hover:bg-navy-700"
              aria-label="Close navigation"
            >
              ✕
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                isActive ? 'sidebar-item-active' : 'sidebar-item'
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 bg-navy-900/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-accent font-semibold tracking-wider uppercase">V2 Connected</span>
            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
              [DEMO]
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Detect → Action → Measure</div>
        </div>
      </aside>
    </>
  )
}

