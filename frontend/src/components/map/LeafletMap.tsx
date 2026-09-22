import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { MapProviderProps } from './MapProvider'
import type { Hazard } from '@/types'

const TILE_URL = import.meta.env.VITE_TILE_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const hazardColors: Record<string, string> = {
  pothole: '#ef4444',
  'near-miss': '#f97316',
  'dangerous-junction': '#ef4444',
  'road-work': '#f59e0b',
  'high-risk-zone': '#dc2626',
}

const hazardLabels: Record<string, string> = {
  pothole: '● Pothole',
  'near-miss': '● Near Miss',
  'dangerous-junction': '⚠ Dangerous Junction',
  'road-work': '🔧 Road Work',
  'high-risk-zone': '🔴 High-Risk Zone',
}

function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#f59e0b'
  return '#10b981'
}

export default function LeafletMap({
  hazards,
  center = [51.5074, -0.1278],
  zoom = 13,
  onMarkerClick,
  className = '',
}: MapProviderProps) {
  return (
    <div className={`relative ${className}`} style={{ minHeight: 400 }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', minHeight: 400, background: '#111827' }}
        className="rounded-lg"
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          // Dark-themed tile layer hint
          className="map-tiles"
        />
        {hazards.map((hazard) => (
          <CircleMarker
            key={hazard.id}
            center={[hazard.latitude, hazard.longitude]}
            radius={hazard.severity === 'CRITICAL' ? 14 : hazard.severity === 'HIGH' ? 11 : 8}
            pathOptions={{
              color: hazardColors[hazard.type] ?? '#3b82f6',
              fillColor: hazardColors[hazard.type] ?? '#3b82f6',
              fillOpacity: 0.75,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onMarkerClick?.(hazard),
            }}
          >
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                  {hazardLabels[hazard.type] ?? hazard.type}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Risk Score: <strong style={{ color: getRiskColor(hazard.risk_score) }}>{hazard.risk_score}/100</strong>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Severity: <strong>{hazard.severity}</strong>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Confidence: {Math.round(hazard.confidence * 100)}%
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {new Date(hazard.detected_at).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>⚠ DEMO DATA</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
