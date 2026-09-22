import type { Intervention } from '@/types'

interface InterventionImpactProps {
  interventions: Intervention[]
}

function riskColor(score: number): string {
  if (score >= 70) return '#ef4444'
  if (score >= 50) return '#f97316'
  if (score >= 30) return '#f59e0b'
  return '#10b981'
}

export default function InterventionImpact({ interventions }: InterventionImpactProps) {
  return (
    <div className="space-y-4">
      {interventions.map((iv) => {
        const before = iv.before_risk ?? 0
        const after = iv.after_risk ?? 0
        const reduction = before > 0 ? Math.round(((before - after) / before) * 100) : 0

        return (
          <div key={iv.id} className="p-3 bg-navy-600 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white truncate pr-2">{iv.name}</span>
              <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-medium flex-shrink-0">
                -{reduction}% risk
              </span>
            </div>

            {/* Before/After bar */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">Before</span>
                <div className="flex-1 bg-navy-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${before}%`, backgroundColor: riskColor(before) }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right" style={{ color: riskColor(before) }}>
                  {before}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">After</span>
                <div className="flex-1 bg-navy-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${after}%`, backgroundColor: riskColor(after) }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right" style={{ color: riskColor(after) }}>
                  {after}
                </span>
              </div>
            </div>

            {iv.type && (
              <div className="text-xs text-gray-500 mt-2 capitalize">
                Type: {iv.type} · Near misses: {iv.before_near_misses} → {iv.after_near_misses}
              </div>
            )}
          </div>
        )
      })}
      {interventions.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-6">No intervention data</div>
      )}
    </div>
  )
}
