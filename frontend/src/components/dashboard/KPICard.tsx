interface KPICardProps {
  label: string
  value: number | string
  sublabel?: string
  color?: 'default' | 'red' | 'amber' | 'green' | 'blue'
  icon?: string
}

const colorMap = {
  default: 'text-white',
  red: 'text-risk-critical',
  amber: 'text-risk-medium',
  green: 'text-risk-low',
  blue: 'text-accent-light',
}

export default function KPICard({ label, value, sublabel, color = 'default', icon }: KPICardProps) {
  return (
    <div className="card flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="card-header mb-0">{label}</span>
        {icon && <span className="text-lg opacity-60">{icon}</span>}
      </div>
      <div className={`text-3xl font-bold font-mono ${colorMap[color]}`}>{value}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>}
    </div>
  )
}
