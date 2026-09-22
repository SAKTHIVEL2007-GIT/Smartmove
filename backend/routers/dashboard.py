"""GET /api/dashboard — Overview KPI stats, recent events, top repairs, interventions."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Road, Hazard, NearMiss, Repair, Intervention
from backend.schemas import DashboardOut, KPIStats, AIEvent, RepairOut, InterventionOut

router = APIRouter()

@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db)):
    # KPI stats
    total_roads = db.query(Road).count()
    high_risk = db.query(Road).filter(Road.risk_score >= 70).count()
    potholes = db.query(Hazard).filter(Hazard.type == "pothole").count()
    near_misses = db.query(NearMiss).count()
    danger_zones = db.query(Road).filter(Road.risk_score >= 80).count()
    pending_repairs = db.query(Repair).filter(Repair.status == "pending").count()

    kpi = KPIStats(
        roads_monitored=total_roads,
        high_risk_roads=high_risk,
        potholes_detected=potholes,
        near_misses=near_misses,
        danger_zones=danger_zones,
        pending_repairs=pending_repairs,
    )

    # Recent AI events (simulated from real data timestamps)
    events_raw = [
        {"type": "pothole", "event": "Pothole detected — School Road [DEMO]"},
        {"type": "near-miss", "event": "Near miss detected — Market Junction [DEMO]"},
        {"type": "danger-zone", "event": "Danger zone score updated — School Road Crossing [DEMO]"},
        {"type": "repair", "event": "Repair priority elevated — Hospital Road [DEMO]"},
        {"type": "pothole", "event": "Pothole detected — Industrial Road [DEMO]"},
        {"type": "near-miss", "event": "Near miss detected — School Road Crossing [DEMO]"},
    ]
    now = datetime.utcnow()
    recent_events = []
    for i, ev in enumerate(events_raw):
        t = now - timedelta(minutes=i * 7 + 3)
        recent_events.append(AIEvent(
            time=t.strftime("%I:%M %p"),
            event=ev["event"],
            type=ev["type"],
        ))

    # Top 5 priority repairs
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

    return DashboardOut(
        kpi=kpi,
        recent_events=recent_events,
        top_repairs=top_repairs,
        interventions=interventions,
    )
