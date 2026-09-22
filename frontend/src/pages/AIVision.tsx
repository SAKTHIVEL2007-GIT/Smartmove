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

  // ── Pothole Upload State ───────────────────────────────────────────────────
  const [potholeFile, setPotholeFile] = useState<File | null>(null)
  const [potholePreview, setPotholePreview] = useState<string | null>(null)
  const [selectedRoadId, setSelectedRoadId] = useState<number | undefined>(undefined)
  const [potholeResult, setPotholeResult] = useState<PotholeAnalysisResult | null>(null)
  const [imageDisplayMode, setImageDisplayMode] = useState<'processed' | 'original'>('processed')
  const [potholeError, setPotholeError] = useState<string | null>(null)

  const potholeInputRef = useRef<HTMLInputElement>(null)
  const { mutate: runPotholeAnalysis, isPending: isAnalyzingPothole } = useAnalyzePothole()

  // ── Traffic Video State ────────────────────────────────────────────────────
  const [trafficFile, setTrafficFile] = useState<File | null>(null)
  const [trafficPreview, setTrafficPreview] = useState<string | null>(null)
  const [selectedJunctionId, setSelectedJunctionId] = useState<number | undefined>(undefined)
  const [trafficResult, setTrafficResult] = useState<TrafficAnalysisResult | null>(null)
  const [trafficError, setTrafficError] = useState<string | null>(null)

  const trafficInputRef = useRef<HTMLInputElement>(null)
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
      { file: trafficFile, junction_id: selectedJunctionId },
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

  return (
    <Layout title="AI Vision" subtitle="Local YOLOv8 Computer Vision Pipeline & Traffic Analytics">
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
                    Demo AI Mode
                  </span>
                ) : (
                  <span className="bg-green-500/10 text-green-400 border border-green-500/30 text-[11px] px-2 py-0.5 rounded font-mono font-medium">
                    YOLOv8 Active
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
              Configure MODEL_PATH ⚙
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
          ⬟ Pothole Analysis
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
            activeTab === 'traffic'
              ? 'text-white border-b-2 border-accent'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ⚡ Traffic Near-Miss Analysis (ByteTrack)
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
              <div className="card-header">Upload Road Image</div>

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

              {/* Sample Buttons for Instant Testing */}
              <div className="mt-3">
                <span className="text-[11px] text-gray-500 block mb-1.5 uppercase tracking-wider font-semibold">
                  Or Test with Sample Images:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => loadSamplePotholeImage('pothole')}
                    className="text-xs bg-navy-600 hover:bg-navy-500 text-gray-300 py-1.5 px-2 rounded border border-gray-700 text-center transition-colors"
                  >
                    Load Road with Pothole
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSamplePotholeImage('clean')}
                    className="text-xs bg-navy-600 hover:bg-navy-500 text-gray-300 py-1.5 px-2 rounded border border-gray-700 text-center transition-colors"
                  >
                    Load Clean Road
                  </button>
                </div>
              </div>

              {/* Road Tagging */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 block mb-1">Associate with Road Segment:</label>
                <select
                  value={selectedRoadId || ''}
                  onChange={(e) => setSelectedRoadId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-navy-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Auto-assign or select road...</option>
                  {roads.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Risk: {r.risk_score})
                    </option>
                  ))}
                </select>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handlePotholeSubmit}
                disabled={!potholeFile || isAnalyzingPothole}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingPothole ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running Local YOLOv8 Inference...
                  </>
                ) : (
                  'Run Pothole Detection'
                )}
              </button>

              {potholeError && (
                <div className="mt-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded">
                  ✕ {potholeError}
                </div>
              )}
            </div>

            {/* Model & Formula Architecture Card */}
            <div className="card text-xs space-y-2 border-gray-800">
              <div className="card-header mb-1">Detection Architecture</div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Pipeline</span>
                <span className="text-white font-mono">Ultralytics YOLOv8</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Inference Location</span>
                <span className="text-green-400 font-mono">100% Local (No Cloud)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Config Path</span>
                <span className="text-accent font-mono truncate max-w-[160px]">
                  {modelStatus?.pothole_model_path || 'models/pothole_yolov8.pt'}
                </span>
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-semibold text-gray-400 mb-1">PROTOTYPE RISK FORMULA:</div>
                <div className="p-2 bg-navy-900 rounded font-mono text-[11px] text-accent-light leading-relaxed">
                  Risk = (Severity Weight × 0.6) + (Confidence × 100 × 0.4)
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visualizer & Results */}
          <div className="xl:col-span-2 space-y-4">
            {potholeResult ? (
              <>
                {/* Result KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="card text-center p-3">
                    <div className="card-header mb-1">Risk Score</div>
                    <div
                      className="text-2xl font-bold font-mono"
                      style={{
                        color:
                          potholeResult.risk_score >= 70
                            ? '#ef4444'
                            : potholeResult.risk_score >= 40
                            ? '#f59e0b'
                            : '#10b981',
                      }}
                    >
                      {potholeResult.risk_score}/100
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Prototype Metric</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="card-header mb-1">Severity</div>
                    <div className="mt-1">
                      <RiskBadge level={potholeResult.severity} />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">Defect Hazard</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="card-header mb-1">AI Confidence</div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {(potholeResult.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Detection Prob.</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="card-header mb-1">Potholes Found</div>
                    <div className="text-2xl font-bold font-mono text-accent">
                      {potholeResult.pothole_count}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Surface Anomalies</div>
                  </div>
                </div>

                {/* Demo Mode Notice Banner if applicable */}
                {potholeResult.is_demo_mode && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex items-start gap-2.5">
                    <span className="text-amber-400 text-sm">⚠</span>
                    <div>
                      <span className="text-amber-400 font-semibold">Demo AI Mode — Real model not configured</span>
                      <p className="text-amber-300/80 text-[11px] mt-0.5">
                        {potholeResult.status_message} To run full YOLOv8 custom inference, place your trained{' '}
                        <code className="bg-navy-900 px-1 rounded text-white font-mono">pothole_yolov8.pt</code> in{' '}
                        <code className="bg-navy-900 px-1 rounded text-white font-mono">models/</code> or configure{' '}
                        <Link to="/settings" className="underline font-semibold text-white">
                          Settings
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {/* Database Sync Notice */}
                {potholeResult.hazard_id && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                    <span className="text-green-400">
                      ✓ Hazard #{potholeResult.hazard_id} recorded in SQLite database and synchronized with{' '}
                      <strong>{potholeResult.road_name || 'monitored road'}</strong>.
                    </span>
                    <Link to="/map" className="text-green-300 font-semibold hover:underline ml-2">
                      View on Map →
                    </Link>
                  </div>
                )}

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
                          <tr className="text-gray-500 border-b border-gray-800 text-left">
                            <th className="py-2 pr-3">Box #</th>
                            <th className="py-2 pr-3">Coordinates [x1, y1, x2, y2]</th>
                            <th className="py-2 pr-3">Confidence</th>
                            <th className="py-2 pr-3">Severity</th>
                            <th className="py-2 pr-3">Risk Score</th>
                            <th className="py-2">Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {potholeResult.detections.map((det, idx) => (
                            <tr key={idx} className="border-b border-gray-900 hover:bg-navy-600/40">
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
                              <td className="py-2 pr-3 font-mono font-bold text-accent-light">
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
                    <div className="text-white font-semibold text-base">No Image Analyzed Yet</div>
                    <p className="text-gray-400 text-xs">
                      Upload a roadway photo or click one of the sample test images on the left to trigger the
                      local YOLOv8 detection pipeline and generate bounding boxes, confidence, and prototype risk scores.
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
                <label className="text-xs text-gray-400 block mb-1">Monitored Junction:</label>
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
                <span className="text-white font-mono">YOLOv8n (80 Classes)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Multi-Object Tracker</span>
                <span className="text-white font-mono">ByteTrack</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">Tracked Classes</span>
                <span className="text-gray-300">Vehicles, Pedestrians, Motorcycles, Cyclists</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-500">TTC Conflict Threshold</span>
                <span className="text-amber-400 font-mono font-bold">&lt; 2.0 seconds</span>
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-semibold text-gray-400 mb-1">SAFETY PRINCIPLE:</div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Flagged as <strong>AI-assisted near-miss detection</strong> based on converging trajectory
                  vectors. This is a collision-threat safety metric, not guaranteed accident prediction.
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
                    <div className="card-header mb-1">Near Misses</div>
                    <div
                      className={`text-2xl font-bold font-mono ${
                        trafficResult.near_miss_count > 0 ? 'text-risk-critical' : 'text-risk-low'
                      }`}
                    >
                      {trafficResult.near_miss_count}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">TTC &lt; 2.0s Flagged</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="card-header mb-1">Tracked Users</div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {trafficResult.tracked_objects_count}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Unique Track IDs</div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="card-header mb-1">Processed Video</div>
                    <div className="text-2xl font-bold font-mono text-accent">
                      {trafficResult.duration_seconds.toFixed(1)}s
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {trafficResult.processed_frames} Frames
                    </div>
                  </div>

                  <div className="card text-center p-3">
                    <div className="card-header mb-1">Junction Status</div>
                    <div className="mt-1">
                      <StatusBadge status="monitored" />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 truncate">
                      {trafficResult.junction_name || 'Active Junction'}
                    </div>
                  </div>
                </div>

                {/* AI-assisted near-miss warning banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex items-start gap-2.5">
                  <span className="text-amber-400 text-base">⚠</span>
                  <div>
                    <span className="text-amber-400 font-semibold">AI-Assisted Near-Miss Detection</span>
                    <p className="text-amber-300/80 text-[11px] mt-0.5">
                      {trafficResult.status_message} Real-time trajectory convergence model evaluates approaching
                      velocity vectors. Not a guarantee of historical accident occurrence.
                    </p>
                  </div>
                </div>

                {/* Processed Video / Playback */}
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-navy-800 border-b border-gray-800 flex items-center justify-between">
                    <span className="card-header mb-0">Video Analysis Player</span>
                    <span className="text-xs text-gray-400 font-mono">
                      {trafficResult.processed_frames} frames processed
                    </span>
                  </div>
                  <div className="p-4 bg-navy-950 flex flex-col items-center justify-center">
                    <video
                      controls
                      className="max-h-[380px] w-full rounded border border-gray-800 shadow-xl bg-black"
                      src={trafficResult.processed_video_url || trafficResult.original_video_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>

                {/* Conflict Snapshots Gallery */}
                {trafficResult.conflict_snapshots.length > 0 && (
                  <div className="card">
                    <div className="card-header">Keyframe Conflict Snapshots</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {trafficResult.conflict_snapshots.map((snap, i) => (
                        <div key={i} className="border border-gray-800 rounded overflow-hidden bg-navy-900">
                          <img src={snap} alt={`Conflict ${i + 1}`} className="w-full h-32 object-cover" />
                          <div className="p-2 text-[11px] text-gray-400 flex items-center justify-between">
                            <span>Conflict Snapshot #{i + 1}</span>
                            <span className="text-red-400 font-bold">TTC &lt; 2s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Near Miss Events List */}
                <div className="card">
                  <div className="card-header">Flagged Near-Miss Events</div>
                  {trafficResult.near_misses.length > 0 ? (
                    <div className="space-y-2.5">
                      {trafficResult.near_misses.map((nm) => (
                        <div
                          key={nm.conflict_id}
                          className="p-3 bg-navy-600 rounded-lg border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">Near Miss</span>
                              <span className="font-mono text-xs text-gray-400">
                                Timestamp: {nm.timestamp_str}
                              </span>
                              <RiskBadge level={nm.risk_level} />
                            </div>
                            <div className="text-xs text-gray-300">
                              Objects:{' '}
                              <strong className="text-white capitalize">
                                {nm.object_types.join(' + ')}
                              </strong>{' '}
                              (Tracks #{nm.track_ids.join(', #')})
                            </div>
                            <div className="text-xs text-gray-400">
                              Conflict Zone: <span className="text-gray-300">{nm.conflict_zone}</span>
                            </div>
                          </div>

                          <div className="sm:text-right">
                            <div className="text-xs text-gray-400">Time-To-Collision</div>
                            <div className="text-lg font-mono font-bold text-risk-critical">
                              TTC: {nm.ttc.toFixed(1)} sec
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 text-sm py-6">
                      No near-miss conflict events detected with TTC &lt; 2.0s in this footage.
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
    </Layout>
  )
}
