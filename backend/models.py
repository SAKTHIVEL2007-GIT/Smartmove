"""
SafeCity Loop V2 — ORM Models
Complete database foundation supporting RoadSegment, HazardObservation,
ConflictEvent, RepairRecord, RiskSnapshot, EvidenceFile, and AuditLog.
Maintains 100% backward compatibility with existing queries.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
)
from sqlalchemy.orm import relationship
from backend.database import Base


class Road(Base):
    """Represents a monitored road segment."""
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    road_type = Column(String(50), default="urban_arterial")       # urban_arterial, school_zone, transit_corridor, local_residential, industrial
    traffic_exposure = Column(String(20), default="MEDIUM")        # LOW/MEDIUM/HIGH/VERY HIGH
    vulnerability = Column(String(20), default="MEDIUM")           # LOW/MEDIUM/HIGH
    vulnerability_score = Column(Float, default=50.0)              # 0–100
    importance_score = Column(Float, default=50.0)                 # 0–100
    risk_score = Column(Float, default=0.0)                        # 0–100 calculated by RiskEngine
    risk_confidence = Column(Float, default=0.85)                  # 0.0–1.0
    safe_city_score = Column(Float, default=100.0)                 # 0–100 (100 - risk_score)
    data_coverage = Column(Float, default=75.0)                    # 0–100% (No data != safe)
    last_observed = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="monitored")               # monitored/at-risk/pending-repair/repaired
    geometry = Column(JSON, default=list)                          # Polyline coordinates [[lat, lon], ...]

    hazards = relationship("Hazard", back_populates="road", cascade="all, delete-orphan")
    conflicts = relationship("NearMiss", back_populates="road", cascade="all, delete-orphan")
    repairs = relationship("Repair", back_populates="road", cascade="all, delete-orphan")
    snapshots = relationship("RiskSnapshot", back_populates="road", cascade="all, delete-orphan")
    evidence_files = relationship("EvidenceFile", back_populates="road", cascade="all, delete-orphan")


# Alias for explicit domain naming
RoadSegment = Road


class Hazard(Base):
    """A detected hazard observation on a road segment."""
    __tablename__ = "hazards"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=False)
    type = Column(String(50), nullable=False)                      # pothole/near-miss/dangerous-junction/road-work/high-risk-zone
    severity = Column(String(20), default="MEDIUM")                # LOW/MEDIUM/HIGH/CRITICAL
    confidence = Column(Float, default=0.0)                        # 0.0–1.0 (AI detection confidence)
    risk_score = Column(Float, default=0.0)                        # 0–100
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    gps_accuracy = Column(Float, default=4.5)                      # in meters
    detected_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active")                  # active/resolved/monitoring
    image_path = Column(String(500), nullable=True)
    source = Column(String(50), default="AI Vision")               # "AI Vision" / "Citizen Report" / "Municipal Inspection"
    verified = Column(Boolean, default=False)
    evidence_id = Column(String(50), nullable=True)                # e.g. "EV-2026-0012"
    evidence_code = Column(String(50), nullable=True)              # e.g. "SC-H-1042"
    visual_severity = Column(String(20), default="HIGH")           # LOW/MEDIUM/HIGH/CRITICAL
    contextual_severity = Column(String(20), default="HIGH")       # LOW/MEDIUM/HIGH/CRITICAL
    direction = Column(String(50), nullable=True)                  # e.g. "Northbound Lane 1"

    road = relationship("Road", back_populates="hazards")


# Alias for explicit domain naming
HazardObservation = Hazard


class NearMiss(Base):
    """A traffic conflict event (near miss) observed on a road segment or junction."""
    __tablename__ = "near_misses"

    id = Column(Integer, primary_key=True, index=True)
    junction_id = Column(Integer, ForeignKey("junctions.id"), nullable=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True)
    video_id = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    object_types = Column(JSON, default=list)                      # e.g. ["vehicle", "pedestrian"]
    object_type_a = Column(String(50), default="vehicle")
    object_type_b = Column(String(50), default="pedestrian")
    ttc = Column(Float, nullable=True)                             # Time-to-collision in seconds (< 2.0s)
    pet = Column(Float, nullable=True)                             # Post-Encroachment Time in seconds
    minimum_distance = Column(Float, default=2.1)                  # in meters
    risk_level = Column(String(20), default="MEDIUM")              # LOW/MEDIUM/HIGH/CRITICAL
    event_severity = Column(String(20), default="HIGH")
    conflict_zone = Column(String(100), nullable=True)             # e.g. "Intersection Center Corridor"
    evidence_clip = Column(String(500), nullable=True)
    review_status = Column(String(50), default="pending_review")   # pending_review / reviewed / false_positive / actioned
    confidence = Column(Float, default=0.88)                       # AI detection/tracking confidence
    source = Column(String(100), default="YOLOv8 + ByteTrack")     # e.g. "YOLOv8 + ByteTrack (Local Edge)"
    direction = Column(String(100), nullable=True)                 # e.g. "Northbound ⟷ Pedestrian Crossing"
    created_at = Column(DateTime, default=datetime.utcnow)

    junction = relationship("Junction", back_populates="near_misses")
    road = relationship("Road", back_populates="conflicts")

    @property
    def event_id(self) -> int:
        return self.id

    @property
    def segment_id(self) -> Optional[int]:
        return self.road_id


# Alias for explicit domain naming
ConflictEvent = NearMiss


class Junction(Base):
    """A road junction being monitored for traffic conflicts."""
    __tablename__ = "junctions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    risk_score = Column(Float, default=0.0)
    camera_id = Column(String(100), nullable=True)
    status = Column(String(50), default="active")

    near_misses = relationship("NearMiss", back_populates="junction", cascade="all, delete-orphan")


class Repair(Base):
    """A municipal repair task assigned to a road segment."""
    __tablename__ = "repairs"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=False)
    priority = Column(Integer, default=3)                          # 1 = highest
    reason = Column(Text, nullable=True)
    status = Column(String(50), default="pending")                 # pending/in-progress/completed
    assigned_to = Column(String(200), nullable=True)
    assigned_department = Column(String(200), default="Municipal Public Works")
    recommended_action = Column(String(200), default="Asphalt Resurfacing")
    approval_status = Column(String(50), default="approved")       # draft / pending_approval / approved / rejected
    repair_date = Column(DateTime, nullable=True)
    before_score = Column(Float, nullable=True)
    after_score = Column(Float, nullable=True)
    before_observations = Column(Integer, default=3)
    after_observations = Column(Integer, default=0)
    evidence_image = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    road = relationship("Road", back_populates="repairs")

    @property
    def before_risk(self) -> Optional[float]:
        return self.before_score

    @before_risk.setter
    def before_risk(self, val: Optional[float]):
        self.before_score = val

    @property
    def after_risk(self) -> Optional[float]:
        return self.after_score

    @after_risk.setter
    def after_risk(self, val: Optional[float]):
        self.after_score = val


# Alias for explicit domain naming
RepairRecord = Repair


class RiskSnapshot(Base):
    """Historical risk snapshot for trend analytics."""
    __tablename__ = "risk_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    risk_score = Column(Float, nullable=False)
    confidence = Column(Float, default=0.85)
    data_coverage = Column(Float, default=80.0)
    hazard_severity = Column(Float, default=0.0)
    traffic_exposure = Column(Float, default=0.0)
    conflict_evidence = Column(Float, default=0.0)
    vulnerable_exposure = Column(Float, default=0.0)
    persistence = Column(Float, default=0.0)
    road_importance = Column(Float, default=0.0)
    contributing_factors = Column(JSON, default=dict)

    road = relationship("Road", back_populates="snapshots")


class EvidenceFile(Base):
    """Centralized evidence file linking detections and conflicts to road segments."""
    __tablename__ = "evidence_files"

    id = Column(Integer, primary_key=True, index=True)
    evidence_code = Column(String(50), unique=True, index=True)     # e.g. "EV-2026-0012"
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True)
    hazard_id = Column(Integer, ForeignKey("hazards.id"), nullable=True)
    conflict_id = Column(Integer, ForeignKey("near_misses.id"), nullable=True)
    file_type = Column(String(50), nullable=False)                  # "image", "video_clip", "keyframe", "sensor"
    file_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    captured_at = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON, default=dict)
    verified = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    road = relationship("Road", back_populates="evidence_files")


class AuditLog(Base):
    """Municipal officer and system decision audit trail."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor = Column(String(100), default="System AI")                # "Municipal Officer", "Road Authority", "System AI"
    action = Column(String(100), nullable=False)                    # "RISK_RECALCULATION", "HAZARD_DETECTED", "CONFLICT_REVIEWED", "REPAIR_STATUS_UPDATED"
    target_type = Column(String(50), nullable=False)                # "RoadSegment", "Hazard", "ConflictEvent", "Repair"
    target_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)


class Intervention(Base):
    """Records a safety intervention and its measured impact."""
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True)
    name = Column(String(200), nullable=False)
    type = Column(String(100), nullable=True)                       # speed-bump/resurfacing/signage/lighting
    before_risk = Column(Float, nullable=True)
    after_risk = Column(Float, nullable=True)
    before_near_misses = Column(Integer, default=0)
    after_near_misses = Column(Integer, default=0)
    implemented_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)


class CitizenReport(Base):
    """A hazard report submitted by a citizen."""
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String(50), nullable=True)                 # e.g. SC-DEMO-00128
    reporter_name = Column(String(200), nullable=True)
    type = Column(String(100), nullable=False)                      # pothole/flooding/debris/other
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    severity = Column(String(20), default="MEDIUM")
    photo_url = Column(String(500), nullable=True)
    status = Column(String(50), default="AI Verification Pending")
    submitted_at = Column(DateTime, default=datetime.utcnow)
