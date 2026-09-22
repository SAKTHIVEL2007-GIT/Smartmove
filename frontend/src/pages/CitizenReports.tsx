import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import RiskBadge from '@/components/ui/RiskBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import { useCitizenReports, useSubmitReport, useRoads } from '@/hooks/useApi'
import type { RiskLevel, CitizenReport } from '@/types'

const HAZARD_TYPES = [
  { value: 'pothole', label: 'Pothole / Road Cavity' },
  { value: 'near-miss', label: 'Dangerous Junction / Near-Miss Hazard' },
  { value: 'flooding', label: 'Water Accumulation / Flooding' },
  { value: 'debris', label: 'Road Debris / Obstruction' },
  { value: 'poor-lighting', label: 'Defective Street Lighting' },
  { value: 'broken-signage', label: 'Missing / Damaged Signage' },
]

const SAMPLE_PHOTOS = [
  { label: 'Sample Pothole', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&auto=format&fit=crop&q=60' },
  { label: 'Sample Junction', url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=500&auto=format&fit=crop&q=60' },
  { label: 'Sample Debris', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60' },
]

export default function CitizenReports() {
  const { data: reports = [], isLoading } = useCitizenReports()
  const { data: roads = [] } = useRoads()
  const { mutate: submit, isPending, isError } = useSubmitReport()

  const [form, setForm] = useState({
    reporter_name: '',
    type: 'pothole',
    description: '',
    severity: 'HIGH' as RiskLevel,
    photo_url: SAMPLE_PHOTOS[0].url,
    latitude: 51.5074,
    longitude: -0.1278,
  })

  const [lastSubmitted, setLastSubmitted] = useState<CitizenReport | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>(SAMPLE_PHOTOS[0].url)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setPhotoPreview(result)
        setForm((f) => ({ ...f, photo_url: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  function handleRoadSelect(roadId: string) {
    if (!roadId) return
    const r = roads.find((road) => road.id === Number(roadId))
    if (r) {
      setForm((f) => ({
        ...f,
        latitude: Number((r.latitude + (Math.random() - 0.5) * 0.001).toFixed(4)),
        longitude: Number((r.longitude + (Math.random() - 0.5) * 0.001).toFixed(4)),
      }))
    }
  }

  function handleUseGPS() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((f) => ({
            ...f,
            latitude: Number(pos.coords.latitude.toFixed(4)),
            longitude: Number(pos.coords.longitude.toFixed(4)),
          }))
        },
        () => {
          // Fallback to School Road coordinates
          setForm((f) => ({ ...f, latitude: 51.5074, longitude: -0.1278 }))
        }
      )
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(
      {
        reporter_name: form.reporter_name || 'Civic Scout [DEMO]',
        type: form.type,
        description: form.description,
        severity: form.severity,
        latitude: form.latitude,
        longitude: form.longitude,
        photo_url: form.photo_url,
      },
      {
        onSuccess: (data) => {
          setLastSubmitted(data)
          setForm({
            reporter_name: '',
            type: 'pothole',
            description: '',
            severity: 'HIGH',
            photo_url: SAMPLE_PHOTOS[0].url,
            latitude: 51.5074,
            longitude: -0.1278,
          })
        },
      }
    )
  }

  return (
    <Layout title="Citizen Hazard Reporting" subtitle="Public crowd-sourced hazard intake portal connected to municipal operations">
      <DemoDataBanner />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Form column */}
        <div className="card border border-gray-700 bg-navy-900/90 shadow-xl">
          <div className="card-header border-b border-gray-800 pb-2 flex items-center justify-between">
            <span>Report a Road Hazard</span>
            <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded font-mono">
              GPS Enabled
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
            {/* Photo upload + Presets */}
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-1">
                Hazard Photo (Upload or Preset) *
              </label>
              <div className="flex gap-3 items-start">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Hazard preview"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-700 bg-navy-950 flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-dashed border-gray-700 bg-navy-950 flex items-center justify-center text-gray-500 text-xs">
                    No photo
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-800 file:text-accent hover:file:bg-navy-700 cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="text-gray-500 mr-1">Sample:</span>
                    {SAMPLE_PHOTOS.map((p) => (
                      <button
                        type="button"
                        key={p.label}
                        onClick={() => {
                          setPhotoPreview(p.url)
                          setForm((f) => ({ ...f, photo_url: p.url }))
                        }}
                        className="px-1.5 py-0.5 bg-navy-800 hover:bg-navy-700 border border-gray-700 rounded text-gray-300"
                      >
                        {p.label.replace('Sample ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Location selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-300 font-semibold">Location / GPS Coordinates *</label>
                <button
                  type="button"
                  onClick={handleUseGPS}
                  className="text-[11px] text-accent hover:underline flex items-center gap-1"
                >
                  📍 Use GPS Pin
                </button>
              </div>
              <select
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent mb-1.5"
                onChange={(e) => handleRoadSelect(e.target.value)}
              >
                <option value="">Snap to Road Corridor...</option>
                {roads.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.latitude.toFixed(3)}° N, {r.longitude.toFixed(3)}° W)
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Latitude"
                  className="bg-navy-950 border border-gray-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: Number(e.target.value) }))}
                  required
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Longitude"
                  className="bg-navy-950 border border-gray-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            {/* Hazard Type */}
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-1">Hazard Type *</label>
              <select
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                required
              >
                {HAZARD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Optional Severity */}
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-1">Observed Severity (Optional)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, severity: s }))}
                    className={`py-1 text-xs font-semibold rounded border transition-colors ${
                      form.severity === s
                        ? 'bg-accent/20 text-accent border-accent'
                        : 'bg-navy-950 text-gray-400 border-gray-700 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-gray-300 font-semibold block mb-1">Description & Context</label>
              <textarea
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                rows={2}
                placeholder="Detail the hazard location, depth, or nearby landmarks..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Reporter Name (optional) */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Reporter Name / Alias (Optional)</label>
              <input
                className="w-full bg-navy-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                placeholder="Citizen Scout / Anonymous"
                value={form.reporter_name}
                onChange={(e) => setForm((f) => ({ ...f, reporter_name: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full text-xs py-2 font-bold shadow-lg shadow-accent/15"
            >
              {isPending ? 'Submitting Report…' : 'Submit Road Hazard Report'}
            </button>

            {isError && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 p-2.5 rounded-lg">
                ✕ Submission failed. Please ensure the backend server is running on port 8000.
              </div>
            )}
          </form>

          {/* Submission Success Card with SC-DEMO Code */}
          {lastSubmitted && (
            <div className="mt-4 p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl animate-in fade-in">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>✓</span> Report Successfully Registered
                </span>
                <span className="text-xs font-mono font-bold text-white bg-navy-900 px-2 py-0.5 rounded border border-emerald-500/50">
                  {lastSubmitted.report_code || `SC-DEMO-${String(lastSubmitted.id).padStart(5, '0')}`}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Status: <strong className="text-amber-400">{lastSubmitted.status}</strong>.
                A spatial hazard pin has been placed on the municipal risk map.
              </p>
            </div>
          )}
        </div>

        {/* Reports Queue column */}
        <div className="xl:col-span-2 card">
          <div className="card-header flex items-center justify-between border-b border-gray-800 pb-2">
            <span>Citizen Hazard Feed ({reports.length})</span>
            <span className="text-xs text-gray-400">Integrated into Municipal Operations Center</span>
          </div>

          {isLoading ? (
            <div className="space-y-3 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse h-20 bg-navy-600" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 mt-3 overflow-y-auto max-h-[620px] pr-1">
              {reports.map((r) => {
                const reportCode = r.report_code || `SC-DEMO-${String(r.id).padStart(5, '0')}`
                return (
                  <div
                    key={r.id}
                    className="p-3.5 bg-navy-800/90 rounded-xl border border-gray-800 hover:border-gray-700 transition-all flex items-start gap-3.5"
                  >
                    {/* Thumbnail if photo provided */}
                    {r.photo_url ? (
                      <img
                        src={r.photo_url}
                        alt="Hazard"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-700 bg-navy-950 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-navy-900 border border-gray-800 flex items-center justify-center text-xl flex-shrink-0 text-accent">
                        ⚠
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                            {reportCode}
                          </span>
                          <span className="text-sm font-semibold text-white capitalize">
                            {r.type.replace(/-/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RiskBadge level={r.severity} />
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {r.status}
                          </span>
                        </div>
                      </div>

                      {r.description && (
                        <p className="text-xs text-gray-300 mt-1 line-clamp-2">{r.description}</p>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-gray-800/80 text-[11px] text-gray-500">
                        <span>Reported by: <strong className="text-gray-300">{r.reporter_name || 'Anonymous'}</strong></span>
                        {r.latitude && r.longitude && (
                          <span className="font-mono">{r.latitude.toFixed(4)}° N, {r.longitude.toFixed(4)}° W</span>
                        )}
                        <span>{new Date(r.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {reports.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-12">
                  No citizen reports submitted yet. Use the form to report the first hazard.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}


