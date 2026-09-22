import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-navy-950 text-white selection:bg-accent selection:text-white font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-accent/20">
            SC
          </div>
          <div>
            <div className="text-white font-extrabold text-base tracking-tight leading-none">SafeCity Loop</div>
            <div className="text-gray-400 text-[10px] mt-0.5 font-medium">Urban Road Safety Platform V2</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs text-gray-300 font-medium">
          <a href="#problem" className="hover:text-accent transition-colors">Problem</a>
          <a href="#solution" className="hover:text-accent transition-colors">Solution</a>
          <a href="#ai-engine" className="hover:text-accent transition-colors">AI Engine</a>
          <a href="#smart-junction" className="hover:text-accent transition-colors">Smart Junction</a>
          <a href="#navigation" className="hover:text-accent transition-colors">Safe Navigation</a>
          <a href="#intelligence" className="hover:text-accent transition-colors">Municipal Intelligence</a>
          <a href="#impact" className="hover:text-accent transition-colors">Impact</a>
          <a href="#tech" className="hover:text-accent transition-colors">Technology</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-primary text-xs py-2 px-4 font-bold shadow-lg shadow-accent/20"
          >
            Launch Command Center →
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6 text-center">
        {/* Background glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-accent/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            SAFECITY LOOP V2 — AI ROAD SAFETY PLATFORM
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-4">
            SAFECITY LOOP
          </h1>

          <p className="text-xl sm:text-2xl font-bold text-accent mb-4">
            AI-powered intelligence for safer roads.
          </p>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            Detect hazards. Predict danger. Prioritize action. Guide safer journeys. Measure impact.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl bg-accent hover:bg-blue-500 text-white font-black text-sm tracking-wide shadow-xl shadow-accent/25 transition-all transform hover:-translate-y-0.5"
            >
              Launch Command Center ⬡
            </button>
            <button
              onClick={() => navigate('/ai-vision')}
              className="px-6 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 border border-gray-700 text-white font-bold text-sm transition-all"
            >
              Try AI Road Scan 👁
            </button>
          </div>

          {/* Workflow Tagline Ribbon */}
          <div className="mt-14 pt-8 border-t border-gray-800/80 flex items-center justify-center gap-2 overflow-x-auto text-xs font-mono text-gray-400">
            {['DETECT', 'ANALYZE', 'PREDICT', 'PRIORITIZE', 'PREVENT', 'REPAIR', 'MEASURE'].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2 flex-shrink-0">
                <span className="text-accent bg-navy-900 border border-accent/30 px-2 py-1 rounded-lg font-bold">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-gray-600">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 1. Problem Section */}
      <section id="problem" className="py-16 px-6 bg-navy-900/60 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest mb-2">1. The Challenge</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Urban Roads Are Dangerously Reactive</h3>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto mt-2">
              Cities currently wait for catastrophic accidents or angry complaints before inspecting road hazards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card p-5 border border-red-900/40 bg-navy-950/60">
              <div className="text-2xl mb-3">💥</div>
              <h4 className="text-base font-bold text-white mb-2">Delayed Hazard Discovery</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Potholes and asphalt fissures remain undetected for months until suspension damage or vehicle crashes occur.
              </p>
            </div>
            <div className="card p-5 border border-red-900/40 bg-navy-950/60">
              <div className="text-2xl mb-3">⚡</div>
              <h4 className="text-base font-bold text-white mb-2">Invisible Near Misses</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Intersections witness dozens of near-collision events daily that are never recorded until a fatal collision strikes.
              </p>
            </div>
            <div className="card p-5 border border-red-900/40 bg-navy-950/60">
              <div className="text-2xl mb-3">📋</div>
              <h4 className="text-base font-bold text-white mb-2">Arbitrary Repair Backlogs</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Municipal maintenance queues are ordered by squeaky wheels and paperwork rather than composite risk intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Solution Section */}
      <section id="solution" className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-2">2. The Solution</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">The SafeCity Closed-Loop Platform</h3>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto mt-2">
              A unified pipeline that bridges optical edge AI, geospatial risk modelling, and municipal dispatch into a continuous feedback loop.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-navy-900 border border-gray-800">
              <div className="text-accent font-mono font-bold text-xs mb-1">STAGE 01</div>
              <h4 className="text-sm font-bold text-white mb-1">Real-Time AI Scan</h4>
              <p className="text-xs text-gray-400">YOLOv8 detects potholes and ByteTrack tracks near misses at junctions.</p>
            </div>
            <div className="p-4 rounded-xl bg-navy-900 border border-gray-800">
              <div className="text-accent font-mono font-bold text-xs mb-1">STAGE 02</div>
              <h4 className="text-sm font-bold text-white mb-1">Danger Zone Score</h4>
              <p className="text-xs text-gray-400">Synthesizes potholes, traffic load, vulnerability, and incident history.</p>
            </div>
            <div className="p-4 rounded-xl bg-navy-900 border border-gray-800">
              <div className="text-accent font-mono font-bold text-xs mb-1">STAGE 03</div>
              <h4 className="text-sm font-bold text-white mb-1">Prioritized Action</h4>
              <p className="text-xs text-gray-400">Explainable AI ranks repair orders and warns drivers via roadside displays.</p>
            </div>
            <div className="p-4 rounded-xl bg-navy-900 border border-gray-800">
              <div className="text-accent font-mono font-bold text-xs mb-1">STAGE 04</div>
              <h4 className="text-sm font-bold text-white mb-1">Impact Analytics</h4>
              <p className="text-xs text-gray-400">Verifies before/after risk drops to ensure civic investments save lives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI Engine */}
      <section id="ai-engine" className="py-16 px-6 bg-navy-900/60 border-t border-gray-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-2">3. AI Vision Engine</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Local Computer Vision Without Cloud Latency
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
              SafeCity Loop executes local inference with Ultralytics YOLOv8. It never requires third-party cloud AI APIs,
              protecting citizen privacy and running on municipal edge servers.
            </p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-center gap-2"><span className="text-emerald-400 font-bold">✓</span> YOLOv8 Pothole detection with bounding boxes, area calculation & severity</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400 font-bold">✓</span> ByteTrack object trajectory tracking across vehicles, pedestrians & cyclists</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400 font-bold">✓</span> Time-To-Collision (TTC &lt; 2.0s) physical kinematics collision detection</li>
            </ul>
            <button onClick={() => navigate('/ai-vision')} className="btn-primary text-xs mt-6">
              Test AI Vision Pipeline →
            </button>
          </div>
          <div className="p-5 bg-navy-950 rounded-2xl border border-gray-800 shadow-2xl">
            <div className="text-xs font-mono text-gray-400 mb-2 border-b border-gray-800 pb-2">AI Inference Console</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="text-gray-500">// Processing School_Road_Survey.jpg</div>
              <div className="text-emerald-400">✓ YOLOv8 Model: Loaded (local CPU/GPU)</div>
              <div className="text-accent">→ Pothole detected [BBox: (124, 210, 480, 360)]</div>
              <div className="text-white">→ Confidence: 92.4% | Severity: CRITICAL</div>
              <div className="text-red-400">→ Calculated Risk: 85.0/100</div>
              <div className="text-emerald-400">✓ Database Synchronized: Hazard #21 Created</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Smart Junction */}
      <section id="smart-junction" className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1 p-6 bg-black rounded-2xl border-2 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center">
            <div className="text-3xl font-black text-red-500 uppercase tracking-tight mb-1">🚨 HIGH RISK JUNCTION</div>
            <div className="text-base font-bold text-white uppercase mb-2">PEDESTRIAN CONFLICT DETECTED</div>
            <div className="text-xl font-mono font-black text-red-300">SLOW DOWN — 14s COUNTDOWN</div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest mb-2">4. Smart Junction</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Intelligent Roadside Warning System
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
              When near misses occur, our roadside billboard interface immediately switches to high-visibility warning modes,
              alerting approaching drivers in real-time before accidents happen.
            </p>
            <button onClick={() => navigate('/junction-display')} className="px-4 py-2 rounded-lg bg-navy-800 border border-red-500/40 text-red-400 font-bold text-xs hover:bg-navy-700">
              Open Roadside Billboard Mode →
            </button>
          </div>
        </div>
      </section>

      {/* 5. Safe Navigation */}
      <section id="navigation" className="py-16 px-6 bg-navy-900/60 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-2">5. Safer Navigation</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Neutral Advisory Route Guidance</h3>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto mt-2">
              We empower drivers with neutral risk comparisons without forcing selections. Commuters choose between fastest vs lower-risk alternatives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-navy-950 border border-red-900/50">
              <span className="text-xs font-bold text-red-400 uppercase font-mono">Fastest Route (Direct Arterial)</span>
              <div className="text-2xl font-black text-white mt-1">1.3 km · 2.9 min</div>
              <div className="text-xs text-red-400 font-mono font-bold mt-1">Overall Calculated Risk: 92.8/100</div>
              <p className="text-xs text-gray-400 mt-2">Crosses School Road critical pothole cluster and Market Junction North.</p>
            </div>
            <div className="p-5 rounded-xl bg-navy-950 border border-emerald-900/50">
              <span className="text-xs font-bold text-emerald-400 uppercase font-mono">Lower-Risk Route (-62% Risk)</span>
              <div className="text-2xl font-black text-white mt-1">1.59 km · 3.7 min</div>
              <div className="text-xs text-emerald-400 font-mono font-bold mt-1">Overall Calculated Risk: 35.3/100</div>
              <p className="text-xs text-gray-400 mt-2">Bypasses hazard zones via signalized perimeter avenues. 48s additional time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Municipal Intelligence */}
      <section id="intelligence" className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-2">6. Municipal Intelligence</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Explainable AI Repair Prioritization
          </h3>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-8">
            The RepairDecisionEngine generates transparent, human-readable rationales for why maintenance work orders are ranked #1, #2, or #3.
          </p>
          <button onClick={() => navigate('/repair')} className="btn-primary text-xs py-2 px-5">
            View Municipal Repair Queue →
          </button>
        </div>
      </section>

      {/* 7. Impact Section */}
      <section id="impact" className="py-16 px-6 bg-navy-900/60 border-t border-gray-800">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-2">7. Verifiable Impact</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
            Measuring Safety Gains Before & After
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-8">
            <div className="card p-4">
              <div className="text-3xl font-black font-mono text-emerald-400">-61.8%</div>
              <div className="text-xs text-gray-400 mt-1">Avg Risk Drop</div>
            </div>
            <div className="card p-4">
              <div className="text-3xl font-black font-mono text-white">5 Roads</div>
              <div className="text-xs text-gray-400 mt-1">Interventions Verified</div>
            </div>
            <div className="card p-4">
              <div className="text-3xl font-black font-mono text-accent">14 → 3</div>
              <div className="text-xs text-gray-400 mt-1">Near Misses Reduced</div>
            </div>
            <div className="card p-4">
              <div className="text-3xl font-black font-mono text-purple-400">100%</div>
              <div className="text-xs text-gray-400 mt-1">Audit Trail Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Technology Section */}
      <section id="tech" className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-xs font-mono font-bold text-accent uppercase tracking-widest mb-2">8. Architecture & Tech Stack</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-8">Built with Modern High-Performance Tools</h3>
          <div className="flex flex-wrap justify-center gap-3 text-xs font-mono">
            {['React 18', 'TypeScript', 'Tailwind CSS', 'Vite', 'FastAPI', 'Python 3.14', 'SQLite ORM', 'Leaflet', 'Recharts', 'Ultralytics YOLOv8', 'ByteTrack', 'TanStack Query'].map((tech) => (
              <span key={tech} className="px-3 py-1.5 rounded-lg bg-navy-900 border border-gray-800 text-gray-300">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-12 px-6 border-t border-gray-800 bg-navy-950 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-xl font-bold text-white">Ready to explore the Command Center?</h3>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/')} className="btn-primary text-xs py-2 px-5">
              Launch Command Center →
            </button>
            <button onClick={() => navigate('/privacy')} className="px-4 py-2 rounded-lg bg-navy-900 border border-gray-800 text-gray-400 hover:text-white text-xs">
              Privacy & Ethics
            </button>
          </div>
          <div className="text-xs text-gray-500 pt-6">
            SafeCity Loop V2 · Prototype Platform · Built for Hackathon Excellence
          </div>
        </div>
      </footer>
    </div>
  )
}

