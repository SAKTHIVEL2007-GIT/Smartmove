import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import MapProvider from '@/components/map/MapProvider'
import RiskBadge from '@/components/ui/RiskBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import { useHazards, useRoads, useDangerZones } from '@/hooks/useApi'
import type { Hazard, RoadSafetyEvaluation } from '@/types'

const HAZARD_TYPES = ['all', 'pothole', 'near-miss', 'dangerous-junction', 'road-work', 'high-risk-zone']

function scoreColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#f59e0b'
  return '#10b981'
}

function factorRow(label: string, value: string) {
  const color = value === 'HIGH' ? 'text-red-400' : value === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export default function SafeCityMap() {
  const [filter, setFilter] = useState('all')
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null)
  const { data: hazards = [], isLoading } = useHazards()
  const { data: roads = [] } = useRoads()
  const { data: evaluations = [] } = useDangerZones()

  const filtered = filter === 'all' ? hazards : hazards.filter((h) => h.type === filter)

  const selectedRoad = selectedHazard
    ? roads.find((r) => r.id === selectedHazard.road_id)
    : null

  const roadEvaluation: RoadSafetyEvaluation | undefined = selectedRoad
    ? evaluations.find((e) => e.road_id === selectedRoad.id)
    : undefined

  const roadHazards = selectedRoad
    ? hazards.filter((h) => h.road_id === selectedRoad.id)
    : []

  const potholes = roadHazards.filter((h) => h.type === 'pothole').length
  const nearMisses = roadHazards.filter((h) => h.type === 'near-miss').length

  return (
    <Layout title="SafeCity Map" subtitle="Interactive hazard map with AI-detected incidents">
      <DemoDataBanner />

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Left panel */}
        <div className="flex flex-col gap-3" style={{ width: 240, flexShrink: 0 }}>
          {/* Filter */}
          <div className="card p-3">
            <div className="card-header">Hazard Filter</div>
            <div className="space-y-1">
              {HAZARD_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded capitalize transition-colors ${
                    filter === t
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'text-gray-400 hover:text-white hover:bg-navy-600'
                  }`}
                >
                  {t === 'all' ? `All Types (${hazards.length})` : t.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Selected hazard / road detail */}
          {selectedHazard && selectedRoad ? (
            <div className="card p-3 flex-1 overflow-auto">
              <div className="card-header">Road Detail</div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">{selectedRoad.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Hazard Risk:</span>
                  <RiskBadge level={selectedHazard.severity} score={selectedHazard.risk_score} />
                </div>

                {roadEvaluation && (
                  <>
                    <div className="border-t border-gray-800 pt-2">
                      <div className="text-xs text-gray-500 mb-1">SafeCity Score</div>
                      <div className="text-2xl font-black font-mono" style={{ color: scoreColor(100 - roadEvaluation.safe_city_score) }}>
                        {Math.round(roadEvaluation.safe_city_score)}
                        <span className="text-sm font-normal text-gray-500">/100</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Danger Zone: <span className="font-semibold text-white">{roadEvaluation.danger_zone_classification}</span>
                        {' '}({Math.round(roadEvaluation.danger_zone_score)}/100)
                      </div>
                    </div>
                    <div className="space-y-1">
                      {factorRow('Pothole Risk', roadEvaluation.factors.pothole_risk)}
                      {factorRow('Junction Risk', roadEvaluation.factors.junction_risk)}
                      {factorRow('Traffic Exposure', roadEvaluation.factors.traffic_exposure)}
                      {factorRow('Pedestrian Exposure', roadEvaluation.factors.pedestrian_exposure)}
                    </div>
                  </>
                )}

                <div className="border-t border-gray-800 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Potholes</span>
                    <span className="text-white font-medium">{potholes}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Near Misses</span>
                    <span className="text-white font-medium">{nearMisses}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Traffic Exposure</span>
                    <span className="text-white font-medium">{selectedRoad.traffic_exposure}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">AI Confidence</span>
                    <span className="text-white font-medium">{Math.round(selectedHazard.confidence * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Road Status</span>
                    <StatusBadge status={selectedRoad.status} />
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {new Date(selectedHazard.detected_at).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-3">
              <div className="text-xs text-gray-500 text-center py-2">Click a marker to see SafeCity Score</div>
              <div className="space-y-1.5 mt-2">
                {[...evaluations].sort((a, b) => b.danger_zone_score - a.danger_zone_score).slice(0, 5).map((ev) => (
                  <div key={ev.road_id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 truncate pr-2">{ev.road_name.replace(' [DEMO]', '')}</span>
                    <span className="font-mono font-bold flex-shrink-0" style={{ color: scoreColor(ev.danger_zone_score) }}>
                      {Math.round(ev.danger_zone_score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Map */}
        <div className="flex-1 card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="card-header mb-0">Hazard Map</span>
            <span className="text-xs text-gray-500">
              {isLoading ? 'Loading…' : `${filtered.length} markers`}
            </span>
          </div>
          <div style={{ height: 'calc(100% - 45px)' }}>
            <MapProvider
              hazards={filtered}
              className="h-full"
              onMarkerClick={(h) => setSelectedHazard(h)}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {[
          { type: 'pothole', color: '#ef4444', label: 'Pothole' },
          { type: 'near-miss', color: '#f97316', label: 'Near Miss' },
          { type: 'dangerous-junction', color: '#dc2626', label: 'Dangerous Junction' },
          { type: 'road-work', color: '#f59e0b', label: 'Road Work' },
          { type: 'high-risk-zone', color: '#dc2626', label: 'High-Risk Zone' },
        ].map((l) => (
          <div key={l.type} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>
    </Layout>
  )
}
