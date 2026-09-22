import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import { useRepairPriority, useUpdateRepairStatus } from '@/hooks/useApi'
import type { MunicipalRepairStatus, PrioritizedRepairItem } from '@/types'

const STATUS_OPTIONS: MunicipalRepairStatus[] = [
  'New', 'Verified', 'High Priority', 'Assigned', 'Under Repair', 'Completed',
]

function urgencyColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#f59e0b'
  return '#10b981'
}

function priorityBadge(level: string) {
  const cls =
    level === 'VERY HIGH' ? 'bg-red-900/50 text-red-300 border-red-700'
    : level === 'HIGH' ? 'bg-orange-900/50 text-orange-300 border-orange-700'
    : level === 'MEDIUM' ? 'bg-amber-900/50 text-amber-300 border-amber-700'
    : 'bg-gray-800 text-gray-400 border-gray-600'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>{level}</span>
}

function statusBadge(status: string) {
  const cls =
    status === 'Completed' ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
    : status === 'Under Repair' ? 'bg-blue-900/50 text-blue-300 border-blue-700'
    : status === 'Assigned' ? 'bg-purple-900/50 text-purple-300 border-purple-700'
    : status === 'High Priority' ? 'bg-red-900/50 text-red-300 border-red-700'
    : status === 'Verified' ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700'
    : 'bg-gray-800 text-gray-400 border-gray-600'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}>{status}</span>
}

function RepairRow({ item, onStatusChange }: { item: PrioritizedRepairItem; onStatusChange: (id: number, status: MunicipalRepairStatus) => void }) {
  const [expanded, setExpanded] = useState(false)
  const urgencyCol = urgencyColor(item.urgency_score)

  return (
    <div className="border border-gray-800 rounded-lg bg-navy-700 overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        {/* Rank */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold border"
          style={{ color: urgencyCol, borderColor: urgencyCol + '55', backgroundColor: urgencyCol + '15' }}
        >
          #{item.priority_rank}
        </div>

        {/* Road + hazard */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{item.road_name}</div>
          <div className="text-gray-400 text-xs truncate mt-0.5">{item.hazard_summary}</div>
        </div>

        {/* Priority level */}
        <div className="flex-shrink-0">{priorityBadge(item.priority_level)}</div>

        {/* Urgency score */}
        <div className="flex-shrink-0 text-center">
          <div className="text-lg font-bold font-mono" style={{ color: urgencyCol }}>{Math.round(item.urgency_score)}</div>
          <div className="text-xs text-gray-500">urgency</div>
        </div>

        {/* Status selector */}
        <select
          className="flex-shrink-0 bg-navy-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent"
          value={item.status}
          onChange={(e) => onStatusChange(item.repair_id ?? item.road_id, e.target.value as MunicipalRepairStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-gray-500 hover:text-accent text-xs px-2 py-1 rounded hover:bg-navy-600 transition-colors"
        >
          {expanded ? '▲ hide' : '▼ reasons'}
        </button>
      </div>

      {/* Status badge + risk score */}
      <div className="flex items-center gap-3 px-4 pb-2">
        {statusBadge(item.status)}
        <span className="text-xs text-gray-500">Risk Score:</span>
        <span className="text-xs font-mono font-bold" style={{ color: urgencyCol }}>{Math.round(item.risk_score)}/100</span>
        {item.assigned_to && (
          <span className="text-xs text-gray-500">→ {item.assigned_to}</span>
        )}
      </div>

      {/* Expanded reasons */}
      {expanded && item.reasons.length > 0 && (
        <div className="px-4 pb-3 pt-2 border-t border-gray-800 bg-navy-900/50">
          <div className="text-xs text-gray-500 mb-1 font-semibold">AI Reasoning:</div>
          <ul className="space-y-1">
            {item.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="text-accent mt-0.5 flex-shrink-0">›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function RepairIntelligence() {
  const { data: repairs = [], isLoading } = useRepairPriority()
  const updateStatus = useUpdateRepairStatus()
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = filterStatus === 'all' ? repairs : repairs.filter((r) => r.status === filterStatus)

  function handleStatusChange(id: number, status: MunicipalRepairStatus) {
    updateStatus.mutate({ id, status })
  }

  const completedCount = repairs.filter((r) => r.status === 'Completed').length
  const veryHighCount = repairs.filter((r) => r.priority_level === 'VERY HIGH').length

  return (
    <Layout title="Repair Intelligence" subtitle="AI-prioritized municipal repair queue with explainable reasoning">
      <DemoDataBanner />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-white font-mono">{repairs.length}</div>
          <div className="text-xs text-gray-400 mt-1">Total Roads</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-red-400 font-mono">{veryHighCount}</div>
          <div className="text-xs text-gray-400 mt-1">Very High Priority</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400 font-mono">{completedCount}</div>
          <div className="text-xs text-gray-400 mt-1">Completed</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-accent font-mono">
            {repairs.length > 0 ? Math.round(repairs.reduce((s, r) => s + r.urgency_score, 0) / repairs.length) : 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Avg Urgency</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-500">Filter by status:</span>
        {(['all', ...STATUS_OPTIONS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              filterStatus === s
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-gray-400 hover:text-white hover:bg-navy-600 border border-transparent'
            }`}
          >
            {s === 'all' ? `All (${repairs.length})` : s}
          </button>
        ))}
      </div>

      {/* Repair queue */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-16 bg-navy-600" />
          ))
        ) : (
          filtered.map((item) => (
            <RepairRow key={item.road_id} item={item} onStatusChange={handleStatusChange} />
          ))
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="card text-center text-gray-500 text-sm py-8">No repairs in this status</div>
        )}
      </div>
    </Layout>
  )
}


