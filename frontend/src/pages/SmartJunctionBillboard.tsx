import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJunctions, useJunctionDisplay, useSimulateJunctionEvent } from '@/hooks/useApi'

export default function SmartJunctionBillboard() {
  const { data: junctions = [] } = useJunctions()
  const [selectedId, setSelectedId] = useState<number>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const navigate = useNavigate()

  // Use first junction by default if available
  const activeJunctionId = junctions.length > 0 && !junctions.find(j => j.id === selectedId)
    ? junctions[0].id
    : selectedId

  const { data: displayState } = useJunctionDisplay(activeJunctionId)
  const { mutate: simulate } = useSimulateJunctionEvent()

  // Local live countdown ticker
  const [countdown, setCountdown] = useState(14)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 18 : c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }

  const isHighRisk = displayState?.display_mode === 'HIGH RISK' || (displayState?.risk_score ?? 0) >= 70
  const isCaution = displayState?.display_mode === 'CAUTION' || ((displayState?.risk_score ?? 0) >= 50 && !isHighRisk)
  const signal = displayState?.signal_state || (isHighRisk ? 'RED' : isCaution ? 'AMBER' : 'GREEN')

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 sm:p-8 select-none font-sans overflow-hidden">
      {/* Top Billboard Control Bar */}
      <header className="flex items-center justify-between border-b-2 border-gray-800 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/junction')}
            className="px-3 py-1.5 rounded-lg bg-navy-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-bold transition-colors"
          >
            ← Exit Billboard Mode
          </button>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
              ROADSIDE INTELLIGENT DISPLAY UNIT #B-104
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Junction Selector */}
          <select
            className="bg-navy-900 border-2 border-gray-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-accent"
            value={activeJunctionId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {junctions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name} (Risk: {Math.round(j.risk_score)})
              </option>
            ))}
          </select>

          {/* Test Buttons */}
          <button
            onClick={() => simulate({ junctionId: activeJunctionId, conflict_type: 'pedestrian-vehicle' })}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-red-600/30"
          >
            ⚡ Test Near-Miss
          </button>
          <button
            onClick={() => simulate({ junctionId: activeJunctionId, reset: true })}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-colors"
          >
            Reset
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg bg-navy-850 border border-gray-700 hover:bg-navy-700 text-gray-300 text-xs font-bold transition-colors"
          >
            {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </header>

      {/* Main Massive Display Board */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {/* Warning Banner Header */}
        <div
          className={`w-full py-5 px-6 rounded-2xl border-4 text-center mb-6 transition-all duration-300 ${
            isHighRisk
              ? 'bg-red-950/90 border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.5)] animate-pulse'
              : isCaution
              ? 'bg-amber-950/90 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)]'
              : 'bg-emerald-950/90 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="flex items-center justify-center gap-3 text-3xl sm:text-5xl font-black uppercase tracking-tight">
            <span>{isHighRisk ? '🚨' : isCaution ? '⚠️' : '✓'}</span>
            <span
              className={
                isHighRisk ? 'text-red-400' : isCaution ? 'text-amber-400' : 'text-emerald-400'
              }
            >
              {isHighRisk
                ? 'HIGH RISK JUNCTION'
                : isCaution
                ? 'CAUTION — ACTIVE INTERSECTION'
                : 'NORMAL OPERATION — CLEAR ROAD'}
            </span>
          </div>

          <div className="text-xl sm:text-3xl font-black text-white mt-2 tracking-wide uppercase">
            {displayState?.pedestrian_warning
              ? displayState.pedestrian_warning
              : isHighRisk
              ? 'PEDESTRIAN CONFLICT DETECTED'
              : isCaution
              ? 'PEDESTRIAN TRAFFIC DETECTED'
              : 'PROCEED WITH NORMAL CAUTION'}
          </div>

          <div
            className={`text-2xl sm:text-4xl font-extrabold mt-2 tracking-widest uppercase ${
              isHighRisk ? 'text-red-300 underline' : isCaution ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            {isHighRisk ? 'SLOW DOWN — PREPARE TO STOP' : isCaution ? 'REDUCE SPEED TO 20 MPH' : 'STANDARD SPEED LIMIT'}
          </div>
        </div>

        {/* Center Row: Massive Signal + Huge Countdown Timer + Live Risk */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* 1. Physical 3-Aspect Signal Light */}
          <div className="flex flex-col items-center justify-center p-6 bg-navy-950/90 rounded-3xl border-4 border-gray-800 shadow-2xl">
            <div className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-4">
              OPTICAL TRAFFIC SIGNAL
            </div>
            <div className="w-32 bg-black border-4 border-gray-700 rounded-full p-4 flex flex-col items-center gap-4 shadow-inner">
              {/* RED LAMP */}
              <div
                className={`w-20 h-20 rounded-full transition-all duration-200 border-2 ${
                  signal === 'RED'
                    ? 'bg-red-500 border-white shadow-[0_0_50px_#ef4444]'
                    : 'bg-red-950/40 border-red-950 opacity-20'
                }`}
              />
              {/* AMBER LAMP */}
              <div
                className={`w-20 h-20 rounded-full transition-all duration-200 border-2 ${
                  signal === 'AMBER'
                    ? 'bg-amber-400 border-white shadow-[0_0_50px_#f59e0b]'
                    : 'bg-amber-950/40 border-amber-950 opacity-20'
                }`}
              />
              {/* GREEN LAMP */}
              <div
                className={`w-20 h-20 rounded-full transition-all duration-200 border-2 ${
                  signal === 'GREEN'
                    ? 'bg-emerald-500 border-white shadow-[0_0_50px_#10b981]'
                    : 'bg-emerald-950/40 border-emerald-950 opacity-20'
                }`}
              />
            </div>
          </div>

          {/* 2. Massive Countdown Digits */}
          <div className="flex flex-col items-center justify-center p-6 bg-navy-950/90 rounded-3xl border-4 border-gray-800 shadow-2xl">
            <div className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">
              SIGNAL PHASE COUNTDOWN
            </div>
            <div
              className={`text-8xl sm:text-9xl font-black font-mono tracking-tighter ${
                signal === 'RED'
                  ? 'text-red-500 shadow-[0_0_60px_rgba(239,68,68,0.4)]'
                  : signal === 'AMBER'
                  ? 'text-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.4)]'
                  : 'text-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.4)]'
              }`}
            >
              {countdown}
            </div>
            <div className="text-sm font-bold text-gray-400 tracking-wider uppercase mt-1">
              SECONDS REMAINING
            </div>
          </div>

          {/* 3. Junction Identity & Calculated Risk Gauge */}
          <div className="flex flex-col items-center justify-center p-6 bg-navy-950/90 rounded-3xl border-4 border-gray-800 shadow-2xl text-center">
            <div className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-1">
              JUNCTION TELEMETRY
            </div>
            <h3 className="text-2xl font-black text-white mb-3">
              {displayState?.junction_name || 'Market Junction North [DEMO]'}
            </h3>

            <div className="w-full bg-navy-900 rounded-2xl p-4 border border-gray-800">
              <div className="text-xs text-gray-400 uppercase font-semibold mb-1">
                Calculated Junction Risk
              </div>
              <div
                className={`text-5xl font-black font-mono ${
                  isHighRisk ? 'text-red-400' : isCaution ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {Math.round(displayState?.risk_score ?? 78)}
                <span className="text-xl font-normal text-gray-500">/100</span>
              </div>
              <div className="text-xs font-bold text-gray-300 mt-1">
                Status: {displayState?.ai_risk_state || 'AI Real-Time Monitored'}
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2 bg-navy-900 rounded-xl border border-gray-800">
                <span className="text-gray-500 block text-[10px]">ACTIVE NEAR MISSES</span>
                <span className="font-mono font-bold text-lg text-white">
                  {displayState?.active_near_misses_count ?? 3}
                </span>
              </div>
              <div className="p-2 bg-navy-900 rounded-xl border border-gray-800">
                <span className="text-gray-500 block text-[10px]">CAMERA TRACK</span>
                <span className="font-mono font-bold text-sm text-accent">CAM-001 (1080p)</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Roadside Status */}
      <footer className="border-t-2 border-gray-800 pt-4 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-accent font-bold">SAFECITY LOOP V2</span>
          <span>·</span>
          <span>High-Contrast Distance Display Specification</span>
        </div>
        <div className="font-mono text-gray-400">
          TTC Threshold: &lt; 2.0s · Sensor Refresh: 100ms · Edge AI: Ultralytics YOLOv8 + ByteTrack
        </div>
      </footer>
    </div>
  )
}

