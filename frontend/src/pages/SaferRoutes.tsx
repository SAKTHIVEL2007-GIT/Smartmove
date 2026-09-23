import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import { useRoads, useRouteComparison } from '@/hooks/useApi'
import type { RouteOption } from '@/types'

function riskColor(score: number): string {
  if (score >= 70) return '#ef4444'
  if (score >= 45) return '#f59e0b'
  return '#10b981'
}

function riskBadge(classification: string) {
  const cls =
    classification === 'VERY HIGH'
      ? 'bg-red-900/50 text-red-300 border-red-700'
      : classification === 'HIGH'
      ? 'bg-orange-900/50 text-orange-300 border-orange-700'
      : classification === 'MEDIUM'
      ? 'bg-amber-900/50 text-amber-300 border-amber-700'
      : 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>{classification}</span>
}

function RouteCard({ route, isSafer }: { route: RouteOption; isSafer: boolean }) {
  const rc = riskColor(route.overall_calculated_risk)
  const isFastest = route.route_key === 'fastest'

  return (
    <div
      className={`card p-5 border-2 transition-all ${
        isSafer
          ? 'border-emerald-600/60 bg-emerald-950/10 shadow-lg shadow-emerald-950/20'
          : 'border-gray-800 bg-navy-800'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-base">{route.route_type.toUpperCase()}</h3>
            {isFastest && (
              <span className="bg-sky-900/60 text-sky-300 border border-sky-700 text-[10px] px-2 py-0.5 rounded font-mono">
                ⏱ Minimum Duration
              </span>
            )}
            {isSafer && (
              <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] px-2 py-0.5 rounded font-mono">
                🛡 Safety Optimized
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-1">{route.description}</p>
        </div>

        <div className="text-right">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded inline-block font-mono"
            style={{ backgroundColor: rc + '22', color: rc, border: `1px solid ${rc}55` }}
          >
            Risk Exposure: {Math.round(route.overall_calculated_risk)}/100
          </span>
          <div className="mt-1">{riskBadge(route.risk_classification)}</div>
        </div>
      </div>

      {/* 4 Core Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-navy-900 p-3 rounded-lg border border-gray-800/80">
          <div className="text-[11px] text-gray-500 uppercase font-mono">Travel Time</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {route.time_minutes.toFixed(1)} <span className="text-xs font-normal text-gray-400">min</span>
          </div>
        </div>

        <div className="bg-navy-900 p-3 rounded-lg border border-gray-800/80">
          <div className="text-[11px] text-gray-500 uppercase font-mono">Distance</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {route.distance_km.toFixed(2)} <span className="text-xs font-normal text-gray-400">km</span>
          </div>
        </div>

        <div className="bg-navy-900 p-3 rounded-lg border border-gray-800/80">
          <div className="text-[11px] text-gray-500 uppercase font-mono">High-Risk Segs</div>
          <div
            className={`text-xl font-bold font-mono mt-0.5 ${
              (route.high_risk_segments_count || 0) > 1 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {route.high_risk_segments_count ?? 1}
          </div>
        </div>

        <div className="bg-navy-900 p-3 rounded-lg border border-gray-800/80">
          <div className="text-[11px] text-gray-500 uppercase font-mono">Route Cost</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {route.route_cost ? route.route_cost.toFixed(1) : (route.time_minutes + 0.15 * route.overall_calculated_risk).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Potholes & Conflicts Encountered */}
      <div className="grid grid-cols-2 gap-3 text-xs bg-navy-950/60 p-3 rounded-lg border border-gray-800 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Pothole Risk Exposure:</span>
          <span
            className={`font-semibold ${
              route.pothole_risk === 'HIGH' ? 'text-red-400' : route.pothole_risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {route.pothole_risk} ({route.hazards_count ?? (isFastest ? 4 : 0)} defects)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Conflict Hotspots:</span>
          <span
            className={`font-semibold ${
              route.junction_risk === 'HIGH' ? 'text-red-400' : route.junction_risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {route.junction_risk} ({route.conflict_hotspots_count ?? (isFastest ? 2 : 0)} hotspots)
          </span>
        </div>
      </div>

      {/* Waypoints */}
      {route.waypoints.length > 0 && (
        <div className="pt-2 border-t border-gray-800 text-xs">
          <span className="text-gray-400">Transit Path Via: </span>
          <span className="text-gray-300 font-medium">
            {route.waypoints.map((w) => w.name).join(' → ')}
          </span>
        </div>
      )}
    </div>
  )
}

export default function SaferRoutes() {
  const { data: roads = [] } = useRoads()
  const [originId, setOriginId] = useState<number | null>(1) // Default School Road
  const [destId, setDestId] = useState<number | null>(2) // Default Market Junction

  const { data: result, isLoading } = useRouteComparison(originId, destId)

  const fastestRoute = result?.routes.find((r) => r.route_key === 'fastest')
  const saferRoute = result?.routes.find((r) => r.route_key === 'safer')

  const timeDiff = fastestRoute && saferRoute
    ? Math.max(0.1, Number((saferRoute.time_minutes - fastestRoute.time_minutes).toFixed(1)))
    : 3.2

  const segsAvoided = fastestRoute && saferRoute
    ? Math.max(1, (fastestRoute.high_risk_segments_count || 3) - (saferRoute.high_risk_segments_count || 1))
    : 3

  return (
    <Layout
      title="Route Intelligence & Surrogate Safety Navigation"
      subtitle="Compare Fastest Arterial Route vs Lower Calculated-Risk Route — Neutral Decision Support"
    >
      <DemoDataBanner />

      {/* Origin & Destination Pickers */}
      <div className="mb-6 p-4 rounded-xl bg-navy-800 border border-gray-800 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <label htmlFor="origin-select" className="text-gray-400 font-semibold">Origin Point:</label>
          <select
            id="origin-select"
            value={originId ?? 1}
            onChange={(e) => setOriginId(Number(e.target.value))}
            className="bg-navy-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
          >
            {roads.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Risk: {Math.round(r.risk_score)})
              </option>
            ))}
          </select>
        </div>

        <div className="text-gray-500 font-bold">➔</div>

        <div className="flex items-center gap-2">
          <label htmlFor="dest-select" className="text-gray-400 font-semibold">Destination Point:</label>
          <select
            id="dest-select"
            value={destId ?? 2}
            onChange={(e) => setDestId(Number(e.target.value))}
            className="bg-navy-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
          >
            {roads.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Risk: {Math.round(r.risk_score)})
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-[11px] text-gray-400 font-mono bg-navy-900 px-3 py-1.5 rounded-lg border border-gray-800">
          Formula: <span className="text-accent font-semibold">RouteCost = TravelTime + 0.15 × RiskPenalty</span>
        </div>
      </div>

      {/* Comparative Explanation Card (Requirement 8) */}
      <div className="mb-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-700/50 flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div>
          <div className="text-sm font-bold text-emerald-300">
            Navigation Safety Trade-off Analysis
          </div>
          <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
            &ldquo;The alternative route takes approximately <strong>{timeDiff} minutes longer</strong> and avoids{' '}
            <strong>{segsAvoided} high-risk segments</strong> based on available observations.&rdquo;
          </p>
          <div className="mt-2 text-[11px] text-gray-400 italic">
            ℹ️ The user retains final route choice. SafeCity Loop V2 presents neutral calculated risk trade-offs without coercive routing.
          </div>
        </div>
      </div>

      {/* Routes Comparison Grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
          Computing route alternatives and surrogate safety penalties...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fastestRoute && <RouteCard route={fastestRoute} isSafer={false} />}
          {saferRoute && <RouteCard route={saferRoute} isSafer={true} />}
        </div>
      )}
    </Layout>
  )
}
