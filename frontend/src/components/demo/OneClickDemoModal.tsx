import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface StepInfo {
  number: number
  title: string
  subtitle: string
  category: string
  details: string
  metrics: { label: string; value: string; color?: string }[]
  targetRoute: string
  actionLabel: string
  icon: string
}

const STEPS: StepInfo[] = [
  {
    number: 1,
    title: 'Road Image Uploaded',
    subtitle: 'Citizen or municipal dashcam feeds street-level optical capture',
    category: 'DETECT',
    details: 'Municipal survey camera uploads high-resolution 1080p frame from School Road segment [DEMO]. Coordinates logged: 51.5074° N, 0.1278° W.',
    metrics: [
      { label: 'Source', value: 'Street Survey #04' },
      { label: 'Resolution', value: '1920x1080' },
      { label: 'Road', value: 'School Road' },
    ],
    targetRoute: '/ai-vision',
    actionLabel: 'View AI Vision Engine',
    icon: '📸',
  },
  {
    number: 2,
    title: 'Pothole Detected',
    subtitle: 'Local YOLOv8 inference runs dark-pixel and contour geometry scan',
    category: 'ANALYZE',
    details: 'Model identifies deep asphalt cavity with 92.4% confidence. Severity classified as CRITICAL (area: 0.42m², estimated depth: 8.5cm).',
    metrics: [
      { label: 'Confidence', value: '92.4%', color: '#10b981' },
      { label: 'Severity', value: 'CRITICAL', color: '#ef4444' },
      { label: 'Class', value: 'Asphalt Pothole' },
    ],
    targetRoute: '/ai-vision',
    actionLabel: 'Inspect Detection Bounding Box',
    icon: '🎯',
  },
  {
    number: 3,
    title: 'Risk Calculated',
    subtitle: 'DangerZoneService combines hazard severity and road vulnerability',
    category: 'PREDICT',
    details: 'Composite algorithm aggregates: Pothole severity (85) + School Zone Pedestrian Factor (x1.4) + Heavy Bus Traffic (x1.2). Danger score spikes.',
    metrics: [
      { label: 'Pothole Risk', value: '85/100', color: '#ef4444' },
      { label: 'Vulnerability', value: 'HIGH' },
      { label: 'SafeCity Score', value: '15/100', color: '#ef4444' },
    ],
    targetRoute: '/danger-zones',
    actionLabel: 'View Danger Zone Engine',
    icon: '🧠',
  },
  {
    number: 4,
    title: 'Hazard Appears on Map',
    subtitle: 'Real-time GPS synchronization generates interactive spatial pin',
    category: 'DETECT',
    details: 'Pin dropped on municipal map at exact coordinates. Nearby drivers receive geofenced alert. Road risk classification highlighted in red.',
    metrics: [
      { label: 'Latitude', value: '51.5074° N' },
      { label: 'Longitude', value: '0.1278° W' },
      { label: 'Pin Type', value: 'Critical Pothole' },
    ],
    targetRoute: '/map',
    actionLabel: 'Explore Interactive Hazard Map',
    icon: '🗺',
  },
  {
    number: 5,
    title: 'Repair Priority Changes',
    subtitle: 'RepairDecisionEngine recalculates municipal maintenance rankings',
    category: 'PRIORITIZE',
    details: 'School Road jumps from Rank #4 to Rank #1 with urgency 100/100. AI generates explainable reason: "Critical pothole severity in school pedestrian corridor".',
    metrics: [
      { label: 'New Rank', value: '#1 Urgent', color: '#ef4444' },
      { label: 'Urgency Score', value: '100/100', color: '#ef4444' },
      { label: 'Assigned To', value: 'Rapid Asphalt Team A' },
    ],
    targetRoute: '/repair',
    actionLabel: 'Open Municipal Repair Queue',
    icon: '🔧',
  },
  {
    number: 6,
    title: 'Traffic Near Miss Detected',
    subtitle: 'Junction camera captures vehicle swerving around pothole',
    category: 'ANALYZE',
    details: 'ByteTrack tracks vehicle and crossing child. Trajectory vector intersection calculated: Time-To-Collision (TTC) drops to 0.72 seconds.',
    metrics: [
      { label: 'Conflict', value: 'Vehicle ↔ Pedestrian', color: '#ef4444' },
      { label: 'TTC', value: '0.72s (Critical)', color: '#ef4444' },
      { label: 'Conflict Zone', value: 'Zebra Crossing' },
    ],
    targetRoute: '/ai-vision',
    actionLabel: 'Review Near-Miss Trajectory',
    icon: '⚡',
  },
  {
    number: 7,
    title: 'Danger-Zone Score Increases',
    subtitle: 'Synergistic risk update across intersecting road corridors',
    category: 'PREDICT',
    details: 'Pothole + Near-Miss triggers compound danger status. Danger Zone Score escalates to 89.0/100. Classification: VERY HIGH.',
    metrics: [
      { label: 'Danger Zone Score', value: '89.0/100', color: '#ef4444' },
      { label: 'Status', value: 'VERY HIGH', color: '#ef4444' },
      { label: 'SafeCity Score', value: '11/100', color: '#ef4444' },
    ],
    targetRoute: '/danger-zones',
    actionLabel: 'View Road Safety Evaluation',
    icon: '🔴',
  },
  {
    number: 8,
    title: 'Smart Junction Switches to HIGH RISK',
    subtitle: 'Digital roadside billboard enters emergency warning state',
    category: 'PREVENT',
    details: 'Smart Junction switches signal to RED, displays flashing warning: "HIGH RISK JUNCTION — PEDESTRIAN CONFLICT DETECTED — SLOW DOWN".',
    metrics: [
      { label: 'Display Mode', value: 'HIGH RISK', color: '#ef4444' },
      { label: 'Signal State', value: 'RED', color: '#ef4444' },
      { label: 'Warning', value: 'Active Pedestrian Alert' },
    ],
    targetRoute: '/junction-display',
    actionLabel: 'View Roadside Display Mode',
    icon: '🚨',
  },
  {
    number: 9,
    title: 'Safer Route Updates',
    subtitle: 'RouteEngine computes lower-risk alternative for commuters',
    category: 'PREVENT',
    details: 'Commuters receive neutral advisory: Fastest Route (School Road direct, Risk 89) vs Lower-Risk Route (Via Park Ave, 22% longer, Risk 34, -62% risk).',
    metrics: [
      { label: 'Fastest Risk', value: '89/100', color: '#ef4444' },
      { label: 'Safer Risk', value: '34/100', color: '#10b981' },
      { label: 'Risk Reduction', value: '-61.8%', color: '#10b981' },
    ],
    targetRoute: '/routes',
    actionLabel: 'Compare Routes Neutrally',
    icon: '↗',
  },
  {
    number: 10,
    title: 'Repair Completed',
    subtitle: 'Municipal crew verifies resurfacing; PATCH /api/repairs executes',
    category: 'REPAIR',
    details: 'Council Maintenance Team fills pothole and applies high-friction surface. Status marked "Completed". Road risk drops immediately by 55%.',
    metrics: [
      { label: 'Status', value: 'Completed', color: '#10b981' },
      { label: 'Material', value: 'Hot-Mix Polymer Asphalt' },
      { label: 'Risk After Repair', value: '34.0/100', color: '#10b981' },
    ],
    targetRoute: '/repair',
    actionLabel: 'Inspect Closed Work Order',
    icon: '✅',
  },
  {
    number: 11,
    title: 'Before/After Impact Appears',
    subtitle: 'Intervention impact module records verified risk drop',
    category: 'MEASURE',
    details: 'SafeCity Loop closed: Before Risk 89 → After Risk 34 (-55 pts, -61.8%). Near misses decrease from 14 to 3. Municipal loop completed!',
    metrics: [
      { label: 'Before Risk', value: '89.0', color: '#ef4444' },
      { label: 'After Risk', value: '34.0', color: '#10b981' },
      { label: 'Delta', value: '-55 points (-61.8%)', color: '#10b981' },
    ],
    targetRoute: '/interventions',
    actionLabel: 'View Before/After Analytics',
    icon: '📈',
  },
]

interface OneClickDemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function OneClickDemoModal({ isOpen, onClose }: OneClickDemoModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 2800)
    return () => clearInterval(timer)
  }, [isPlaying])

  if (!isOpen) return null

  const step = STEPS[currentStep]
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-navy-800 border border-gray-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-navy-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-lg shadow-inner">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-base leading-none">RUN SAFECITY DEMO</h2>
                <span className="bg-accent/10 text-accent border border-accent/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                  End-to-End Loop
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Interactive 11-step walkthrough of the SafeCity Loop intelligence pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-navy-700 transition-colors text-lg"
            aria-label="Close demo"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-navy-950 h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-accent via-amber-400 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step pills navigation */}
        <div className="px-5 py-2.5 bg-navy-850 border-b border-gray-800/80 flex items-center gap-1.5 overflow-x-auto text-xs">
          {STEPS.map((s, idx) => {
            const isActive = idx === currentStep
            const isCompleted = idx < currentStep
            return (
              <button
                key={s.number}
                onClick={() => {
                  setCurrentStep(idx)
                  setIsPlaying(false)
                }}
                className={`flex-shrink-0 px-2 py-1 rounded text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-accent text-white font-bold shadow'
                    : isCompleted
                    ? 'bg-navy-900 text-emerald-400 border border-emerald-500/30'
                    : 'bg-navy-900 text-gray-500 hover:text-gray-300'
                }`}
              >
                {isCompleted ? `✓ ${s.number}` : s.number}
              </button>
            )
          })}
        </div>

        {/* Modal content body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Top category banner */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{step.icon}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                STEP {step.number} OF {STEPS.length}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                {step.category}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              Loop Stage: <strong className="text-white">{step.category}</strong>
            </span>
          </div>

          {/* Title & subtitle */}
          <div>
            <h3 className="text-white font-black text-xl tracking-tight leading-tight">
              {step.title}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {step.subtitle}
            </p>
          </div>

          {/* Details callout */}
          <div className="p-3.5 bg-navy-900/90 rounded-xl border border-gray-700 text-xs text-gray-300 leading-relaxed">
            {step.details}
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {step.metrics.map((m, i) => (
              <div key={i} className="p-2.5 bg-navy-900/60 rounded-lg border border-gray-800 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5 truncate">
                  {m.label}
                </div>
                <div
                  className="text-sm font-bold font-mono truncate"
                  style={{ color: m.color || '#f3f4f6' }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Connected architecture chain */}
          <div className="p-2.5 bg-navy-950/80 rounded-lg border border-gray-800/80 text-[11px] text-gray-400">
            <span className="text-accent font-semibold mr-1">Connected Chain:</span>
            <span className="font-mono text-gray-400">
              ROAD DATA → AI → RISK → DANGER ZONE → REPAIR PRIORITY → SMART JUNCTION → SAFER ROUTE → REPAIR → MEASURE
            </span>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-5 py-3.5 bg-navy-900 border-t border-gray-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-navy-700 text-white border-gray-600 hover:bg-navy-600'
              }`}
            >
              <span>{isPlaying ? '⏸ Pause Auto' : '▶ Play Auto'}</span>
            </button>

            <button
              onClick={() => {
                onClose()
                navigate(step.targetRoute)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 transition-colors"
            >
              {step.actionLabel} ↗
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPlaying(false)
                setCurrentStep((s) => Math.max(0, s - 1))
              }}
              disabled={currentStep === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-navy-700 border border-gray-700 hover:bg-navy-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                if (currentStep < STEPS.length - 1) {
                  setCurrentStep((s) => s + 1)
                } else {
                  onClose()
                }
              }}
              className="btn-primary text-xs py-1.5 px-4 font-semibold"
            >
              {currentStep < STEPS.length - 1 ? 'Next Step →' : 'Finish Demo ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

