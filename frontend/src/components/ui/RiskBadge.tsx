import type { RiskLevel } from '@/types'

interface RiskBadgeProps {
  level: RiskLevel | string
  score?: number
}

const levelMap: Record<string, string> = {
  LOW: 'badge-low',
  MEDIUM: 'badge-medium',
  HIGH: 'badge-high',
  CRITICAL: 'badge-critical',
}

export default function RiskBadge({ level, score }: RiskBadgeProps) {
  const cls = levelMap[level?.toUpperCase()] ?? 'badge-medium'
  return (
    <span className={cls}>
      {level}{score !== undefined ? ` ${score}/100` : ''}
    </span>
  )
}
