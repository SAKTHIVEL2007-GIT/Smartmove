import { NavLink } from 'react-router-dom'

const mobileTabs = [
  { path: '/', label: 'Home', icon: '⢡' },
  { path: '/map', label: 'Map', icon: '🟺' },
  { path: '/routes', label: 'Safe Route', icon: '↗' },
  { path: '/ai-vision', label: 'Hazards', icon: '👍' },
  { path: '/reports', label: 'Report', icon: '📃' },
  { path: '/danger-zones', label: 'Alerts', icon: '⚡' },
  { path: '/settings', label: 'Profile', icon: '⚙' },
]

export default function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-navy-950/95 backdrop-blur border-t border-gray-800 flex items-center justify-around px-1 z-50">
      {mobileTabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              isActive
                ? 'text-accent font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`
          }
        >
          <span className="text-lg leading-none mb-1">{tab.icon}</span>
          <span className="text-[0.65rem] leading-tight truncate max-w-[50px]">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
