import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import KPICard from '@/components/dashboard/KPICard'
import MapProvider from '@/components/map/MapProvider'
import OneClickDemoModal from '@/components/demo/OneClickDemoModal'
import {
  useDashboard,
  useHazards,
  useDangerZones,
  useRepairPriority,
  useRoadSegments,
  useConflicts,
} from '@/hooks/useApi'

function riskColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 55) return '#f97316'
  if (score >= 30) return '#eab308'
  return '#10b981'
}

export default function Overview() {
  const { data: dashboard, isLoading, error } = useDashboard()
  const { data: hazards = [] } = useHazards()
  const { data: dangerZones = [] } = useDangerZones()
  const { data: repairs = [] } = useRepairPriority()
  const { data: roads = [] } = useRoadSegments()
  const { data: conflicts = [] } = useConflicts()

  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const navigate = useNavigate()

  // Trend data fallback if empty
  const trendData = dashboard?.risk_trend && dashboard.risk_trend.length > 0
    ? dashboard.risk_trend
    : [
        { date: 'Sep 17', average_risk: 52.4, high_risk_count: 2 },
        { date: 'Sep 18', average_risk: 53.1, high_risk_count: 2 },
        { date: 'Sep 19', average_risk: 53.8, high_risk_count: 2 },
        { date: 'Sep 20', average_risk: 54.2, high_risk_count: 3 },
        { date: 'Sep 21', average_risk: 55.0, high_risk_count: 3 },
        { date: 'Sep 22', average_risk: 55.6, high_risk_count: 3 },
        { date: 'Sep 23', average_risk: 56.4, high_risk_count: 3 },
      ]

  const coverageStats = dashboard?.data_coverage_stats || {
    high_coverage_count: 4,
    moderate_coverage_count: 1,
    low_coverage_count: 1,
    average_coverage_pct: 73.5,
  }

  return (
    <Layout
      title="Command Center"
      subtitle="Smart City Road Safety & Municipal Decision Support Platform [DEMO]"
    >
      <DemoDataBanner />

      {/* Header Operational Bar */}
      <div className="mb-5 p-4 bg-navy-800/95 rounded-2xl border border-gray-700/80 shadow-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xl shadow-inner font-black">
            ⬡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-extrabold text-base sm:text-lg tracking-tight">
                Municipal Operations Command
              </h2>
              <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                INTELLIGENCE ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 overflow-x-auto text-[11px] font-mono">
              {['OBSERVE', 'DETECT', 'ANALYZE', 'IDENTIFY RISK', 'PRIORITIZE', 'PREVENT', 'REPAIR', 'MEASURE'].map(
                (step, i, arr) => (
                  <span key={step} className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-accent bg-accent/10 border border-accent/25 px-1.5 py-0.2 rounded font-semibold">
                      {step}
                    </span>
                    {i < arr.length - 1 && <span className="text-gray-600 text-[10px]">→</span>}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDemoModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-blue-600 text-white text-xs font-black tracking-wide shadow-lg shadow-accent/25 hover:brightness-110 flex items-center gap-2 transition-all transform active:scale-95"
          >
            <span className="text-sm">⚡</span>
            <span>RUN SAFECITY DEMO</span>
          </button>
          <button
            onClick={() => navigate('/ai-vision')}
            className="px-3.5 py-2 rounded-xl bg-accent/20 border border-accent/40 hover:bg-accent/30 text-accent-light text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>👁</span>
            <span>Vision AI Studio</span>
          </button>
          <button
            onClick={() => navigate('/road-intelligence')}
            className="px-3.5 py-2 rounded-xl bg-navy-900 border border-gray-700 hover:border-accent text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>🛣</span>
            <span>Road Dossiers</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-navy-600" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm mb-5 card">
          Failed to load dashboard data. Check backend connectivity at http://localhost:8000.
        </div>
      ) : dashboard ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          <KPICard
            label="Road Segments Monitored"
            value={dashboard.kpi.roads_monitored}
            sublabel="Sector A Corridor"
            color="blue"
            icon="🛣"
          />
          <KPICard
            label="High-Concern Segments"
            value={dashboard.kpi.high_concern_segments ?? dashboard.kpi.high_risk_roads}
            sublabel="Calculated risk ≥60"
            color="red"
            icon="⚠"
          />
          <KPICard
            label="Active Hazards"
            value={dashboard.kpi.active_hazards ?? dashboard.kpi.potholes_detected}
            sublabel="Verified surface defects"
            color="amber"
            icon="⬟"
          />
          <KPICard
            label="Conflict Events"
            value={dashboard.kpi.conflict_events ?? dashboard.kpi.near_misses}
            sublabel="TTC < 2.0s near-misses"
            color="amber"
            icon="⚡"
          />
          <KPICard
            label="Pending Repairs"
            value={dashboard.kpi.pending_repairs}
            sublabel="Municipal queue"
            color="blue"
            icon="🔧"
          />
          <KPICard
            label="Low-Confidence Segments"
            value={dashboard.kpi.low_confidence_segments ?? 1}
            sublabel="Sparse coverage alert"
            color="amber"
            icon="📡"
          />
        </div>
      ) : null}

      {/* Main Split: Interactive Risk Map (LEFT) + Priority Actions (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* LEFT (7 cols): Interactive Road-Risk Map (WHERE is the problem?) */}
        <div className="lg:col-span-7 card p-0 overflow-hidden border border-gray-700/80 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-navy-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-white font-bold text-xs uppercase tracking-wider">
                Road Network Spatial Risk Map
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">WHERE IS THE PROBLEM?</span>
              <button
                onClick={() => navigate('/map')}
                className="text-xs text-accent hover:underline font-semibold"
              >
                Expand GIS ↗
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-[380px] bg-navy-950">
            <MapProvider hazards={hazards} className="h-full min-h-[380px]" />
          </div>
          <div className="px-4 py-2 border-t border-gray-800 bg-navy-900/60 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>● Red: Very High Risk (≥80) | Orange: High Risk (≥55) | Green: Lower Risk</span>
            <span className="text-accent">{roads.length} corridors mapped</span>
          </div>
        </div>

        {/* RIGHT (5 cols): Priority Actions (WHY is it risky? WHAT action is pending?) */}
        <div className="lg:col-span-5 card border border-gray-700/80 flex flex-col justify-between">
          <div>
            <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">🎯</span>
                <span>Priority Decision Actions</span>
              </div>
              <button
                onClick={() => navigate('/repair')}
                className="text-xs text-accent hover:underline font-semibold"
              >
                Work Orders ↗
              </button>
            </div>

            <div className="space-y-3">
              {/* Item 1: School Road */}
              <div className="p-3 rounded-xl bg-navy-900 border border-red-500/40 hover:border-red-500 transition-all">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold text-white">School Road [DEMO]</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-mono">
                    RANK #1 • URGENT
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-snug">
                  <strong className="text-red-400">WHY:</strong> Critical crater defect + 92% pedestrian vulnerability with active morning school crossing conflicts.
                </p>
                <div className="mt-2 flex items-center justify-between pt-2 border-t border-gray-800 text-[11px]">
                  <span className="text-gray-400 font-mono">Action: Milling & Full-Depth Infill</span>
                  <button
                    onClick={() => navigate('/road-intelligence')}
                    className="text-accent hover:underline font-semibold"
                  >
                    Inspect Dossier →
                  </button>
                </div>
              </div>

              {/* Item 2: Market Junction */}
              <div className="p-3 rounded-xl bg-navy-900 border border-amber-500/40 hover:border-amber-500 transition-all">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-bold text-white">Market Junction [DEMO]</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">
                    RANK #2 • HIGH
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-snug">
                  <strong className="text-amber-400">WHY:</strong> Recurring left-turn vehicle-cyclist conflicts (TTC 1.45s) on heavily congested transit corridor.
                </p>
                <div className="mt-2 flex items-center justify-between pt-2 border-t border-gray-800 text-[11px]">
                  <span className="text-gray-400 font-mono">Action: Turning restriction review</span>
                  <button
                    onClick={() => navigate('/traffic-conflicts')}
                    className="text-accent hover:underline font-semibold"
                  >
                    Review Conflicts →
                  </button>
                </div>
              </div>

              {/* Item 3: Low Data Warning */}
              <div className="p-3 rounded-xl bg-navy-900/60 border border-gray-800">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-200">Residential Lane [DEMO]</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    LOW COVERAGE
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  <strong className="text-gray-300">NOTICE:</strong> Last observation was 6 days ago. Low data does not imply road safety. Mobile patrol pass recommended.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-mono">Decision-maker: Municipal Officer</span>
            <button
              onClick={() => navigate('/evidence')}
              className="text-xs text-accent font-semibold hover:underline"
            >
              Open Evidence Vault ↗
            </button>
          </div>
        </div>
      </div>

      {/* Below Grid: Risk Trend, Recent Conflicts, Repair Queue, Data Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Risk Trend Chart (6 cols) */}
        <div className="lg:col-span-6 card border border-gray-700/80">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-accent">📈</span>
              <span>City-Wide Calculated Risk Trend (7 Days)</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Aggregated Sector A</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis domain={[30, 80]} stroke="#6b7280" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151', borderRadius: '8px', fontSize: '11px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="average_risk"
                  name="Average Risk Score"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#riskGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-800">
            <span>Formula: 0.30H + 0.20E + 0.20C + 0.15V + 0.10P + 0.05U</span>
            <span className="text-amber-400">Stable Elevated</span>
          </div>
        </div>

        {/* Data Coverage & Freshness (6 cols) */}
        <div className="lg:col-span-6 card border border-gray-700/80">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-accent">📡</span>
              <span>Data Coverage & Observational Health</span>
            </div>
            <span className="text-[10px] text-accent font-mono font-bold">
              Avg {coverageStats.average_coverage_pct}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="p-3 bg-navy-900 rounded-xl border border-emerald-500/20">
              <div className="text-lg font-black text-emerald-400 font-mono">
                {coverageStats.high_coverage_count}
              </div>
              <div className="text-[10px] text-gray-400 uppercase mt-0.5">High Coverage (≥75%)</div>
            </div>
            <div className="p-3 bg-navy-900 rounded-xl border border-amber-500/20">
              <div className="text-lg font-black text-amber-400 font-mono">
                {coverageStats.moderate_coverage_count}
              </div>
              <div className="text-[10px] text-gray-400 uppercase mt-0.5">Moderate (45–74%)</div>
            </div>
            <div className="p-3 bg-navy-900 rounded-xl border border-red-500/20">
              <div className="text-lg font-black text-red-400 font-mono">
                {coverageStats.low_coverage_count}
              </div>
              <div className="text-[10px] text-gray-400 uppercase mt-0.5">Sparse / Low (&lt;45%)</div>
            </div>
          </div>

          {/* Principle Banner */}
          <div className="p-3 bg-navy-900 rounded-xl border border-amber-500/30 text-xs flex items-start gap-2.5">
            <span className="text-amber-400 text-sm mt-0.5">⚠</span>
            <div>
              <div className="text-white font-bold text-xs tracking-tight">
                Operational Rule: NO DATA ≠ SAFE ROAD
              </div>
              <p className="text-gray-400 text-[11px] mt-0.5 leading-snug">
                Absence of reported defects does not guarantee a safe road corridor. Road segments with low coverage or aging sensor feeds are flagged for targeted patrol sweeps.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Traffic Conflicts (6 cols) */}
        <div className="lg:col-span-6 card border border-gray-700/80">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <span>Recent Traffic Conflicts (Near-Misses)</span>
            </div>
            <button onClick={() => navigate('/traffic-conflicts')} className="text-xs text-accent hover:underline">
              All ({conflicts.length}) ↗
            </button>
          </div>

          <div className="space-y-2">
            {conflicts.slice(0, 3).map((c) => (
              <div
                key={c.id}
                onClick={() => navigate('/traffic-conflicts')}
                className="p-2.5 bg-navy-900 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {c.object_types.join(' ↔ ')}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      TTC: <strong className="text-amber-400">{c.ttc ? `${c.ttc}s` : '1.3s'}</strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {c.conflict_zone || 'Intersection Crossing'}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    c.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {c.risk_level}
                  </span>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">
                    {c.review_status ? c.review_status.replace('_', ' ') : 'pending review'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Municipal Repair Queue (6 cols) */}
        <div className="lg:col-span-6 card border border-gray-700/80">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-accent">🔧</span>
              <span>Municipal Repair Queue</span>
            </div>
            <button onClick={() => navigate('/repair')} className="text-xs text-accent hover:underline">
              Full Queue ({repairs.length}) ↗
            </button>
          </div>

          <div className="space-y-2">
            {repairs.slice(0, 3).map((r) => (
              <div
                key={r.road_id}
                onClick={() => navigate('/repair')}
                className="p-2.5 bg-navy-900 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate max-w-[200px]">
                      {r.road_name.replace(' [DEMO]', '')}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Rank #{r.priority_rank}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[280px]">
                    {r.hazard_summary}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    r.status === 'Under Repair' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {r.status}
                  </span>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">
                    Score: {Math.round(r.urgency_score)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* One-Click Demo Interactive Modal */}
      <OneClickDemoModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
    </Layout>
  )
}
