import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import { useAIModelStatus } from '@/hooks/useApi'

export default function Settings() {
  const { data: aiStatus } = useAIModelStatus()

  // Local settings state with localStorage persistence
  const [modelPath, setModelPath] = useState(
    localStorage.getItem('safecity_model_path') || aiStatus?.pothole_model_path || 'models/pothole_yolov8.pt'
  )
  const [demoMode, setDemoMode] = useState(
    localStorage.getItem('safecity_demo_mode') !== 'false'
  )
  const [mapProvider, setMapProvider] = useState(
    localStorage.getItem('safecity_map_provider') || 'leaflet'
  )
  const [googleMapsKey, setGoogleMapsKey] = useState(
    localStorage.getItem('safecity_google_maps_key') || ''
  )
  const [ttcThreshold, setTtcThreshold] = useState(
    Number(localStorage.getItem('safecity_ttc_threshold')) || 2.0
  )
  const [criticalThreshold, setCriticalThreshold] = useState(
    Number(localStorage.getItem('safecity_thresh_crit')) || 80
  )
  const [highThreshold, setHighThreshold] = useState(
    Number(localStorage.getItem('safecity_thresh_high')) || 60
  )
  const [displayMode, setDisplayMode] = useState(
    localStorage.getItem('safecity_display_mode') || 'standard'
  )
  const [savedSuccess, setSavedSuccess] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('safecity_model_path', modelPath)
    localStorage.setItem('safecity_demo_mode', String(demoMode))
    localStorage.setItem('safecity_map_provider', mapProvider)
    localStorage.setItem('safecity_google_maps_key', googleMapsKey)
    localStorage.setItem('safecity_ttc_threshold', String(ttcThreshold))
    localStorage.setItem('safecity_thresh_crit', String(criticalThreshold))
    localStorage.setItem('safecity_thresh_high', String(highThreshold))
    localStorage.setItem('safecity_display_mode', displayMode)

    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <Layout title="System Settings" subtitle="Platform configuration, AI models, thresholds & hardware tuning">
      <DemoDataBanner />

      <form onSubmit={handleSave} className="max-w-4xl space-y-5">
        {/* Top Save action bar */}
        <div className="flex items-center justify-between p-3 bg-navy-800 rounded-xl border border-gray-700">
          <div className="text-xs text-gray-300">
            Configure local inference paths, safety heuristics, and mapping providers.
          </div>
          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-bold animate-in fade-in">
                ✓ Settings saved successfully!
              </span>
            )}
            <button type="submit" className="btn-primary text-xs py-1.5 px-4 font-bold">
              Save Changes
            </button>
          </div>
        </div>

        {/* 1. AI Vision Model Configuration */}
        <div className="card border-accent/30 bg-navy-800/90">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <span>1. Local AI Vision Models</span>
            {aiStatus?.is_pothole_demo_mode ? (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                Demo AI Mode Active
              </span>
            ) : (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                YOLOv8 Active
              </span>
            )}
          </div>

          <div className="space-y-3 mt-3 text-xs">
            <div>
              <label className="text-gray-300 font-semibold block mb-1">
                Pothole Model Path (<code className="text-accent">MODEL_PATH</code>)
              </label>
              <input
                type="text"
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-accent"
                value={modelPath}
                onChange={(e) => setModelPath(e.target.value)}
                placeholder="models/pothole_yolov8.pt"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Local Ultralytics model weights. If custom weights are not present, system runs in Demo AI Mode.
              </p>
            </div>

            <div>
              <label className="text-gray-300 font-semibold block mb-1">
                Traffic Near-Miss Model Path
              </label>
              <input
                type="text"
                readOnly
                className="w-full bg-navy-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono"
                value={aiStatus?.traffic_model_path || 'yolov8n.pt'}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Pre-trained YOLOv8n COCO weights with ByteTrack trajectory forecasting.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Demo Mode Configuration */}
        <div className="card">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <span>2. Demo & Simulation Mode</span>
            <span className="text-xs font-mono text-gray-400">Environment</span>
          </div>
          <div className="space-y-3 mt-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-navy-900 rounded-lg border border-gray-800">
              <div>
                <div className="font-semibold text-white">Enable Synthetic Demo Mode [DEMO]</div>
                <div className="text-gray-400 text-[11px] mt-0.5">
                  Populates 18 hazards, 5 danger zones, 10 repair tasks, and 5 historical interventions for hackathon demonstration.
                </div>
              </div>
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="w-5 h-5 accent-accent rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. Map Provider & Google Maps API Configuration */}
        <div className="card">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <span>3. Mapping Provider & API Keys</span>
            <span className="text-xs font-mono text-gray-400">Spatial Engine</span>
          </div>

          <div className="space-y-3 mt-3 text-xs">
            <div>
              <label className="text-gray-300 font-semibold block mb-1">Active Map Provider</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMapProvider('leaflet')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mapProvider === 'leaflet'
                      ? 'bg-accent/15 border-accent text-white'
                      : 'bg-navy-900 border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">Leaflet / OpenStreetMap (Default)</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Free, open-source, zero API key required, offline-capable tile layers.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMapProvider('google')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mapProvider === 'google'
                      ? 'bg-accent/15 border-accent text-white'
                      : 'bg-navy-900 border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">Google Maps Platform</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Requires <code className="text-accent">GOOGLE_MAPS_API_KEY</code>. Supports Satellite & 3D photorealistic tiles.
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-300 font-semibold block mb-1">
                Google Maps API Key (<code className="text-accent">GOOGLE_MAPS_API_KEY</code>)
              </label>
              <input
                type="password"
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-accent"
                value={googleMapsKey}
                onChange={(e) => setGoogleMapsKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Stored securely in your local environment. Never committed to source control or exposed in production bundles.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Risk & Collision Thresholds */}
        <div className="card">
          <div className="card-header border-b border-gray-800 pb-2">
            4. Risk Thresholds & Collision Heuristics
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
            <div>
              <label className="text-gray-300 font-semibold block mb-1">
                Critical Danger Score (≥)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-500">Triggers immediate red hazard badge</span>
            </div>

            <div>
              <label className="text-gray-300 font-semibold block mb-1">
                High Risk Threshold (≥)
              </label>
              <input
                type="number"
                min="30"
                max="80"
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                value={highThreshold}
                onChange={(e) => setHighThreshold(Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-500">Triggers municipal work order queue</span>
            </div>

            <div>
              <label className="text-gray-300 font-semibold block mb-1">
                TTC Near-Miss Threshold (seconds)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="5.0"
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                value={ttcThreshold}
                onChange={(e) => setTtcThreshold(Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-500">Default &lt; 2.0s time-to-collision</span>
            </div>
          </div>
        </div>

        {/* 5. Display Mode */}
        <div className="card">
          <div className="card-header border-b border-gray-800 pb-2">
            5. UI & Roadside Display Mode
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
            <button
              type="button"
              onClick={() => setDisplayMode('standard')}
              className={`p-3 rounded-lg border text-center transition-all ${
                displayMode === 'standard' ? 'bg-accent/20 border-accent text-white font-bold' : 'bg-navy-900 border-gray-800 text-gray-400'
              }`}
            >
              Command Center Dark (Default)
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('high-contrast')}
              className={`p-3 rounded-lg border text-center transition-all ${
                displayMode === 'high-contrast' ? 'bg-accent/20 border-accent text-white font-bold' : 'bg-navy-900 border-gray-800 text-gray-400'
              }`}
            >
              High Contrast Municipal
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('billboard')}
              className={`p-3 rounded-lg border text-center transition-all ${
                displayMode === 'billboard' ? 'bg-accent/20 border-accent text-white font-bold' : 'bg-navy-900 border-gray-800 text-gray-400'
              }`}
            >
              Roadside Billboard Mode
            </button>
          </div>
        </div>

        {/* API Docs & Links */}
        <div className="card bg-navy-900/50 border border-gray-800 text-xs text-gray-400 flex items-center justify-between">
          <span>FastAPI Backend Swagger Documentation:</span>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline font-mono"
          >
            http://localhost:8000/docs ↗
          </a>
        </div>
      </form>
    </Layout>
  )
}
