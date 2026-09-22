import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import MapProvider from '@/components/map/MapProvider'
import { useRoads, useRouteComparison } from '@/hooks/useApi'
import type { RouteOption } from '@/types'

function riskColor(score: number): string {
  if (score >= 70) return '#ef4444'
  if (score >= 45) return '#f59e0b'
  return '#10b981'
}

function riskBadge(classification: string) {
  const cls =
    classification === 'VERY HIGH' ? 'bg-red-900/50 text-red-300 border-red-700'
    : classification === 'HIGH' ? 'bg-orange-900/50 text-orange-300 border-orange-700'
    : classification === 'MEDIUM' ? 'bg-amber-900/50 text-amber-300 border-amber-700'
    : 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>{classification}</span>
}

function RouteCard({ route, highlight }: { route: RouteOption; highlight: boolean }) {
  const rc = riskColor(route.overall_calculated_risk)
  const isFastest = route.route_key === 'fastest'
  return (
    <div className={`card p-4 border-2 transition-colors ${highlight ? 'border-accent/60 bg-accent/5' : 'border-gray-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-white font-bold text-sm">{route.route_type}</div>
          <div className="text-gray-400 text-xs mt-0.5">{route.description}</div>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: rc + '22', color: rc, border: `1px solid ${rc}55` }}>
          Risk {Math.round(route.overall_calculated_risk)}/100
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-navy-900 rounded p-2">
          <div className="text-xs text-gray-500">Distance</div>
          <div className="text-lg font-bold font-mono text-white">{route.distance_km.toFixed(2)} <span className="text-sm font-normal">km</span></div>
        </div>
        <div className="bg-navy-900 rounded p-2">
          <div className="text-xs text-gray-500">Est. Time</div>
          <div className="text-lg font-bold font-mono text-white">{route.time_minutes.toFixed(1)} <span className="text-sm font-normal">min</span></div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Pothole Risk</span>
          <span className={`font-semibold ${route.pothole_risk === 'HIGH' ? 'text-red-400' : route.pothole_risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>{route.pothole_risk}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Junction Risk</span>
          <span className={`font-semibold ${route.junction_risk === 'HIGH' ? 'text-red-400' : route.junction_risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>{route.junction_risk}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Risk Classification</span>
          <span>{riskBadge(route.risk_classification)}</span>
        </div>
      </div>

      {route.waypoints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-1">Via:</div>
          <div className="flex flex-wrap gap-1">
            {route.waypoints.map((wp, i) => (
              <span key={i} className="text-xs bg-navy-900 px-1.5 py-0.5 rounded text-gray-400">{wp.name}</span>
            ))}
          </div>
        </div>
      )}
      {isFastest
        ? <div className="mt-2 text-xs text-gray-500 italic">⏱ Fastest direct route</div>
        : <div className="mt-2 text-xs text-emerald-400 italic">🛡 Lower-risk alternative</div>}
    </div>
  )
}

export default function SaferRoutes() {
  const { data: roads = [] } = useRoads()
  const [originId, setOriginId] = useState<number | null>(null)
  const [destId, setDestId] = useState<number | null>(null)

  const { data: result, isLoading, isError } = useRouteComparison(originId, destId)

  const fastestRoute = result?.routes.find((r) => r.route_key === 'fastest')
  const saferRoute = result?.routes.find((r) => r.route_key === 'safer')

  return (
    <Layout title="Safer Routes" subtitle="Compare fastest vs lower-risk routes — neutral information only">
      <DemoDataBanner />

      <div className="mb-4 px-3 py-2 rounded bg-blue-900/20 border border-blue-700/30 text-xs text-blue-300">
        ℹ️ Route risk information is provided to help you make an informed decision. The platform does not recommend
        or enforce any particular route. All risk values are <strong>Calculated Danger Zone Scores</strong>.
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">Route Planner</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Origin Road</label>
                <select
                  className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  value={originId ?? ''}
                  onChange={(e) => setOriginId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select origin…</option>
                  {roads.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Destination Road</label>
                <select
                  className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  value={destId ?? ''}
                  onChange={(e) => setDestId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select destination…</option>
                  {roads.filter((r) => r.id !== originId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {isLoading && <div className="text-xs text-accent animate-pulse">Computing routes…</div>}
              {isError && <div className="text-xs text-red-400">Failed to compute routes. Try different roads.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header">Road Risk Reference</div>
            <div className="space-y-1.5">
              {[...roads].sort((a, b) => b.risk_score - a.risk_score).slice(0, 8).map((road) => (
                <div key={road.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 truncate pr-2">{road.name}</span>
                  <span className="font-mono font-bold flex-shrink-0" style={{ color: riskColor(road.risk_score) }}>
                    {Math.round(road.risk_score)}/100
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {result && (
            <>
              <div className="px-3 py-2 rounded bg-gray-800/60 border border-gray-700 text-xs text-gray-300">
                {result.neutral_advisory}
              </div>
              <div className="text-sm text-gray-300">
                <span className="font-semibold text-white">{result.origin_name}</span>
                <span className="text-gray-500 mx-2">→</span>
                <span className="font-semibold text-white">{result.destination_name}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fastestRoute && <RouteCard route={fastestRoute} highlight={false} />}
                {saferRoute && <RouteCard route={saferRoute} highlight={true} />}
              </div>
            </>
          )}
          {!result && !isLoading && (
            <div className="card text-center py-16 text-gray-500">
              <div className="text-2xl mb-2">↗</div>
              <div className="text-sm">Select an origin and destination road to compare routes</div>
            </div>
          )}
          <div className="card p-0 overflow-hidden" style={{ minHeight: 400 }}>
            <div className="px-4 py-3 border-b border-gray-800">
              <span className="card-header mb-0">Hazard Overlay</span>
            </div>
            <div style={{ height: 400 }}>
              <MapProvider hazards={[]} className="h-full" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}


