import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import {
  useInterventions, useRoads, useSimulateIntervention,
  useInterventionComparisonChart, useRoadRiskEvaluation
} from '@/hooks/useApi'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { InterventionSimulationResult } from '@/types'

export default function InterventionImpactPage() {
  const { data: interventions = [] } = useInterventions()
  const { data: roads = [] } = useRoads()

  // Simulator state
  const [selectedRoadId, setSelectedRoadId] = useState<number | ''>('')
  const [interventionType, setInterventionType] = useState('speed_bump')
  const { mutate: runSimulation, isPending: isSimulating, data: simulatedResult, error: simError } = useSimulateIntervention()

  // Dynamic comparison chart data for selected road
  const activeRoadId = selectedRoadId ? Number(selectedRoadId) : (roads[0]?.id ?? 1)
  const { data: comparisonData } = useInterventionComparisonChart(activeRoadId)
  const { data: currentRiskEval } = useRoadRiskEvaluation(activeRoadId)

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

  // Dynamic comparison chart dataset (Part 2 Step 7)
  const chartData = comparisonData?.interventions.map((item) => ({
    name: item.name.replace('Installation', '').replace('Reconstruction', '').trim(),
    'Current Risk': comparisonData.current_risk,
    'Projected Risk': item.projected_risk,
  })) || interventions.map((iv) => ({
    name: iv.name.replace(' [DEMO]', '').replace('Corridor', '').replace('Upgrade', '').trim(),
    'Current Risk': iv.before_risk ?? 0,
    'Projected Risk': iv.after_risk ?? 0,
  }))

  function handleSimulate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoadId) return
    runSimulation({
      road_id: Number(selectedRoadId),
      intervention: interventionType,
    })
  }

  return (
    <Layout title="Intervention Impact" subtitle="What-If Municipal Simulator & Transparent Risk Engine Analysis">
      <DemoDataBanner />

      {/* Mandatory scientific / simulation disclaimer */}
      <div className="mb-4 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-300 flex items-start gap-2.5">
        <span className="text-base flex-shrink-0">⚠️</span>
        <div>
          <strong className="text-amber-200">Simulation Disclaimer:</strong> Projected results are generated from current
          measured road-risk factors and configurable intervention-effect assumptions. They are mathematical simulations,
          not guaranteed real-world accident elimination outcomes.
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
          <div className="text-xs text-gray-400 mt-1">Observed Conflicts Mitigated</div>
        </div>
      </div>

      {/* Primary Municipal Interventions Pipeline */}
      <div className="card mb-4 border border-gray-700 bg-navy-950/70">
        <div className="card-header border-b border-gray-800 pb-2 mb-4 flex items-center justify-between">
          <span>Municipal Interventions — Current vs Projected Pipeline</span>
          <span className="text-xs bg-navy-800 text-gray-400 px-2.5 py-1 rounded font-mono border border-gray-700">
            Engine: calculate_risk_score()
          </span>
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
                      VERIFIED REPAIR
                    </span>
                  </div>
                </div>

                {/* CURRENT CONDITION -> REPAIR -> PROJECTED AFTER INTERVENTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-2 bg-navy-950/70 p-3 rounded-lg border border-gray-800/80">
                  {/* CURRENT CONDITION */}
                  <div className="text-center p-3 rounded-lg bg-red-950/30 border border-red-900/40">
                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">
                      CURRENT CONDITION
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-red-400">
                      {Math.round(before)}
                      <span className="text-xs font-normal text-gray-500">/100</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Observed Conflicts: <strong className="text-red-400">{iv.before_near_misses}</strong>
                    </div>
                    <div className="mt-1">
                      <span className="text-[9px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded border border-red-700/50 font-mono">
                        DEMO ROAD DATA
                      </span>
                    </div>
                  </div>

                  {/* REPAIR / INTERVENTION ACTION */}
                  <div className="text-center flex flex-col items-center justify-center p-2">
                    <div className="text-accent text-xs font-bold mb-1">↓ SIMULATED INTERVENTION ↓</div>
                    <div className="px-3 py-1 rounded bg-accent/15 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider font-mono">
                      {iv.type || 'resurfacing'}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold mt-2">
                      Δ -{Math.round(delta)} pts (-{percent}%)
                    </div>
                  </div>

                  {/* PROJECTED AFTER INTERVENTION */}
                  <div className="text-center p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                      PROJECTED AFTER INTERVENTION
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                      {Math.round(after)}
                      <span className="text-xs font-normal text-gray-500">/100</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Projected Conflicts: <strong className="text-emerald-400">{iv.after_near_misses}</strong>
                    </div>
                    <div className="mt-1">
                      <span className="text-[9px] bg-emerald-900/40 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/50 font-mono">
                        MODE: SIMULATION
                      </span>
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
        {/* Dynamic Comparison Chart */}
        <div className="card">
          <div className="card-header mb-2 flex items-center justify-between">
            <span>Intervention Risk Comparison Chart</span>
            {comparisonData && (
              <span className="text-[10px] bg-navy-800 text-gray-300 px-2 py-0.5 rounded font-mono border border-gray-700">
                {comparisonData.road_name} (Current: {comparisonData.current_risk})
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Dynamic risk comparison generated by <code className="text-accent font-mono">calculate_projected_risk()</code> across candidate interventions.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Current Risk" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Projected Risk" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* What-If Municipal Simulator (Part 2) */}
        <div className="card border border-accent/30 bg-navy-850">
          <div className="card-header flex items-center justify-between">
            <span>What-If Municipal Simulator</span>
            <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded font-mono font-bold">
              WHAT-IF SIMULATION
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Simulate the projected safety impact of proposed civic repairs on any monitored road corridor.
          </p>

          <form onSubmit={handleSimulate} className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Candidate Road Segment</label>
              <select
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                value={selectedRoadId}
                onChange={(e) => setSelectedRoadId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Choose a road corridor...</option>
                {roads.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — Risk: {Math.round(r.risk_score)}/100
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Proposed Intervention Package</label>
              <select
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                value={interventionType}
                onChange={(e) => setInterventionType(e.target.value)}
              >
                <option value="speed_bump">Speed Bump & Chicane Installation (Speed / Near-Miss)</option>
                <option value="pedestrian_refuge_island">Pedestrian Refuge Island & Solar Signage (Vulnerable / Crossing)</option>
                <option value="road_resurfacing">Full Road Surface Reconstruction (Potholes / Fatigue)</option>
                <option value="micro_surfacing">Micro-Surfacing & Anti-Skid Epoxy (Friction / Cratering)</option>
                <option value="speed_cushions">Dual Speed Cushions (Traffic Speed Calibration)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSimulating || !selectedRoadId}
              className="btn-primary w-full text-xs py-2 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calculating Projected Risk Factors...
                </>
              ) : (
                '⚡ Compute Projected Safety Delta'
              )}
            </button>
          </form>

          {simError && (
            <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded">
              ✕ {simError.message}
            </div>
          )}

          {simulatedResult && (
            <div className="mt-4 p-3.5 bg-navy-950 rounded-lg border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-emerald-400">
                  ✓ Simulation Projection: {simulatedResult.intervention_name}
                </div>
                <span className="text-[10px] bg-purple-900/50 text-purple-300 border border-purple-700 px-2 py-0.5 rounded font-mono">
                  {simulatedResult.data_source}
                </span>
              </div>

              {/* KPI delta summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-navy-900 rounded border border-gray-800">
                  <div className="text-[10px] text-gray-500">CURRENT CONDITION</div>
                  <div className="text-base font-bold font-mono text-red-400">{simulatedResult.current_risk}</div>
                </div>
                <div className="p-2 bg-navy-900 rounded border border-gray-800">
                  <div className="text-[10px] text-gray-500">PROJECTED AFTER</div>
                  <div className="text-base font-bold font-mono text-emerald-400">{simulatedResult.projected_risk}</div>
                </div>
                <div className="p-2 bg-navy-900 rounded border border-gray-800">
                  <div className="text-[10px] text-gray-500">PROJECTED REDUCTION</div>
                  <div className="text-base font-bold font-mono text-accent">-{simulatedResult.reduction_percent}%</div>
                </div>
              </div>

              {/* Factor Transition List (Part 2 Step 6) */}
              <div>
                <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  IMPACTED RISK FACTORS (BEFORE → AFTER)
                </div>
                <div className="space-y-1">
                  {Object.values(simulatedResult.factor_transitions).map((ft) => {
                    const label = ft.factor_key.replace('_', ' ').toUpperCase()
                    return (
                      <div
                        key={ft.factor_key}
                        className={`flex items-center justify-between text-xs p-1.5 rounded font-mono ${
                          ft.is_modified ? 'bg-accent/10 border border-accent/30' : 'bg-navy-900/60 text-gray-500'
                        }`}
                      >
                        <span>{label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={ft.is_modified ? 'text-red-400 font-bold' : 'text-gray-400'}>
                            {ft.before_normalized.toFixed(2)}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className={ft.is_modified ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
                            {ft.after_normalized.toFixed(2)}
                          </span>
                          {ft.is_modified && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded">
                              ({ft.delta > 0 ? `+${ft.delta}` : ft.delta})
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="text-[10px] text-gray-400 border-t border-gray-800 pt-2 italic">
                {simulatedResult.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
