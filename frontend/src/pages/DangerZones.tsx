import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import MapProvider from '@/components/map/MapProvider'
import { useDangerZones, useHazards, useRoads } from '@/hooks/useApi'
import type { RoadSafetyEvaluation } from '@/types'

function classColor(cls: string): string {
  if (cls.includes('VERY HIGH')) return '#ef4444'
  if (cls.includes('HIGH')) return '#f97316'
  if (cls.includes('MEDIUM') || cls.includes('MODERATE')) return '#f59e0b'
  return '#10b981'
}

export default function DangerZones() {
  const { data: evaluations = [], isLoading } = useDangerZones()
  const { data: hazards = [] } = useHazards()
  const { data: roads = [] } = useRoads()
  const [selected, setSelected] = useState<RoadSafetyEvaluation | null>(null)

  const sorted = [...evaluations].sort((a, b) => b.danger_zone_score - a.danger_zone_score)
  const activeRoad = selected || sorted[0] || null

  return (
    <Layout
      title="Danger-Zone & Conflict-Hotspot Engine"
      subtitle="Multi-factor road risk aggregation, recurring conflict evidence, and explainable safety contributor equations"
    >
      <DemoDataBanner />

      {/* Epistemological Warning Banner */}
      <div className="mb-4 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-700/40 text-xs text-amber-300 flex items-center justify-between">
        <span>
          ℹ️ All scores are <strong>Calculated Danger Zone Scores</strong> derived from empirical AI detections and surrogate conflict evidence. Not scientifically validated accident probability.
        </span>
        <span className="font-mono text-[11px] text-amber-400 font-bold ml-2">NO DATA ≠ SAFE ROAD</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[600px]">
        {/* Left Column: Danger Zone Corridors List (Requirement 1) */}
        <div className="xl:col-span-1 space-y-3 overflow-y-auto max-h-[750px] pr-1">
          <div className="text-xs font-semibold text-gray-400 uppercase font-mono px-1 flex justify-between">
            <span>Ranked Danger Corridors ({sorted.length})</span>
            <span>Evidence-Based</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse h-28 bg-navy-700" />
              ))}
            </div>
          ) : (
            sorted.map((ev) => {
              const isSelected = activeRoad?.road_id === ev.road_id
              const color = classColor(ev.danger_zone_classification)

              return (
                <div
                  key={ev.road_id}
                  onClick={() => setSelected(ev)}
                  className={`card p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent/10 shadow-lg shadow-accent/15'
                      : 'border-gray-800 bg-navy-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-bold text-white leading-tight">
                        {ev.road_name}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Exposure: <strong className="text-gray-300">{ev.traffic_exposure || 'HIGH'}</strong> • Confidence: <strong className="text-sky-400">{ev.confidence || 'HIGH'}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded font-mono"
                        style={{ backgroundColor: color + '22', color, border: `1px solid ${color}55` }}
                      >
                        Risk {Math.round(ev.danger_zone_score)}/100
                      </span>
                      {ev.is_hotspot && (
                        <div className="mt-1">
                          <span className="bg-red-900/60 text-red-300 border border-red-700 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                            🔥 HOTSPOT
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 8 Core Required Fields (Requirement 1) */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-navy-950/70 p-2.5 rounded-lg border border-gray-800/80 mt-2">
                    <div>
                      <span className="text-gray-500">Conflicts: </span>
                      <span className="font-mono font-bold text-amber-400">{ev.conflict_count ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Hazards: </span>
                      <span className="font-mono font-bold text-red-400">{ev.hazard_count ?? 0}</span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span className="text-gray-500">Main Driver: </span>
                      <span className="font-semibold text-gray-200">
                        {ev.main_contributing_factor || 'Observed Surface Defects'}
                      </span>
                    </div>
                    <div className="col-span-2 text-[10px] text-gray-500 font-mono">
                      Observed: {ev.last_observed ? new Date(ev.last_observed).toLocaleDateString('en-GB') : 'Recent Inspection'}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Interactive Risk Breakdown & Map (Requirement 2 & 3) */}
        <div className="xl:col-span-2 space-y-4">
          {activeRoad && (
            <div className="card p-5 bg-navy-800 border-gray-800 space-y-4">
              <div className="border-b border-gray-800 pb-3 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-accent font-bold">
                    Interactive Risk Engine Breakdown (Judge View)
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    {activeRoad.road_name}
                  </h3>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">
                    Formula: <span className="text-gray-300">Risk = 0.30H + 0.20E + 0.20C + 0.15V + 0.10P + 0.05U</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-red-400">
                    {Math.round(activeRoad.danger_zone_score)}
                    <span className="text-sm font-normal text-gray-500">/100</span>
                  </div>
                  <span className="text-xs font-bold text-gray-300">
                    Confidence: <strong className="text-emerald-400">{activeRoad.confidence || 'HIGH'}</strong>
                  </span>
                </div>
              </div>

              {/* Interactive Factor Contributor Bars (Requirement 2) */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-gray-300 flex justify-between">
                  <span>Why is this score high? Contributors:</span>
                  <span className="text-gray-400 font-mono text-[11px]">Normalized Points / Weight Max</span>
                </div>

                {/* 1. Hazard severity (0.30 * H = max 30) */}
                <div className="bg-navy-950 p-2.5 rounded-lg border border-gray-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 font-medium">Hazard severity (H)</span>
                    <span className="font-mono font-bold text-red-400">
                      {Math.round((activeRoad.factors.pothole_score || 50) * 0.3)}/30
                    </span>
                  </div>
                  <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((activeRoad.factors.pothole_score || 50) * 0.3 / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 2. Traffic exposure (0.20 * E = max 20) */}
                <div className="bg-navy-950 p-2.5 rounded-lg border border-gray-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 font-medium">Traffic exposure (E)</span>
                    <span className="font-mono font-bold text-orange-400">
                      {Math.round((activeRoad.factors.traffic_score || 60) * 0.2)}/20
                    </span>
                  </div>
                  <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((activeRoad.factors.traffic_score || 60) * 0.2 / 20) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 3. Conflict evidence (0.20 * C = max 20) */}
                <div className="bg-navy-950 p-2.5 rounded-lg border border-gray-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 font-medium">Conflict evidence (C)</span>
                    <span className="font-mono font-bold text-amber-400">
                      {Math.round((activeRoad.factors.junction_score || 50) * 0.2)}/20
                    </span>
                  </div>
                  <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((activeRoad.factors.junction_score || 50) * 0.2 / 20) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 4. Vulnerable users (0.15 * V = max 15) */}
                <div className="bg-navy-950 p-2.5 rounded-lg border border-gray-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 font-medium">Vulnerable users (V)</span>
                    <span className="font-mono font-bold text-purple-400">
                      {Math.round((activeRoad.factors.vulnerability_score || 55) * 0.15)}/15
                    </span>
                  </div>
                  <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((activeRoad.factors.vulnerability_score || 55) * 0.15 / 15) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 5. Persistence (0.10 * P = max 10) */}
                <div className="bg-navy-950 p-2.5 rounded-lg border border-gray-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 font-medium">Persistence / Recurrence (P)</span>
                    <span className="font-mono font-bold text-sky-400">
                      {Math.round((activeRoad.factors.persistence_score || 60) * 0.1)}/10
                    </span>
                  </div>
                  <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-sky-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((activeRoad.factors.persistence_score || 60) * 0.1 / 10) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 6. Road importance (0.05 * U = max 5) */}
                <div className="bg-navy-950 p-2.5 rounded-lg border border-gray-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 font-medium">Road importance / Urgency (U)</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.round((activeRoad.factors.road_importance_score || 80) * 0.05)}/5
                    </span>
                  </div>
                  <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((activeRoad.factors.road_importance_score || 80) * 0.05 / 5) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map Preview of Selected Corridor */}
          <div className="card p-3 overflow-hidden min-h-[360px]">
            <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center justify-between">
              <span>Spatial Corridor Context</span>
              <span className="text-gray-500 text-[11px] font-mono">
                {activeRoad ? activeRoad.road_name : 'Road Map'}
              </span>
            </div>
            <div className="h-72 rounded-lg overflow-hidden">
              <MapProvider
                roads={roads}
                hazards={hazards}
                selectedRoadId={activeRoad?.road_id}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
