import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Overview from '@/pages/Overview'
import SafeCityMap from '@/pages/SafeCityMap'
import AIVision from '@/pages/AIVision'
import DangerZones from '@/pages/DangerZones'
import RepairIntelligence from '@/pages/RepairIntelligence'
import SaferRoutes from '@/pages/SaferRoutes'
import SmartJunction from '@/pages/SmartJunction'
import DigitalTwin from '@/pages/DigitalTwin'
import Analytics from '@/pages/Analytics'
import CitizenReports from '@/pages/CitizenReports'
import InterventionImpact from '@/pages/InterventionImpact'
import Settings from '@/pages/Settings'
import LandingPage from '@/pages/LandingPage'
import SmartJunctionBillboard from '@/pages/SmartJunctionBillboard'
import RoadIntelligence from '@/pages/RoadIntelligence'
import TrafficConflicts from '@/pages/TrafficConflicts'
import EvidenceAudit from '@/pages/EvidenceAudit'
import Privacy from '@/pages/Privacy'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/road-intelligence" element={<RoadIntelligence />} />
        <Route path="/traffic-conflicts" element={<TrafficConflicts />} />
        <Route path="/evidence" element={<EvidenceAudit />} />
        <Route path="/map" element={<SafeCityMap />} />
        <Route path="/ai-vision" element={<AIVision />} />
        <Route path="/danger-zones" element={<DangerZones />} />
        <Route path="/repair" element={<RepairIntelligence />} />
        <Route path="/routes" element={<SaferRoutes />} />
        <Route path="/junction" element={<SmartJunction />} />
        <Route path="/junction-display" element={<SmartJunctionBillboard />} />
        <Route path="/digital-twin" element={<DigitalTwin />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<CitizenReports />} />
        <Route path="/interventions" element={<InterventionImpact />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </BrowserRouter>
  )
}

