/**
 * MapProvider — Map abstraction layer
 * Reads VITE_MAP_PROVIDER env variable to select map implementation.
 * Currently supports: "leaflet" (OpenStreetMap default)
 * Modular fallback ready for: "google" (if API key configured)
 */
import { lazy, Suspense } from 'react'
import type { Hazard, Road } from '@/types'

export interface MapProviderProps {
  hazards?: Hazard[]
  roads?: Road[]
  selectedRoadId?: number | null
  onMarkerClick?: (hazard: Hazard) => void
  onRoadClick?: (road: Road) => void
  center?: [number, number]
  zoom?: number
  className?: string
  showRoads?: boolean
  showHazards?: boolean
  showHotspots?: boolean
  showReports?: boolean
}

const PROVIDER = import.meta.env.VITE_MAP_PROVIDER ?? 'leaflet'
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const LeafletMap = lazy(() => import('./LeafletMap'))

export default function MapProvider(props: MapProviderProps) {
  // If Google Maps is selected but no key is configured, gracefully fall back to Leaflet/OSM
  if (PROVIDER === 'google' && !GOOGLE_KEY) {
    console.warn('[MapProvider] Google Maps key not configured. Falling back to OpenStreetMap / Leaflet.')
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 bg-navy-800 rounded-lg text-gray-400 text-sm">
          Loading OpenStreetMap tiles…
        </div>
      }
    >
      <LeafletMap {...props} />
    </Suspense>
  )
}
