import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'

export default function Privacy() {
  return (
    <Layout title="Privacy & Data Ethics" subtitle="Production architecture, data governance, and edge security blueprint">
      <DemoDataBanner />

      <div className="max-w-4xl space-y-6">
        {/* Prototype Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-300 text-xs leading-relaxed flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🛡</span>
          <div>
            <h3 className="font-bold text-amber-200 text-sm mb-1">
              Hackathon Prototype Disclaimer — Not Production Deployed
            </h3>
            <p>
              SafeCity Loop V2 is an interactive architectural prototype demonstrated using synthetic data [DEMO], local models,
              and mock municipal camera feeds. It does <strong>NOT claim to be a deployed production system</strong>.
              A real-world civic deployment would mandate the rigorous privacy, legal, and operational infrastructure detailed below.
            </p>
          </div>
        </div>

        {/* 6 Essential Production Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Face & License Plate Redaction */}
          <div className="card border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎭</span>
              <h4 className="text-sm font-bold text-white">1. Face & License Plate Blurring at Edge</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              In production, cameras execute an on-device automated anonymization pass before any frames are written or transmitted.
              Automated blurring (using lightweight edge models like SCRFD or YOLOv8-face/plate) strips personally identifiable information (PII)
              at the hardware capture level.
            </p>
          </div>

          {/* 2. Edge Processing */}
          <div className="card border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <h4 className="text-sm font-bold text-white">2. Edge Processing & Zero-Stream Storage</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Video streams should not be streamed in bulk to central servers. Edge devices (NVIDIA Jetson / municipal micro-servers)
              compute kinematics and collision vectors locally. Only aggregate numerical metadata (e.g. `vehicle_count: 3`, `ttc: 1.4s`)
              leaves the junction node.
            </p>
          </div>

          {/* 3. Secure Storage */}
          <div className="card border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔒</span>
              <h4 className="text-sm font-bold text-white">3. Encrypted Storage at Rest and in Transit</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              All spatial coordinates, citizen reports, and maintenance records must be encrypted using AES-256 at rest and TLS 1.3 in transit.
              Databases require municipal key management services (KMS) with hardware security modules (HSM).
            </p>
          </div>

          {/* 4. Access Control */}
          <div className="card border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔑</span>
              <h4 className="text-sm font-bold text-white">4. Role-Based Access Control (RBAC)</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Citizen reporters submit anonymous hazards without tracking cookies. Municipal engineers access work-order dispatch.
              Traffic enforcement and law enforcement are strictly decoupled to maintain public trust and civic safety focus.
            </p>
          </div>

          {/* 5. Data Retention */}
          <div className="card border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⏳</span>
              <h4 className="text-sm font-bold text-white">5. Ephemeral Data Retention Policies</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Near-miss visual clips are stored in a rolling circular buffer for a maximum of 72 hours solely for model validation
              and incident dispute resolution, after which raw optical media is automatically purged. Only anonymized numerical telemetry is retained.
            </p>
          </div>

          {/* 6. Legal & Regulatory */}
          <div className="card border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📜</span>
              <h4 className="text-sm font-bold text-white">6. GDPR & Civic Privacy Compliance</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Compliant with UK GDPR, EU AI Act requirements for high-risk infrastructure AI, and US municipal surveillance oversight ordinances.
              Periodic external algorithmic bias audits ensure equitable repair prioritization across all socio-economic zones.
            </p>
          </div>
        </div>

        {/* Prototype Verification Note */}
        <div className="card bg-navy-900/50 border border-gray-800 text-xs text-gray-400 space-y-2">
          <div className="font-semibold text-white">Prototype Compliance Verification:</div>
          <div>• Zero biometric or facial tracking features exist in this codebase.</div>
          <div>• YOLOv8 inference runs strictly on the local machine with no external network telemetry.</div>
          <div>• All coordinates in the prototype use synthetic public road centerlines.</div>
        </div>
      </div>
    </Layout>
  )
}

