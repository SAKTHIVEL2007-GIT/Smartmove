import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import { useInterventions, useRoads } from '@/hooks/useApi'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

export default function InterventionImpactPage() {
  const { data: interventions = [], isLoading } = useInterventions()
  const { data: roads = [] } = useRoads()

  // Simulator state
  const [selectedRoadId, setSelectedRoadId] = useState<number | ''>('')
  const [interventionType, setInterventionType] = useState('resurfacing')
  const [simulatedResult, setSimulatedResult] = useState<{
    roadName: string
    beforeRisk: number
    projectedRisk: number
    delta: number
    percent: number
  } | null>(null)

  const totalRiskReduction = interventions.reduce((s, iv) => {
    if (iv.before_risk && iv.after_risk) {
      return s + (iv.before_risk - iv.after_risk)
    }
    return s
  }, 0)

  const totalNearMissReduction = interventions.reduce(
    (s, iv) => s + (iv.before_near_misses - iv.after_near_misses),
    0,
  )

  const avgReductionPercent = interventions.length
    ? Math.round(
        interventions.reduce((s, iv) => {
          if (iv.before_risk && iv.after_risk) {
            return s + ((iv.before_risk - iv.after_risk) / iv.before_risk) * 100
          }
          return s
        }, 0) / interventions.length,
      )
    : 0

  // Chart data
  const chartData = interventions.map((iv) => ({
    name: iv.name.replace(' [DEMO]', '').replace('Corridor', '').replace('Upgrade', '').trim(),
    Before: iv.before_risk ?? 0,
    After: iv.after_risk ?? 0,
  }))

  function handleSimulate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoadId) return
    const road = roads.find((r) => r.id === Number(selectedRoadId))
    if (!road) return

    const reductionFactor = interventionType === 'resurfacing' ? 0.58 : interventionType === 'signals' ? 0.48 : 0.38
    const projected = Math.round(road.risk_score * (1 - reductionFactor))
    const delta = Math.round(road.risk_score - projected)
    const percent = Math.round((delta / road.risk_score) * 100)

    setSimulatedResult({
      roadName: road.name.replace(' [DEMO]', ''),
      beforeRisk: Math.round(road.risk_score),
      projectedRisk: projected,
      delta,
      percent,
    })
  }

  return (
    <Layout title="Intervention Impact" subtitle="Before / After safety intervention and repair effectiveness analysis">
      <DemoDataBanner />

      {/* Mandatory scientific / demo disclaimer */}
      <div className="mb-4 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-300 flex items-start gap-2.5">
        <span className="text-base flex-shrink-0">⚠️</span>
        <div>
          <strong className="text-amber-200">Simulated Intervention Analysis Disclaimer:</strong> All risk score differences,
          incident counts, and projected impacts are computed from algorithmic heuristics and fictional [DEMO] records.
          SafeCity Loop does <strong>not claim that these risk reductions prove actual or guaranteed accident elimination</strong> in municipal environments.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">{interventions.length}</div>
          <div className="text-xs text-gray-400 mt-1">Interventions Tracked</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            -{Math.round(totalRiskReduction)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total Risk Points Removed</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            -{avgReductionPercent}%
          </div>
          <div className="text-xs text-gray-400 mt-1">Average Risk Reduction</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-accent">
            -{totalNearMissReduction}
          </div>
          <div className="text-xs text-gray-400 mt-1">Near Misses Mitigated</div>
        </div>
      </div>

      {/* Primary Before -> Repair -> After workflow showcases */}
      <div className="card mb-4 border border-gray-700 bg-navy-950/70">
        <div className="card-header border-b border-gray-800 pb-2 mb-4">
          Municipal Interventions — Before vs After Pipeline
        </div>

        <div className="space-y-4">
          {interventions.map((iv) => {
            const before = iv.before_risk ?? 0
            const after = iv.after_risk ?? 0
            const delta = before - after
            const percent = before > 0 ? Math.round((delta / before) * 100) : 0
            const dateStr = iv.implemented_at
              ? new Date(iv.implemented_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
              : 'Recent'

            return (
              <div
                key={iv.id}
                className="p-4 bg-navy-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all"
              >
                {/* Intervention title + tags */}
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white">{iv.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{iv.notes || 'Civic road safety upgrade'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-navy-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded font-mono">
                      Completed: {dateStr}
                    </span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                      Verified
                    </span>
                  </div>
                </div>

                {/* BEFORE -> REPAIR -> AFTER visual workflow */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-2 bg-navy-950/70 p-3 rounded-lg border border-gray-800/80">
                  {/* BEFORE */}
                  <div className="text-center p-3 rounded-lg bg-red-950/30 border border-red-900/40">
                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">
                      BEFORE INTERVENTION
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-red-400">
                      {Math.round(before)}
                      <span className="text-xs font-normal text-gray-500">/100</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Near Misses: <strong className="text-red-400">{iv.before_near_misses}</strong> / month
                    </div>
                  </div>

                  {/* REPAIR ACTION */}
                  <div className="text-center flex flex-col items-center justify-center p-2">
                    <div className="text-accent text-lg mb-1">↓ REPAIR EXECUTED ↓</div>
                    <div className="px-3 py-1 rounded bg-accent/15 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider font-mono">
                      {iv.type || 'resurfacing'}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold mt-2">
                      Δ -{Math.round(delta)} pts (-{percent}%)
                    </div>
                  </div>

                  {/* AFTER */}
                  <div className="text-center p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                      AFTER INTERVENTION
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                      {Math.round(after)}
                      <span className="text-xs font-normal text-gray-500">/100</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Near Misses: <strong className="text-emerald-400">{iv.after_near_misses}</strong> / month
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart & What-if simulator */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Comparison Chart */}
        <div className="card">
          <div className="card-header mb-3">Intervention Risk Comparison Chart</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Before" name="Before Risk" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="After" name="After Risk" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* What-If Intervention Simulator */}
        <div className="card border border-accent/30 bg-navy-850">
          <div className="card-header flex items-center justify-between">
            <span>What-If Municipal Simulator</span>
            <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded font-mono">
              Predictive Mode
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Simulate the projected safety impact of proposed civic repairs on any monitored road.
          </p>

          <form onSubmit={handleSimulate} className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Select Candidate Road</label>
              <select
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                value={selectedRoadId}
                onChange={(e) => {
                  setSelectedRoadId(e.target.value ? Number(e.target.value) : '')
                  setSimulatedResult(null)
                }}
                required
              >
                <option value="">Choose a road segment...</option>
                {roads.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — Current Risk: {Math.round(r.risk_score)}/100
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Proposed Intervention Package</label>
              <select
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                value={interventionType}
                onChange={(e) => {
                  setInterventionType(e.target.value)
                  setSimulatedResult(null)
                }}
              >
                <option value="resurfacing">Full Micro-Surfacing & Speed Cushions (-58% est.)</option>
                <option value="signals">Smart Adaptive Signals & Optical Crossing Warning (-48% est.)</option>
                <option value="lighting">High-Luminance LED Studs & Anti-Skid Epoxy (-38% est.)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary w-full text-xs py-2 font-semibold">
              Compute Projected Safety Delta
            </button>
          </form>

          {simulatedResult && (
            <div className="mt-4 p-3 bg-navy-950 rounded-lg border border-emerald-500/40 animate-in fade-in">
              <div className="text-xs font-bold text-emerald-400 mb-2">
                ✓ Simulation Projection for {simulatedResult.roadName}:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-navy-900 rounded border border-gray-800">
                  <div className="text-[10px] text-gray-500">Current Risk</div>
                  <div className="text-base font-bold font-mono text-red-400">{simulatedResult.beforeRisk}</div>
                </div>
                <div className="p-2 bg-navy-900 rounded border border-gray-800">
                  <div className="text-[10px] text-gray-500">Projected Risk</div>
                  <div className="text-base font-bold font-mono text-emerald-400">{simulatedResult.projectedRisk}</div>
                </div>
                <div className="p-2 bg-navy-900 rounded border border-gray-800">
                  <div className="text-[10px] text-gray-500">Estimated Delta</div>
                  <div className="text-base font-bold font-mono text-accent">-{simulatedResult.percent}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

