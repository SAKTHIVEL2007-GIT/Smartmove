"""
SafeCity Loop V2 — Pydantic Schemas
Response and request models for all GovTech municipal intelligence endpoints.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


# ── Road / RoadSegment ────────────────────────────────────────────────────────

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
    road_type: Optional[str] = "urban_arterial"
    vulnerability_score: Optional[float] = 50.0
    importance_score: Optional[float] = 50.0
    risk_confidence: Optional[float] = 0.85
    data_coverage: Optional[float] = 75.0
    last_observed: Optional[datetime] = None
    geometry: Optional[List[List[float]]] = None


RoadSegmentOut = RoadOut


# ── Hazard / HazardObservation ────────────────────────────────────────────────

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
    gps_accuracy: Optional[float] = 4.5
    image_path: Optional[str] = None
    source: Optional[str] = "AI Vision"
    verified: Optional[bool] = False
    evidence_id: Optional[str] = None


HazardObservationOut = HazardOut


# ── NearMiss / ConflictEvent ──────────────────────────────────────────────────

class NearMissBase(BaseModel):
    junction_id: Optional[int] = None
    road_id: Optional[int] = None
    timestamp: datetime
    object_types: List[str]
    ttc: Optional[float] = None
    risk_level: str
    conflict_zone: Optional[str] = None


class NearMissOut(NearMissBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    video_id: Optional[str] = None
    object_type_a: Optional[str] = "vehicle"
    object_type_b: Optional[str] = "pedestrian"
    pet: Optional[float] = None
    minimum_distance: Optional[float] = 2.5
    event_severity: Optional[str] = "HIGH"
    evidence_clip: Optional[str] = None
    review_status: Optional[str] = "pending_review"


ConflictEventOut = NearMissOut


class ConflictReviewUpdate(BaseModel):
    review_status: str   # pending_review / reviewed / false_positive / actioned
    notes: Optional[str] = None


# ── Junction ──────────────────────────────────────────────────────────────────

class JunctionBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    risk_score: float
    camera_id: Optional[str] = None
    status: str = "active"


class JunctionOut(JunctionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    near_misses: List[NearMissOut] = []


# ── Repair / RepairRecord ─────────────────────────────────────────────────────

class RepairBase(BaseModel):
    road_id: int
    priority: int
    reason: Optional[str] = None
    status: str
    assigned_to: Optional[str] = None
    assigned_department: Optional[str] = "Municipal Public Works"
    recommended_action: Optional[str] = "Asphalt Resurfacing"
    approval_status: Optional[str] = "approved"
    before_score: Optional[float] = None
    after_score: Optional[float] = None


class RepairOut(RepairBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    road: Optional[RoadOut] = None
    repair_date: Optional[datetime] = None
    evidence_image: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


RepairRecordOut = RepairOut


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


class CitizenReportStatusUpdate(BaseModel):
    status: str  # Submitted / Under Review / Verified / Rejected / Converted to Hazard
    reviewer: Optional[str] = "Municipal Officer"
    notes: Optional[str] = None


class DecisionAuditOut(BaseModel):
    evidence_id: str
    source: str
    date: str
    location: str
    ai_result: str
    confidence: float
    reviewer: str
    decision: str
    status: str


# ── EvidenceFile & AuditLog ───────────────────────────────────────────────────

class EvidenceFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    evidence_code: str
    road_id: Optional[int] = None
    hazard_id: Optional[int] = None
    conflict_id: Optional[int] = None
    file_type: str
    file_url: str
    thumbnail_url: Optional[str] = None
    captured_at: datetime
    metadata_json: Dict[str, Any] = {}
    verified: bool = False
    notes: Optional[str] = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: datetime
    actor: str
    action: str
    target_type: str
    target_id: Optional[int] = None
    details: Optional[str] = None


# ── RiskSnapshots ─────────────────────────────────────────────────────────────

class RiskSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    road_id: int
    timestamp: datetime
    risk_score: float
    confidence: float
    data_coverage: float
    hazard_severity: float
    traffic_exposure: float
    conflict_evidence: float
    vulnerable_exposure: float
    persistence: float
    road_importance: float
    contributing_factors: Dict[str, Any] = {}


# ── Command Center Dashboard & KPIs ───────────────────────────────────────────

class KPIStats(BaseModel):
    roads_monitored: int
    high_concern_segments: int = 0
    high_risk_roads: int = 0
    active_hazards: int = 0
    potholes_detected: int = 0
    conflict_events: int = 0
    near_misses: int = 0
    danger_zones: int = 0
    pending_repairs: int = 0
    low_confidence_segments: int = 0
    completed_repairs: int = 0


CommandCenterKPIs = KPIStats


class RiskTrendPoint(BaseModel):
    date: str
    average_risk: float
    high_risk_count: int


class DataCoverageStats(BaseModel):
    high_coverage_count: int
    moderate_coverage_count: int
    low_coverage_count: int
    average_coverage_pct: float


class LegacyAIEvent(BaseModel):
    time: str
    event: str
    type: str


class AIEvent(BaseModel):
    id: Optional[str] = None
    type: str                      # "hazard" or "near_miss"
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = "MEDIUM"
    location: Optional[str] = None
    timestamp: Optional[datetime] = None
    risk_score: Optional[float] = 0.0
    image_url: Optional[str] = None
    time: Optional[str] = None
    event: Optional[str] = None


class DashboardOut(BaseModel):
    kpi: KPIStats
    recent_events: List[Any]
    top_repairs: List[RepairOut]
    interventions: List[InterventionOut]
    risk_trend: List[RiskTrendPoint] = []
    data_coverage_stats: Optional[DataCoverageStats] = None
    recent_conflicts: List[ConflictEventOut] = []


DashboardData = DashboardOut


# ── Road Intelligence Dossier ─────────────────────────────────────────────────

class DataQualityOut(BaseModel):
    last_observation: Optional[str]
    last_observation_hours_ago: float
    observation_count: int
    hazard_count: int
    conflict_count: int
    gps_accuracy_meters: float
    model_confidence: float
    confidence_tier: str
    data_freshness: str
    coverage_percentage: float
    coverage_tier: str
    quality_warning: Optional[str] = None
    audit_disclaimer: str


class ContributingFactorDetail(BaseModel):
    score: float
    weight: float
    weighted_contribution: float
    label: str


class RoadSegmentDossierOut(BaseModel):
    segment_id: int
    road_name: str
    road_type: str
    calculated_risk: float
    risk_score: Optional[float] = None
    safe_city_score: float
    classification: str
    is_danger_zone: bool
    confidence: float
    data_coverage: float
    traffic_exposure: str
    vulnerable_user_exposure: str
    repair_status: str
    suggested_intervention: str
    quality: DataQualityOut
    contributing_factors: Dict[str, ContributingFactorDetail]
    contributors_summary: Optional[List[Dict[str, Any]]] = []
    hazards: List[HazardOut]
    conflicts: List[ConflictEventOut]
    evidence_timeline: List[EvidenceFileOut]
    repairs: List[RepairOut]
    risk_history: List[RiskSnapshotOut]
    disclaimer: str


# ── AI Vision: Pothole & Traffic Analysis ─────────────────────────────────────

class PotholeDetectionBoundingBoxOut(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float


BoundingBoxOut = PotholeDetectionBoundingBoxOut


class PotholeDetectionItemOut(BaseModel):
    box: PotholeDetectionBoundingBoxOut
    confidence: float
    class_name: str
    severity: str
    risk_score: float
    is_demo: bool = False


class PotholeAnalysisOut(BaseModel):
    success: bool = True
    image_id: Optional[str] = None
    is_demo_mode: bool
    is_precomputed_demo: Optional[bool] = False
    model_status: str
    status_message: str
    model_path: str
    pothole_count: int
    detection_count: Optional[int] = 0
    confidence: float
    average_confidence: Optional[float] = 0.0
    processing_time_ms: Optional[int] = 0
    processing_time_sec: Optional[float] = 0.0
    visual_severity: Optional[str] = "HIGH"
    contextual_severity: Optional[str] = "HIGH"
    highest_severity: Optional[str] = "HIGH"
    traffic_exposure: Optional[str] = "HIGH"
    vulnerable_users: Optional[str] = "HIGH"
    persistence: Optional[str] = "MEDIUM"
    severity: str
    risk_score: float
    risk_confidence: Optional[str] = "HIGH"
    risk_formula: str
    detections: List[PotholeDetectionItemOut]
    original_image_url: str
    processed_image_url: str
    hazard_id: Optional[int] = None
    road_id: Optional[int] = None
    road_name: Optional[str] = None
    evidence_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_source: Optional[str] = "Location unavailable"
    gps_accuracy: Optional[float] = 2.5
    is_simulated_gps: Optional[bool] = False
    timestamp: Optional[str] = None
    disclaimer: Optional[str] = "AI detection confidence measures visual pattern recognition accuracy only; it does not represent collision probability. NO DATA ≠ SAFE ROAD."


class UniquePotholeTrackOut(BaseModel):
    pothole_id: int
    first_seen_timestamp: str
    last_seen_timestamp: str
    first_seen_seconds: float
    last_seen_seconds: float
    first_seen_frame: int
    last_seen_frame: int
    max_confidence: float
    average_confidence: float
    severity: str
    risk_score: float
    box: PotholeDetectionBoundingBoxOut
    snapshot_url: str
    frame_count: int


class PotholeVideoTimelineItemOut(BaseModel):
    pothole_id: int
    timestamp_str: str
    timestamp_seconds: float
    frame_index: int
    confidence: float
    severity: str
    snapshot_url: str


class VideoMetaOut(BaseModel):
    filename: str
    duration_seconds: float
    fps: float
    width: int
    height: int
    total_frames: int


class PotholeVideoAnalysisSummaryOut(BaseModel):
    frames_analyzed: int
    process_every_n_frames: int
    confidence_threshold: float
    unique_potholes: int
    total_detections: int
    max_confidence: float
    average_confidence: float
    high_severity_count: int = 0
    medium_severity_count: int = 0
    low_severity_count: int = 0


class PotholeVideoAnalysisOut(BaseModel):
    success: bool = True
    video_id: str
    is_demo_mode: bool
    model_status: str
    status_message: str
    model_path: str
    video: VideoMetaOut
    analysis: PotholeVideoAnalysisSummaryOut
    unique_potholes: List[UniquePotholeTrackOut]
    timeline: List[PotholeVideoTimelineItemOut]
    original_video_url: str
    processed_video_url: str
    road_id: Optional[int] = None
    road_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_source: Optional[str] = "GPS unavailable in uploaded video"
    created_hazard_ids: List[int] = []
    timestamp: Optional[str] = None
    disclaimer: Optional[str] = "AI pothole detection confidence measures visual pattern recognition accuracy only. Deduplication performed via spatial-temporal tracking."


class TrafficConflictDetailOut(BaseModel):
    conflict_id: str
    timestamp_str: str
    timestamp_seconds: float
    object_type_a: Optional[str] = "vehicle"
    object_type_b: Optional[str] = "pedestrian"
    object_types: List[str]
    track_ids: List[int]
    ttc: float
    pet: Optional[float] = None
    minimum_distance: Optional[float] = 2.5
    risk_level: str
    event_severity: Optional[str] = "HIGH"
    conflict_zone: str
    direction: Optional[str] = None
    frame_index: int
    confidence: Optional[float] = 0.88
    snapshot_url: Optional[str] = None
    review_status: Optional[str] = "pending_review"
    disclaimer: Optional[str] = "Approximate monocular surrogate safety estimate. Potential traffic conflict."


class ConflictHotspotOut(BaseModel):
    corridor_id: int
    corridor_name: str
    location_type: str            # "Corridor" or "Junction"
    conflict_count: int
    peak_period: str              # e.g. "5:00 PM – 8:00 PM"
    primary_interaction: str      # e.g. "Motorcycle ⟷ Pedestrian"
    calculated_concern: str       # "VERY HIGH", "HIGH", "MODERATE"
    data_confidence: str          # "HIGH", "MEDIUM", "LOW"
    mean_ttc: float               # e.g. 1.25s
    label: str = "Recurring Conflict Hotspot"


class TrafficAnalysisOut(BaseModel):
    success: bool = True
    video_id: Optional[str] = None
    is_demo_mode: bool
    is_demo_video: Optional[bool] = False
    model_status: str
    status_message: str
    junction_id: Optional[int]
    junction_name: Optional[str] = None
    road_id: Optional[int] = None
    duration_seconds: float
    total_frames: int
    processed_frames: int
    processing_time_sec: Optional[float] = 0.0
    tracked_objects_count: int
    object_class_counts: Dict[str, int]
    near_miss_count: int
    near_misses: List[TrafficConflictDetailOut]
    timeline: Optional[List[Dict[str, Any]]] = []
    original_video_url: str
    processed_video_url: Optional[str]
    conflict_snapshots: List[str]
    created_near_miss_ids: List[int] = []
    privacy_applied: Optional[bool] = True
    privacy_notice: Optional[str] = "Video processing is intended to minimize unnecessary storage of personally identifiable visual information (faces and license plates anonymized)."
    tracked_objects_summary: Optional[List[Dict[str, Any]]] = []


class AIModelStatusOut(BaseModel):
    pothole_model_path: str
    pothole_model_loaded: bool
    traffic_model_path: str
    traffic_model_loaded: bool
    water_model_path: Optional[str] = "models/water_segmentation.pt"
    water_model_loaded: Optional[bool] = False
    is_pothole_demo_mode: bool
    is_traffic_demo_mode: bool
    is_water_demo_mode: Optional[bool] = True
    message: str


# ── Water Accumulation Analysis Schemas ──────────────────────────────────────

class WaterRegionBoxOut(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class WaterRegionItemOut(BaseModel):
    id: int
    area_pixels: int
    area_percent: float
    confidence: float
    severity: str
    box: WaterRegionBoxOut
    polygon: List[List[int]] = []
    description: Optional[str] = None


class CombinedHazardOut(BaseModel):
    detected: bool = True
    pothole_count: int
    pothole_severity: str
    water_severity: str
    combined_risk_score: float
    obscured_hazard_warning: str
    interaction_factor: float = 1.2


class WaterAnalysisOut(BaseModel):
    success: bool = True
    image_id: Optional[str] = None
    hazard_type: str = "water_accumulation"
    detected: bool
    confidence: float
    severity: str
    water_area_percent: float
    road_area_pixels: Optional[int] = 0
    water_area_pixels: Optional[int] = 0
    regions: List[WaterRegionItemOut] = []
    risk_contribution: float
    processed_image_url: str
    mask_image_url: str
    is_demo_mode: bool
    model_status: str
    depth_label: str = "Not available from RGB image"
    combined_hazard: Optional[CombinedHazardOut] = None
    hazard_id: Optional[int] = None
    road_id: Optional[int] = None
    road_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[str] = None



# ── Danger Zones & Repairs ────────────────────────────────────────────────────

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
    pothole_severity: Optional[str] = "MEDIUM"
    hazard_frequency: Optional[int] = 0
    conflict_frequency: Optional[int] = 0
    conflict_severity: Optional[str] = "MEDIUM"
    motorcycle_exposure: Optional[str] = "MEDIUM"
    persistence_score: Optional[float] = 0.0
    road_importance_score: Optional[float] = 50.0
    data_confidence: Optional[str] = "HIGH"
    main_contributing_factor: Optional[str] = "Observed Surface Defects"


class RoadSafetyEvaluationOut(BaseModel):
    road_id: int
    road_name: str
    danger_zone_score: float
    danger_zone_classification: str
    safe_city_score: float
    factors: SafeCityFactorsOut
    conflict_count: Optional[int] = 0
    hazard_count: Optional[int] = 0
    traffic_exposure: Optional[str] = "HIGH"
    main_contributing_factor: Optional[str] = "Observed Surface Defects"
    confidence: Optional[str] = "HIGH"
    coverage: Optional[str] = "HIGH COVERAGE"
    last_observed: Optional[str] = None
    is_hotspot: Optional[bool] = False
    quality_warning: Optional[str] = None
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
    assigned_department: Optional[str] = "Municipal Public Works"
    recommended_action: Optional[str] = "Asphalt Resurfacing"
    approval_status: Optional[str] = "approved"
    reasons: List[str]
    reason: Optional[str] = None
    suggested_action: Optional[str] = "Road-surface inspection + pedestrian-safety review"
    evidence_ids: Optional[List[str]] = []
    human_approval_required: bool = True
    created_at: Optional[str] = None


class RepairStatusUpdate(BaseModel):
    status: Optional[str] = "NEW"  # NEW / UNDER REVIEW / VERIFIED / REPAIR ASSIGNED / REPAIRED / POST-REPAIR MONITORING / CLOSED
    action: Optional[str] = None # verify / approve / assign / reject / mark_repaired / reopen
    assigned_to: Optional[str] = None
    assigned_department: Optional[str] = None
    approval_status: Optional[str] = None
    reviewer: Optional[str] = "Municipal Officer"
    notes: Optional[str] = None


# ── Route Intelligence ────────────────────────────────────────────────────────

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
    risk_penalty: Optional[float] = 0.0
    route_cost: Optional[float] = 0.0
    high_risk_segments_count: Optional[int] = 0
    hazards_count: Optional[int] = 0
    conflict_hotspots_count: Optional[int] = 0
    explanation: Optional[str] = None


class RouteComparisonResultOut(BaseModel):
    origin_name: str
    destination_name: str
    routes: List[RouteOptionOut]
    neutral_advisory: str


class JunctionSimulationRequest(BaseModel):
    conflict_type: str = "pedestrian-vehicle"
    ttc: float = 1.3
    risk_level: str = "HIGH"
    reset: bool = False


class SmartJunctionDisplayStateOut(BaseModel):
    junction_id: int
    junction_name: str
    display_mode: str
    signal_state: str
    countdown_seconds: int
    pedestrian_warning: bool
    road_hazard_warning: bool
    ai_risk_state: str
    risk_score: float
    active_near_misses_count: int
    recent_conflict: Optional[TrafficConflictDetailOut] = None


# ── Risk Engine & What-If Municipal Simulator (Part 1 & 2) ───────────────────

class RiskFactorItemOut(BaseModel):
    label: str
    normalized_value: float
    weight: float
    max_points: float
    contribution_points: float
    status: str


class RiskEvaluationOut(BaseModel):
    mode: str = "current"
    data_source: str
    road_id: int
    road_name: str
    risk_score: float
    observed_conflicts: int = 0
    observation_note: str = ""
    factors: Dict[str, RiskFactorItemOut]


class FactorTransitionOut(BaseModel):
    factor_key: str
    before_normalized: float
    after_normalized: float
    delta: float
    is_modified: bool


class InterventionSimulationRequest(BaseModel):
    road_id: int
    intervention: str = "speed_bump"


class InterventionSimulationOut(BaseModel):
    mode: str = "simulation"
    data_source: str = "WHAT-IF SIMULATION"
    road_id: int
    road_name: str
    intervention_key: str
    intervention_name: str
    intervention_type: str
    current_risk: float
    projected_risk: float
    change_points: float
    reduction_percent: float
    factor_transitions: Dict[str, FactorTransitionOut]
    projected_factors_breakdown: Dict[str, RiskFactorItemOut]
    disclaimer: str


class InterventionComparisonItemOut(BaseModel):
    key: str
    name: str
    type: str
    projected_risk: float
    change_points: float
    reduction_percent: float


class InterventionComparisonOut(BaseModel):
    road_id: int
    road_name: str
    current_risk: float
    data_source: str
    interventions: List[InterventionComparisonItemOut]


# ── Unified AI Road Analysis Schemas ──────────────────────────────────────────

class UnifiedImageMetaOut(BaseModel):
    width: int
    height: int
    filename: str


class UnifiedPotholeDetectionItemOut(BaseModel):
    box: WaterRegionBoxOut
    confidence: float
    severity: str
    risk_score: float
    is_water_filled: bool = False
    water_overlap_percent: float = 0.0


class UnifiedPotholesSummaryOut(BaseModel):
    count: int
    highest_severity: str
    confidence: float
    water_filled_count: int = 0
    detections: List[UnifiedPotholeDetectionItemOut] = []


class UnifiedWaterSummaryOut(BaseModel):
    status: str
    is_available: bool
    detected: bool
    confidence: float
    coverage_percent: float
    water_pixel_count: int = 0
    road_pixel_count: int = 0
    severity: str
    depth_label: str = "Depth: Not estimated from RGB image"
    regions: List[WaterRegionItemOut] = []
    mask_url: Optional[str] = ""


class UnifiedRoadConditionOut(BaseModel):
    classification: str
    road_name: str
    road_type: str


class UnifiedRiskSummaryOut(BaseModel):
    score: float
    factors: Dict[str, Any] = {}


class UnifiedRoadAnalysisOut(BaseModel):
    analysis_id: str
    image: UnifiedImageMetaOut
    potholes: UnifiedPotholesSummaryOut
    water: UnifiedWaterSummaryOut
    road_condition: UnifiedRoadConditionOut
    risk: UnifiedRiskSummaryOut
    processed_image_url: str
    metadata: Dict[str, Any] = {}


