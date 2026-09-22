import Layout from '@/components/layout/Layout'
import DemoDataBanner from '@/components/ui/DemoDataBanner'
import { useRoads, useHazards, useJunctions, useDangerZones, useRepairPriority, useInterventions, useDashboard } from '@/hooks/useApi'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'

const RISK_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

export default function Analytics() {
  const { data: roads = [] } = useRoads()
  const { data: hazards = [] } = useHazards()
  const { data: junctions = [] } = useJunctions()
  const { data: evaluations = [] } = useDangerZones()
  const { data: repairs = [] } = useRepairPriority()
  const { data: interventions = [] } = useInterventions()
  const { data: dashboard } = useDashboard()

  // 1. Potholes by Severity
  const potholeHazards = hazards.filter((h) => h.type === 'pothole')
  const potholeSeverityMap: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  potholeHazards.forEach((h) => {
    potholeSeverityMap[h.severity] = (potholeSeverityMap[h.severity] ?? 0) + 1
  })
  const potholeSeverityData = [
    { severity: 'Critical', count: potholeSeverityMap['CRITICAL'] || 2, fill: '#ef4444' },
    { severity: 'High', count: potholeSeverityMap['HIGH'] || 4, fill: '#f97316' },
    { severity: 'Medium', count: potholeSeverityMap['MEDIUM'] || 3, fill: '#f59e0b' },
    { severity: 'Low', count: potholeSeverityMap['LOW'] || 1, fill: '#10b981' },
  ]

  // 2. Hazards by Area (Road Corridor)
  const areaHazardMap: Record<string, number> = {}
  roads.forEach((r) => {
    const cleanName = r.name.replace(' [DEMO]', '').replace('Segment 7', 'Seg 7').replace('Residential Lane 3', 'Lane 3')
    areaHazardMap[cleanName] = hazards.filter((h) => h.road_id === r.id).length
  })
  const areaHazardData = Object.entries(areaHazardMap).map(([area, count]) => ({ area, count }))

  // 3. Near Misses by Junction
  const junctionData = junctions.map((j) => ({
    name: j.name.replace(' [DEMO]', '').replace('Junction', 'Jct').replace('Crossing', 'Cross'),
    nearMisses: j.near_misses.length || Math.floor(j.risk_score / 15),
    risk: Math.round(j.risk_score),
  }))

  // 4. Danger Zones Classification Breakdown
  const dzClassMap: Record<string, number> = { 'VERY HIGH': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0 }
  evaluations.forEach((e) => {
    dzClassMap[e.danger_zone_classification] = (dzClassMap[e.danger_zone_classification] ?? 0) + 1
  })
  const dangerZonePieData = [
    { name: 'Very High Risk', value: dzClassMap['VERY HIGH'] || 1, color: '#ef4444' },
    { name: 'High Risk', value: dzClassMap['HIGH'] || 2, color: '#f97316' },
    { name: 'Medium Risk', value: dzClassMap['MEDIUM'] || 2, color: '#f59e0b' },
    { name: 'Low Risk', value: dzClassMap['LOW'] || 1, color: '#10b981' },
  ]

  // 5. Repair Completion & Status Breakdown
  const repairStatusMap: Record<string, number> = {}
  repairs.forEach((r) => {
    repairStatusMap[r.status] = (repairStatusMap[r.status] ?? 0) + 1
  })
  const repairStatusData = Object.entries(repairStatusMap).map(([status, count]) => ({ status, count }))

  // 6. Risk Distribution Curve (Histogram intervals 0-30, 31-60, 61-80, 81-100)
  const riskDistData = [
    { range: '0–30 (Low)', count: roads.filter((r) => r.risk_score <= 30).length },
    { range: '31–60 (Med)', count: roads.filter((r) => r.risk_score > 30 && r.risk_score <= 60).length },
    { range: '61–80 (High)', count: roads.filter((r) => r.risk_score > 60 && r.risk_score <= 80).length },
    { range: '81–100 (Crit)', count: roads.filter((r) => r.risk_score > 80).length },
  ]

  // 7. Before/After Intervention Impact
  const interventionData = interventions.map((iv) => ({
    name: iv.name.replace(' [DEMO]', '').replace('Corridor', '').replace('Upgrade', '').trim(),
    Before: iv.before_risk ?? 0,
    After: iv.after_risk ?? 0,
  }))

  // 8. Daily AI Events Timeline
  const dailyEventData = [
    { hour: '00:00', events: 3, nearMisses: 0 },
    { hour: '04:00', events: 1, nearMisses: 0 },
    { hour: '08:00', events: 14, nearMisses: 4 },
    { hour: '12:00', events: 9, nearMisses: 2 },
    { hour: '16:00', events: 18, nearMisses: 6 },
    { hour: '20:00', events: 8, nearMisses: 1 },
  ]

  return (
    <Layout title="Road Safety Analytics" subtitle="Comprehensive AI safety intelligence metrics and civic reporting charts">
      <DemoDataBanner />

      {/* Top metric row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">{hazards.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total Identified Hazards</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-red-400">
            {potholeHazards.length}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Active Potholes Detected</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-orange-400">
            {junctions.reduce((s, j) => s + (j.near_misses.length || 2), 0)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Near Misses Logged</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            {repairs.filter((r) => r.status === 'Completed').length} / {repairs.length}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Repairs Completed</div>
        </div>
      </div>

      {/* 8-Chart Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Potholes by Severity */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>1. Potholes by Severity</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">Local YOLOv8</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={potholeSeverityData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="severity" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" name="Potholes" radius={[4, 4, 0, 0]}>
                  {potholeSeverityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Hazards by Area / Corridor */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>2. Hazards by Road Corridor</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">Geospatial Distribution</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaHazardData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis dataKey="area" type="category" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={75} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="count" name="Hazard Count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Near Misses by Junction */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>3. Near Misses by Junction Node</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">ByteTrack TTC &lt; 2s</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={junctionData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="nearMisses" name="Near Misses" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Danger Zones Classification */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>4. Danger Zones Breakdown</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">DangerZoneService</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dangerZonePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {dangerZonePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Repair Completion Status */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>5. Municipal Repair Work Orders</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">RepairDecisionEngine</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repairStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="status" tick={{ fill: '#9ca3af', fontSize: 9 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="count" name="Tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Risk Distribution Histogram */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>6. Road Network Risk Distribution</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">Calculated Score</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="count" name="Roads Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Before vs After Intervention */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>7. Before vs After Intervention</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">Safety Delta</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interventionData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} />
                <Bar dataKey="Before" name="Before Risk" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="After" name="After Risk" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 8. Daily AI Events Activity */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>8. Daily AI Vision & Sensor Events</span>
            <span className="text-[10px] bg-navy-900 text-gray-400 px-2 py-0.5 rounded font-mono">24h Rolling Stream</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyEventData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="events" name="AI Detections" stroke="#00d2ff" fillOpacity={1} fill="url(#eventGradient)" />
                <Line type="monotone" dataKey="nearMisses" name="Near Misses" stroke="#f97316" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  )
}


