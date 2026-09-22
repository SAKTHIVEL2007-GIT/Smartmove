import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import MapProvider from '@/components/map/MapProvider'
import RiskBadge from '@/components/ui/RiskBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import { useRoads, useHazards, useDangerZones, useRepairPriority } from '@/hooks/useApi'
import type { Road, Hazard, RoadSafetyEvaluation, PrioritizedRepairItem } from '@/types'

function riskColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#f59e0b'
  return '#10b981'
}

function safeCityColor(score: number): string {
  if (score >= 60) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function DigitalTwin() {
  const { data: roads = [], isLoading: roadsLoading } = useRoads()
  const { data: hazards = [] } = useHazards()
  const { data: evaluations = [] } = useDangerZones()
  const { data: repairs = [] } = useRepairPriority()

  const [selectedRoadId, setSelectedRoadId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'network' | 'geo'>('network')
  const navigate = useNavigate()

  const selectedRoad = roads.find((r) => r.id === selectedRoadId) || roads[0] || null
  const selectedEval: RoadSafetyEvaluation | undefined = selectedRoad
    ? evaluations.find((e) => e.road_id === selectedRoad.id)
    : undefined
  const selectedHazards: Hazard[] = selectedRoad
    ? hazards.filter((h) => h.road_id === selectedRoad.id)
    : []
  const selectedRepair: PrioritizedRepairItem | undefined = selectedRoad
    ? repairs.find((r) => r.road_id === selectedRoad.id)
    : undefined

  const avgRisk = roads.length
    ? Math.round(roads.reduce((s, r) => s + r.risk_score, 0) / roads.length)
    : 0
  const avgSafeCity = roads.length
    ? Math.round(roads.reduce((s, r) => s + r.safe_city_score, 0) / roads.length)
    : 0

  return (
    <Layout title="SafeCity Digital Twin" subtitle="Virtual replica & telemetry of the monitored municipal road network">
      <DemoDataBanner />

      {/* Top network health summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-accent">{roads.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Monitored Segments</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono" style={{ color: riskColor(avgRisk) }}>
            {avgRisk}/100
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Network Avg Risk</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono" style={{ color: safeCityColor(avgSafeCity) }}>
            {avgSafeCity}/100
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Network SafeCity Score</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">{hazards.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Live Hazards Mapped</div>
        </div>
        <div className="card p-3 text-center col-span-2 md:col-span-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">99.8%</div>
          <div className="text-xs text-gray-400 mt-0.5">Sensor Telemetry Sync</div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Twin Perspective:</span>
          <button
            onClick={() => setViewMode('network')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              viewMode === 'network'
                ? 'bg-accent text-white shadow-md'
                : 'bg-navy-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            ◈ Network Topology View
          </button>
          <button
            onClick={() => setViewMode('geo')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              viewMode === 'geo'
                ? 'bg-accent text-white shadow-md'
                : 'bg-navy-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            🗺 Geographical Twin Map
          </button>
        </div>
        <span className="text-xs text-gray-500 hidden sm:inline">
          Click any road segment to open its live telemetry inspector
        </span>
      </div>

      {/* Main interactive twin view */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: visual twin display */}
        <div className="xl:col-span-2 space-y-4">
          {viewMode === 'network' ? (
            <div className="card p-4 border border-gray-700 bg-navy-950/80">
              <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide uppercase">
                    Virtual Road Topology Matrix
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                  <span>[CLICK SEGMENT TO INSPECT]</span>
                </div>
              </div>

              {/* Road segment grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roads.map((road) => {
                  const isSelected = selectedRoad?.id === road.id
                  const roadEval = evaluations.find((e) => e.road_id === road.id)
                  const roadHazards = hazards.filter((h) => h.road_id === road.id)
                  const potholeCount = roadHazards.filter((h) => h.type === 'pothole').length
                  const nearMissCount = roadHazards.filter((h) => h.type === 'near-miss').length
                  const roadRepair = repairs.find((r) => r.road_id === road.id)
                  const rc = riskColor(road.risk_score)
                  const sc = safeCityColor(road.safe_city_score)

                  return (
                    <div
                      key={road.id}
                      onClick={() => setSelectedRoadId(road.id)}
                      className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all relative overflow-hidden ${
                        isSelected
                          ? 'border-accent bg-navy-800/95 shadow-xl shadow-accent/10'
                          : 'border-gray-800 bg-navy-900/70 hover:border-gray-600 hover:bg-navy-850'
                      }`}
                    >
                      {/* Top status tag */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: rc, boxShadow: `0 0 8px ${rc}` }}
                          />
                          <h4 className="text-sm font-bold text-white truncate">{road.name}</h4>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded font-mono flex-shrink-0 border"
                          style={{
                            backgroundColor: rc + '18',
                            color: rc,
                            borderColor: rc + '40',
                          }}
                        >
                          {roadEval?.danger_zone_classification || (road.risk_score >= 70 ? 'HIGH RISK' : 'MONITORED')}
                        </span>
                      </div>

                      {/* Twin telemetry badges */}
                      <div className="grid grid-cols-2 gap-2 my-2.5">
                        <div className="p-2 bg-navy-950/80 rounded-lg border border-gray-800/80">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Calculated Risk</div>
                          <div className="text-base font-bold font-mono" style={{ color: rc }}>
                            {Math.round(road.risk_score)}
                            <span className="text-xs font-normal text-gray-500">/100</span>
                          </div>
                        </div>
                        <div className="p-2 bg-navy-950/80 rounded-lg border border-gray-800/80">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">SafeCity Score</div>
                          <div className="text-base font-bold font-mono" style={{ color: sc }}>
                            {Math.round(road.safe_city_score)}
                            <span className="text-xs font-normal text-gray-500">/100</span>
                          </div>
                        </div>
                      </div>

                      {/* Counts: Potholes, Near Misses, Repair Status */}
                      <div className="space-y-1 text-xs pt-1 border-t border-gray-800/80">
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-gray-500">Active Potholes:</span>
                          <span className={`font-mono font-bold ${potholeCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {potholeCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-gray-500">Near Misses:</span>
                          <span className={`font-mono font-bold ${nearMissCount > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                            {nearMissCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-gray-500">Repair Status:</span>
                          <span className="text-xs font-medium text-gray-300">
                            {roadRepair?.status || road.status}
                          </span>
                        </div>
                      </div>

                      {/* Selected indicator bar */}
                      {isSelected && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden border border-gray-700" style={{ height: 480 }}>
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-navy-900">
                <span className="card-header mb-0">Geospatial Digital Twin</span>
                <span className="text-xs text-gray-400">{hazards.length} spatial hazard markers synced</span>
              </div>
              <div style={{ height: 'calc(100% - 45px)' }}>
                <MapProvider hazards={hazards} zoom={13} className="h-full" />
              </div>
            </div>
          )}
        </div>

        {/* Right: Road Telemetry Inspector Drawer */}
        <div className="space-y-4">
          {selectedRoad ? (
            <div className="card border-2 border-accent/40 bg-navy-900/90 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
                <div>
                  <span className="text-[10px] text-accent font-bold uppercase tracking-wider">
                    Digital Twin Telemetry Inspector
                  </span>
                  <h3 className="text-lg font-black text-white leading-tight mt-0.5">
                    {selectedRoad.name}
                  </h3>
                </div>
                <RiskBadge level={selectedRoad.risk_score >= 70 ? 'CRITICAL' : selectedRoad.risk_score >= 50 ? 'HIGH' : 'LOW'} />
              </div>

              {/* Real-time Scores */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2.5 bg-navy-950 rounded-lg border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Danger Zone Score</div>
                  <div className="text-xl font-bold font-mono" style={{ color: riskColor(selectedRoad.risk_score) }}>
                    {Math.round(selectedRoad.risk_score)}/100
                  </div>
                </div>
                <div className="p-2.5 bg-navy-950 rounded-lg border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">SafeCity Score</div>
                  <div className="text-xl font-bold font-mono" style={{ color: safeCityColor(selectedRoad.safe_city_score) }}>
                    {Math.round(selectedRoad.safe_city_score)}/100
                  </div>
                </div>
              </div>

              {/* Environmental & IoT Sensors */}
              <div className="space-y-2 border-t border-gray-800 pt-3 text-xs">
                <div className="font-semibold text-gray-300 text-[11px] uppercase tracking-wider mb-1">
                  Virtual Sensor Telemetry
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Asphalt Vibration Index (IRI):</span>
                  <span className="font-mono text-white font-medium">3.8 m/km (Rough)</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Surface Friction Coefficient (μ):</span>
                  <span className="font-mono text-white font-medium">0.62 (Adequate)</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Traffic Load Index:</span>
                  <span className="font-mono text-amber-400 font-bold">{selectedRoad.traffic_exposure}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Pedestrian Vulnerability:</span>
                  <span className="font-mono text-red-400 font-bold">{selectedRoad.vulnerability}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>GPS Coordinates:</span>
                  <span className="font-mono text-gray-300">{selectedRoad.latitude.toFixed(4)}° N, {selectedRoad.longitude.toFixed(4)}° W</span>
                </div>
              </div>

              {/* Active Hazards list */}
              <div className="border-t border-gray-800 pt-3 text-xs">
                <div className="font-semibold text-gray-300 text-[11px] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Active Mapped Hazards ({selectedHazards.length})</span>
                </div>
                {selectedHazards.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedHazards.map((h) => (
                      <div key={h.id} className="p-2 bg-navy-950 rounded flex items-center justify-between text-xs">
                        <div>
                          <span className="text-white capitalize font-medium">{h.type.replace(/-/g, ' ')}</span>
                          <span className="text-gray-500 text-[10px] ml-2">Conf: {Math.round(h.confidence * 100)}%</span>
                        </div>
                        <RiskBadge level={h.severity} score={h.risk_score} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs py-2">No active hazards mapped for this segment</div>
                )}
              </div>

              {/* Maintenance task link */}
              {selectedRepair && (
                <div className="border-t border-gray-800 pt-3 text-xs bg-navy-950/60 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">Repair Work Order #{selectedRepair.priority_rank}</span>
                    <StatusBadge status={selectedRepair.status} />
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight">{selectedRepair.hazard_summary}</p>
                  {selectedRepair.assigned_to && (
                    <div className="text-[10px] text-accent mt-1">Assigned: {selectedRepair.assigned_to}</div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-3 border-t border-gray-800 flex items-center gap-2">
                <button
                  onClick={() => navigate('/repair')}
                  className="btn-primary text-xs py-1.5 flex-1"
                >
                  View in Repair Queue
                </button>
                <button
                  onClick={() => navigate('/routes')}
                  className="text-xs px-3 py-1.5 rounded-lg bg-navy-800 border border-gray-700 text-gray-300 hover:text-white"
                >
                  Safer Route
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-20 text-gray-500">
              <div className="text-3xl mb-2">◈</div>
              <div className="text-sm">Select a road segment to view Digital Twin telemetry</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}



