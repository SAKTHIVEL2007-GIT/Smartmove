/**
 * MapProvider — Map abstraction layer
 * Reads VITE_MAP_PROVIDER env variable to select map implementation.
 * Currently supports: "leaflet" (default)
 * Stub ready for: "google" (Part 3)
 */
import { lazy, Suspense } from 'react'
import type { Hazard } from '@/types'

export interface MapProviderProps {
  hazards: Hazard[]
  center?: [number, number]
  zoom?: number
  onMarkerClick?: (hazard: Hazard) => void
  className?: string
}

const PROVIDER = import.meta.env.VITE_MAP_PROVIDER ?? 'leaflet'

// Dynamic import based on provider
const LeafletMap = lazy(() => import('./LeafletMap'))
// GoogleMap would be: const GoogleMap = lazy(() => import('./GoogleMap'))

export default function MapProvider(props: MapProviderProps) {
  if (PROVIDER === 'google') {
    // Placeholder — implement GoogleMap in Part 3
    return (
      <div className="flex items-center justify-center h-64 bg-navy-700 rounded-lg text-gray-400 text-sm">
        Google Maps provider — set VITE_GOOGLE_MAPS_API_KEY and implement GoogleMap.tsx
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 bg-navy-700 rounded-lg text-gray-400 text-sm">
          Loading map…
        </div>
      }
    >
      <LeafletMap {...props} />
    </Suspense>
  )
}
