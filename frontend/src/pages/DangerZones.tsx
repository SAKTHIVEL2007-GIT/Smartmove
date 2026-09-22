import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import MapProvider from '@/components/map/MapProvider'
import { useDangerZones, useHazards } from '@/hooks/useApi'
import type { RoadSafetyEvaluation } from '@/types'

function classColor(cls: string): string {
  if (cls === 'VERY HIGH') return '#ef4444'
  if (cls === 'HIGH') return '#f97316'
  if (cls === 'MEDIUM') return '#f59e0b'
  return '#10b981'
}

function riskBar(score: number, label: string) {
  const color = score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 40 ? '#f59e0b' : '#10b981'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-navy-900 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono w-6 text-right flex-shrink-0" style={{ color }}>{Math.round(score)}</span>
    </div>
  )
}

function factorBadge(level: string) {
  const cls =
    level === 'HIGH' ? 'bg-red-900/50 text-red-300 border-red-700'
    : level === 'MEDIUM' ? 'bg-amber-900/50 text-amber-300 border-amber-700'
    : 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
  return <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${cls}`}>{level}</span>
}

export default function DangerZones() {
  const { data: evaluations = [], isLoading } = useDangerZones()
  const { data: hazards = [] } = useHazards()
  const [selected, setSelected] = useState<RoadSafetyEvaluation | null>(null)
  const highRiskHazards = hazards.filter((h) => h.risk_score >= 50)

  const sorted = [...evaluations].sort((a, b) => b.danger_zone_score - a.danger_zone_score)

  return (
    <Layout title="Danger Zones" subtitle="Calculated Danger Zone Scores and SafeCity Scores per road">
      <DemoDataBanner />

      {/* Disclaimer */}
      <div className="mb-4 px-3 py-2 rounded bg-amber-900/20 border border-amber-700/30 text-xs text-amber-300">
        ℹ️ All scores are <strong>Calculated Danger Zone Scores</strong> derived from AI detections, near-miss records,
        traffic exposure, and citizen reports. These are <strong>not scientifically validated accident probability estimates</strong>.
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Road list */}
        <div className="xl:col-span-1 space-y-3">
          {isLoading ? (
            <div className="card animate-pulse h-24 bg-navy-600" />
          ) : (
            sorted.map((ev) => {
              const isSelected = selected?.road_id === ev.road_id
              const color = classColor(ev.danger_zone_classification)
              return (
                <button
                  key={ev.road_id}
                  onClick={() => setSelected(isSelected ? null : ev)}
                  className={`w-full text-left card p-3 border transition-colors ${
                    isSelected ? 'border-accent/60 bg-accent/5' : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-white leading-tight">{ev.road_name}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: color + '22', color, border: `1px solid ${color}55` }}
                    >
                      {ev.danger_zone_classification}
                    </span>
                  </div>

                  {/* Danger zone score bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 w-28 flex-shrink-0">Danger Zone Score</span>
                    <div className="flex-1 bg-navy-900 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${ev.danger_zone_score}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs font-mono font-bold w-6 text-right" style={{ color }}>
                      {Math.round(ev.danger_zone_score)}
                    </span>
                  </div>

                  {/* SafeCity score */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">SafeCity Score</span>
                    <span
                      className="text-xs font-bold font-mono"
                      style={{
                        color: ev.safe_city_score >= 60 ? '#10b981' : ev.safe_city_score >= 40 ? '#f59e0b' : '#ef4444',
                      }}
                    >
                      {Math.round(ev.safe_city_score)}/100
                    </span>
                  </div>

                  {/* Expanded factor detail */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-1.5">
                      {riskBar(ev.factors.pothole_score, 'Pothole Risk')}
                      {riskBar(ev.factors.junction_score, 'Junction Risk')}
                      {riskBar(ev.factors.traffic_score, 'Traffic Exposure')}
                      {riskBar(ev.factors.vulnerability_score, 'Pedestrian Exposure')}
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span className="text-gray-500 w-28 flex-shrink-0">Citizen Reports</span>
                        <span className="text-white font-mono">{ev.factors.report_count}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                        <span className="text-xs text-gray-500">Factors:</span>
                        {factorBadge(ev.factors.pothole_risk)}
                        <span className="text-xs text-gray-500">Pothole</span>
                        {factorBadge(ev.factors.junction_risk)}
                        <span className="text-xs text-gray-500">Junction</span>
                        {factorBadge(ev.factors.traffic_exposure)}
                        <span className="text-xs text-gray-500">Traffic</span>
                        {factorBadge(ev.factors.pedestrian_exposure)}
                        <span className="text-xs text-gray-500">Pedestrian</span>
                      </div>
                    </div>
                  )}
                </button>
              )
            })
          )}
          {!isLoading && sorted.length === 0 && (
            <div className="card text-center text-gray-500 text-sm py-8">No evaluations available</div>
          )}
        </div>

        {/* Map */}
        <div className="xl:col-span-2 card p-0 overflow-hidden" style={{ minHeight: 500 }}>
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="card-header mb-0">Danger Zone Map</span>
            <span className="text-xs text-gray-500">
              {selected ? selected.road_name : `${sorted.length} roads evaluated`}
            </span>
          </div>
          <div style={{ height: 'calc(100% - 45px)', minHeight: 455 }}>
            <MapProvider hazards={highRiskHazards} className="h-full" />
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      {evaluations.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['VERY HIGH', 'HIGH', 'MEDIUM', 'LOW'] as const).map((cls) => {
            const count = evaluations.filter((e) => e.danger_zone_classification === cls).length
            const color = classColor(cls)
            return (
              <div key={cls} className="card p-3 text-center">
                <div className="text-2xl font-bold font-mono" style={{ color }}>{count}</div>
                <div className="text-xs text-gray-400 mt-1">{cls} Risk Roads</div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

