import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import StatusBadge from '@/components/ui/StatusBadge'
import { useRoadSegments, useRoadSegmentDossier } from '@/hooks/useApi'

function getRiskColor(score: number): { bg: string; text: string; border: string; bar: string } {
  if (score >= 80) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', bar: 'bg-red-500' }
  if (score >= 55) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', bar: 'bg-orange-500' }
  if (score >= 30) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', bar: 'bg-amber-500' }
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', bar: 'bg-emerald-500' }
}

interface FactorMeta {
  cleanLabel: string
  weightLabel: string
  weightPercent: number
  icon: string
  iconBg: string
  iconColor: string
}

const FACTOR_CONFIG: Record<string, FactorMeta> = {
  hazard_severity: {
    cleanLabel: 'Observed Defects & Hazard Severity',
    weightLabel: '30%',
    weightPercent: 30,
    icon: '⚠',
    iconBg: 'bg-amber-500/10 border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  traffic_exposure: {
    cleanLabel: 'Vehicle Traffic Volume & Exposure',
    weightLabel: '20%',
    weightPercent: 20,
    icon: '🚗',
    iconBg: 'bg-blue-500/10 border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  conflict_evidence: {
    cleanLabel: 'Near-Miss & Traffic Conflict Evidence',
    weightLabel: '20%',
    weightPercent: 20,
    icon: '⚠',
    iconBg: 'bg-red-500/10 border-red-500/30',
    iconColor: 'text-red-400',
  },
  vulnerable_user_exposure: {
    cleanLabel: 'Pedestrian & Cyclist Vulnerability',
    weightLabel: '15%',
    weightPercent: 15,
    icon: '🚶',
    iconBg: 'bg-purple-500/10 border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  persistence: {
    cleanLabel: 'Recurring Hotspot / Defect Persistence',
    weightLabel: '10%',
    weightPercent: 10,
    icon: '◷',
    iconBg: 'bg-orange-500/10 border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  road_importance: {
    cleanLabel: 'Network Criticality & Urgency',
    weightLabel: '5%',
    weightPercent: 5,
    icon: '▣',
    iconBg: 'bg-cyan-500/10 border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
}

const FACTOR_ORDER = [
  'hazard_severity',
  'traffic_exposure',
  'conflict_evidence',
  'vulnerable_user_exposure',
  'persistence',
  'road_importance',
]

function resolveFactorMeta(key: string, factor: any): FactorMeta {
  const norm = key.toLowerCase().replace(/[\s-]/g, '_')
  if (norm.includes('hazard')) return FACTOR_CONFIG.hazard_severity
  if (norm.includes('traffic')) return FACTOR_CONFIG.traffic_exposure
  if (norm.includes('conflict') || norm.includes('near_miss')) return FACTOR_CONFIG.conflict_evidence
  if (norm.includes('vulnerab') || norm.includes('pedestrian')) return FACTOR_CONFIG.vulnerable_user_exposure
  if (norm.includes('persist')) return FACTOR_CONFIG.persistence
  if (norm.includes('importance') || norm.includes('criticality')) return FACTOR_CONFIG.road_importance
  if (FACTOR_CONFIG[norm]) return FACTOR_CONFIG[norm]

  const cleanLabel = factor?.label ? String(factor.label).replace(/\s*\(\d+%\)/, '').trim() : key.replace(/_/g, ' ')
  const weightPercent = factor?.weight ? Math.round(factor.weight * 100) : 10
  return {
    cleanLabel,
    weightLabel: `${weightPercent}%`,
    weightPercent,
    icon: 'ℹ',
    iconBg: 'bg-navy-900 border-gray-700',
    iconColor: 'text-accent',
  }
}

export default function RoadIntelligence() {
  const { data: roads = [], isLoading: roadsLoading } = useRoadSegments()
  const [selectedRoadId, setSelectedRoadId] = useState<number>(1)

  const activeId = selectedRoadId || (roads.length > 0 ? roads[0].id : 1)
  const { data: dossier, isLoading: dossierLoading } = useRoadSegmentDossier(activeId)

  const activeRoad = roads.find((r) => r.id === activeId) || roads[0]

  return (
    <Layout
      title="Road Intelligence Dossier"
      subtitle="Multi-Factor Calculated Risk Analysis, Field Evidence & Data Quality Assurance [DEMO]"
    >
      <DemoDataBanner />

      {/* Header Segment Selector Bar */}
      <div className="mb-6 p-4 bg-navy-800 rounded-xl border border-gray-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label htmlFor="road-select" className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Select Road Corridor / Segment
          </label>
          <div className="flex items-center gap-3">
            <select
              id="road-select"
              value={activeId}
              onChange={(e) => setSelectedRoadId(Number(e.target.value))}
              aria-label="Select Road Corridor / Segment"
              className="bg-navy-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-accent min-w-[260px]"
            >
              {roads.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — Risk: {Math.round(r.risk_score)}/100 ({(r.road_type || 'corridor').replace('_', ' ')})
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400 hidden sm:inline">
              {roads.length} corridors actively monitored
            </span>
          </div>
        </div>

        {/* Quick Corridor Navigation Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {roads.map((r) => {
            const isSelected = r.id === activeId
            const color = getRiskColor(r.risk_score)
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRoadId(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-accent/20 border-accent text-white shadow-md'
                    : 'bg-navy-900/60 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${color.bar}`} />
                <span>{r.name}</span>
                <span className="font-mono text-[10px] opacity-75">{Math.round(r.risk_score)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {roadsLoading || dossierLoading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 gap-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span>Loading Corridor Dossier & Evidence...</span>
        </div>
      ) : dossier ? (
        <div className="space-y-6">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Risk Card */}
            <div className="bg-navy-800 p-4 rounded-xl border border-gray-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Calculated Risk Score</span>
                <span className="text-[10px] font-mono bg-navy-900 px-1.5 py-0.5 rounded border border-gray-700">0.3H+0.2E+0.2C+...</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-extrabold ${getRiskColor(dossier.calculated_risk).text}`}>
                  {Math.round(dossier.calculated_risk)}
                </span>
                <span className="text-gray-500 text-xs font-mono">/ 100</span>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${getRiskColor(dossier.calculated_risk).bg} ${getRiskColor(dossier.calculated_risk).text} ${getRiskColor(dossier.calculated_risk).border}`}>
                  {dossier.classification}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Empirical synthesis of hazard severity, exposure & near-miss telemetry.
              </p>
            </div>

            {/* SafeCity Score */}
            <div className="bg-navy-800 p-4 rounded-xl border border-gray-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>SafeCity Safety Score</span>
                <span className="text-[10px] font-mono text-emerald-400">Target: &gt;80</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">
                  {Math.round(dossier.safe_city_score)}
                </span>
                <span className="text-gray-500 text-xs font-mono">/ 100</span>
                {dossier.is_danger_zone && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/30">
                    ⚠ DANGER ZONE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Inverse composite rating. Higher represents better municipal infrastructure safety.
              </p>
            </div>

            {/* Data Coverage Health */}
            <div className="bg-navy-800 p-4 rounded-xl border border-gray-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Data Coverage Level</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                  dossier.quality.coverage_tier === 'HIGH'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : dossier.quality.coverage_tier === 'MODERATE'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {dossier.quality.coverage_tier} COVERAGE
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-accent">
                  {Math.round(dossier.data_coverage)}%
                </span>
                <span className="text-gray-400 text-xs">monitored</span>
              </div>
              {/* Coverage progress */}
              <div className="w-full bg-navy-900 h-1.5 rounded-full mt-2 overflow-hidden border border-gray-800">
                <div
                  className={`h-full rounded-full ${
                    dossier.data_coverage > 75 ? 'bg-emerald-500' : dossier.data_coverage > 45 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${dossier.data_coverage}%` }}
                />
              </div>
              <p className="text-[10px] text-amber-400/90 font-semibold mt-2">
                ⚠ Low coverage does NOT mean a safe road.
              </p>
            </div>

            {/* Municipal Action Plan */}
            <div className="bg-navy-800 p-4 rounded-xl border border-gray-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Repair & Intervention</span>
                <StatusBadge status={dossier.repair_status} />
              </div>
              <div className="mt-2">
                <div className="text-xs font-semibold text-white truncate" title={dossier.suggested_intervention}>
                  {dossier.suggested_intervention}
                </div>
                <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                  <span>Type: <strong className="text-gray-300">{dossier.road_type.replace('_', ' ')}</strong></span>
                  <span>•</span>
                  <span>Exposure: <strong className="text-gray-300">{dossier.traffic_exposure}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Scientific Disclaimer / Caution Banner if low coverage */}
          {dossier.quality.quality_warning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-300">
              <span className="text-base leading-none">⚠</span>
              <div>
                <strong className="font-bold text-amber-200">Data Coverage Alert:</strong> {dossier.quality.quality_warning}
                <div className="text-[11px] text-amber-400/80 mt-0.5">
                  SafeCity Loop enforces strict epistemological limits: an unobserved road segment must never be labeled safe simply due to absent sensor telemetry.
                </div>
              </div>
            </div>
          )}

          {/* Main Grid: Factor Breakdown & Data Integrity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contributing Factor Breakdown (2 Cols) */}
            <div className="lg:col-span-2 bg-navy-800 p-5 sm:p-6 rounded-xl border border-gray-800 shadow-md">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-gray-700/60">
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-sm sm:text-base">
                    Calculated Risk Formula Breakdown
                  </h3>
                  <p className="text-gray-400 text-xs flex flex-wrap items-center gap-1.5">
                    <span>Formula:</span>
                    <code className="text-accent font-mono bg-navy-900/80 px-1.5 py-0.5 rounded border border-gray-800 text-[11px] sm:text-xs">
                      Risk = 0.30H + 0.20E + 0.20C + 0.15V + 0.10P + 0.05U
                    </code>
                  </p>
                </div>
                <div className="flex items-center self-start sm:self-center">
                  <span className="text-xs font-mono font-bold text-white bg-navy-900 px-2.5 py-1.5 rounded-lg border border-gray-700 shadow-inner">
                    Total = {Math.round(dossier.calculated_risk)}/100
                  </span>
                </div>
              </div>

              {/* Factor Rows */}
              <div className="space-y-3.5">
                {Object.entries(dossier.contributing_factors || {})
                  .sort(([a], [b]) => {
                    const aNorm = a.toLowerCase().replace(/[\s-]/g, '_')
                    const bNorm = b.toLowerCase().replace(/[\s-]/g, '_')
                    const aIdx = FACTOR_ORDER.findIndex((k) => aNorm.includes(k) || k.includes(aNorm))
                    const bIdx = FACTOR_ORDER.findIndex((k) => bNorm.includes(k) || k.includes(bNorm))
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
                    return 0
                  })
                  .map(([key, factor]) => {
                    const meta = resolveFactorMeta(key, factor)
                    const scoreVal = typeof factor.score === 'number' ? factor.score : 0
                    const percent = Math.min(100, Math.max(0, scoreVal))
                    const points = typeof factor.weighted_contribution === 'number'
                      ? factor.weighted_contribution
                      : (scoreVal * (meta.weightPercent / 100))

                    return (
                      <div
                        key={key}
                        data-factor-key={key.toUpperCase()}
                        title={`Internal Factor Key: ${key.toUpperCase()}`}
                        className="p-3.5 sm:p-4 rounded-xl bg-navy-900/50 border border-gray-800/80 hover:border-gray-700/80 transition-colors flex items-center gap-3.5 sm:gap-4"
                      >
                        {/* Icon Column (Fixed 48px x 48px) */}
                        <div
                          className={`w-12 h-12 flex-shrink-0 rounded-xl border flex items-center justify-center text-lg sm:text-xl select-none ${meta.iconBg} ${meta.iconColor}`}
                          aria-hidden="true"
                        >
                          {meta.icon}
                        </div>

                        {/* Content Column */}
                        <div className="min-w-0 flex-1 flex flex-col justify-center gap-2">
                          {/* Header Row: Title + Weight on Left, Score + Points on Right */}
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 min-w-0">
                            <div className="min-w-0 flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-white font-semibold text-xs sm:text-sm">
                                {meta.cleanLabel}
                              </span>
                              <span className="text-gray-400 font-mono text-[11px] sm:text-xs">
                                ({meta.weightLabel})
                              </span>
                            </div>

                            <div className="flex items-center gap-3 font-mono text-xs flex-shrink-0">
                              <span className="text-gray-400">
                                Score: <strong className="text-gray-200 font-semibold">{Math.round(scoreVal)}</strong>
                              </span>
                              <span className="text-accent font-bold">
                                +{points.toFixed(1)} pts
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar (on its own row beneath title/score) */}
                          <div className="w-full bg-navy-950 h-2.5 rounded-full overflow-hidden border border-gray-800/80">
                            <div
                              className="h-full bg-gradient-to-r from-accent/80 to-accent rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                              role="progressbar"
                              aria-valuenow={Math.round(scoreVal)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3.5 border-t border-gray-700/60 bg-navy-900/40 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-accent font-bold" aria-hidden="true">ℹ</span>
                  <span>Scores are bounded [0–100] and weighted strictly by municipal severity guidelines.</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap self-start sm:self-center">
                  REF: SC-MUNI-SPEC-V2.1
                </span>
              </div>
            </div>

            {/* Data Quality & Sensor Telemetry (1 Col) */}
            <div className="bg-navy-800 p-5 rounded-xl border border-gray-800 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-700/60">
                  <h3 className="text-white font-bold text-sm">Data Quality Metrics</h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-navy-900/80 rounded-lg border border-gray-800">
                    <span className="text-gray-400">Last Observation</span>
                    <span className="font-mono text-gray-200">
                      {dossier.quality.last_observation_hours_ago.toFixed(1)} hours ago
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-navy-900/80 rounded-lg border border-gray-800">
                    <span className="text-gray-400">Observation Samples</span>
                    <span className="font-mono text-white font-bold">
                      {dossier.quality.observation_count} frames / passes
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-navy-900/80 rounded-lg border border-gray-800">
                    <span className="text-gray-400">GPS Spatial Precision</span>
                    <span className="font-mono text-emerald-400">
                      ±{dossier.quality.gps_accuracy_meters.toFixed(1)} meters
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-navy-900/80 rounded-lg border border-gray-800">
                    <span className="text-gray-400">Model Inference Confidence</span>
                    <span className="font-mono text-accent font-bold">
                      {(dossier.quality.model_confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-navy-900/80 rounded-lg border border-gray-800">
                    <span className="text-gray-400">Freshness Assessment</span>
                    <span className="font-mono text-gray-200">{dossier.quality.data_freshness}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-navy-900 border border-gray-800 rounded-lg text-[10px] text-gray-400 space-y-1">
                <div className="font-semibold text-gray-300">EPIDEMIOLOGICAL DISCLAIMER:</div>
                <p className="leading-relaxed">
                  {dossier.quality.audit_disclaimer}
                </p>
              </div>
            </div>
          </div>

          {/* Field Hazards & Near Misses Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hazards on Segment */}
            <div className="bg-navy-800 p-5 rounded-xl border border-gray-800 shadow-md">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-base">⚠</span>
                  <h3 className="text-white font-bold text-sm">
                    Surface Hazards & Defects ({dossier.hazards.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-navy-900 px-2 py-0.5 rounded border border-gray-700">
                  AI + CITIZEN DETECTED
                </span>
              </div>

              {dossier.hazards.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs">
                  No active surface defects registered for this corridor.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {dossier.hazards.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-navy-900/90 rounded-lg border border-gray-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-gray-200 flex items-center gap-2">
                          <span>{h.type}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-bold ${
                            h.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            h.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {h.severity}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {h.description || 'Pothole detected via road inspection pass'}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">
                          Coords: {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)} • Conf: {(h.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={h.status} />
                        <div className="text-[10px] font-mono text-gray-400 mt-1">
                          Risk: {Math.round(h.risk_score)}/100
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Traffic Conflicts on Segment */}
            <div className="bg-navy-800 p-5 rounded-xl border border-gray-800 shadow-md">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-base">⚡</span>
                  <h3 className="text-white font-bold text-sm">
                    Traffic Conflicts & Near Misses ({dossier.conflicts.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-navy-900 px-2 py-0.5 rounded border border-gray-700">
                  TELEMETRY / VIDEO
                </span>
              </div>

              {dossier.conflicts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs">
                  No near-miss telemetry logged on this corridor.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {dossier.conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-navy-900/90 rounded-lg border border-gray-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-gray-200 flex items-center gap-2">
                          <span>{(c.conflict_type || 'VEHICLE_CONFLICT').replace('_', ' ')}</span>
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            TTC: {c.ttc ? `${c.ttc.toFixed(1)}s` : '1.2s'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {c.description || 'Conflict detected between vehicles/pedestrians'}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">
                          PET: {c.pet ? `${c.pet.toFixed(1)}s` : 'N/A'} • Min Dist: {c.minimum_distance ? `${c.minimum_distance.toFixed(1)}m` : '1.8m'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          c.review_status === 'ACTIONED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          c.review_status === 'REVIEWED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {c.review_status}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1 font-mono">
                          {c.timestamp.substring(0, 10)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Evidence Vault Timeline on Corridor */}
          <div className="bg-navy-800 p-5 rounded-xl border border-gray-800 shadow-md">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-700/60">
              <div className="flex items-center gap-2">
                <span className="text-accent text-base">📁</span>
                <h3 className="text-white font-bold text-sm">
                  Chain-of-Custody Evidence Timeline ({dossier.evidence_timeline.length} files)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                AUDIT COMPLIANT
              </span>
            </div>

            {dossier.evidence_timeline.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">
                No multimedia evidence files linked directly to this segment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {dossier.evidence_timeline.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-navy-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-2">
                        <span className="font-mono text-accent font-bold">{ev.evidence_code}</span>
                        <span className="text-[9px] bg-navy-800 border border-gray-700 text-gray-300 px-1.5 py-0.2 rounded font-mono">
                          {ev.file_type}
                        </span>
                      </div>
                      <div className="w-full h-24 bg-navy-950 rounded border border-gray-800 flex items-center justify-center text-gray-600 mb-2 overflow-hidden relative">
                        {ev.thumbnail_url ? (
                          <img src={ev.thumbnail_url} alt={ev.evidence_code} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-xs text-gray-500">
                            <span className="text-xl">📷</span>
                            <span className="text-[10px] mt-1">Snapshot</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-300 line-clamp-2">
                        {ev.notes || 'Inspection telemetry file'}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                      <span>{ev.captured_at.substring(0, 10)}</span>
                      <span className={ev.verified ? 'text-emerald-400' : 'text-amber-400'}>
                        {ev.verified ? '✓ Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400">
          Segment details could not be loaded.
        </div>
      )}
    </Layout>
  )
}
