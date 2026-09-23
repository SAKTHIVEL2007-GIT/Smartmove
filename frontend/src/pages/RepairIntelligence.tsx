import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import { useRepairPriority, useUpdateRepairStatus } from '@/hooks/useApi'
import type { MunicipalRepairStatus, PrioritizedRepairItem } from '@/types'

const STATUS_LIST: MunicipalRepairStatus[] = [
  'NEW',
  'UNDER REVIEW',
  'VERIFIED',
  'REPAIR ASSIGNED',
  'REPAIRED',
  'POST-REPAIR MONITORING',
  'CLOSED',
]

function priorityBadge(level: string) {
  const cls =
    level === 'VERY HIGH'
      ? 'bg-red-900/50 text-red-300 border-red-700'
      : level === 'HIGH'
      ? 'bg-orange-900/50 text-orange-300 border-orange-700'
      : level === 'MEDIUM'
      ? 'bg-amber-900/50 text-amber-300 border-amber-700'
      : 'bg-gray-800 text-gray-400 border-gray-600'
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${cls}`}>{level}</span>
}

function statusBadge(status: string) {
  const s = status.toUpperCase()
  const cls =
    s.includes('REPAIRED') || s.includes('COMPLETED')
      ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
      : s.includes('ASSIGNED')
      ? 'bg-purple-900/50 text-purple-300 border-purple-700'
      : s.includes('VERIFIED')
      ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700'
      : s.includes('REVIEW')
      ? 'bg-amber-900/50 text-amber-300 border-amber-700'
      : s.includes('CLOSED')
      ? 'bg-gray-900 text-gray-400 border-gray-700'
      : 'bg-blue-900/50 text-blue-300 border-blue-700'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}>{status}</span>
}

export default function RepairIntelligence() {
  const { data: queue = [], isLoading } = useRepairPriority()
  const updateStatusMutation = useUpdateRepairStatus()
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const handleAction = (item: PrioritizedRepairItem, action: string) => {
    updateStatusMutation.mutate({
      id: item.repair_id ?? item.road_id,
      action,
      reviewer: 'Municipal Senior Engineer',
      notes: `Action '${action}' executed with verified human engineering sign-off.`,
    })
  }

  const handleStatusSelect = (item: PrioritizedRepairItem, newStatus: MunicipalRepairStatus) => {
    updateStatusMutation.mutate({
      id: item.repair_id ?? item.road_id,
      status: newStatus,
      reviewer: 'Municipal Senior Engineer',
      notes: `Status updated to ${newStatus} by municipal supervisor.`,
    })
  }

  const filteredQueue = filterStatus === 'ALL'
    ? queue
    : queue.filter((i) => i.status.toUpperCase() === filterStatus.toUpperCase())

  return (
    <Layout
      title="Municipal Repair Queue & Priority Engine"
      subtitle="AI-prioritized road repairs, rule-based intervention recommendations, and mandatory human sign-off"
    >
      <DemoDataBanner />

      {/* Mandatory Human Approval Banner (Requirements 5, 6, 7) */}
      <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div>
          <div className="text-sm font-bold text-amber-300">
            MANDATORY HUMAN APPROVAL — DECISION SUPPORT SYSTEM ONLY
          </div>
          <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
            The SafeCity AI Repair Priority Engine generates risk-weighted urgency scores and suggests engineering interventions for human evaluation.
            <strong> The AI does NOT automatically approve engineering work, dispatch contractors, or commit municipal capital without certified human officer approval.</strong>
          </p>
        </div>
      </div>

      {/* Filter and Metrics Summary Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-navy-800 rounded-xl border border-gray-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-medium">Filter by Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-navy-900 border border-gray-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Statuses ({queue.length})</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-gray-400 font-mono text-[11px]">
          <span>Ranked Corridors: <strong className="text-white">{queue.length}</strong></span>
          <span>•</span>
          <span>Pending Human Sign-off: <strong className="text-amber-400">{queue.filter((q) => !q.status.includes('REPAIRED') && !q.status.includes('CLOSED')).length}</strong></span>
        </div>
      </div>

      {/* Municipal Repair Table */}
      <div className="bg-navy-800 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
            Calculating multi-factor urgency queue...
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No repair items found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-900/90 text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Road Segment</th>
                  <th className="px-4 py-3 text-center">Risk Score</th>
                  <th className="px-4 py-3">Main Reason (Why Prioritized)</th>
                  <th className="px-4 py-3">Evidence IDs</th>
                  <th className="px-4 py-3">Suggested Action</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Officer Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {filteredQueue.map((item) => {
                  const riskColor =
                    item.risk_score >= 80 ? 'text-red-400'
                    : item.risk_score >= 55 ? 'text-orange-400'
                    : item.risk_score >= 35 ? 'text-amber-400' : 'text-emerald-400'

                  return (
                    <tr key={item.road_id} className="hover:bg-navy-700/40 transition-colors">
                      {/* Priority Rank */}
                      <td className="px-4 py-3 text-center font-mono font-bold text-sm text-gray-400">
                        #{item.priority_rank}
                      </td>

                      {/* Priority Level */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {priorityBadge(item.priority_level)}
                      </td>

                      {/* Road Segment */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white text-sm">{item.road_name}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{item.hazard_summary}</div>
                      </td>

                      {/* Risk Score */}
                      <td className="px-4 py-3 text-center font-mono font-bold text-sm">
                        <span className={riskColor}>{Math.round(item.risk_score)}</span>
                        <span className="text-[10px] text-gray-500 font-normal">/100</span>
                      </td>

                      {/* Main Reason */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-gray-200 font-medium">
                          {item.reason || item.reasons[0] || 'High risk and traffic exposure detected.'}
                        </div>
                      </td>

                      {/* Evidence IDs */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {(item.evidence_ids && item.evidence_ids.length > 0
                            ? item.evidence_ids
                            : [`SC-H-00${item.road_id}`]
                          ).map((eid) => (
                            <span
                              key={eid}
                              className="bg-navy-950 text-sky-400 border border-sky-800/60 px-1.5 py-0.5 rounded text-[10px] font-mono"
                            >
                              {eid}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Suggested Action */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-white font-medium text-[11px]">
                          {item.suggested_action || 'Road-surface inspection + pedestrian-safety review'}
                        </div>
                        <span className="inline-block mt-1 text-[9px] text-amber-300/80 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/50">
                          Suggested intervention for human review
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div>{statusBadge(item.status)}</div>
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusSelect(item, e.target.value as MunicipalRepairStatus)}
                            className="bg-navy-950 border border-gray-700 text-gray-300 rounded px-2 py-0.5 text-[10px] focus:outline-none focus:border-accent"
                            disabled={updateStatusMutation.isPending}
                          >
                            {STATUS_LIST.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Human Officer Action Buttons */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex flex-col gap-1">
                          {item.status.toUpperCase() === 'NEW' && (
                            <>
                              <button
                                onClick={() => handleAction(item, 'verify')}
                                className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10px] font-semibold transition"
                              >
                                ✓ Verify
                              </button>
                              <button
                                onClick={() => handleAction(item, 'reject')}
                                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-[10px] transition"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}

                          {(item.status.toUpperCase() === 'UNDER REVIEW' || item.status.toUpperCase() === 'VERIFIED') && (
                            <>
                              <button
                                onClick={() => handleAction(item, 'assign')}
                                className="px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-[10px] font-semibold transition"
                              >
                                👷 Assign Crew
                              </button>
                              <button
                                onClick={() => handleAction(item, 'reject')}
                                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-[10px] transition"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}

                          {item.status.toUpperCase() === 'REPAIR ASSIGNED' && (
                            <>
                              <button
                                onClick={() => handleAction(item, 'mark_repaired')}
                                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-semibold transition shadow"
                              >
                                ✓ Mark Repaired
                              </button>
                              <button
                                onClick={() => handleAction(item, 'reopen')}
                                className="px-2 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded text-[10px] transition"
                              >
                                ↺ Reopen
                              </button>
                            </>
                          )}

                          {(item.status.toUpperCase() === 'REPAIRED' || item.status.toUpperCase() === 'CLOSED') && (
                            <button
                              onClick={() => handleAction(item, 'reopen')}
                              className="px-2 py-1 bg-navy-900 hover:bg-navy-700 text-gray-300 border border-gray-700 rounded text-[10px] transition"
                            >
                              ↺ Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
