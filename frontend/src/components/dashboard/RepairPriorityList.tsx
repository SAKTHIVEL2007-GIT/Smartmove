import type { Repair } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge'

interface RepairPriorityListProps {
  repairs: Repair[]
}

function getRiskColor(score: number): string {
  if (score >= 80) return 'text-risk-critical'
  if (score >= 60) return 'text-risk-high'
  if (score >= 40) return 'text-risk-medium'
  return 'text-risk-low'
}

export default function RepairPriorityList({ repairs }: RepairPriorityListProps) {
  return (
    <div className="space-y-2">
      {repairs.map((r, i) => (
        <div key={r.id} className="flex items-start gap-3 p-3 bg-navy-600 rounded-lg border border-gray-800">
          {/* Priority badge */}
          <div className="flex-shrink-0 w-6 h-6 rounded bg-navy-500 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 mt-0.5">
            {i + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium text-white truncate">
                {r.road?.name ?? `Road #${r.road_id}`}
              </span>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{r.reason ?? '—'}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {r.before_risk != null && (
                <span className="text-xs text-gray-400">
                  Risk: <span className={`font-medium ${getRiskColor(r.before_risk)}`}>{r.before_risk}/100</span>
                </span>
              )}
              {r.assigned_to && (
                <span className="text-xs text-gray-500 truncate">{r.assigned_to}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {repairs.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-6">No pending repairs</div>
      )}
    </div>
  )
}
