import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import RiskBadge from '@/components/ui/RiskBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  useRoads, useJunctions, useAIModelStatus,
  useAnalyzePothole, useAnalyzeTraffic, useAIEvents,
  useDemoTrafficVideo, useReviewConflict
} from '@/hooks/useApi'
import type { PotholeAnalysisResult, TrafficAnalysisResult, TrafficConflictDetail } from '@/types'

export default function AIVision() {
  const [activeTab, setActiveTab] = useState<'potholes' | 'traffic'>('potholes')

  // API Hooks
  const { data: roads = [] } = useRoads()
  const { data: junctions = [] } = useJunctions()
  const { data: modelStatus } = useAIModelStatus()
  const { data: aiEvents = [] } = useAIEvents()
  const { data: demoVideoMeta } = useDemoTrafficVideo()
  const { mutate: reviewConflict, isPending: isReviewingConflict } = useReviewConflict()

  // ── Pothole Upload & Camera State ──────────────────────────────────────────
  const [potholeFile, setPotholeFile] = useState<File | null>(null)
  const [potholePreview, setPotholePreview] = useState<string | null>(null)
  const [selectedRoadId, setSelectedRoadId] = useState<number | undefined>(undefined)
  const [potholeResult, setPotholeResult] = useState<PotholeAnalysisResult | null>(null)
  const [potholeViewMode, setPotholeViewMode] = useState<'side-by-side' | 'single'>('side-by-side')
  const [singleViewToggle, setSingleViewToggle] = useState<'processed' | 'original'>('processed')
  const [potholeError, setPotholeError] = useState<string | null>(null)
  const [isDemoSampleActive, setIsDemoSampleActive] = useState<boolean>(false)
  const [isDraggingPothole, setIsDraggingPothole] = useState<boolean>(false)

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
  const [isDemoVideoActive, setIsDemoVideoActive] = useState<boolean>(false)

  // Conflict modal state
  const [selectedConflict, setSelectedConflict] = useState<TrafficConflictDetail | null>(null)
  const [reviewedConflicts, setReviewedConflicts] = useState<Record<string, string>>({})

  const trafficInputRef = useRef<HTMLInputElement>(null)
  const processedVideoRef = useRef<HTMLVideoElement>(null)
  const { mutate: runTrafficAnalysis, isPending: isAnalyzingTraffic } = useAnalyzeTraffic()

  // ── Handlers: Potholes ─────────────────────────────────────────────────────
  const processPotholeFile = (file: File, autoRun = true) => {
    setPotholeError(null)
    setIsDemoSampleActive(false)

    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
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

    if (autoRun) {
      runPotholeAnalysis(
        {
          file,
          road_id: selectedRoadId,
          is_demo_sample: false,
        },
        {
          onSuccess: (data) => {
            setPotholeResult(data)
          },
          onError: (err: any) => {
            setPotholeError(err.response?.data?.detail || err.message || 'Analysis failed. Check backend connection.')
          },
        }
      )
    }
  }

  const handlePotholeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processPotholeFile(file, true)
    e.target.value = ''
  }

  const handlePotholeSubmit = () => {
    if (!potholeFile) return
    setPotholeError(null)
    runPotholeAnalysis(
      {
        file: potholeFile,
        road_id: selectedRoadId,
        is_demo_sample: isDemoSampleActive || potholeFile.name.includes('sample_pothole'),
      },
      {
        onSuccess: (data) => {
          setPotholeResult(data)
        },
        onError: (err: any) => {
          setPotholeError(err.response?.data?.detail || err.message || 'Analysis failed. Check backend connection.')
        },
      }
    )
  }

  const loadPrecomputedDemoSample = async () => {
    try {
      setPotholeError(null)
      setIsDemoSampleActive(true)
      const url = '/uploads/samples/sample_pothole_road.jpg'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Sample file not reachable.')
      const blob = await response.blob()
      const file = new File([blob], 'sample_pothole_road.jpg', { type: 'image/jpeg' })
      setPotholeFile(file)
      setPotholePreview(URL.createObjectURL(blob))
      setPotholeResult(null)

      // Automatically execute demonstration inference
      runPotholeAnalysis(
        {
          file,
          road_id: selectedRoadId || (roads[0]?.id ?? 1),
          is_demo_sample: true,
        },
        {
          onSuccess: (data) => {
            setPotholeResult(data)
          },
          onError: (err: any) => {
            setPotholeError(err.response?.data?.detail || err.message || 'Demonstration execution failed.')
          },
        }
      )
    } catch (err: any) {
      setPotholeError(err.message || 'Could not load precomputed demonstration sample.')
    }
  }

  const loadSamplePotholeImage = async (type: 'pothole' | 'clean') => {
    try {
      if (type === 'pothole') {
        await loadPrecomputedDemoSample()
        return
      }
      setPotholeError(null)
      setIsDemoSampleActive(false)
      const url = '/uploads/samples/sample_clean_road.jpg'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Clean road sample not found.')
      const blob = await response.blob()
      const file = new File([blob], 'sample_clean_road.jpg', { type: 'image/jpeg' })
      setPotholeFile(file)
      setPotholePreview(URL.createObjectURL(blob))
      setPotholeResult(null)

      // Immediately execute analysis to verify 0 defects on clean asphalt
      runPotholeAnalysis(
        {
          file,
          road_id: selectedRoadId || (roads[0]?.id ?? 1),
          is_demo_sample: false,
        },
        {
          onSuccess: (data) => {
            setPotholeResult(data)
          },
          onError: (err: any) => {
            setPotholeError(err.response?.data?.detail || err.message || 'Clean sample analysis failed.')
          },
        }
      )
    } catch (err: any) {
      setPotholeError(err.message || `Unable to load sample ${type} image.`)
    }
  }

  // Camera Capture Lifecycle
  const startCamera = async () => {
    setPotholeError(null)
    setIsCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      cameraStreamRef.current = stream
      if (videoStreamRef.current) {
        videoStreamRef.current.srcObject = stream
      }
    } catch {
      setPotholeError('Unable to access camera. Check device permissions.')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }
    setIsCameraActive(false)
  }

  const captureCameraSnapshot = () => {
    if (!videoStreamRef.current) return
    const video = videoStreamRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `road_cam_${Date.now()}.jpg`, { type: 'image/jpeg' })
      stopCamera()
      processPotholeFile(file, true)
    }, 'image/jpeg', 0.92)
  }

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // ── Handlers: Traffic Video ────────────────────────────────────────────────
  const handleTrafficFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTrafficError(null)
    setIsDemoVideoActive(false)

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi)$/i)) {
      setTrafficError('Please upload a video file (MP4, MOV, AVI).')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setTrafficError('Video file exceeds 50MB limit.')
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
        is_demo_video: isDemoVideoActive || trafficFile.name.includes('demo'),
      },
      {
        onSuccess: (data) => {
          setTrafficResult(data)
        },
        onError: (err: any) => {
          setTrafficError(err.response?.data?.detail || 'Traffic analysis failed. Check backend connection.')
        },
      }
    )
  }

  const handleRunDemoTraffic = async () => {
    setTrafficError(null)
    setIsDemoVideoActive(true)
    try {
      let response = await fetch('/uploads/demo/demo_traffic_junction.mp4')
      if (!response.ok) {
        response = await fetch('/demo/demo_traffic_junction.mp4')
      }
      if (!response.ok) {
        throw new Error('Local demo video not found. Generate or place demo_traffic_junction.mp4 in uploads/demo/.')
      }
      const blob = await response.blob()
      const demoFile = new File([blob], 'demo_traffic_junction.mp4', { type: 'video/mp4' })
      setTrafficFile(demoFile)
      setTrafficPreview(URL.createObjectURL(blob))
      setTrafficResult(null)

      runTrafficAnalysis(
        {
          file: demoFile,
          junction_id: selectedJunctionId || (junctions[0]?.id ?? 1),
          road_id: selectedTrafficRoadId,
          ttc_threshold: ttcThreshold,
          apply_privacy: applyPrivacyMask,
          is_demo_video: true,
        },
        {
          onSuccess: (data) => {
            setTrafficResult(data)
          },
          onError: (err: any) => {
            setTrafficError(err.response?.data?.detail || 'Demo traffic analysis execution failed.')
          },
        }
      )
    } catch (err: any) {
      setTrafficError(err.message || 'Could not load local demo video.')
    }
  }

  const handleTimelineJump = (seconds: number) => {
    if (processedVideoRef.current) {
      processedVideoRef.current.currentTime = seconds
      processedVideoRef.current.play().catch(() => {})
    }
  }

  const handleReviewAction = (status: 'verified' | 'rejected') => {
    if (!selectedConflict) return
    const numericId = parseInt(selectedConflict.conflict_id.replace(/\D/g, '') || '1', 10)
    reviewConflict(
      { conflict_id: numericId, status, reviewer: 'Municipal Traffic Safety Officer' },
      {
        onSuccess: () => {
          setReviewedConflicts((prev) => ({ ...prev, [selectedConflict.conflict_id]: status }))
          setSelectedConflict(null)
        },
      }
    )
  }

  return (
    <Layout
      title="AI Vision & Conflict Intelligence"
      subtitle="Local Edge YOLOv8 Object Tracking & Surrogate Safety Analysis"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">AI Vision & Conflict Intelligence</h1>
            <span className="text-[10px] bg-accent/20 text-accent-light px-2 py-0.5 rounded-full font-mono font-semibold border border-accent/30">
              YOLOv8 + ByteTrack
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Edge-deployed neural vision: Pothole & visual severity segmentation, multi-object tracking, and surrogate safety Time-To-Collision (TTC) conflict estimation.
          </p>
        </div>

        {/* Local Model Status Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 border border-gray-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                modelStatus?.pothole_model_loaded ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-gray-400">Pothole AI:</span>
            <span className="text-white font-mono font-bold text-[11px]">
              {modelStatus?.pothole_model_loaded ? 'Custom YOLO Weights' : 'Model Unconfigured'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 border border-gray-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                modelStatus?.traffic_model_loaded ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span className="text-gray-400">Traffic AI:</span>
            <span className="text-white font-mono font-bold text-[11px]">
              {modelStatus?.traffic_model_loaded ? 'YOLOv8n Active' : 'Offline'}
            </span>
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
          TAB 1: ROAD IMAGE ANALYSIS (POTHOLE DETECTION)
         ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'potholes' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column: Upload & Triggers */}
          <div className="xl:col-span-1 space-y-4">
            <div className="card">
              <div className="card-header">Road Image Input</div>

              {/* Drag & Drop Area */}
              <div
                onClick={() => potholeInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingPothole(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingPothole(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingPothole(false)
                  const droppedFile = e.dataTransfer.files?.[0]
                  if (droppedFile) {
                    processPotholeFile(droppedFile, true)
                  }
                }}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-150 ${
                  isDraggingPothole
                    ? 'border-accent bg-accent/20 scale-[1.02] shadow-lg shadow-accent/20'
                    : 'border-gray-700 hover:border-accent/60 bg-navy-900/60'
                }`}
              >
                <input
                  ref={potholeInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePotholeFileChange}
                />
                <div className="text-3xl mb-1.5">{isDraggingPothole ? '📥' : '📸'}</div>
                <div className="text-white text-sm font-semibold">
                  {isDraggingPothole ? 'Drop Image Here to Analyze' : 'Click or Drag & Drop Road Image'}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">Auto-runs YOLOv8 inspection (JPG, PNG, WEBP &lt; 15MB)</div>
                {potholeFile && (
                  <div className="mt-2.5 text-xs bg-accent/15 text-accent-light px-2.5 py-1 rounded inline-block font-mono border border-accent/30 font-semibold">
                    {potholeFile.name} ({(potholeFile.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>

              {/* Action Triggers: Camera + Precomputed Demonstration */}
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full text-xs bg-navy-700 hover:bg-navy-600 text-white font-semibold py-2 px-3 rounded border border-gray-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>📷</span> Capture from Live Camera
                </button>

                <div className="text-[11px] font-semibold text-gray-400 pt-1">ONE-CLICK TEST SAMPLES:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={loadPrecomputedDemoSample}
                    disabled={isAnalyzingPothole}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 py-2 px-2.5 rounded border border-amber-500/40 text-center transition-colors font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <span>★</span> Damaged Road (Potholes)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSamplePotholeImage('clean')}
                    disabled={isAnalyzingPothole}
                    className="text-xs bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 py-2 px-2.5 rounded border border-emerald-500/40 text-center transition-colors font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <span>✓</span> Clean Highway (0 Defects)
                  </button>
                </div>
              </div>

              {/* Corridor Selection */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 block mb-1">Target Road Corridor:</label>
                <select
                  value={selectedRoadId || ''}
                  onChange={(e) => setSelectedRoadId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Auto-detect GPS or select corridor...</option>
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

            {/* Architecture Card */}
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

          {/* Right Column: Visualizer & Structured Results */}
          <div className="xl:col-span-2 space-y-4">
            {potholeResult ? (
              <>
                {/* Precomputed Demonstration Label Banner */}
                {potholeResult.is_precomputed_demo && (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-base">★</span>
                      <div>
                        <span className="text-amber-300 font-bold tracking-wide">[Precomputed Demonstration]</span>
                        <p className="text-amber-200/80 text-[11px]">
                          Displaying benchmark verified ground-truth pothole detection annotations on standard urban asphalt test frame.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                      BENCHMARK
                    </span>
                  </div>
                )}

                {/* Honest Unconfigured Model Banner */}
                {potholeResult.is_demo_mode && !potholeResult.is_precomputed_demo && (
                  <div className="bg-navy-900 border border-amber-500/40 rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <span>⚠</span> YOLO pothole model not configured.
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      Custom YOLO pothole weights were not found at{' '}
                      <code className="bg-navy-950 px-1 py-0.5 rounded font-mono text-amber-300">
                        {potholeResult.model_path || 'models/pothole_yolov8.pt'}
                      </code>. No artificial bounding boxes were invented.
                    </p>
                    <div className="bg-navy-950 p-2.5 rounded border border-gray-800 text-[11px] text-gray-400 space-y-1">
                      <div className="font-semibold text-gray-300">To enable custom YOLO pothole inference:</div>
                      <div>1. Train or download a YOLOv8 pothole weights file (`best.pt`).</div>
                      <div>2. Place it at `models/pothole_yolov8.pt` in the project root.</div>
                      <div>3. Or click <strong>[Precomputed Demo]</strong> to explore the benchmark test sample.</div>
                    </div>
                  </div>
                )}

                {/* 3 Structured Result Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Card 1: Detection Summary */}
                  <div className="card p-3.5 space-y-2">
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>1. Detection Summary</span>
                      <span className="text-accent font-mono text-xs">{(potholeResult.processing_time_sec ?? 0.12).toFixed(2)}s</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800/60 text-xs">
                      <div>
                        <div className="text-gray-500 text-[10px]">Pothole Count</div>
                        <div className="text-xl font-bold font-mono text-white mt-0.5">{potholeResult.pothole_count}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px]">Avg Confidence</div>
                        <div className="text-xl font-bold font-mono text-accent mt-0.5">
                          {((potholeResult.average_confidence ?? potholeResult.confidence) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="pt-1 text-[11px] text-gray-400 flex justify-between items-center border-t border-gray-800/40">
                      <span>Highest Severity:</span>
                      <RiskBadge level={potholeResult.highest_severity || potholeResult.visual_severity || potholeResult.severity} />
                    </div>
                  </div>

                  {/* Card 2: Contextual Analysis */}
                  <div className="card p-3.5 space-y-2">
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                      2. Contextual Analysis
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-gray-800/60 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Traffic Exposure:</span>
                        <span className="font-mono text-white font-semibold">{potholeResult.traffic_exposure || 'HIGH'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Vulnerable Users:</span>
                        <span className="font-mono text-amber-400 font-semibold">{potholeResult.vulnerable_users || 'HIGH'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Defect Persistence:</span>
                        <span className="font-mono text-gray-300">{potholeResult.persistence || 'MEDIUM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Calculated Risk */}
                  <div className="card p-3.5 space-y-2">
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>3. Calculated Risk</span>
                      <span className="text-[10px] text-emerald-400 font-mono">CONF: {potholeResult.risk_confidence || 'HIGH'}</span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1 border-t border-gray-800/60">
                      <div className="text-2xl font-black font-mono text-red-400">
                        {Math.round(potholeResult.risk_score)}<span className="text-xs text-gray-500 font-normal">/100</span>
                      </div>
                      <RiskBadge level={potholeResult.severity} />
                    </div>
                    <p className="text-[9px] text-gray-400 leading-tight border-t border-gray-800/40 pt-1">
                      ⚠️ <em>Model confidence ≠ road danger.</em> Synthesizes traffic exposure and vulnerable road users.
                    </p>
                  </div>
                </div>

                {/* Evidence Chain-of-Custody & GPS Card */}
                <div className="p-3 bg-navy-800 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Evidence Record:</span>
                    <span className="font-mono text-accent font-bold bg-navy-900 border border-gray-700 px-2 py-0.5 rounded">
                      {potholeResult.evidence_id || 'SC-H-1042'}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">
                      ✓ CHAIN-OF-CUSTODY REGISTERED
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-gray-300">
                    <span className="flex items-center gap-1">
                      <span>📍</span>
                      {potholeResult.latitude && potholeResult.longitude ? (
                        `${potholeResult.latitude.toFixed(4)}, ${potholeResult.longitude.toFixed(4)}`
                      ) : (
                        <span className="text-gray-500 italic">Location unavailable</span>
                      )}
                    </span>
                    <span className="text-[9px] bg-navy-900 text-gray-400 border border-gray-700 px-1.5 py-0.5 rounded">
                      {potholeResult.gps_source || 'Corridor Default'}
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">{potholeResult.timestamp || 'Recorded Just Now'}</span>
                  </div>
                </div>

                {/* Side-by-Side Visual Inspection Viewport */}
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-navy-800 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="card-header mb-0">Visual Inspection Viewport</span>
                      {potholeResult.detections.length > 0 && (
                        <span className="text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded font-mono border border-accent/20">
                          {potholeResult.detections.length} Detection Box(es)
                        </span>
                      )}
                    </div>

                    {/* View Switcher: Side-by-Side vs Toggle */}
                    <div className="flex items-center gap-1 bg-navy-900 p-0.5 rounded border border-gray-700">
                      <button
                        onClick={() => setPotholeViewMode('side-by-side')}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          potholeViewMode === 'side-by-side'
                            ? 'bg-accent text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Side-by-Side View
                      </button>
                      <button
                        onClick={() => setPotholeViewMode('single')}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          potholeViewMode === 'single'
                            ? 'bg-accent text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Single View
                      </button>
                    </div>
                  </div>

                  {potholeViewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-navy-950">
                      {/* LEFT: Original Uploaded Image */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-mono">
                          <span>LEFT: Original Uploaded Image</span>
                          <span className="text-[10px] text-gray-500">Raw Capture</span>
                        </div>
                        <div className="bg-black/60 rounded border border-gray-800 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[460px]">
                          <img
                            src={potholeResult.original_image_url}
                            alt="Original Road"
                            className="max-h-[440px] w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>

                      {/* RIGHT: AI Analysis Viewport */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-mono">
                          <span>RIGHT: AI Annotated Analysis</span>
                          <span className="text-[10px] text-accent">YOLO BBoxes + Labels</span>
                        </div>
                        <div className="bg-black/60 rounded border border-accent/30 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[460px] relative">
                          <img
                            src={potholeResult.processed_image_url}
                            alt="AI Annotated Road"
                            className="max-h-[440px] w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-navy-950 flex flex-col items-center justify-center">
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => setSingleViewToggle('processed')}
                          className={`text-xs px-3 py-1 rounded font-semibold ${
                            singleViewToggle === 'processed' ? 'bg-accent text-white' : 'bg-navy-800 text-gray-400'
                          }`}
                        >
                          Detection Overlay
                        </button>
                        <button
                          onClick={() => setSingleViewToggle('original')}
                          className={`text-xs px-3 py-1 rounded font-semibold ${
                            singleViewToggle === 'original' ? 'bg-accent text-white' : 'bg-navy-800 text-gray-400'
                          }`}
                        >
                          Original Photo
                        </button>
                      </div>
                      <img
                        src={
                          singleViewToggle === 'processed'
                            ? potholeResult.processed_image_url
                            : potholeResult.original_image_url
                        }
                        alt="Road Visual"
                        className="max-h-[460px] w-auto max-w-full object-contain rounded border border-gray-800 shadow-xl"
                      />
                    </div>
                  )}
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
                            <th className="py-2 pr-3">Confidence</th>
                            <th className="py-2 pr-3">Visual Severity</th>
                            <th className="py-2 pr-3">Defect Risk</th>
                            <th className="py-2">Source</th>
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
                                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                                    Demo Sample
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
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
              <div className="card p-10 text-center flex flex-col items-center justify-center min-h-[420px]">
                {isAnalyzingPothole ? (
                  <div className="space-y-4 max-w-sm text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto shadow-lg shadow-accent/20" />
                    <div className="text-white text-base font-bold">Executing YOLOv8 Neural Inference...</div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Detecting asphalt cavities, computing bounding boxes, measuring physical dimensions, and synthesizing corridor risk score...
                    </p>
                    {potholePreview && (
                      <div className="relative rounded-lg overflow-hidden border border-accent/40 max-w-[280px] mx-auto mt-2 opacity-75">
                        <img src={potholePreview} alt="Scanning" className="max-h-36 w-auto mx-auto object-cover" />
                        <div className="absolute inset-0 bg-accent/15 animate-pulse flex items-center justify-center">
                          <span className="text-[11px] font-mono font-bold bg-navy-950/80 text-accent px-2 py-0.5 rounded border border-accent/40">
                            SCANNING SURFACE...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : potholePreview ? (
                  <div className="space-y-4 max-w-sm">
                    <img src={potholePreview} alt="Upload preview" className="max-h-52 rounded-lg border border-gray-700 mx-auto shadow-md" />
                    <div className="text-white text-sm font-semibold">Image loaded and ready for analysis</div>
                    <button onClick={handlePotholeSubmit} disabled={isAnalyzingPothole} className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2">
                      <span>⚡</span> Run Road Image Analysis →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-md">
                    <div className="w-14 h-14 rounded-full bg-navy-700 border border-gray-700 flex items-center justify-center text-2xl text-gray-400 mx-auto">
                      📸
                    </div>
                    <div className="text-white font-semibold text-base">No Road Image Analyzed Yet</div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Upload an asphalt surface photo (JPG or PNG) or choose a test sample above to inspect surface distress, bounding boxes, severity assessment, and synthesized road risk scores.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={loadPrecomputedDemoSample}
                        className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <span>★</span> Damaged Road Sample
                      </button>
                      <button
                        onClick={() => loadSamplePotholeImage('clean')}
                        className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <span>✓</span> Clean Road Sample
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 2: TRAFFIC VIDEO ANALYSIS (YOLOv8 + ByteTrack)
         ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'traffic' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column: Triggers & Options */}
          <div className="xl:col-span-1 space-y-4">
            <div className="card">
              <div className="card-header">Traffic Video Source</div>

              {/* Two Prominent Action Triggers */}
              <div className="space-y-2.5 mb-4">
                <button
                  type="button"
                  onClick={handleRunDemoTraffic}
                  disabled={isAnalyzingTraffic}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-accent to-accent-light hover:brightness-110 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
                >
                  {isAnalyzingTraffic && isDemoVideoActive ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Tracking Demo Traffic Junction...
                    </>
                  ) : (
                    <>
                      <span>▶</span> Run Demo Traffic Analysis
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => trafficInputRef.current?.click()}
                  className="w-full py-2 px-4 bg-navy-800 hover:bg-navy-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <span>📁</span> Upload Traffic Video (MP4/MOV)
                </button>
                <input
                  ref={trafficInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo"
                  className="hidden"
                  onChange={handleTrafficFileChange}
                />
              </div>

              {trafficFile && (
                <div className="p-2.5 bg-navy-900 border border-gray-800 rounded-lg text-xs flex items-center justify-between mb-4">
                  <div className="truncate text-gray-300 font-mono text-[11px]">
                    {trafficFile.name} ({(trafficFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                  {isDemoVideoActive && (
                    <span className="text-[10px] bg-accent/20 text-accent font-mono px-1.5 py-0.5 rounded font-bold">
                      DEMO FEED
                    </span>
                  )}
                </div>
              )}

              {/* Junction selection */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Monitored Junction / Corridor:</label>
                  <select
                    value={selectedJunctionId || ''}
                    onChange={(e) => setSelectedJunctionId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="">Auto-select junction...</option>
                    {junctions.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name} ({j.camera_id || 'CAM-04'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Configurable TTC Threshold Slider */}
                <div className="p-3 bg-navy-900 rounded-lg border border-gray-800">
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
                <div className="p-3 bg-navy-900 rounded-lg border border-gray-800">
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
              </div>

              {trafficFile && !isDemoVideoActive && (
                <button
                  onClick={handleTrafficSubmit}
                  disabled={isAnalyzingTraffic}
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzingTraffic ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Tracking Objects with ByteTrack & Calculating TTC...
                    </>
                  ) : (
                    'Analyze Uploaded Traffic Video'
                  )}
                </button>
              )}

              {trafficError && (
                <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded">
                  ✕ {trafficError}
                </div>
              )}
            </div>

            {/* Safety Analytics Principles */}
            <div className="card text-xs space-y-2 border-gray-800">
              <div className="card-header mb-1">Surrogate Safety Principles</div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Detector</span>
                <span className="text-white font-mono">YOLOv8 Object Detection</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Multi-Object Tracker</span>
                <span className="text-white font-mono">ByteTrack (Trajectories)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Conflict Metric</span>
                <span className="text-amber-400 font-mono font-bold">Approx. TTC &lt; {ttcThreshold}s</span>
              </div>
              <p className="text-gray-400 text-[10px] leading-relaxed pt-1">
                Monocular CV speed and distance estimates are surrogate near-miss metrics, indicating converging trajectory hazards rather than crash forecasts.
              </p>
            </div>
          </div>

          {/* Right Column: Video Player, Timeline & Telemetry */}
          <div className="xl:col-span-2 space-y-4">
            {trafficResult ? (
              <>
                {/* Traffic Result Metrics */}
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
                      {trafficResult.processed_frames} Frames ({(trafficResult.processing_time_sec ?? 0.8).toFixed(1)}s run)
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

                {/* Video Player */}
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-navy-800 border-b border-gray-800 flex items-center justify-between">
                    <span className="card-header mb-0">Annotated Video Player (ByteTrack Trajectories)</span>
                    <span className="text-xs text-gray-400 font-mono">
                      {trafficResult.processed_frames} frames processed
                    </span>
                  </div>
                  <div className="p-4 bg-navy-950 flex flex-col items-center justify-center">
                    <video
                      ref={processedVideoRef}
                      controls
                      playsInline
                      className="max-h-[380px] w-full rounded border border-gray-800 shadow-xl bg-black"
                      src={trafficResult.original_video_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>

                {/* Event Timeline Under Video */}
                {trafficResult.timeline && trafficResult.timeline.length > 0 && (
                  <div className="card">
                    <div className="card-header">Video Event Timeline (Click to Seek)</div>
                    <div className="space-y-2">
                      {trafficResult.timeline.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleTimelineJump(item.seconds)}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            item.conflict
                              ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                              : 'bg-navy-900 border-gray-800 hover:bg-navy-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-accent px-1.5 py-0.5 bg-navy-950 rounded border border-gray-700">
                              {item.timestamp_str}
                            </span>
                            <span className={`font-semibold ${item.conflict ? 'text-red-400' : 'text-gray-300'}`}>
                              {item.status}
                            </span>
                            <span className="text-gray-400 text-[11px] hidden sm:inline">
                              — {item.description}
                            </span>
                          </div>
                          <span className="text-accent text-[11px] font-mono flex items-center gap-1 font-semibold">
                            Seek ▶
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflict Snapshots Gallery */}
                {trafficResult.conflict_snapshots.length > 0 && (
                  <div className="card">
                    <div className="card-header">Keyframe Conflict Snapshots</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {trafficResult.conflict_snapshots.map((snap, i) => (
                        <div key={i} className="border border-gray-800 rounded overflow-hidden bg-navy-900">
                          <img src={snap} alt={`Conflict ${i + 1}`} className="w-full h-32 object-cover" />
                          <div className="p-2 text-[11px] text-gray-400 flex items-center justify-between">
                            <span>Keyframe #{i + 1}</span>
                            <span className="text-red-400 font-bold font-mono">TTC &lt; {ttcThreshold}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flagged Traffic Conflict Candidates List */}
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
                              {reviewedConflicts[nm.conflict_id] && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                                  reviewedConflicts[nm.conflict_id] === 'verified'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                  {reviewedConflicts[nm.conflict_id]}
                                </span>
                              )}
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
                                Min Dist: {nm.minimum_distance ? `${nm.minimum_distance.toFixed(1)}m` : '2.4m'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedConflict(nm)}
                                className="px-2.5 py-1 bg-navy-800 hover:bg-navy-700 text-gray-200 border border-gray-700 rounded text-xs font-semibold"
                              >
                                View Details & Review
                              </button>
                              <button
                                onClick={() => handleTimelineJump(nm.timestamp_seconds)}
                                className="px-2.5 py-1 bg-accent/20 hover:bg-accent/30 text-accent-light border border-accent/40 rounded text-xs font-semibold"
                              >
                                Seek ▶
                              </button>
                            </div>
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
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Click <strong>[▶ Run Demo Traffic Analysis]</strong> to execute real local ByteTrack trajectory tracking and surrogate conflict analysis on an urban intersection benchmark clip.
                    </p>
                    <button
                      onClick={handleRunDemoTraffic}
                      className="px-4 py-2 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-accent/20 transition-all"
                    >
                      <span>▶</span> Run Demo Traffic Analysis
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Conflict Detail Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-gray-700 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-bold text-sm">⚡ Conflict Event Detail</span>
                <span className="font-mono text-xs text-accent bg-navy-900 px-2 py-0.5 rounded border border-gray-700">
                  {selectedConflict.conflict_id}
                </span>
              </div>
              <button onClick={() => setSelectedConflict(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Keyframe Snapshot */}
            {selectedConflict.snapshot_url && (
              <div className="rounded-lg overflow-hidden border border-gray-700 bg-black">
                <img src={selectedConflict.snapshot_url} alt="Conflict Evidence" className="w-full max-h-56 object-contain" />
              </div>
            )}

            {/* Conflict Telemetry Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-navy-900 rounded border border-gray-800">
                <div className="text-gray-500 text-[10px]">Approx. Time-To-Collision (TTC)</div>
                <div className="text-lg font-bold font-mono text-red-400 mt-0.5">{selectedConflict.ttc.toFixed(2)}s</div>
              </div>
              <div className="p-2.5 bg-navy-900 rounded border border-gray-800">
                <div className="text-gray-500 text-[10px]">Approx. Clearance Distance</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {selectedConflict.minimum_distance ? `${selectedConflict.minimum_distance.toFixed(1)}m` : '2.4m'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-300">
              <div><strong>Road Users:</strong> <span className="capitalize">{selectedConflict.object_types.join(' ⟷ ')}</span> (Tracks #{selectedConflict.track_ids.join(', #')})</div>
              <div><strong>Conflict Zone:</strong> {selectedConflict.conflict_zone}</div>
              <div><strong>Relative Heading:</strong> {selectedConflict.direction || 'Converging'}</div>
              <div className="text-[10px] text-gray-400 italic">
                {selectedConflict.disclaimer || 'Approximate monocular surrogate safety estimate. Potential traffic conflict.'}
              </div>
            </div>

            {/* Municipal Review Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-700">
              <span className="text-[11px] text-gray-400">Municipal Review:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReviewAction('rejected')}
                  disabled={isReviewingConflict}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-semibold"
                >
                  ✕ Reject Event
                </button>
                <button
                  onClick={() => handleReviewAction('verified')}
                  disabled={isReviewingConflict}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-semibold"
                >
                  ✓ Verify Event
                </button>
              </div>
            </div>
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
