import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import KPICard from '@/components/dashboard/KPICard'
import RepairPriorityList from '@/components/dashboard/RepairPriorityList'
import RecentAIEvents from '@/components/dashboard/RecentAIEvents'
import InterventionImpact from '@/components/dashboard/InterventionImpact'
import MapProvider from '@/components/map/MapProvider'
import OneClickDemoModal from '@/components/demo/OneClickDemoModal'
import { useDashboard, useHazards, useDangerZones, useRepairPriority } from '@/hooks/useApi'

function riskColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#f59e0b'
  return '#10b981'
}

export default function Overview() {
  const { data: dashboard, isLoading, error } = useDashboard()
  const { data: hazards = [] } = useHazards()
  const { data: evaluations = [] } = useDangerZones()
  const { data: repairs = [] } = useRepairPriority()

  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const navigate = useNavigate()

  const topDangerZones = [...evaluations]
    .sort((a, b) => b.danger_zone_score - a.danger_zone_score)
    .slice(0, 4)

  return (
    <Layout title="Command Center" subtitle="Smart City Road Safety Operations Center — Monitored Sector A [DEMO]">
      <DemoDataBanner />

      {/* Hero bar: Operations Status + One Click Demo trigger */}
      <div className="mb-5 p-4 bg-navy-800/90 rounded-2xl border border-gray-700/80 shadow-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xl shadow-inner">
            ⬡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-extrabold text-base sm:text-lg tracking-tight">
                SafeCity Closed-Loop Intelligence
              </h2>
              <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM ACTIVE
              </span>
            </div>
            {/* Core Workflow Tagline */}
            <div className="flex items-center gap-1 mt-1 overflow-x-auto text-[11px] font-mono">
              {['DETECT', 'ANALYZE', 'PREDICT', 'PRIORITIZE', 'PREVENT', 'REPAIR', 'MEASURE'].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-accent bg-accent/10 border border-accent/25 px-1.5 py-0.2 rounded">
                    {step}
                  </span>
                  {i < arr.length - 1 && <span className="text-gray-600 text-[10px]">→</span>}
                </span>
              ))}
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
            onClick={() => navigate('/junction-display')}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-red-500/40 text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>🚨</span>
            <span className="hidden sm:inline">Roadside Billboard</span>
          </button>
        </div>
      </div>

      {/* KPI Cards — Live Risk Overview */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-navy-600" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm mb-5 card">
          Failed to load dashboard data. Is backend running on port 8000?
        </div>
      ) : dashboard ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          <KPICard
            label="Roads Monitored"
            value={dashboard.kpi.roads_monitored}
            sublabel="Active segments"
            color="blue"
            icon="🛣"
          />
          <KPICard
            label="High-Risk Roads"
            value={dashboard.kpi.high_risk_roads}
            sublabel="Risk score ≥70"
            color="red"
            icon="⚠"
          />
          <KPICard
            label="Potholes Detected"
            value={dashboard.kpi.potholes_detected}
            sublabel="Local YOLOv8"
            color="amber"
            icon="⬟"
          />
          <KPICard
            label="Near Misses"
            value={dashboard.kpi.near_misses}
            sublabel="TTC < 2.0s"
            color="amber"
            icon="⚡"
          />
          <KPICard
            label="Danger Zones"
            value={dashboard.kpi.danger_zones}
            sublabel="Score ≥80"
            color="red"
            icon="🔴"
          />
          <KPICard
            label="Pending Repairs"
            value={dashboard.kpi.pending_repairs}
            sublabel="Urgency prioritized"
            color="amber"
            icon="🔧"
          />
        </div>
      ) : null}

      {/* Operations Center Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* City Risk Map — Spans 2 columns */}
        <div className="xl:col-span-2 card p-0 overflow-hidden border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-navy-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="card-header mb-0">City Risk Spatial Map</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">{hazards.length} hazards synced</span>
              <button
                onClick={() => navigate('/map')}
                className="text-xs text-accent hover:underline"
              >
                Full Map ↗
              </button>
            </div>
          </div>
          <div className="h-80 sm:h-96">
            <MapProvider hazards={hazards} className="h-full" />
          </div>
        </div>

        {/* Danger Zones Watchlist */}
        <div className="card border border-gray-700">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <span>Danger Zones Watchlist</span>
            <button onClick={() => navigate('/danger-zones')} className="text-xs text-accent hover:underline">
              All Zones ↗
            </button>
          </div>
          <div className="space-y-2.5 mt-3">
            {topDangerZones.map((dz) => {
              const color = riskColor(dz.danger_zone_score)
              return (
                <div
                  key={dz.road_id}
                  onClick={() => navigate('/danger-zones')}
                  className="p-3 bg-navy-900 rounded-xl border border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white truncate">{dz.road_name.replace(' [DEMO]', '')}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono flex-shrink-0"
                      style={{ backgroundColor: color + '22', color, borderColor: color + '55' }}
                    >
                      {dz.danger_zone_classification}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 bg-navy-950 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${dz.danger_zone_score}%`, backgroundColor: color }} />
                    </div>
                    <span className="font-mono text-xs font-bold w-7 text-right" style={{ color }}>
                      {Math.round(dz.danger_zone_score)}
                    </span>
                  </div>
                </div>
              )
            })}
            {topDangerZones.length === 0 && (
              <div className="text-center text-gray-500 text-xs py-6">No danger zones flagged</div>
            )}
          </div>
        </div>

        {/* Urgent Repair Queue */}
        <div className="card border border-gray-700">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <span>Municipal Repair Queue</span>
            <button onClick={() => navigate('/repair')} className="text-xs text-accent hover:underline">
              Queue ({repairs.length}) ↗
            </button>
          </div>
          <div className="mt-3">
            <RepairPriorityList repairs={dashboard?.top_repairs ?? []} />
          </div>
        </div>

        {/* Live AI Event Feed */}
        <div className="card border border-gray-700">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live AI Event Feed</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Real-Time</span>
          </div>
          <div className="mt-3">
            <RecentAIEvents events={dashboard?.recent_events ?? []} />
          </div>
        </div>

        {/* Intervention Impact Preview */}
        <div className="card border border-gray-700">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <span>Intervention Impact</span>
            <button onClick={() => navigate('/interventions')} className="text-xs text-accent hover:underline">
              View All ↗
            </button>
          </div>
          <div className="mt-3">
            <InterventionImpact interventions={dashboard?.interventions ?? []} />
          </div>
        </div>
      </div>

      {/* One-Click Demo Interactive Modal */}
      <OneClickDemoModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
    </Layout>
  )
}


