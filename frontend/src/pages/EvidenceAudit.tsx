import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import { useEvidence, useAuditLogs, useRoadSegments, useDecisionAudits } from '@/hooks/useApi'

export default function EvidenceAudit() {
  const [activeTab, setActiveTab] = useState<'evidence' | 'decisions' | 'audit'>('decisions')
  const [selectedRoadId, setSelectedRoadId] = useState<string>('ALL')
  const [selectedFileType, setSelectedFileType] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data: roads = [] } = useRoadSegments()

  const params: any = {}
  if (selectedRoadId !== 'ALL') params.road_id = Number(selectedRoadId)
  if (selectedFileType !== 'ALL') params.file_type = selectedFileType

  const { data: evidenceFiles = [], isLoading: evidenceLoading } = useEvidence(params)
  const { data: auditLogs = [], isLoading: auditLoading } = useAuditLogs(50)
  const { data: decisionAudits = [], isLoading: decisionsLoading } = useDecisionAudits()

  // Filter evidence files by search query
  const filteredEvidence = evidenceFiles.filter((ev) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      ev.evidence_code.toLowerCase().includes(q) ||
      (ev.notes && ev.notes.toLowerCase().includes(q)) ||
      ev.file_type.toLowerCase().includes(q)
    )
  })

  // Filter decision audits by search query
  const filteredDecisions = decisionAudits.filter((dec) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      dec.evidence_id.toLowerCase().includes(q) ||
      dec.location.toLowerCase().includes(q) ||
      dec.ai_result.toLowerCase().includes(q) ||
      dec.reviewer.toLowerCase().includes(q)
    )
  })

  return (
    <Layout
      title="Evidence Vault & Municipal Audit Trail"
      subtitle="Chain-of-Custody Digital Evidence, Explainable Decision Accountability & Immutable Compliance Ledger"
    >
      <DemoDataBanner />

      {/* Tabs and Summary Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-navy-800 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'decisions'
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'bg-navy-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <span>⚖️ Decision Accountability</span>
            <span className="bg-navy-950 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {filteredDecisions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'evidence'
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'bg-navy-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <span>📁 Evidence Vault</span>
            <span className="bg-navy-950 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {filteredEvidence.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'bg-navy-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <span>📜 Audit Log Ledger</span>
            <span className="bg-navy-950 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {auditLogs.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 bg-navy-900/80 px-3 py-1.5 rounded-lg border border-gray-800 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>CHAIN-OF-CUSTODY: ISO 27037 COMPLIANT</span>
        </div>
      </div>

      {/* Tab 1: Decision Accountability (Requirement 11) */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          <div className="p-4 bg-navy-800 rounded-xl border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Evidence ID, Location, or Reviewer..."
                className="w-full bg-navy-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent text-xs"
              />
            </div>
            <span className="text-gray-400 font-mono text-[11px]">
              Every municipal decision is cross-referenced with local AI telemetry and human reviewer signatures.
            </span>
          </div>

          <div className="bg-navy-800 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
            {decisionsLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                Loading explainable decision ledger...
              </div>
            ) : filteredDecisions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                No decision audit records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-900/90 text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-3">Evidence ID</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">AI Result</th>
                      <th className="px-4 py-3 text-center">Confidence</th>
                      <th className="px-4 py-3">Reviewer</th>
                      <th className="px-4 py-3">Decision</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {filteredDecisions.map((d) => (
                      <tr key={d.evidence_id} className="hover:bg-navy-700/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-accent font-bold whitespace-nowrap">
                          {d.evidence_id}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {d.source}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                          {d.date}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {d.location}
                        </td>
                        <td className="px-4 py-3 text-gray-200">
                          {d.ai_result}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-sky-400">
                          {Math.round(d.confidence * 100)}%
                        </td>
                        <td className="px-4 py-3 text-amber-300 whitespace-nowrap font-medium">
                          {d.reviewer}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {d.decision}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                              d.status === 'Verified'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Evidence Vault */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="p-4 bg-navy-800 rounded-xl border border-gray-800 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Evidence Code (e.g. EV-2026-0001) or notes..."
                className="w-full bg-navy-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="filter-road" className="text-gray-400 font-medium">Corridor:</label>
              <select
                id="filter-road"
                value={selectedRoadId}
                onChange={(e) => setSelectedRoadId(e.target.value)}
                className="bg-navy-900 border border-gray-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent"
              >
                <option value="ALL">All Corridors</option>
                {roads.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="filter-type" className="text-gray-400 font-medium">Artifact Type:</label>
              <select
                id="filter-type"
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="bg-navy-900 border border-gray-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent"
              >
                <option value="ALL">All Types</option>
                <option value="image">Inspection Images</option>
                <option value="video_clip">Video Clips</option>
                <option value="keyframe">Video Keyframes</option>
                <option value="sensor">Sensor Telemetry</option>
              </select>
            </div>
          </div>

          {evidenceLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-400 gap-3">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span>Decrypting and verifying evidence vault assets...</span>
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="bg-navy-800 rounded-xl p-12 text-center border border-gray-800 text-gray-400">
              <span className="text-3xl">📁</span>
              <h3 className="text-white font-bold text-sm mt-2">No Evidence Records Found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEvidence.map((ev) => {
                const road = roads.find((r) => r.id === ev.road_id)
                return (
                  <div
                    key={ev.id}
                    className="bg-navy-800 rounded-xl border border-gray-800/80 p-4 hover:border-gray-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-accent font-bold tracking-tight">
                          {ev.evidence_code}
                        </span>
                        <span className="text-[10px] bg-navy-900 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono">
                          {ev.file_type}
                        </span>
                      </div>

                      <div className="w-full h-32 bg-navy-950 rounded-lg border border-gray-800/80 mb-3 overflow-hidden flex items-center justify-center relative">
                        {ev.thumbnail_url ? (
                          <img
                            src={ev.thumbnail_url}
                            alt={ev.evidence_code}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-gray-500">
                            <span className="text-2xl">📷</span>
                            <div className="text-[10px] mt-1 font-mono">Visual Artifact</div>
                          </div>
                        )}
                        {ev.verified && (
                          <span className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                            ✓ VERIFIED
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-white truncate">
                        {road ? road.name : 'Corridor Artifact'}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                        {ev.notes || 'Recorded via municipal inspection survey sensor suite'}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                      <span>{ev.captured_at.substring(0, 16).replace('T', ' ')}</span>
                      <span className="text-gray-400">ID #{ev.id}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Municipal Audit Log Ledger */}
      {activeTab === 'audit' && (
        <div className="bg-navy-800 rounded-xl border border-gray-800 overflow-hidden shadow-md">
          <div className="p-4 border-b border-gray-700/60 flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">
              Municipal Compliance &amp; Decision Audit Ledger
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              Immutable append-only records
            </span>
          </div>

          {auditLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-400 gap-3">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span>Loading municipal audit logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No audit records currently available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900/80 text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor / Entity</th>
                    <th className="px-4 py-3">Action Performed</th>
                    <th className="px-4 py-3">Target Reference</th>
                    <th className="px-4 py-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-navy-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                        {log.timestamp.substring(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-white flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span>{log.actor}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-accent text-[11px] whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400 text-[11px] whitespace-nowrap">
                        {log.target_type} {log.target_id ? `(#${log.target_id})` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-[11px]">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
