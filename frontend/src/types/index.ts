// SafeCity Loop — TypeScript Types & Interfaces

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TrafficExposure = 'LOW' | 'MEDIUM' | 'HIGH'
export type RoadStatus = 'monitored' | 'at-risk' | 'pending-repair' | 'repaired'
export type HazardType = 'pothole' | 'near-miss' | 'dangerous-junction' | 'road-work' | 'high-risk-zone'
export type RepairStatus = 'pending' | 'in-progress' | 'completed'

export interface Road {
  id: number
  name: string
  latitude: number
  longitude: number
  risk_score: number
  safe_city_score: number
  traffic_exposure: TrafficExposure
  vulnerability: string
  status: RoadStatus
}

export interface Hazard {
  id: number
  road_id: number
  type: HazardType
  severity: RiskLevel
  confidence: number
  risk_score: number
  latitude: number
  longitude: number
  detected_at: string
  status: string
}

export interface NearMiss {
  id: number
  junction_id: number | null
  timestamp: string
  object_types: string[]
  ttc: number | null
  risk_level: RiskLevel
  conflict_zone: string | null
}

export interface Junction {
  id: number
  name: string
  latitude: number
  longitude: number
  risk_score: number
  camera_id: string | null
  status: string
  near_misses: NearMiss[]
}

export interface Repair {
  id: number
  road_id: number
  priority: number
  reason: string | null
  status: RepairStatus
  assigned_to: string | null
  before_risk: number | null
  after_risk: number | null
  created_at: string
  road?: Road
}

export interface Intervention {
  id: number
  road_id: number | null
  name: string
  type: string | null
  before_risk: number | null
  after_risk: number | null
  before_near_misses: number
  after_near_misses: number
  implemented_at: string | null
  notes: string | null
}

export interface CitizenReport {
  id: number
  report_code?: string
  reporter_name: string | null
  type: string
  description: string | null
  latitude: number | null
  longitude: number | null
  severity: RiskLevel
  photo_url?: string | null
  status: string
  submitted_at: string
}

export interface CitizenReportCreate {
  reporter_name?: string
  type: string
  description?: string
  latitude?: number
  longitude?: number
  severity?: RiskLevel
  photo_url?: string | null
}


export interface KPIStats {
  roads_monitored: number
  high_risk_roads: number
  potholes_detected: number
  near_misses: number
  danger_zones: number
  pending_repairs: number
}

export interface AIEvent {
  time: string
  event: string
  type: string
  severity?: string | null
}

export interface DashboardData {
  kpi: KPIStats
  recent_events: AIEvent[]
  top_repairs: Repair[]
  interventions: Intervention[]
}

export interface DangerZone {
  id: number
  name: string
  latitude: number
  longitude: number
  risk_score: number
  hazard_count: number
  near_miss_count: number
  status: string
}

// ── AI Vision Types ──────────────────────────────────────────────────────────

export interface BoundingBox {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  height: number
}

export interface PotholeDetectionItem {
  box: BoundingBox
  confidence: number
  class_name: string
  severity: RiskLevel
  risk_score: number
  is_demo: boolean
}

export interface PotholeAnalysisResult {
  is_demo_mode: boolean
  model_status: string
  status_message: string
  model_path: string
  pothole_count: number
  confidence: number
  severity: RiskLevel
  risk_score: number
  risk_formula: string
  detections: PotholeDetectionItem[]
  original_image_url: string
  processed_image_url: string
  hazard_id: number | null
  road_id: number | null
  road_name: string | null
}

export interface TrafficConflictDetail {
  conflict_id: string
  timestamp_str: string
  timestamp_seconds: number
  object_types: string[]
  track_ids: number[]
  ttc: number
  risk_level: RiskLevel
  conflict_zone: string
  frame_index: number
  snapshot_url: string | null
}

export interface TrafficAnalysisResult {
  is_demo_mode: boolean
  model_status: string
  status_message: string
  junction_id: number | null
  junction_name: string | null
  duration_seconds: number
  total_frames: number
  processed_frames: number
  tracked_objects_count: number
  object_class_counts: Record<string, number>
  near_miss_count: number
  near_misses: TrafficConflictDetail[]
  original_video_url: string
  processed_video_url: string | null
  conflict_snapshots: string[]
  created_near_miss_ids: number[]
}

export interface AIModelStatus {
  pothole_model_path: string
  pothole_model_loaded: boolean
  traffic_model_path: string
  traffic_model_loaded: boolean
  is_pothole_demo_mode: boolean
  is_traffic_demo_mode: boolean
  message: string
}

// ── Road Safety Intelligence Layer Types ─────────────────────────────────────

export interface SafeCityFactors {
  pothole_risk: string
  junction_risk: string
  traffic_exposure: string
  pedestrian_exposure: string
  pothole_score: number
  junction_score: number
  traffic_score: number
  vulnerability_score: number
  report_count: number
}

export interface RoadSafetyEvaluation {
  road_id: number
  road_name: string
  danger_zone_score: number
  danger_zone_classification: string // LOW / MEDIUM / HIGH / VERY HIGH
  safe_city_score: number
  factors: SafeCityFactors
  disclaimer: string
}

export type MunicipalRepairStatus = 'New' | 'Verified' | 'High Priority' | 'Assigned' | 'Under Repair' | 'Completed'

export interface PrioritizedRepairItem {
  road_id: number
  road_name: string
  repair_id: number | null
  priority_level: string // VERY HIGH / HIGH / MEDIUM / LOW
  priority_rank: number
  urgency_score: number
  hazard_summary: string
  risk_score: number
  status: MunicipalRepairStatus | string
  assigned_to: string | null
  reasons: string[]
  created_at: string | null
}

export interface RouteWaypoint {
  latitude: number
  longitude: number
  name: string
  road_id: number | null
  risk_score: number
}

export interface RouteOption {
  route_type: string
  route_key: 'fastest' | 'safer'
  distance_km: number
  time_minutes: number
  pothole_risk: string
  junction_risk: string
  overall_calculated_risk: number
  risk_classification: string
  description: string
  waypoints: RouteWaypoint[]
}

export interface RouteComparisonResult {
  origin_name: string
  destination_name: string
  routes: RouteOption[]
  neutral_advisory: string
}

export interface SmartJunctionDisplayState {
  junction_id: number
  junction_name: string
  display_mode: 'NORMAL' | 'CAUTION' | 'HIGH RISK'
  signal_state: 'RED' | 'AMBER' | 'GREEN'
  countdown_seconds: number
  pedestrian_warning: boolean
  road_hazard_warning: boolean
  ai_risk_state: string
  risk_score: number
  active_near_misses_count: number
  recent_conflict: TrafficConflictDetail | null
}

