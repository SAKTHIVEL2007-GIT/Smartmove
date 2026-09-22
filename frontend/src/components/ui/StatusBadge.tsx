interface StatusBadgeProps {
  status: string
}

const statusMap: Record<string, string> = {
  monitored: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'at-risk': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'pending-repair': 'bg-red-500/10 text-red-400 border-red-500/30',
  repaired: 'bg-green-500/10 text-green-400 border-green-500/30',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'in-progress': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  resolved: 'bg-green-500/10 text-green-400 border-green-500/30',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cls = statusMap[status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/30'
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      {status.replace(/-/g, ' ').toUpperCase()}
    </span>
  )
}
