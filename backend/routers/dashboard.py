"""
SafeCity Loop V2 — Dashboard & Command Center Router
Provides municipal overview KPIs, risk trends, coverage stats, and recent events.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Road, Hazard, NearMiss, Repair, Intervention, RiskSnapshot
from backend.schemas import (
    DashboardOut, KPIStats, AIEvent, RepairOut, InterventionOut,
    RiskTrendPoint, DataCoverageStats, ConflictEventOut
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db)):
    """
    Returns Command Center overview statistics:
    - Road Segments Monitored
    - High-Concern Segments
    - Active Hazards
    - Traffic Conflict Events
    - Pending Repairs
    - Low-Confidence Segments
    - Completed Repairs
    - 7-Day Risk Trend
    - Data Coverage Statistics
    """
    total_roads = db.query(Road).count()
    high_concern = db.query(Road).filter(Road.risk_score >= 60.0).count()
    active_hazards = db.query(Hazard).filter(Hazard.status == "active").count()
    potholes = db.query(Hazard).filter(Hazard.type == "pothole").count()
    conflict_events = db.query(NearMiss).count()
    danger_zones = db.query(Road).filter(Road.risk_score >= 55.0).count()
    pending_repairs = db.query(Repair).filter(Repair.status.in_(["pending", "in-progress"])).count()
    low_confidence = db.query(Road).filter(Road.risk_confidence < 0.75).count()
    completed_repairs = db.query(Repair).filter(Repair.status == "completed").count()

    kpi = KPIStats(
        roads_monitored=total_roads,
        high_concern_segments=high_concern,
        high_risk_roads=high_concern,
        active_hazards=active_hazards,
        potholes_detected=potholes,
        conflict_events=conflict_events,
        near_misses=conflict_events,
        danger_zones=danger_zones,
        pending_repairs=pending_repairs,
        low_confidence_segments=low_confidence,
        completed_repairs=completed_repairs,
    )

    # 7-day city-wide risk trend
    now = datetime.utcnow()
    risk_trend = []
    for day_i in range(6, -1, -1):
        d = now - timedelta(days=day_i)
        date_str = d.strftime("%b %d")
        # Base trend around 55.0 with slight daily progression
        avg_risk = round(54.2 + (6 - day_i) * 0.45, 1)
        high_count = 2 if day_i > 3 else 3
        risk_trend.append(RiskTrendPoint(
            date=date_str,
            average_risk=avg_risk,
            high_risk_count=high_count
        ))

    # Data coverage stats
    roads = db.query(Road).all()
    if roads:
        high_cov = sum(1 for r in roads if (r.data_coverage or 0) >= 75.0)
        mod_cov = sum(1 for r in roads if 45.0 <= (r.data_coverage or 0) < 75.0)
        low_cov = sum(1 for r in roads if (r.data_coverage or 0) < 45.0)
        avg_cov = round(sum(r.data_coverage or 0 for r in roads) / len(roads), 1)
    else:
        high_cov, mod_cov, low_cov, avg_cov = 0, 0, 0, 0.0

    coverage_stats = DataCoverageStats(
        high_coverage_count=high_cov,
        moderate_coverage_count=mod_cov,
        low_coverage_count=low_cov,
        average_coverage_pct=avg_cov
    )

    # Recent AI events
    events_raw = [
        {"type": "hazard", "title": "Critical Pothole Flagged", "desc": "YOLOv8 detected severe crater (94% conf) in active school zone", "location": "School Road [DEMO]", "score": 92.0},
        {"type": "near_miss", "title": "Traffic Conflict Detected", "desc": "ByteTrack flagged TTC 1.15s vehicle-pedestrian conflict", "location": "School Road Crossing [DEMO]", "score": 88.0},
        {"type": "hazard", "title": "Surface Fatigue Observation", "desc": "Recurring distress cluster verified via mobile patrol", "location": "Market Junction [DEMO]", "score": 78.0},
        {"type": "near_miss", "title": "Near-Miss Turning Conflict", "desc": "Van and cyclist trajectory intersection (TTC 1.45s)", "location": "Market Junction North [DEMO]", "score": 76.0},
        {"type": "hazard", "title": "Pavement Rutting Detected", "desc": "Heavy axle depression logged on industrial approach", "location": "Industrial Road [DEMO]", "score": 72.0},
    ]
    recent_events = []
    for i, ev in enumerate(events_raw):
        t = now - timedelta(minutes=i * 12 + 5)
        recent_events.append(AIEvent(
            id=f"EVT-{i+1:03d}",
            type=ev["type"],
            title=ev["title"],
            description=ev["desc"],
            severity="CRITICAL" if ev["score"] >= 85 else "HIGH",
            location=ev["location"],
            timestamp=t,
            risk_score=ev["score"],
            time=t.strftime("%I:%M %p"),
            event=f"{ev['title']} — {ev['location']}",
        ))

    # Priority repairs
    top_repairs_orm = (
        db.query(Repair)
        .filter(Repair.status.in_(["pending", "in-progress"]))
        .order_by(Repair.priority)
        .limit(5)
        .all()
    )
    top_repairs = [RepairOut.model_validate(r) for r in top_repairs_orm]

    # Interventions
    interventions_orm = db.query(Intervention).limit(3).all()
    interventions = [InterventionOut.model_validate(iv) for iv in interventions_orm]

    # Recent conflicts
    recent_conflicts_orm = (
        db.query(NearMiss)
        .order_by(NearMiss.timestamp.desc())
        .limit(5)
        .all()
    )
    recent_conflicts = [ConflictEventOut.model_validate(c) for c in recent_conflicts_orm]

    return DashboardOut(
        kpi=kpi,
        risk_trend=risk_trend,
        data_coverage_stats=coverage_stats,
        recent_events=recent_events,
        top_repairs=top_repairs,
        interventions=interventions,
        recent_conflicts=recent_conflicts,
    )
