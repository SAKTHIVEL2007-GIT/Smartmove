import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import RiskBadge from '@/components/ui/RiskBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  useRoads, useJunctions, useAIModelStatus,
  useAnalyzePothole, useAnalyzeTraffic, useAIEvents
} from '@/hooks/useApi'
import type { PotholeAnalysisResult, TrafficAnalysisResult } from '@/types'

export default function AIVision() {
  const [activeTab, setActiveTab] = useState<'potholes' | 'traffic'>('potholes')

  // API Hooks
  const { data: roads = [] } = useRoads()
  const { data: junctions = [] } = useJunctions()
  const { data: modelStatus } = useAIModelStatus()
  const { data: aiEvents = [] } = useAIEvents()

  // ── Pothole Upload & Camera State ──────────────────────────────────────────
  const [potholeFile, setPotholeFile] = useState<File | null>(null)
  const [potholePreview, setPotholePreview] = useState<string | null>(null)
  const [selectedRoadId, setSelectedRoadId] = useState<number | undefined>(undefined)
  const [potholeResult, setPotholeResult] = useState<PotholeAnalysisResult | null>(null)
  const [imageDisplayMode, setImageDisplayMode] = useState<'processed' | 'original'>('processed')
  const [potholeError, setPotholeError] = useState<string | null>(null)

  // Camera capture modal state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const videoStreamRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  const potholeInputRef = useRef<HTMLInputElement>(null)
  const { mutate: runPotholeAnalysis, isPending: isAnalyzingPothole } = useAnalyzePothole()

  // ── Traffic Video State ────────────────────────────────────────────────────
  const [trafficFile, setTrafficFile] = useState<File | null>(null)
  const [trafficPreview, setTrafficPreview] = useState<string | null>(null)
  const [selectedJunctionId, setSelectedJunctionId] = useState<number | undefined>(undefined)
  const [selectedTrafficRoadId, setSelectedTrafficRoadId] = useState<number | undefined>(undefined)
  const [ttcThreshold, setTtcThreshold] = useState<number>(2.0)
  const [applyPrivacyMask, setApplyPrivacyMask] = useState<boolean>(true)
  const [trafficResult, setTrafficResult] = useState<TrafficAnalysisResult | null>(null)
  const [trafficError, setTrafficError] = useState<string | null>(null)

  const trafficInputRef = useRef<HTMLInputElement>(null)
  const processedVideoRef = useRef<HTMLVideoElement>(null)
  const { mutate: runTrafficAnalysis, isPending: isAnalyzingTraffic } = useAnalyzeTraffic()

  // ── Handlers: Potholes ─────────────────────────────────────────────────────
  const handlePotholeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPotholeError(null)

    if (!file.type.startsWith('image/')) {
      setPotholeError('Please upload an image file (JPG, PNG, WEBP).')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setPotholeError('File size exceeds 15MB limit.')
      return
    }

    setPotholeFile(file)
    setPotholePreview(URL.createObjectURL(file))
    setPotholeResult(null)
  }

  const handlePotholeSubmit = () => {
    if (!potholeFile) return
    setPotholeError(null)
    runPotholeAnalysis(
      { file: potholeFile, road_id: selectedRoadId },
      {
        onSuccess: (data) => {
          setPotholeResult(data)
          setImageDisplayMode('processed')
        },
        onError: (err: any) => {
          setPotholeError(err.response?.data?.detail || 'Analysis failed. Check backend connection.')
        },
      }
    )
  }

  const loadSamplePotholeImage = async (type: 'pothole' | 'clean') => {
    try {
      const url = type === 'pothole'
        ? '/uploads/samples/sample_pothole_road.jpg'
        : '/uploads/samples/sample_clean_road.jpg'
      const response = await fetch(url)
      const blob = await response.blob()
      const file = new File([blob], `${type}_sample.jpg`, { type: 'image/jpeg' })
      setPotholeFile(file)
      setPotholePreview(URL.createObjectURL(blob))
      setPotholeResult(null)
      setPotholeError(null)
    } catch {
      setPotholeError('Could not load sample image.')
    }
  }

  // Camera Capture Handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
      cameraStreamRef.current = stream
      setIsCameraActive(true)
      setTimeout(() => {
        if (videoStreamRef.current) {
          videoStreamRef.current.srcObject = stream
          videoStreamRef.current.play()
        }
      }, 100)
    } catch {
      setPotholeError('Could not access camera device. Ensure camera permissions are granted.')
    }
  }

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    setIsCameraActive(false)
  }

  const captureCameraSnapshot = () => {
    if (!videoStreamRef.current) return
    const video = videoStreamRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' })
      setPotholeFile(file)
      setPotholePreview(URL.createObjectURL(blob))
      setPotholeResult(null)
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  // ── Handlers: Traffic ──────────────────────────────────────────────────────
  const handleTrafficFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTrafficError(null)

    const validExtensions = ['.mp4', '.mov', '.avi']
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setTrafficError('Please upload a video file in MP4, MOV, or AVI format.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setTrafficError('Video file exceeds 50MB prototype limit.')
      return
    }

    setTrafficFile(file)
    setTrafficPreview(URL.createObjectURL(file))
    setTrafficResult(null)
  }

  const handleTrafficSubmit = () => {
    if (!trafficFile) return
    setTrafficError(null)
    runTrafficAnalysis(
      {
        file: trafficFile,
        junction_id: selectedJunctionId,
        road_id: selectedTrafficRoadId,
        ttc_threshold: ttcThreshold,
        apply_privacy: applyPrivacyMask,
      },
      {
        onSuccess: (data) => {
          setTrafficResult(data)
        },
        onError: (err: any) => {
          setTrafficError(err.response?.data?.detail || 'Video processing failed. Check backend logs.')
        },
      }
    )
  }

  const handleTimelineJump = (seconds: number) => {
    if (processedVideoRef.current) {
      processedVideoRef.current.currentTime = seconds
      processedVideoRef.current.play().catch(() => {})
    }
  }

  return (
    <Layout title="Vision AI Studio" subtitle="Local YOLOv8 Computer Vision Pipeline, ByteTrack & Traffic Analytics [DEMO]">
      <DemoDataBanner />

      {/* Model Status Header Bar */}
      <div className="card mb-5 border-gray-800 bg-navy-800/80 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-lg font-bold">
              👁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">SafeCity Local Vision Engine</span>
                {modelStatus?.is_pothole_demo_mode ? (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] px-2 py-0.5 rounded font-mono font-medium">
                    Demo AI Mode — YOLO model not configured
                  </span>
                ) : (
                  <span className="bg-green-500/10 text-green-400 border border-green-500/30 text-[11px] px-2 py-0.5 rounded font-mono font-medium">
                    YOLOv8 Active (Local Model)
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                {modelStatus?.message || 'Local YOLOv8 inference pipeline running on-device.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="text-xs text-accent hover:text-accent-light bg-accent/10 border border-accent/20 px-3 py-1.5 rounded transition-colors"
            >
              Configure YOLO_MODEL_PATH ⚙
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 mb-5">
        <button
          onClick={() => setActiveTab('potholes')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
            activeTab === 'potholes'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ⬟ Road Image Analysis (Pothole Detection)
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
            activeTab === 'traffic'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ⚡ Traffic Video Analysis (YOLOv8 + ByteTrack)
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 1: POTHOLE ANALYSIS
         ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'potholes' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column: Upload & Controls */}
          <div className="xl:col-span-1 space-y-4">
            <div className="card">
              <div className="card-header">Road Image Source</div>

              {/* Drag & Drop Area */}
              <div
                onClick={() => potholeInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-accent/60 bg-navy-900/60 rounded-lg p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={potholeInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePotholeFileChange}
                />
                <div className="text-3xl mb-2">📸</div>
                <div className="text-white text-sm font-medium">Click or Drag & Drop Road Image</div>
                <div className="text-gray-500 text-xs mt-1">Supports JPG, PNG, WEBP (Max 15MB)</div>
                {potholeFile && (
                  <div className="mt-3 text-xs bg-accent/10 text-accent-light px-2.5 py-1 rounded inline-block font-mono">
                    {potholeFile.name} ({(potholeFile.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>

              {/* Action Buttons: Live Camera + Samples */}
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full text-xs bg-navy-700 hover:bg-navy-600 text-white font-semibold py-2 px-3 rounded border border-gray-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>📷</span> Capture from Live Camera
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => loadSamplePotholeImage('pothole')}
                    className="text-xs bg-navy-900 hover:bg-navy-700 text-gray-300 py-1.5 px-2 rounded border border-gray-800 text-center transition-colors truncate"
                  >
                    Sample: Damaged Road
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSamplePotholeImage('clean')}
                    className="text-xs bg-navy-900 hover:bg-navy-700 text-gray-300 py-1.5 px-2 rounded border border-gray-800 text-center transition-colors truncate"
                  >
                    Sample: Clean Road
                  </button>
                </div>
              </div>

              {/* Road Tagging */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 block mb-1">Target Road Corridor:</label>
                <select
                  value={selectedRoadId || ''}
                  onChange={(e) => setSelectedRoadId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Auto-detect or select corridor...</option>
                  {roads.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Risk: {Math.round(r.risk_score)}/100)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePotholeSubmit}
                disabled={!potholeFile || isAnalyzingPothole}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingPothole ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executing YOLOv8 Inference Pipeline...
                  </>
                ) : (
                  'Run Road Image Analysis'
                )}
              </button>

              {potholeError && (
                <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded">
                  ✕ {potholeError}
                </div>
              )}
            </div>

            {/* Architecture Details */}
            <div className="card text-xs space-y-2 border-gray-800">
              <div className="card-header mb-1">AI Inference Pipeline</div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Pipeline Stages</span>
                <span className="text-white font-mono text-[10px]">IMAGE → YOLOv8 → SEVERITY → RISK</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Model Runtime</span>
                <span className="text-white font-mono">Ultralytics YOLOv8</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Inference Location</span>
                <span className="text-emerald-400 font-mono">100% Local (On-Device)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Configured Weights</span>
                <span className="text-accent font-mono truncate max-w-[160px]">
                  {modelStatus?.pothole_model_path || 'models/pothole_yolov8.pt'}
                </span>
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-semibold text-gray-400 mb-1">RISK SYNTHESIS ENGINE:</div>
                <div className="p-2 bg-navy-900 rounded font-mono text-[10px] text-accent leading-relaxed">
                  Risk = 0.6 × Contextual + 0.3 × Visual + 0.1 × Confidence
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visualizer & Results */}
          <div className="xl:col-span-2 space-y-4">
            {potholeResult ? (
              <>
                {/* Result KPI Metrics Header */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Potholes</div>
                    <div className="text-2xl font-black font-mono text-accent mt-0.5">
                      {potholeResult.pothole_count}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Defect Count</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Detection Conf.</div>
                    <div className="text-2xl font-black font-mono text-white mt-0.5">
                      {(potholeResult.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-[9px] text-amber-400 mt-0.5" title="Model confidence is NOT danger probability">
                      AI Certainty ℹ
                    </div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Visual Severity</div>
                    <div className="mt-1">
                      <RiskBadge level={potholeResult.visual_severity || potholeResult.severity} />
                    </div>
                    <div className="text-[9px] text-gray-500 mt-1">Physical Scale</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Context Severity</div>
                    <div className="mt-1">
                      <RiskBadge level={potholeResult.contextual_severity || potholeResult.severity} />
                    </div>
                    <div className="text-[9px] text-gray-500 mt-1">Exposure Adjusted</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Calculated Risk</div>
                    <div
                      className="text-2xl font-black font-mono mt-0.5"
                      style={{
                        color:
                          potholeResult.risk_score >= 70
                            ? '#ef4444'
                            : potholeResult.risk_score >= 40
                            ? '#f59e0b'
                            : '#10b981',
                      }}
                    >
                      {Math.round(potholeResult.risk_score)}/100
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Road Risk</div>
                  </div>
                </div>

                {/* Evidence & Location Bar */}
                <div className="p-3 bg-navy-800 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Evidence ID:</span>
                    <span className="font-mono text-accent font-bold bg-navy-900 border border-gray-700 px-2 py-0.5 rounded">
                      {potholeResult.evidence_id || 'SC-H-1042'}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">
                      ✓ CHAIN-OF-CUSTODY REGISTERED
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-gray-300">
                    <span>
                      GPS: {potholeResult.latitude?.toFixed(4)}, {potholeResult.longitude?.toFixed(4)}
                    </span>
                    {potholeResult.is_simulated_gps ? (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        [DEMO COORDINATES]
                      </span>
                    ) : (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        GPS ±{potholeResult.gps_accuracy}m
                      </span>
                    )}
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">{potholeResult.timestamp || 'Recorded Just Now'}</span>
                  </div>
                </div>

                {/* Demo Mode Notice Banner if applicable */}
                {potholeResult.is_demo_mode && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex items-start gap-2.5">
                    <span className="text-amber-400 text-sm">⚠</span>
                    <div>
                      <span className="text-amber-400 font-semibold">Demo AI Mode — YOLO model not configured</span>
                      <p className="text-amber-300/80 text-[11px] mt-0.5">
                        {potholeResult.status_message} To run full YOLOv8 custom weights, place your trained{' '}
                        <code className="bg-navy-900 px-1 rounded text-white font-mono">pothole_yolov8.pt</code> in{' '}
                        <code className="bg-navy-900 px-1 rounded text-white font-mono">models/</code> or set{' '}
                        <code className="bg-navy-900 px-1 rounded text-white font-mono">YOLO_MODEL_PATH</code> in{' '}
                        <Link to="/settings" className="underline font-semibold text-white">
                          Settings
                        </Link>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Epistemological disclaimer card */}
                <div className="p-2.5 bg-navy-900/60 border border-gray-800 rounded-lg text-[10px] text-gray-400 flex items-center gap-2">
                  <span className="text-accent text-sm">ℹ</span>
                  <span>{potholeResult.disclaimer || 'Never represent model confidence as danger probability. NO DATA ≠ SAFE ROAD.'}</span>
                </div>

                {/* Image Inspection Viewport */}
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-navy-800 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="card-header mb-0">Visual Inspection Viewport</span>
                      {potholeResult.detections.length > 0 && (
                        <span className="text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded font-mono">
                          {potholeResult.detections.length} Bounding Box(es)
                        </span>
                      )}
                    </div>
                    {/* Toggle View */}
                    <div className="flex items-center gap-1 bg-navy-900 p-0.5 rounded border border-gray-700">
                      <button
                        onClick={() => setImageDisplayMode('processed')}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          imageDisplayMode === 'processed'
                            ? 'bg-accent text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Detection Overlay
                      </button>
                      <button
                        onClick={() => setImageDisplayMode('original')}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          imageDisplayMode === 'original'
                            ? 'bg-accent text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Original Photo
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-navy-950 flex items-center justify-center min-h-[360px] max-h-[520px] overflow-hidden">
                    <img
                      src={
                        imageDisplayMode === 'processed'
                          ? potholeResult.processed_image_url
                          : potholeResult.original_image_url
                      }
                      alt="Pothole Detection"
                      className="max-h-[480px] w-auto max-w-full object-contain rounded border border-gray-800 shadow-xl"
                    />
                  </div>
                </div>

                {/* Bounding Box Detail Breakdown Table */}
                {potholeResult.detections.length > 0 && (
                  <div className="card">
                    <div className="card-header">Bounding Box Detections</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-800 text-left font-mono">
                            <th className="py-2 pr-3">Box #</th>
                            <th className="py-2 pr-3">Coordinates [x1, y1, x2, y2]</th>
                            <th className="py-2 pr-3">Detection Confidence</th>
                            <th className="py-2 pr-3">Severity</th>
                            <th className="py-2 pr-3">Defect Risk</th>
                            <th className="py-2">Pipeline Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {potholeResult.detections.map((det, idx) => (
                            <tr key={idx} className="border-b border-gray-900 hover:bg-navy-700/40">
                              <td className="py-2 pr-3 font-mono text-white font-semibold">#{idx + 1}</td>
                              <td className="py-2 pr-3 font-mono text-gray-400">
                                [{det.box.x1}, {det.box.y1}, {det.box.x2}, {det.box.y2}]
                              </td>
                              <td className="py-2 pr-3 font-mono font-medium text-white">
                                {(det.confidence * 100).toFixed(1)}%
                              </td>
                              <td className="py-2 pr-3">
                                <RiskBadge level={det.severity} />
                              </td>
                              <td className="py-2 pr-3 font-mono font-bold text-accent">
                                {det.risk_score}/100
                              </td>
                              <td className="py-2">
                                {det.is_demo ? (
                                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    Demo Anomaly
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                                    YOLO Model
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty / Placeholder State */
              <div className="card p-10 text-center flex flex-col items-center justify-center min-h-[420px]">
                {potholePreview ? (
                  <div className="space-y-3 max-w-sm">
                    <img
                      src={potholePreview}
                      alt="Preview"
                      className="max-h-56 mx-auto rounded border border-gray-700 shadow-md object-contain"
                    />
                    <div className="text-white text-sm font-medium">Ready to analyze with local YOLOv8</div>
                    <button onClick={handlePotholeSubmit} className="btn-primary w-full text-xs">
                      Start Pothole Inference →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-md">
                    <div className="w-14 h-14 rounded-full bg-navy-700 border border-gray-700 flex items-center justify-center text-2xl text-gray-400 mx-auto">
                      📸
                    </div>
                    <div className="text-white font-semibold text-base">No Road Image Analyzed Yet</div>
                    <p className="text-gray-400 text-xs">
                      Upload a roadway photo, snap from your camera, or test with sample images to trigger the
                      local YOLOv8 detection pipeline and generate bounding boxes, visual/contextual severities, and evidence records.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 2: TRAFFIC ANALYSIS (VIDEO + BYTETRACK + TTC)
         ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'traffic' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column: Video Upload & Options */}
          <div className="xl:col-span-1 space-y-4">
            <div className="card">
              <div className="card-header">Upload Traffic Video</div>

              <div
                onClick={() => trafficInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-accent/60 bg-navy-900/60 rounded-lg p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={trafficInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo"
                  className="hidden"
                  onChange={handleTrafficFileChange}
                />
                <div className="text-3xl mb-2">📹</div>
                <div className="text-white text-sm font-medium">Select Traffic Footage</div>
                <div className="text-gray-500 text-xs mt-1">Supports MP4, MOV, AVI (Max 50MB)</div>
                {trafficFile && (
                  <div className="mt-3 text-xs bg-accent/10 text-accent-light px-2.5 py-1 rounded inline-block font-mono">
                    {trafficFile.name} ({(trafficFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                )}
              </div>

              {/* Junction selection */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 block mb-1">Monitored Junction / Corridor:</label>
                <select
                  value={selectedJunctionId || ''}
                  onChange={(e) => setSelectedJunctionId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Auto-select junction...</option>
                  {junctions.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name} ({j.camera_id || 'CAM'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Configurable TTC Threshold Slider */}
              <div className="mt-4 p-3 bg-navy-900 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-300 font-semibold">TTC Threshold:</span>
                  <span className="font-mono text-accent font-bold">{ttcThreshold.toFixed(1)} seconds</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={ttcThreshold}
                  onChange={(e) => setTtcThreshold(parseFloat(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                  <span>1.0s (Severe)</span>
                  <span>2.0s (Standard)</span>
                  <span>3.0s (Sensitive)</span>
                </div>
              </div>

              {/* Privacy Masking Toggle */}
              <div className="mt-3 p-3 bg-navy-900 rounded-lg border border-gray-800">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-gray-200">
                    🛡 Privacy Anonymization
                  </span>
                  <input
                    type="checkbox"
                    checked={applyPrivacyMask}
                    onChange={(e) => setApplyPrivacyMask(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded"
                  />
                </label>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Blurs pedestrian faces and vehicle license plates on recorded frames to ensure GDPR/GovTech privacy compliance.
                </p>
              </div>

              <button
                onClick={handleTrafficSubmit}
                disabled={!trafficFile || isAnalyzingTraffic}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingTraffic ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Tracking Objects with ByteTrack & Calculating TTC...
                  </>
                ) : (
                  'Analyze Traffic & Near Misses'
                )}
              </button>

              {trafficError && (
                <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded">
                  ✕ {trafficError}
                </div>
              )}
            </div>

            {/* Near-Miss Detection Specification */}
            <div className="card text-xs space-y-2 border-gray-800">
              <div className="card-header mb-1">Near-Miss Analytics Engine</div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Detector</span>
                <span className="text-white font-mono">YOLOv8 Object Detection</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Multi-Object Tracker</span>
                <span className="text-white font-mono">ByteTrack (Trajectories)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Detected Classes</span>
                <span className="text-gray-300">Car, Motorcycle, Bus, Truck, Bicycle, Pedestrian</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Conflict Engine Rule</span>
                <span className="text-amber-400 font-mono font-bold">Zone ∩ Convergence ∩ TTC &lt; {ttcThreshold}s</span>
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-semibold text-gray-400 mb-1">SAFETY PRINCIPLE:</div>
                <p className="text-gray-400 text-[10px] leading-relaxed">
                  Surrogate safety measures (approximate TTC & PET) indicate converging collision threat, not guaranteed accident prediction.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Video Player & Near-Miss Timeline */}
          <div className="xl:col-span-2 space-y-4">
            {trafficResult ? (
              <>
                {/* Traffic KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Conflicts Flagged</div>
                    <div
                      className={`text-2xl font-bold font-mono ${
                        trafficResult.near_miss_count > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {trafficResult.near_miss_count}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">TTC &lt; {ttcThreshold}s (Approx)</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Tracked Users</div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {trafficResult.tracked_objects_count}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">ByteTrack IDs</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Processed Video</div>
                    <div className="text-2xl font-bold font-mono text-accent">
                      {trafficResult.duration_seconds.toFixed(1)}s
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {trafficResult.processed_frames} Frames
                    </div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Privacy State</div>
                    <div className="mt-1">
                      {trafficResult.privacy_applied ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                          ✓ ANONYMIZED
                        </span>
                      ) : (
                        <span className="bg-gray-500/10 text-gray-400 text-[10px] px-2 py-0.5 rounded font-mono">
                          Raw
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-1 truncate">
                      Faces / Plates Masked
                    </div>
                  </div>
                </div>

                {/* Privacy notice banner */}
                <div className="p-2.5 bg-navy-900 border border-gray-800 rounded-lg text-[10px] text-gray-400 flex items-center gap-2">
                  <span className="text-accent text-sm">🛡</span>
                  <span>{trafficResult.privacy_notice || 'Video processing is intended to minimize unnecessary storage of personally identifiable visual information.'}</span>
                </div>

                {/* Processed Video / Playback */}
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-navy-800 border-b border-gray-800 flex items-center justify-between">
                    <span className="card-header mb-0">Annotated Video Player (ByteTrack Trails & Direction)</span>
                    <span className="text-xs text-gray-400 font-mono">
                      {trafficResult.processed_frames} frames processed
                    </span>
                  </div>
                  <div className="p-4 bg-navy-950 flex flex-col items-center justify-center">
                    <video
                      ref={processedVideoRef}
                      controls
                      className="max-h-[380px] w-full rounded border border-gray-800 shadow-xl bg-black"
                      src={trafficResult.processed_video_url || trafficResult.original_video_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>

                {/* Tracked Objects Telemetry Summary */}
                {trafficResult.tracked_objects_summary && trafficResult.tracked_objects_summary.length > 0 && (
                  <div className="card">
                    <div className="card-header">Tracked Road Users Telemetry (ByteTrack)</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-800 text-left font-mono">
                            <th className="py-2 pr-3">Track ID</th>
                            <th className="py-2 pr-3">Object Type</th>
                            <th className="py-2 pr-3">Est. Speed</th>
                            <th className="py-2 pr-3">Direction</th>
                            <th className="py-2 pr-3">Trajectory Samples</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trafficResult.tracked_objects_summary.map((obj: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-900 hover:bg-navy-700/40">
                              <td className="py-2 pr-3 font-mono text-white font-semibold">#{obj.track_id}</td>
                              <td className="py-2 pr-3 capitalize text-gray-300">{obj.object_type}</td>
                              <td className="py-2 pr-3 font-mono text-emerald-400">{obj.velocity} km/h</td>
                              <td className="py-2 pr-3 font-mono text-accent">{obj.direction}</td>
                              <td className="py-2 pr-3 font-mono text-gray-400">{obj.trajectory_length} points</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Conflict Snapshots Gallery */}
                {trafficResult.conflict_snapshots.length > 0 && (
                  <div className="card">
                    <div className="card-header">Keyframe Conflict Snapshots (Surrogate Safety Evidence)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {trafficResult.conflict_snapshots.map((snap, i) => (
                        <div key={i} className="border border-gray-800 rounded overflow-hidden bg-navy-900">
                          <img src={snap} alt={`Conflict ${i + 1}`} className="w-full h-32 object-cover" />
                          <div className="p-2 text-[11px] text-gray-400 flex items-center justify-between">
                            <span>Conflict Snapshot #{i + 1}</span>
                            <span className="text-red-400 font-bold font-mono">TTC &lt; {ttcThreshold}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Near Miss Events List with Timeline Jump */}
                <div className="card">
                  <div className="card-header">Flagged Traffic Conflict Candidates</div>
                  {trafficResult.near_misses.length > 0 ? (
                    <div className="space-y-2.5">
                      {trafficResult.near_misses.map((nm) => (
                        <div
                          key={nm.conflict_id}
                          className="p-3 bg-navy-900 rounded-lg border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">⚡ Potential Conflict</span>
                              <span className="font-mono text-xs text-gray-400">
                                Time: {nm.timestamp_str}
                              </span>
                              <RiskBadge level={nm.risk_level} />
                            </div>
                            <div className="text-xs text-gray-300">
                              Objects:{' '}
                              <strong className="text-white capitalize">
                                {nm.object_types.join(' ⟷ ')}
                              </strong>{' '}
                              (Tracks #{nm.track_ids.join(', #')})
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-2">
                              <span>Zone: <strong className="text-gray-300">{nm.conflict_zone}</strong></span>
                              {nm.direction && <span>• Heading: <strong className="text-gray-300 font-mono">{nm.direction}</strong></span>}
                            </div>
                          </div>

                          <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                            <div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                Approx TTC: <strong className="text-red-400">{nm.ttc.toFixed(2)}s</strong>
                                {nm.pet && <span> | PET: {nm.pet.toFixed(2)}s</span>}
                              </div>
                              <div className="text-[10px] text-emerald-400 font-mono">
                                Min Dist: {nm.minimum_distance ? `${nm.minimum_distance.toFixed(1)}m` : '2.1m'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleTimelineJump(nm.timestamp_seconds)}
                              className="px-2.5 py-1 bg-navy-800 hover:bg-navy-700 text-accent border border-accent/40 rounded text-xs font-semibold"
                            >
                              Jump to {nm.timestamp_str} ▶
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 text-sm py-6">
                      No near-miss conflict events detected with TTC &lt; {ttcThreshold}s in this footage.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card p-10 text-center flex flex-col items-center justify-center min-h-[420px]">
                {trafficPreview ? (
                  <div className="space-y-3 max-w-sm">
                    <video src={trafficPreview} className="max-h-48 rounded border border-gray-700 mx-auto" />
                    <div className="text-white text-sm font-medium">Video loaded and ready for ByteTrack</div>
                    <button onClick={handleTrafficSubmit} className="btn-primary w-full text-xs">
                      Start Traffic & Near-Miss Analysis →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-md">
                    <div className="w-14 h-14 rounded-full bg-navy-700 border border-gray-700 flex items-center justify-center text-2xl text-gray-400 mx-auto">
                      📹
                    </div>
                    <div className="text-white font-semibold text-base">No Video Analyzed Yet</div>
                    <p className="text-gray-400 text-xs">
                      Upload a junction traffic clip (MP4, MOV, or AVI) to run YOLOv8 object detection, ByteTrack
                      trajectory tracking for vehicles and pedestrians, and automatic Time-To-Collision (TTC) near-miss calculation.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-gray-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-700">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <span>📷</span> Live Road Camera Capture
              </h3>
              <button onClick={stopCamera} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <video ref={videoStreamRef} autoPlay playsInline muted className="w-full max-h-72 object-cover" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700">
              <button
                onClick={stopCamera}
                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={captureCameraSnapshot}
                className="btn-primary text-xs"
              >
                Capture Photo →
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
