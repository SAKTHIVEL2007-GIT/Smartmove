import type { AIEvent } from '@/types'

interface RecentAIEventsProps {
  events: AIEvent[]
}

const eventColors: Record<string, string> = {
  pothole: 'bg-red-500',
  'near-miss': 'bg-orange-500',
  'danger-zone': 'bg-red-600',
  repair: 'bg-blue-500',
}

const eventIcons: Record<string, string> = {
  pothole: '⬟',
  'near-miss': '⚡',
  'danger-zone': '⚠',
  repair: '🔧',
}

export default function RecentAIEvents({ events }: RecentAIEventsProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-800" />

      <div className="space-y-3">
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-3 pl-0">
            {/* Dot */}
            <div
              className={`relative z-10 w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 ${eventColors[ev.type] ?? 'bg-gray-500'}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400 flex-shrink-0">{ev.time}</span>
                <span className="text-xs">{eventIcons[ev.type] ?? '●'}</span>
              </div>
              <p className="text-sm text-gray-300 mt-0.5 leading-snug">{ev.event}</p>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-6">No recent events</div>
      )}
    </div>
  )
}
