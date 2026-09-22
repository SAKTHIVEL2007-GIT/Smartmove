import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import RiskBadge from '@/components/ui/RiskBadge'
import { useJunctions, useJunctionDisplay, useSimulateJunctionEvent } from '@/hooks/useApi'

// ── Signal light ──────────────────────────────────────────────────────────────
function SignalLight({ state }: { state: 'RED' | 'AMBER' | 'GREEN' }) {
  return (
    <div className="flex flex-col items-center gap-1.5 bg-gray-950 rounded-xl p-2 border border-gray-700">
      {(['RED', 'AMBER', 'GREEN'] as const).map((s) => (
        <div
          key={s}
          className="w-8 h-8 rounded-full transition-all"
          style={{
            backgroundColor: state === s ? (s === 'RED' ? '#ef4444' : s === 'AMBER' ? '#f59e0b' : '#10b981') : '#1f2937',
            boxShadow: state === s ? `0 0 14px ${s === 'RED' ? '#ef4444' : s === 'AMBER' ? '#f59e0b' : '#10b981'}` : 'none',
          }}
        />
      ))}
    </div>
  )
}

// ── Junction Display Panel ────────────────────────────────────────────────────
function JunctionDisplay({ junctionId }: { junctionId: number }) {
  const { data: display, isLoading } = useJunctionDisplay(junctionId)
  const simulate = useSimulateJunctionEvent()
  const [simulating, setSimulating] = useState(false)

  if (isLoading || !display) return <div className="card animate-pulse h-64 bg-navy-600" />

  const modeColor =
    display.display_mode === 'HIGH RISK' ? '#ef4444'
    : display.display_mode === 'CAUTION' ? '#f59e0b'
    : '#10b981'

  const modeBg =
    display.display_mode === 'HIGH RISK' ? 'bg-red-950/80 border-red-700'
    : display.display_mode === 'CAUTION' ? 'bg-amber-950/80 border-amber-700'
    : 'bg-emerald-950/80 border-emerald-700'

  return (
    <div className={`card border-2 ${modeBg} transition-all`}>
      {/* Mode banner */}
      <div
        className="text-center font-black text-xl py-2 mb-3 rounded tracking-wider"
        style={{ color: modeColor, textShadow: `0 0 20px ${modeColor}` }}
      >
        {display.display_mode}
      </div>

      <div className="flex items-start gap-4">
        <SignalLight state={display.signal_state} />
        <div className="flex-1 space-y-2">
          <div className="text-white font-semibold text-sm">{display.junction_name}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Signal changes in:</span>
            <span className="text-lg font-mono font-bold" style={{ color: modeColor }}>{display.countdown_seconds}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Risk Score:</span>
            <span className="text-sm font-mono font-bold" style={{ color: modeColor }}>{Math.round(display.risk_score)}/100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Active Near Misses:</span>
            <span className="text-sm font-mono font-bold text-orange-400">{display.active_near_misses_count}</span>
          </div>
        </div>
      </div>

      {display.ai_risk_state && display.ai_risk_state !== 'NORMAL OPERATION' && (
        <div
          className="mt-3 px-3 py-2 rounded text-xs font-bold text-center tracking-wide"
          style={{ backgroundColor: modeColor + '22', color: modeColor, border: `1px solid ${modeColor}55` }}
        >
          {display.ai_risk_state}
        </div>
      )}

      {display.pedestrian_warning && (
        <div className="mt-2 px-3 py-1.5 rounded bg-amber-900/40 border border-amber-700/50 text-xs text-amber-300 font-semibold text-center">
          ⚠️ PEDESTRIAN CROSSING — REDUCE SPEED
        </div>
      )}

      {display.road_hazard_warning && (
        <div className="mt-2 px-3 py-1.5 rounded bg-red-900/40 border border-red-700/50 text-xs text-red-300 font-semibold text-center">
          🚧 ROAD HAZARD DETECTED — CAUTION
        </div>
      )}

      {display.recent_conflict && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-1">Last detected conflict:</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white">{display.recent_conflict.object_types.join(' ↔ ')}</span>
            <span className="text-gray-500">TTC: {display.recent_conflict.ttc.toFixed(1)}s</span>
            <RiskBadge level={display.recent_conflict.risk_level} />
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-800 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Simulation:</span>
        <button
          onClick={() => {
            setSimulating(true)
            simulate.mutate({ junctionId, conflict_type: 'pedestrian-vehicle' }, { onSettled: () => setSimulating(false) })
          }}
          disabled={simulating}
          className="text-xs px-3 py-1 rounded bg-red-900/40 border border-red-700/50 text-red-300 hover:bg-red-900/60 transition-colors disabled:opacity-50"
        >
          {simulating ? 'Triggering…' : '⚡ Trigger Near-Miss'}
        </button>
        <button
          onClick={() => simulate.mutate({ junctionId, reset: true })}
          className="text-xs px-3 py-1 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          Reset Risk
        </button>
        <span className="text-xs text-gray-600">NearMiss → DB → Junction risk → Display</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function riskLevel(score: number): string {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

export default function SmartJunction() {
  const { data: junctions = [], isLoading } = useJunctions()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <Layout title="Smart Junction" subtitle="AI traffic monitoring — real-time display with near-miss simulation">
      <DemoDataBanner />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: junction list */}
        <div className="space-y-2">
          <div className="card-header px-0">Select Junction</div>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-16 bg-navy-600" />)
            : junctions.map((junction) => (
                <button
                  key={junction.id}
                  onClick={() => setSelectedId(junction.id === selectedId ? null : junction.id)}
                  className={`w-full text-left card p-3 border transition-colors ${
                    junction.id === selectedId ? 'border-accent/60 bg-accent/5' : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">{junction.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{junction.camera_id ?? 'No camera'}</div>
                    </div>
                    <RiskBadge level={riskLevel(junction.risk_score)} score={junction.risk_score} />
                  </div>
                  <div className="mt-2 bg-navy-900 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${junction.risk_score}%`,
                        backgroundColor: junction.risk_score >= 75 ? '#ef4444' : junction.risk_score >= 50 ? '#f97316' : '#f59e0b',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Near misses: {junction.near_misses.length}</span>
                    <span className="text-xs text-gray-500 font-mono">{Math.round(junction.risk_score)}/100</span>
                  </div>
                </button>
              ))
          }
        </div>

        {/* Right: full display */}
        <div className="xl:col-span-2">
          {selectedId !== null ? (
            <JunctionDisplay junctionId={selectedId} />
          ) : (
            <div className="card text-center py-20 text-gray-500">
              <div className="text-4xl mb-3">🚦</div>
              <div className="text-sm">Select a junction to view its Smart Display</div>
              <div className="text-xs text-gray-600 mt-2">Display auto-refreshes every 5 seconds</div>
            </div>
          )}

          <div className="mt-4 card bg-navy-600/50 border border-gray-800">
            <div className="text-xs text-gray-400 font-semibold mb-2">Real Data Flow</div>
            <div className="flex flex-wrap gap-1 items-center text-xs text-gray-500">
              {['Traffic Video Upload', '→', 'AI Near-Miss Detection', '→', 'NearMiss saved to DB', '→',
                'Junction risk_score increases', '→', 'Display → HIGH RISK', '→', 'Dashboard records event'
              ].map((step, i) => (
                <span key={i} className={step === '→' ? 'text-accent' : 'bg-navy-900 px-1.5 py-0.5 rounded'}>
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}


