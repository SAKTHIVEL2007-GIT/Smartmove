import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import RiskBadge from '@/components/ui/RiskBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  useRoads, useJunctions, useAIModelStatus,
  useAnalyzePothole, useAnalyzePotholeVideo, useAnalyzeWater, useAnalyzeRoadCondition, useAnalyzeTraffic, useAIEvents,
  useDemoTrafficVideo, useReviewConflict
} from '@/hooks/useApi'
import type { PotholeAnalysisResult, PotholeVideoAnalysisResult, UniquePotholeTrack, WaterAnalysisResult, UnifiedRoadAnalysisResult, TrafficAnalysisResult, TrafficConflictDetail } from '@/types'

export default function AIVision() {
  const [activeTab, setActiveTab] = useState<'potholes' | 'pothole-video' | 'water' | 'traffic'>('potholes')

  // API Hooks
  const { data: roads = [] } = useRoads()
  const { data: junctions = [] } = useJunctions()
  const { data: modelStatus } = useAIModelStatus()
  const { data: aiEvents = [] } = useAIEvents()
  const { data: demoVideoMeta } = useDemoTrafficVideo()
  const { mutate: reviewConflict, isPending: isReviewingConflict } = useReviewConflict()

  // ── Unified Road Condition Analysis State ────────────────────────────────
  const [unifiedFile, setUnifiedFile] = useState<File | null>(null)
  const [unifiedPreview, setUnifiedPreview] = useState<string | null>(null)
  const [selectedUnifiedRoadId, setSelectedUnifiedRoadId] = useState<number | undefined>(undefined)
  const [unifiedResult, setUnifiedResult] = useState<UnifiedRoadAnalysisResult | null>(null)
  const [unifiedError, setUnifiedError] = useState<string | null>(null)
  const [isDraggingUnified, setIsDraggingUnified] = useState<boolean>(false)
  const [unifiedViewMode, setUnifiedViewMode] = useState<'side-by-side' | 'single'>('side-by-side')

  const unifiedInputRef = useRef<HTMLInputElement>(null)
  const { mutate: runUnifiedRoadAnalysis, isPending: isAnalyzingUnified } = useAnalyzeRoadCondition()

  const processUnifiedFile = (file: File, autoRun = true) => {
    setUnifiedError(null)
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      setUnifiedError('Please upload a valid image file (JPG, PNG, WEBP).')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setUnifiedError('File size exceeds 15MB limit.')
      return
    }

    setUnifiedFile(file)
    setUnifiedPreview(URL.createObjectURL(file))
    setUnifiedResult(null)

    if (autoRun) {
      runUnifiedRoadAnalysis(
        {
          file,
          road_id: selectedUnifiedRoadId,
        },
        {
          onSuccess: (data) => setUnifiedResult(data),
          onError: (err: any) => setUnifiedError(err.response?.data?.detail || err.message || 'Unified road analysis failed.'),
        }
      )
    }
  }

  const handleUnifiedDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingUnified(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUnifiedFile(e.dataTransfer.files[0])
    }
  }

  // ── Water Accumulation State ──────────────────────────────────────────────
  const [waterFile, setWaterFile] = useState<File | null>(null)
  const [waterPreview, setWaterPreview] = useState<string | null>(null)
  const [selectedWaterRoadId, setSelectedWaterRoadId] = useState<number | undefined>(undefined)
  const [waterHasPotholes, setWaterHasPotholes] = useState<boolean>(false)
  const [waterPotholeSeverity, setWaterPotholeSeverity] = useState<string>('HIGH')
  const [waterPotholeCount, setWaterPotholeCount] = useState<number>(1)
  const [waterResult, setWaterResult] = useState<WaterAnalysisResult | null>(null)
  const [waterError, setWaterError] = useState<string | null>(null)
  const [isDraggingWater, setIsDraggingWater] = useState<boolean>(false)
  const [waterViewMode, setWaterViewMode] = useState<'side-by-side' | 'single'>('side-by-side')
  const [waterSingleToggle, setWaterSingleToggle] = useState<'processed' | 'mask' | 'original'>('processed')

  const waterInputRef = useRef<HTMLInputElement>(null)
  const { mutate: runWaterAnalysis, isPending: isAnalyzingWater } = useAnalyzeWater()

  const processWaterFile = (file: File, autoRun = true) => {
    setWaterError(null)
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      setWaterError('Please upload a valid image file (JPG, PNG, WEBP).')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setWaterError('File size exceeds 15MB limit.')
      return
    }

    setWaterFile(file)
    setWaterPreview(URL.createObjectURL(file))
    setWaterResult(null)

    if (autoRun) {
      runWaterAnalysis(
        {
          file,
          road_id: selectedWaterRoadId,
          has_potholes: waterHasPotholes,
          pothole_severity: waterPotholeSeverity,
          pothole_count: waterPotholeCount,
        },
        {
          onSuccess: (data) => setWaterResult(data),
          onError: (err: any) => setWaterError(err.response?.data?.detail || err.message || 'Water analysis failed.'),
        }
      )
    }
  }

  const handleWaterDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingWater(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processWaterFile(e.dataTransfer.files[0])
    }
  }

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

  // ── Pothole Video State ───────────────────────────────────────────────────
  const [potholeVideoFile, setPotholeVideoFile] = useState<File | null>(null)
  const [potholeVideoPreview, setPotholeVideoPreview] = useState<string | null>(null)
  const [potholeVideoMeta, setPotholeVideoMeta] = useState<{ fps: number; duration: number; width: number; height: number; totalFrames: number } | null>(null)
  const [selectedPotholeVideoRoadId, setSelectedPotholeVideoRoadId] = useState<number | undefined>(undefined)
  const [potholeVideoProcessEveryN, setPotholeVideoProcessEveryN] = useState<number>(2)
  const [potholeVideoConfThreshold, setPotholeVideoConfThreshold] = useState<number>(0.40)
  const [potholeVideoMinFrames, setPotholeVideoMinFrames] = useState<number>(3)
  const [potholeVideoResult, setPotholeVideoResult] = useState<PotholeVideoAnalysisResult | null>(null)
  const [potholeVideoError, setPotholeVideoError] = useState<string | null>(null)
  const [isDraggingPotholeVideo, setIsDraggingPotholeVideo] = useState<boolean>(false)

  const potholeVideoInputRef = useRef<HTMLInputElement>(null)
  const annotatedPotholeVideoRef = useRef<HTMLVideoElement>(null)
  const { mutate: runPotholeVideoAnalysis, isPending: isAnalyzingPotholeVideo } = useAnalyzePotholeVideo()

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
      if (activeTab === 'potholes') {
        processUnifiedFile(file, true)
      } else if (activeTab === 'water') {
        processWaterFile(file, true)
      } else {
        processPotholeFile(file, true)
      }
    }, 'image/jpeg', 0.92)
  }

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // ── Handlers: Pothole Video ───────────────────────────────────────────────
  const processPotholeVideoFile = (file: File) => {
    setPotholeVideoError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) && !file.type.startsWith('video/')) {
      setPotholeVideoError('Please upload a valid video file (MP4, MOV, AVI, MKV, WEBM).')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setPotholeVideoError('Video file size exceeds 100MB limit.')
      return
    }

    const objUrl = URL.createObjectURL(file)
    setPotholeVideoFile(file)
    setPotholeVideoPreview(objUrl)
    setPotholeVideoResult(null)

    const tempVid = document.createElement('video')
    tempVid.preload = 'metadata'
    tempVid.src = objUrl
    tempVid.onloadedmetadata = () => {
      const dur = tempVid.duration || 0
      const w = tempVid.videoWidth || 1280
      const h = tempVid.videoHeight || 720
      const fps = 25.0
      const totalF = Math.round(dur * fps)
      setPotholeVideoMeta({
        fps,
        duration: dur,
        width: w,
        height: h,
        totalFrames: totalF,
      })
    }
    tempVid.onerror = () => {
      setPotholeVideoError('Unable to decode video metadata. File may be corrupted or use an unsupported codec.')
    }
  }

  const handlePotholeVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processPotholeVideoFile(file)
    e.target.value = ''
  }

  const handlePotholeVideoSubmit = () => {
    if (!potholeVideoFile) return
    setPotholeVideoError(null)
    runPotholeVideoAnalysis(
      {
        file: potholeVideoFile,
        road_id: selectedPotholeVideoRoadId,
        process_every_n_frames: potholeVideoProcessEveryN,
        conf_threshold: potholeVideoConfThreshold,
        min_confirmation_frames: potholeVideoMinFrames,
      },
      {
        onSuccess: (data) => {
          setPotholeVideoResult(data)
        },
        onError: (err: any) => {
          setPotholeVideoError(err.response?.data?.detail || err.message || 'Video pothole analysis failed.')
        },
      }
    )
  }

  const handleJumpToPotholeTimestamp = (seconds: number) => {
    if (annotatedPotholeVideoRef.current) {
      annotatedPotholeVideoRef.current.currentTime = seconds
      annotatedPotholeVideoRef.current.play().catch(() => {})
    }
  }

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
                modelStatus?.water_model_loaded ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span className="text-gray-400">Water AI:</span>
            <span className="text-white font-mono font-bold text-[11px]">
              {modelStatus?.water_model_loaded ? 'YOLOv8-Seg Loaded' : 'YOLOv8-Seg ⚠ Model unavailable'}
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
      <div className="flex items-center gap-2 border-b border-gray-800 mb-5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('potholes')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative flex-shrink-0 ${
            activeTab === 'potholes'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ⬟ AI Road Condition Analysis
        </button>
        <button
          onClick={() => setActiveTab('pothole-video')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative flex-shrink-0 ${
            activeTab === 'pothole-video'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          🎥 Road Video Analysis (Potholes)
        </button>
        <button
          onClick={() => setActiveTab('water')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative flex-shrink-0 ${
            activeTab === 'water'
              ? 'text-white border-b-2 border-cyan-400 text-cyan-300'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          💧 Water Accumulation Analysis
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative flex-shrink-0 ${
            activeTab === 'traffic'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ⚡ Traffic Video Analysis (YOLOv8 + ByteTrack)
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 1: UNIFIED AI ROAD CONDITION ANALYSIS
         ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'potholes' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column: Upload & Triggers */}
          <div className="xl:col-span-1 space-y-4">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <span>AI Road Condition Analysis</span>
                <span className="text-[10px] bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded font-mono font-bold">
                  UNIFIED HAZARD SCAN
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Upload any road image. The AI automatically checks for potholes, standing water, surface distress, and water-filled cavities in a single execution pipeline.
              </p>

              {/* Drag & Drop Area */}
              <div
                onClick={() => unifiedInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingUnified(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingUnified(false)
                }}
                onDrop={handleUnifiedDrop}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-150 ${
                  isDraggingUnified
                    ? 'border-accent bg-accent/20 scale-[1.02] shadow-lg shadow-accent/20'
                    : 'border-gray-700 hover:border-accent/60 bg-navy-900/60'
                }`}
              >
                <input
                  ref={unifiedInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) processUnifiedFile(f, true)
                    e.target.value = ''
                  }}
                />
                <div className="text-3xl mb-1.5">{isDraggingUnified ? '📥' : '📸'}</div>
                <div className="text-white text-sm font-semibold">
                  {isDraggingUnified ? 'Drop Road Image Here' : 'Click or Drag & Drop Any Road Image'}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">JPG • PNG • WEBP (&lt; 15MB)</div>
                <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-mono">
                  <span>✓ Potholes</span>
                  <span>✓ Water Accumulation</span>
                  <span>✓ Surface Defects</span>
                </div>
                {unifiedFile && (
                  <div className="mt-2 text-xs bg-accent/15 text-accent-light px-2.5 py-1 rounded inline-block font-mono border border-accent/30 font-semibold">
                    {unifiedFile.name} ({(unifiedFile.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>

              {/* Live Camera Button & Samples */}
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full text-xs bg-navy-700 hover:bg-navy-600 text-white font-semibold py-2 px-3 rounded border border-gray-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>📷</span> Capture from Live Camera
                </button>

                <div className="text-[11px] font-semibold text-gray-400 pt-1">TEST SAMPLES:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/uploads/samples/sample_pothole_road.jpg')
                        if (res.ok) {
                          const blob = await res.blob()
                          const f = new File([blob], 'sample_pothole_road.jpg', { type: 'image/jpeg' })
                          processUnifiedFile(f, true)
                        }
                      } catch (e) {}
                    }}
                    disabled={isAnalyzingUnified}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 py-2 px-2 rounded border border-amber-500/40 text-center transition-colors font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>★</span> Potholes Sample
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/uploads/samples/sample_water_road.jpg')
                        if (res.ok) {
                          const blob = await res.blob()
                          const f = new File([blob], 'sample_water_road.jpg', { type: 'image/jpeg' })
                          processUnifiedFile(f, true)
                        }
                      } catch (e) {}
                    }}
                    disabled={isAnalyzingUnified}
                    className="text-xs bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 py-2 px-2 rounded border border-cyan-500/40 text-center transition-colors font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>💧</span> Water Puddle Sample
                  </button>
                </div>
              </div>

              {/* Road Corridor Selection */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 block mb-1">Target Road Corridor:</label>
                <select
                  value={selectedUnifiedRoadId || ''}
                  onChange={(e) => setSelectedUnifiedRoadId(e.target.value ? Number(e.target.value) : undefined)}
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
                onClick={() => {
                  if (unifiedFile) processUnifiedFile(unifiedFile, true)
                }}
                disabled={!unifiedFile || isAnalyzingUnified}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingUnified ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running AI Road Analysis...
                  </>
                ) : (
                  '⚡ RUN AI ROAD ANALYSIS'
                )}
              </button>

              {unifiedError && (
                <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded">
                  ✕ {unifiedError}
                </div>
              )}
            </div>

            {/* Truthful AI Engine Status Panel */}
            <div className="card text-xs space-y-2.5 border-gray-800">
              <div className="card-header mb-1">AI ENGINE STATUS</div>

              <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Pothole Detection</span>
                <span
                  className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${
                    modelStatus?.pothole_model_loaded
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  YOLOv8 • {modelStatus?.pothole_model_loaded ? 'Loaded' : 'Unconfigured'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Water Segmentation</span>
                <span
                  className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${
                    modelStatus?.water_model_loaded
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  YOLOv8-Seg • {modelStatus?.water_model_loaded ? 'Loaded' : '⚠ Model unavailable'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-400">Traffic Detection</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                  YOLOv8 + ByteTrack • Loaded
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visualization & Structured Results */}
          <div className="xl:col-span-2 space-y-4">
            {unifiedResult ? (
              <>
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Potholes Card */}
                  <div className="card p-3 space-y-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Potholes</span>
                      <span className="text-accent text-[10px]">YOLOv8</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {unifiedResult.potholes.count} <span className="text-xs font-normal text-gray-400">detected</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-800 text-[11px]">
                      <span className="text-gray-400">Severity:</span>
                      <RiskBadge level={unifiedResult.potholes.highest_severity || 'LOW'} />
                    </div>
                  </div>

                  {/* Water Accumulation Card */}
                  <div className="card p-3 space-y-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Water Accumulation</span>
                      <span className="text-cyan-400 text-[10px]">Segmentation</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-cyan-300">
                      {unifiedResult.water.status === 'model_unavailable' ? (
                        <span className="text-amber-400 text-sm font-sans font-normal">Model unavailable</span>
                      ) : (
                        `${unifiedResult.water.coverage_percent.toFixed(1)}%`
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-800 text-[11px]">
                      <span className="text-gray-400">Severity:</span>
                      {unifiedResult.water.status === 'model_unavailable' ? (
                        <span className="text-[10px] text-amber-400 font-mono">Model N/A</span>
                      ) : (
                        <RiskBadge level={unifiedResult.water.severity} />
                      )}
                    </div>
                  </div>

                  {/* Surface Condition Card */}
                  <div className="card p-3 space-y-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Road Condition
                    </div>
                    <div
                      className={`text-xl font-black font-mono mt-0.5 ${
                        unifiedResult.road_condition.classification === 'CRITICAL'
                          ? 'text-red-400'
                          : unifiedResult.road_condition.classification === 'POOR'
                          ? 'text-amber-400'
                          : unifiedResult.road_condition.classification === 'FAIR'
                          ? 'text-yellow-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {unifiedResult.road_condition.classification}
                    </div>
                    <div className="pt-1 border-t border-gray-800 text-[10px] text-gray-400 truncate">
                      {unifiedResult.water.water_filled_potholes ? '⚠️ Water-filled Potholes' : 'Defect Scanned'}
                    </div>
                  </div>

                  {/* Monitored Road Risk Card */}
                  <div className="card p-3 space-y-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Monitored Road Risk
                    </div>
                    <div className="text-2xl font-black font-mono text-red-400">
                      {Math.round(unifiedResult.risk.score)}
                      <span className="text-xs text-gray-500 font-normal">/100</span>
                    </div>
                    <div className="pt-1 border-t border-gray-800 text-[10px] text-emerald-400 font-mono">
                      SYNTHESIZED RISK
                    </div>
                  </div>
                </div>

                {/* Transparent Risk Breakdown Panel */}
                <div className="card p-3 text-xs space-y-2 border-gray-800 bg-navy-900/80">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-1 font-bold text-white">
                    <span>ROAD RISK SCORE: {Math.round(unifiedResult.risk.score)}/100</span>
                    <span className="text-[10px] font-mono text-accent">Transparent Factor Breakdown</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
                    <div className="bg-navy-950 p-2 rounded border border-gray-800">
                      <div className="text-gray-400 text-[10px]">Potholes</div>
                      <div className="font-mono text-amber-300 font-bold">
                        +{unifiedResult.risk.factors.pothole_severity || 0}
                      </div>
                    </div>
                    <div className="bg-navy-950 p-2 rounded border border-gray-800">
                      <div className="text-gray-400 text-[10px]">Water</div>
                      <div className="font-mono text-cyan-300 font-bold">
                        +{unifiedResult.risk.factors.water_accumulation || 0}
                      </div>
                    </div>
                    <div className="bg-navy-950 p-2 rounded border border-gray-800">
                      <div className="text-gray-400 text-[10px]">Traffic Exp</div>
                      <div className="font-mono text-white font-bold">
                        +{unifiedResult.risk.factors.traffic_exposure || 0}
                      </div>
                    </div>
                    <div className="bg-navy-950 p-2 rounded border border-gray-800">
                      <div className="text-gray-400 text-[10px]">Road Cond</div>
                      <div className="font-mono text-white font-bold">
                        +{unifiedResult.risk.factors.road_condition || 0}
                      </div>
                    </div>
                    <div className="bg-navy-950 p-2 rounded border border-gray-800">
                      <div className="text-gray-400 text-[10px]">Vulnerable Users</div>
                      <div className="font-mono text-amber-400 font-bold">
                        +{unifiedResult.risk.factors.vulnerable_users || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Inspection Viewport (Side-by-Side or Single) */}
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-navy-800 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="card-header mb-0">AI Hazard Overlay Viewport</span>
                      {unifiedResult.water.detected && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-500/30">
                          💧 Water Mask Active
                        </span>
                      )}
                      {unifiedResult.water.water_filled_potholes && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono border border-purple-500/30">
                          ⚡ Water-filled Pothole Mask Overlap
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-navy-900 p-0.5 rounded border border-gray-700">
                      <button
                        onClick={() => setUnifiedViewMode('side-by-side')}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          unifiedViewMode === 'side-by-side'
                            ? 'bg-accent text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Side-by-Side View
                      </button>
                      <button
                        onClick={() => setUnifiedViewMode('single')}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          unifiedViewMode === 'single'
                            ? 'bg-accent text-white font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Single View
                      </button>
                    </div>
                  </div>

                  {unifiedViewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-navy-950">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-mono">
                          <span>LEFT: Original Road Image</span>
                          <span className="text-[10px] text-gray-500">Raw Input</span>
                        </div>
                        <div className="bg-black/60 rounded border border-gray-800 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[460px]">
                          <img
                            src={unifiedResult.overlay_url || unifiedPreview || ''}
                            alt="Original Road"
                            className="max-h-[440px] w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-mono">
                          <span>RIGHT: AI Hazard Overlay</span>
                          <span className="text-[10px] text-accent">Potholes (BBoxes) + Water (Mask)</span>
                        </div>
                        <div className="bg-black/60 rounded border border-accent/30 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[460px] relative">
                          <img
                            src={unifiedResult.overlay_url || unifiedPreview || ''}
                            alt="AI Hazard Overlay"
                            className="max-h-[440px] w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-navy-950 flex flex-col items-center justify-center">
                      <img
                        src={unifiedResult.overlay_url || unifiedPreview || ''}
                        alt="AI Hazard Overlay"
                        className="max-h-[460px] w-auto max-w-full object-contain rounded border border-gray-800 shadow-xl"
                      />
                    </div>
                  )}
                </div>

                {/* Bounding Box Detail Breakdown Table */}
                {unifiedResult.potholes.detections.length > 0 && (
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
                          {unifiedResult.potholes.detections.map((det, idx) => (
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
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                                  YOLO Model
                                </span>
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
                {isAnalyzingUnified ? (
                  <div className="space-y-4 max-w-sm text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto shadow-lg shadow-accent/20" />
                    <div className="text-white text-base font-bold">Running Unified AI Road Analysis...</div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Detecting potholes, segmenting standing water, classifying surface condition, and calculating synthesized corridor risk...
                    </p>
                  </div>
                ) : unifiedPreview ? (
                  <div className="space-y-4 max-w-sm">
                    <img src={unifiedPreview} alt="Upload preview" className="max-h-52 rounded-lg border border-gray-700 mx-auto shadow-md" />
                    <div className="text-white text-sm font-semibold">Road Image Loaded</div>
                    <button
                      onClick={() => {
                        if (unifiedFile) processUnifiedFile(unifiedFile, true)
                      }}
                      disabled={isAnalyzingUnified}
                      className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2"
                    >
                      <span>⚡</span> RUN AI ROAD ANALYSIS →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-md">
                    <div className="w-14 h-14 rounded-full bg-navy-700 border border-gray-700 flex items-center justify-center text-2xl text-gray-400 mx-auto">
                      📸
                    </div>
                    <div className="text-white font-semibold text-base">No Road Image Analyzed Yet</div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Upload any road image (JPG, PNG, WEBP) or capture from your camera to automatically scan for potholes, water accumulation, and surface hazards in a single step.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 2: ROAD VIDEO ANALYSIS (POTHOLE TRACKING)
         ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pothole-video' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column: Input & Controls */}
          <div className="xl:col-span-1 space-y-4">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <span>Road Video Input</span>
                <span className="text-[10px] bg-accent/15 text-accent-light px-2 py-0.5 rounded font-mono font-semibold">
                  YOLOv8 + IoU Tracking
                </span>
              </div>

              {/* Upload Drag & Drop */}
              <div
                onClick={() => potholeVideoInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingPotholeVideo(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingPotholeVideo(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingPotholeVideo(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) processPotholeVideoFile(file)
                }}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-150 ${
                  isDraggingPotholeVideo
                    ? 'border-accent bg-accent/20 scale-[1.02] shadow-lg shadow-accent/20'
                    : 'border-gray-700 hover:border-accent/60 bg-navy-900/60'
                }`}
              >
                <input
                  ref={potholeVideoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
                  className="hidden"
                  onChange={handlePotholeVideoFileChange}
                />
                <div className="text-3xl mb-1.5">{isDraggingPotholeVideo ? '📥' : '🎥'}</div>
                <div className="text-white text-sm font-semibold">
                  {isDraggingPotholeVideo ? 'Drop Road Video Here' : 'Click or Drag & Drop Road Video'}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">
                  Supports MP4, MOV, AVI, MKV, WEBM (&lt; 100MB)
                </div>
                {potholeVideoFile && (
                  <div className="mt-2.5 text-xs bg-accent/15 text-accent-light px-2.5 py-1 rounded inline-block font-mono border border-accent/30 font-semibold">
                    {potholeVideoFile.name} ({(potholeVideoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                )}
              </div>

              {/* Extracted Video Metadata */}
              {potholeVideoMeta && (
                <div className="mt-3 p-3 bg-navy-900/80 rounded border border-gray-800 text-xs space-y-1">
                  <div className="text-gray-400 font-semibold mb-1 border-b border-gray-800 pb-1 flex justify-between">
                    <span>VIDEO METADATA</span>
                    <span className="text-emerald-400">Decoded OK</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white text-right font-bold">{potholeVideoMeta.duration.toFixed(1)}s</span>
                    <span className="text-gray-400">Resolution:</span>
                    <span className="text-white text-right font-bold">{potholeVideoMeta.width}x{potholeVideoMeta.height}</span>
                    <span className="text-gray-400">Estimated FPS:</span>
                    <span className="text-white text-right font-bold">{potholeVideoMeta.fps.toFixed(1)}</span>
                    <span className="text-gray-400">Total Frames:</span>
                    <span className="text-white text-right font-bold">~{potholeVideoMeta.totalFrames}</span>
                  </div>
                </div>
              )}

              {/* Road Corridor Selection */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Road Corridor:</label>
                  <select
                    value={selectedPotholeVideoRoadId || ''}
                    onChange={(e) => setSelectedPotholeVideoRoadId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="">Auto-detect or select road corridor...</option>
                    {roads.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Risk: {Math.round(r.risk_score)}/100)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pipeline Tunables */}
                <div className="p-3 bg-navy-950/60 rounded border border-gray-800/80 space-y-2.5">
                  <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                    Pipeline Parameters
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Frame Sampling Step:</span>
                      <span className="text-accent font-mono font-bold">Every {potholeVideoProcessEveryN} frame{potholeVideoProcessEveryN > 1 ? 's' : ''}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={potholeVideoProcessEveryN}
                      onChange={(e) => setPotholeVideoProcessEveryN(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="text-[10px] text-gray-500">Higher = Faster processing. Lower = Smoother tracking.</div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">YOLO Confidence Threshold:</span>
                      <span className="text-amber-400 font-mono font-bold">{(potholeVideoConfThreshold * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      value={potholeVideoConfThreshold}
                      onChange={(e) => setPotholeVideoConfThreshold(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Min Confirmed Frames:</span>
                      <span className="text-emerald-400 font-mono font-bold">{potholeVideoMinFrames} frames</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={potholeVideoMinFrames}
                      onChange={(e) => setPotholeVideoMinFrames(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                    <div className="text-[10px] text-gray-500">Filters single-frame transient false positives.</div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handlePotholeVideoSubmit}
                disabled={!potholeVideoFile || isAnalyzingPotholeVideo}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingPotholeVideo ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing Video & Tracking Potholes...
                  </>
                ) : (
                  '🎥 Run Pothole Video Analysis'
                )}
              </button>

              {potholeVideoError && (
                <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded">
                  ✕ {potholeVideoError}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Display & Results */}
          <div className="xl:col-span-2 space-y-4">
            {!potholeVideoPreview && !potholeVideoResult && (
              <div className="card text-center py-16">
                <div className="text-4xl mb-3">🎥</div>
                <div className="text-white font-semibold text-base">No Road Video Loaded</div>
                <div className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                  Upload a dashcam or roadside video above to analyze potholes frame-by-frame, count unique physical defects with spatial IoU tracking, and generate annotated video output.
                </div>
              </div>
            )}

            {potholeVideoPreview && !potholeVideoResult && (
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <span>Raw Video Preview</span>
                  <span className="text-xs text-gray-400 font-normal">Ready for AI processing</span>
                </div>
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-800">
                  <video src={potholeVideoPreview} controls className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            {potholeVideoResult && (
              <div className="space-y-4">
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="card p-3 border-l-4 border-l-purple-500 bg-navy-800/80">
                    <div className="text-gray-400 text-xs font-medium">Unique Potholes</div>
                    <div className="text-2xl font-black text-purple-300 font-mono mt-0.5">
                      {potholeVideoResult.summary.unique_potholes_count}
                    </div>
                    <div className="text-[10px] text-purple-400/80 mt-0.5">Deduplicated across frames</div>
                  </div>

                  <div className="card p-3 border-l-4 border-l-red-500 bg-navy-800/80">
                    <div className="text-gray-400 text-xs font-medium">High Severity</div>
                    <div className="text-2xl font-black text-red-400 font-mono mt-0.5">
                      {potholeVideoResult.summary.high_severity_count}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Requires priority repair</div>
                  </div>

                  <div className="card p-3 border-l-4 border-l-amber-500 bg-navy-800/80">
                    <div className="text-gray-400 text-xs font-medium">Raw Detections</div>
                    <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">
                      {potholeVideoResult.summary.total_raw_detections}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Across {potholeVideoResult.summary.frames_analyzed} frames</div>
                  </div>

                  <div className="card p-3 border-l-4 border-l-emerald-500 bg-navy-800/80">
                    <div className="text-gray-400 text-xs font-medium">Avg Confidence</div>
                    <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                      {(potholeVideoResult.summary.average_confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      In {potholeVideoResult.summary.processing_time_seconds.toFixed(1)}s
                    </div>
                  </div>
                </div>

                {/* Annotated Video Player */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">Annotated Pothole Video</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-semibold">
                        YOLO Bounding Boxes & Tracks
                      </span>
                    </div>
                    <a
                      href={potholeVideoResult.video_url}
                      download
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                    >
                      📥 Download Output MP4
                    </a>
                  </div>

                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video border border-gray-800 shadow-xl">
                    <video
                      ref={annotatedPotholeVideoRef}
                      src={potholeVideoResult.video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                    <span>Corridor: <strong className="text-white">{potholeVideoResult.location_summary}</strong></span>
                    <span>Processed: {new Date(potholeVideoResult.processed_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Keyframe Snapshots & Unique Track Gallery */}
                <div className="card p-4">
                  <div className="card-header flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span>Unique Pothole Keyframes</span>
                      <span className="text-xs bg-navy-700 text-gray-300 px-2 py-0.5 rounded font-mono">
                        {potholeVideoResult.unique_tracks.length} Tracks
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">Click snapshot to jump video to timestamp</span>
                  </div>

                  {potholeVideoResult.unique_tracks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No potholes exceeded the temporal confirmation threshold in this video.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {potholeVideoResult.unique_tracks.map((track) => {
                        const sevColor =
                          track.severity === 'HIGH' ? 'bg-red-900/60 text-red-300 border-red-700' :
                          track.severity === 'MEDIUM' ? 'bg-amber-900/60 text-amber-300 border-amber-700' :
                          'bg-emerald-900/60 text-emerald-300 border-emerald-700'

                        return (
                          <div
                            key={track.track_id}
                            className="bg-navy-900/90 border border-gray-800 rounded-lg p-2.5 flex flex-col justify-between hover:border-accent/50 transition-colors"
                          >
                            <div>
                              <div className="relative rounded overflow-hidden aspect-video bg-black mb-2 border border-gray-800 group">
                                {track.snapshot_url ? (
                                  <img
                                    src={track.snapshot_url}
                                    alt={track.track_id}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-mono">
                                    No Snapshot
                                  </div>
                                )}
                                <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-accent font-bold">
                                  {track.track_id}
                                </div>
                                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">
                                  {track.best_timestamp_seconds.toFixed(1)}s
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sevColor}`}>
                                  {track.severity} SEVERITY
                                </span>
                                <span className="font-mono text-emerald-400 font-bold text-[11px]">
                                  {(track.max_confidence * 100).toFixed(0)}% Conf
                                </span>
                              </div>

                              <div className="text-[11px] text-gray-400 font-mono space-y-0.5">
                                <div>Frame Range: #{track.first_seen_frame} - #{track.last_seen_frame}</div>
                                <div>Confirmations: {track.total_confirmations} frames</div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleJumpToPotholeTimestamp(track.best_timestamp_seconds)}
                              className="w-full mt-2 text-xs bg-accent/20 hover:bg-accent/35 text-accent-light py-1.5 px-2 rounded border border-accent/40 text-center font-semibold transition-colors flex items-center justify-center gap-1"
                            >
                              <span>⏱️ Jump to {track.best_timestamp_seconds.toFixed(1)}s</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Video Detection Timeline Table */}
                <div className="card p-4">
                  <div className="card-header mb-3">Detection Timeline & Tracking Log</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-navy-900 text-gray-400 uppercase font-mono text-[10px]">
                        <tr>
                          <th className="p-2">Frame #</th>
                          <th className="p-2">Timestamp</th>
                          <th className="p-2">Detections</th>
                          <th className="p-2">Active Track IDs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 font-mono">
                        {potholeVideoResult.timeline.map((item) => (
                          <tr key={item.frame_number} className="hover:bg-navy-800/40">
                            <td className="p-2 text-white">#{item.frame_number}</td>
                            <td className="p-2 text-accent">{item.timestamp_seconds.toFixed(2)}s</td>
                            <td className="p-2 text-amber-300 font-bold">{item.detections_in_frame}</td>
                            <td className="p-2">
                              {item.active_track_ids.map((id) => (
                                <span
                                  key={id}
                                  onClick={() => {
                                    const tr = potholeVideoResult.unique_tracks.find((t) => t.track_id === id)
                                    if (tr) handleJumpToPotholeTimestamp(tr.best_timestamp_seconds)
                                  }}
                                  className="inline-block bg-purple-900/40 text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded text-[10px] mr-1 cursor-pointer hover:bg-purple-800/60"
                                >
                                  {id}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 3: WATER ACCUMULATION ANALYSIS
         ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'water' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left Column: Upload & Options */}
          <div className="xl:col-span-1 space-y-4">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <span>Water Accumulation Image Upload</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 font-mono">
                  Segmentation
                </span>
              </div>

              {/* Drag & Drop Area */}
              <div
                onClick={() => waterInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingWater(true); }}
                onDragLeave={() => setIsDraggingWater(false)}
                onDrop={handleWaterDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDraggingWater
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-gray-700 hover:border-gray-500 bg-navy-900/50'
                }`}
              >
                <input
                  ref={waterInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && processWaterFile(e.target.files[0])}
                />
                <div className="text-4xl mb-2">💧</div>
                <div className="text-sm font-semibold text-gray-200">
                  {waterFile ? waterFile.name : 'Drop Road Image Here or Click to Upload'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Supports JPG, PNG, WEBP (Max 15MB)
                </div>
              </div>

              {/* Road Selection & Combined Hazard Options */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Monitored Road</label>
                  <select
                    value={selectedWaterRoadId || ''}
                    onChange={(e) => setSelectedWaterRoadId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Auto-Detect Road (General Corridor)</option>
                    {roads.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.road_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-lg bg-navy-900/80 border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waterHasPotholes}
                        onChange={(e) => setWaterHasPotholes(e.target.checked)}
                        className="rounded border-gray-700 bg-navy-950 text-cyan-500 focus:ring-0"
                      />
                      Combined Hazard (Pothole Present)
                    </label>
                    {waterHasPotholes && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-700/50 px-1.5 py-0.5 rounded">
                        Obscured Defect Boost
                      </span>
                    )}
                  </div>

                  {waterHasPotholes && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Pothole Severity</label>
                        <select
                          value={waterPotholeSeverity}
                          onChange={(e) => setWaterPotholeSeverity(e.target.value)}
                          className="w-full bg-navy-950 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Defect Count</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={waterPotholeCount}
                          onChange={(e) => setWaterPotholeCount(Number(e.target.value))}
                          className="w-full bg-navy-950 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {waterError && (
                  <div className="p-3 rounded-lg bg-red-950/50 border border-red-700 text-xs text-red-300">
                    ⚠️ {waterError}
                  </div>
                )}

                <button
                  disabled={!waterFile || isAnalyzingWater}
                  onClick={() => waterFile && processWaterFile(waterFile, true)}
                  className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isAnalyzingWater ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing Standing Water...
                    </>
                  ) : (
                    '💧 Analyze Water Accumulation'
                  )}
                </button>
              </div>
            </div>

            {/* Developer Model Status Panel */}
            <div className="card bg-navy-900/60 border-cyan-900/40">
              <div className="card-header flex items-center justify-between text-xs">
                <span>Developer Model Status</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  modelStatus?.water_model_loaded
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  {modelStatus?.water_model_loaded ? 'YOLOv8-SEG LOADED' : 'UNCONFIGURED (FALLBACK MODE)'}
                </span>
              </div>
              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Model Path:</span>
                  <span className="font-mono text-cyan-300">{modelStatus?.water_model_path || 'models/water_segmentation.pt'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Segmentation Model:</span>
                  <span className="font-mono">{modelStatus?.water_model_loaded ? 'Active (Local PyTorch/Ultralytics)' : 'Optical Water-Region Segmenter'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Inference Mode:</span>
                  <span className="font-mono">{modelStatus?.water_model_loaded ? 'REAL MODEL INFERENCE' : 'PROTOTYPE SCANNER'}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                  ℹ️ Place your custom trained YOLOv8 segmentation weights at <code className="text-cyan-300">models/water_segmentation.pt</code> to enable local neural instance segmentation.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Results Display */}
          <div className="xl:col-span-2 space-y-4">
            {waterResult ? (
              <>
                {/* Result Header & Status Banner */}
                <div className="card space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        💧 Water Accumulation Analysis Results
                        <span className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                          waterResult.detected
                            ? waterResult.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700'
                              : waterResult.severity === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-700'
                              : 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}>
                          {waterResult.detected ? `DETECTED (${waterResult.severity})` : 'NO WATER DETECTED'}
                        </span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Road: <span className="text-gray-200 font-semibold">{waterResult.road_name}</span> | ID: <span className="font-mono text-cyan-400">{waterResult.image_id}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setWaterViewMode(waterViewMode === 'side-by-side' ? 'single' : 'side-by-side')}
                        className="px-3 py-1.5 text-xs bg-navy-800 hover:bg-navy-700 text-gray-200 rounded border border-gray-700 transition-all"
                      >
                        {waterViewMode === 'side-by-side' ? '🔍 Single View' : '↔️ Side-by-Side'}
                      </button>
                    </div>
                  </div>

                  {/* Mode & Provenance Banner */}
                  <div className={`px-3 py-2 rounded text-xs border flex items-center justify-between ${
                    waterResult.is_demo_mode
                      ? 'bg-amber-950/30 border-amber-700/50 text-amber-300'
                      : 'bg-cyan-950/30 border-cyan-700/50 text-cyan-300'
                  }`}>
                    <span>
                      {waterResult.is_demo_mode ? '⚠️ PROTOTYPE SCANNER (Uncalibrated Optical Water Segmenter)' : '🟢 REAL MODEL INFERENCE (YOLOv8-SEG)'}
                    </span>
                    <span className="font-mono font-bold text-[11px]">
                      {waterResult.model_status}
                    </span>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-navy-900 border border-gray-800">
                      <div className="text-[11px] text-gray-400">Affected Road Area</div>
                      <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">
                        {waterResult.water_area_percent}%
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Road-bounded coverage
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-navy-900 border border-gray-800">
                      <div className="text-[11px] text-gray-400">Detection Confidence</div>
                      <div className="text-xl font-bold text-white font-mono mt-0.5">
                        {Math.round(waterResult.confidence * 100)}%
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        AI Pattern Match
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-navy-900 border border-gray-800">
                      <div className="text-[11px] text-gray-400">Severity Tier</div>
                      <div className={`text-xl font-bold font-mono mt-0.5 ${
                        waterResult.severity === 'CRITICAL' ? 'text-red-400'
                        : waterResult.severity === 'HIGH' ? 'text-orange-400'
                        : waterResult.severity === 'MEDIUM' ? 'text-amber-400'
                        : 'text-emerald-400'
                      }`}>
                        {waterResult.severity}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {waterResult.regions.length} Water Region(s)
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-navy-900 border border-gray-800">
                      <div className="text-[11px] text-gray-400">Risk Contribution</div>
                      <div className="text-xl font-bold text-red-400 font-mono mt-0.5">
                        +{waterResult.risk_contribution} pts
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Added to Road Risk
                      </div>
                    </div>
                  </div>

                  {/* Depth Disclaimer Banner */}
                  <div className="px-3 py-2 rounded bg-navy-950 border border-gray-800 text-xs flex items-center justify-between text-gray-400">
                    <span className="flex items-center gap-1.5">
                      ℹ️ <strong>Water Depth:</strong> {waterResult.depth_label}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      RGB Monocular Camera
                    </span>
                  </div>

                  {/* Visual Overlay Image Display */}
                  {waterViewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                          <span>Original Road Upload</span>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-gray-800 bg-black aspect-video flex items-center justify-center">
                          <img
                            src={waterPreview || waterResult.processed_image_url}
                            alt="Original Road"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-cyan-300 flex items-center justify-between">
                          <span>Water Mask Visual Overlay</span>
                          <span className="text-[10px] text-cyan-400 font-mono">Cyan Highlight</span>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-cyan-800/50 bg-black aspect-video flex items-center justify-center">
                          <img
                            src={waterResult.processed_image_url}
                            alt="Water Mask Overlay"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setWaterSingleToggle('processed')}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                              waterSingleToggle === 'processed' ? 'bg-cyan-600 text-white' : 'bg-navy-800 text-gray-400'
                            }`}
                          >
                            Visual Mask Overlay
                          </button>
                          <button
                            onClick={() => setWaterSingleToggle('mask')}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                              waterSingleToggle === 'mask' ? 'bg-cyan-600 text-white' : 'bg-navy-800 text-gray-400'
                            }`}
                          >
                            Binary Mask Only
                          </button>
                          <button
                            onClick={() => setWaterSingleToggle('original')}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                              waterSingleToggle === 'original' ? 'bg-cyan-600 text-white' : 'bg-navy-800 text-gray-400'
                            }`}
                          >
                            Original
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-gray-800 bg-black aspect-video max-h-[480px] flex items-center justify-center">
                        <img
                          src={
                            waterSingleToggle === 'mask'
                              ? waterResult.mask_image_url
                              : waterSingleToggle === 'original'
                              ? waterPreview || waterResult.processed_image_url
                              : waterResult.processed_image_url
                          }
                          alt="Water Detection"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Combined Road Hazard Card */}
                {waterResult.combined_hazard && (
                  <div className="card bg-amber-950/20 border-amber-700/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                        ⚠️ COMBINED ROAD HAZARD (Standing Water + Potholes)
                      </h4>
                      <span className="text-xs font-mono font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-700">
                        Combined Risk: {waterResult.combined_hazard.combined_risk_score}/100
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {waterResult.combined_hazard.obscured_hazard_warning}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div className="p-2 rounded bg-navy-950/80 border border-gray-800">
                        <span className="text-gray-400 block text-[10px]">Pothole Severity:</span>
                        <span className="font-bold text-amber-300">{waterResult.combined_hazard.pothole_severity} ({waterResult.combined_hazard.pothole_count} defect(s))</span>
                      </div>
                      <div className="p-2 rounded bg-navy-950/80 border border-gray-800">
                        <span className="text-gray-400 block text-[10px]">Water Severity:</span>
                        <span className="font-bold text-cyan-300">{waterResult.combined_hazard.water_severity}</span>
                      </div>
                      <div className="p-2 rounded bg-navy-950/80 border border-gray-800">
                        <span className="text-gray-400 block text-[10px]">Obscuration Factor:</span>
                        <span className="font-bold text-red-300">{waterResult.combined_hazard.interaction_factor}x Risk Boost</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multi-Region Water Puddle Table */}
                {waterResult.regions.length > 0 && (
                  <div className="card space-y-3">
                    <div className="card-header text-xs flex items-center justify-between">
                      <span>Detected Water Regions (Multi-Puddle Segmentation)</span>
                      <span className="text-gray-400 font-mono text-[11px]">{waterResult.regions.length} Regions</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 bg-navy-900/60">
                            <th className="p-2.5">Region</th>
                            <th className="p-2.5">Area (Pixels)</th>
                            <th className="p-2.5">Road Surface Coverage</th>
                            <th className="p-2.5">Severity</th>
                            <th className="p-2.5">Confidence</th>
                            <th className="p-2.5">Bounding Box (x1, y1, x2, y2)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {waterResult.regions.map((reg) => (
                            <tr key={reg.id} className="hover:bg-navy-900/40 font-mono">
                              <td className="p-2.5 font-bold text-cyan-300">Puddle #{reg.id}</td>
                              <td className="p-2.5 text-gray-300">{reg.area_pixels} px</td>
                              <td className="p-2.5 font-bold text-white">{reg.area_percent}%</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  reg.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800'
                                  : reg.severity === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                  : reg.severity === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                }`}>
                                  {reg.severity}
                                </span>
                              </td>
                              <td className="p-2.5 text-gray-300">{Math.round(reg.confidence * 100)}%</td>
                              <td className="p-2.5 text-gray-400 text-[11px]">
                                ({reg.box.x1}, {reg.box.y1}) to ({reg.box.x2}, {reg.box.y2})
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
              <div className="card h-full min-h-[420px] flex flex-col items-center justify-center p-8 text-center border-dashed border-gray-800">
                <div className="text-5xl mb-3 opacity-40">💧</div>
                <h3 className="text-base font-bold text-gray-300 mb-1">
                  Water Accumulation / Waterlogging Pipeline Ready
                </h3>
                <p className="text-xs text-gray-500 max-w-md leading-relaxed">
                  Upload a road image on the left to execute standing water segmentation, calculate road-bounded coverage percentages, evaluate visual severity, and render cyan mask overlays.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 4: TRAFFIC VIDEO ANALYSIS (YOLOv8 + ByteTrack)
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
