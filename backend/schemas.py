"""
SafeCity Loop — Pydantic Schemas
Response models for all API endpoints.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


# ── Road ──────────────────────────────────────────────────────────────────────

class RoadBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    risk_score: float
    safe_city_score: float
    traffic_exposure: str
    vulnerability: str
    status: str

class RoadOut(RoadBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── Hazard ────────────────────────────────────────────────────────────────────

class HazardBase(BaseModel):
    road_id: int
    type: str
    severity: str
    confidence: float
    risk_score: float
    latitude: float
    longitude: float
    detected_at: datetime
    status: str

class HazardOut(HazardBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── NearMiss ──────────────────────────────────────────────────────────────────

class NearMissBase(BaseModel):
    junction_id: Optional[int]
    timestamp: datetime
    object_types: List[str]
    ttc: Optional[float]
    risk_level: str
    conflict_zone: Optional[str]

class NearMissOut(NearMissBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── Junction ──────────────────────────────────────────────────────────────────

class JunctionBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    risk_score: float
    camera_id: Optional[str]
    status: str

class JunctionOut(JunctionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    near_misses: List[NearMissOut] = []


# ── Repair ────────────────────────────────────────────────────────────────────

class RepairBase(BaseModel):
    road_id: int
    priority: int
    reason: Optional[str]
    status: str
    assigned_to: Optional[str]
    before_risk: Optional[float]
    after_risk: Optional[float]

class RepairOut(RepairBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    road: Optional[RoadOut] = None
    created_at: datetime


# ── Intervention ──────────────────────────────────────────────────────────────

class InterventionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    road_id: Optional[int]
    name: str
    type: Optional[str]
    before_risk: Optional[float]
    after_risk: Optional[float]
    before_near_misses: int
    after_near_misses: int
    implemented_at: Optional[datetime]
    notes: Optional[str]


# ── CitizenReport ─────────────────────────────────────────────────────────────

class CitizenReportCreate(BaseModel):
    reporter_name: Optional[str] = None
    type: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: str = "MEDIUM"
    photo_url: Optional[str] = None

class CitizenReportOut(CitizenReportCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_code: Optional[str] = None
    status: str
    submitted_at: datetime



# ── Dashboard ─────────────────────────────────────────────────────────────────

class KPIStats(BaseModel):
    roads_monitored: int
    high_risk_roads: int
    potholes_detected: int
    near_misses: int
    danger_zones: int
    pending_repairs: int

class AIEvent(BaseModel):
    time: str
    event: str
    type: str           # pothole / near-miss / danger-zone / repair
    severity: Optional[str] = None

class DashboardOut(BaseModel):
    kpi: KPIStats
    recent_events: List[AIEvent]
    top_repairs: List[RepairOut]
    interventions: List[InterventionOut]


# ── DangerZone ────────────────────────────────────────────────────────────────

class DangerZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    latitude: float
    longitude: float
    risk_score: float
    hazard_count: int
    near_miss_count: int
    status: str


# ── AI Vision: Pothole Detection ──────────────────────────────────────────────

class BoundingBoxOut(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float

class PotholeDetectionItemOut(BaseModel):
    box: BoundingBoxOut
    confidence: float
    class_name: str
    severity: str
    risk_score: float
    is_demo: bool = False

class PotholeAnalysisOut(BaseModel):
    is_demo_mode: bool
    model_status: str
    status_message: str
    model_path: str
    pothole_count: int
    confidence: float
    severity: str
    risk_score: float
    risk_formula: str
    detections: List[PotholeDetectionItemOut]
    original_image_url: str
    processed_image_url: str
    hazard_id: Optional[int] = None
    road_id: Optional[int] = None
    road_name: Optional[str] = None


# ── AI Vision: Traffic Analysis ───────────────────────────────────────────────

class TrafficConflictDetailOut(BaseModel):
    conflict_id: str
    timestamp_str: str
    timestamp_seconds: float
    object_types: List[str]
    track_ids: List[int]
    ttc: float
    risk_level: str
    conflict_zone: str
    frame_index: int
    snapshot_url: Optional[str] = None

class TrafficAnalysisOut(BaseModel):
    is_demo_mode: bool
    model_status: str
    status_message: str
    junction_id: Optional[int]
    junction_name: Optional[str] = None
    duration_seconds: float
    total_frames: int
    processed_frames: int
    tracked_objects_count: int
    object_class_counts: Dict[str, int]
    near_miss_count: int
    near_misses: List[TrafficConflictDetailOut]
    original_video_url: str
    processed_video_url: Optional[str]
    conflict_snapshots: List[str]
    created_near_miss_ids: List[int] = []


class AIModelStatusOut(BaseModel):
    pothole_model_path: str
    pothole_model_loaded: bool
    traffic_model_path: str
    traffic_model_loaded: bool
    is_pothole_demo_mode: bool
    is_traffic_demo_mode: bool
    message: str


# ── Road Safety Intelligence Layer ────────────────────────────────────────────

class SafeCityFactorsOut(BaseModel):
    pothole_risk: str
    junction_risk: str
    traffic_exposure: str
    pedestrian_exposure: str
    pothole_score: float
    junction_score: float
    traffic_score: float
    vulnerability_score: float
    report_count: int

class RoadSafetyEvaluationOut(BaseModel):
    road_id: int
    road_name: str
    danger_zone_score: float
    danger_zone_classification: str
    safe_city_score: float
    factors: SafeCityFactorsOut
    disclaimer: str

class PrioritizedRepairItemOut(BaseModel):
    road_id: int
    road_name: str
    repair_id: Optional[int] = None
    priority_level: str
    priority_rank: int
    urgency_score: float
    hazard_summary: str
    risk_score: float
    status: str
    assigned_to: Optional[str] = None
    reasons: List[str]
    created_at: Optional[str] = None

class RepairStatusUpdate(BaseModel):
    status: str                  # New / Verified / High Priority / Assigned / Under Repair / Completed
    assigned_to: Optional[str] = None

class RouteWaypointOut(BaseModel):
    latitude: float
    longitude: float
    name: str
    road_id: Optional[int] = None
    risk_score: float

class RouteOptionOut(BaseModel):
    route_type: str
    route_key: str
    distance_km: float
    time_minutes: float
    pothole_risk: str
    junction_risk: str
    overall_calculated_risk: float
    risk_classification: str
    description: str
    waypoints: List[RouteWaypointOut]

class RouteComparisonResultOut(BaseModel):
    origin_name: str
    destination_name: str
    routes: List[RouteOptionOut]
    neutral_advisory: str

class JunctionSimulationRequest(BaseModel):
    conflict_type: str = "pedestrian-vehicle"  # pedestrian-vehicle / vehicle-vehicle / reset
    ttc: float = 1.3
    risk_level: str = "HIGH"

class SmartJunctionDisplayStateOut(BaseModel):
    junction_id: int
    junction_name: str
    display_mode: str            # NORMAL / CAUTION / HIGH RISK
    signal_state: str            # RED / AMBER / GREEN
    countdown_seconds: int
    pedestrian_warning: bool
    road_hazard_warning: bool
    ai_risk_state: str           # e.g. "HIGH RISK — PEDESTRIAN–VEHICLE CONFLICT — SLOW DOWN"
    risk_score: float
    active_near_misses_count: int
    recent_conflict: Optional[TrafficConflictDetailOut] = None

