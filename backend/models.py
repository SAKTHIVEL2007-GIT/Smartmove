"""
SafeCity Loop — ORM Models
All database tables defined here using SQLAlchemy declarative style.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
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
    risk_score = Column(Float, default=0.0)          # 0–100
    safe_city_score = Column(Float, default=100.0)   # 0–100 (higher = safer)
    traffic_exposure = Column(String(20), default="MEDIUM")  # LOW/MEDIUM/HIGH
    vulnerability = Column(String(20), default="MEDIUM")
    status = Column(String(50), default="monitored")         # monitored/at-risk/pending-repair/repaired

    hazards = relationship("Hazard", back_populates="road", cascade="all, delete-orphan")
    repairs = relationship("Repair", back_populates="road", cascade="all, delete-orphan")


class Hazard(Base):
    """A detected hazard on a road (pothole, near-miss zone, etc.)."""
    __tablename__ = "hazards"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=False)
    type = Column(String(50), nullable=False)          # pothole/near-miss/dangerous-junction/road-work/high-risk-zone
    severity = Column(String(20), default="MEDIUM")    # LOW/MEDIUM/HIGH/CRITICAL
    confidence = Column(Float, default=0.0)            # 0.0–1.0 (AI confidence)
    risk_score = Column(Float, default=0.0)            # 0–100
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active")      # active/resolved/monitoring

    road = relationship("Road", back_populates="hazards")


class NearMiss(Base):
    """A traffic near-miss event recorded at a junction."""
    __tablename__ = "near_misses"

    id = Column(Integer, primary_key=True, index=True)
    junction_id = Column(Integer, ForeignKey("junctions.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    object_types = Column(JSON, default=list)          # e.g. ["vehicle", "pedestrian"]
    ttc = Column(Float, nullable=True)                 # Time-to-collision in seconds
    risk_level = Column(String(20), default="MEDIUM")  # LOW/MEDIUM/HIGH/CRITICAL
    conflict_zone = Column(String(100), nullable=True)

    junction = relationship("Junction", back_populates="near_misses")


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
    """A repair task assigned to a road."""
    __tablename__ = "repairs"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=False)
    priority = Column(Integer, default=3)              # 1 = highest
    reason = Column(Text, nullable=True)
    status = Column(String(50), default="pending")     # pending/in-progress/completed
    assigned_to = Column(String(200), nullable=True)
    before_risk = Column(Float, nullable=True)
    after_risk = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    road = relationship("Road", back_populates="repairs")


class Intervention(Base):
    """Records a safety intervention and its measured impact."""
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True)
    name = Column(String(200), nullable=False)
    type = Column(String(100), nullable=True)           # speed-bump/resurfacing/signage/lighting
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
    report_code = Column(String(50), nullable=True)     # e.g. SC-DEMO-00128
    reporter_name = Column(String(200), nullable=True)
    type = Column(String(100), nullable=False)          # pothole/flooding/debris/other
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    severity = Column(String(20), default="MEDIUM")
    photo_url = Column(String(500), nullable=True)
    status = Column(String(50), default="AI Verification Pending")
    submitted_at = Column(DateTime, default=datetime.utcnow)

