"""
SafeCity Loop V2 — Junctions & Smart Junction Display Router
Endpoints:
- GET /api/junctions
- GET /api/junctions/{id}
- GET /api/junctions/{id}/display (Real-time Smart Junction Display state)
- POST /api/junctions/{id}/simulate-event (Interactive near-miss simulation & display trigger)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.database import get_db
from backend.models import Junction, NearMiss, Hazard
from backend.schemas import (
    JunctionOut, SmartJunctionDisplayStateOut, JunctionSimulationRequest,
    TrafficConflictDetailOut
)

router = APIRouter()


@router.get("/junctions", response_model=List[JunctionOut])
def get_junctions(db: Session = Depends(get_db)):
    junctions = (
        db.query(Junction)
        .options(joinedload(Junction.near_misses))
        .order_by(Junction.risk_score.desc())
        .all()
    )
    return [JunctionOut.model_validate(j) for j in junctions]


@router.get("/junctions/{junction_id}", response_model=JunctionOut)
def get_junction(junction_id: int, db: Session = Depends(get_db)):
    junction = (
        db.query(Junction)
        .options(joinedload(Junction.near_misses))
        .filter(Junction.id == junction_id)
        .first()
    )
    if not junction:
        raise HTTPException(status_code=404, detail="Junction not found.")
    return JunctionOut.model_validate(junction)


@router.get("/junctions/{junction_id}/display", response_model=SmartJunctionDisplayStateOut)
def get_smart_junction_display(junction_id: int, db: Session = Depends(get_db)):
    """
    Returns full-screen Smart Junction Display state.
    Modes: NORMAL / CAUTION / HIGH RISK.
    Includes: signal state, countdown timer, pedestrian warning, road hazard warning, AI risk state.
    """
    junction = db.query(Junction).filter(Junction.id == junction_id).first()
    if not junction:
        junction = db.query(Junction).first()
        if not junction:
            raise HTTPException(status_code=404, detail="No junction available.")

    # Fetch recent near miss within the junction
    recent_nm = (
        db.query(NearMiss)
        .filter(NearMiss.junction_id == junction.id)
        .order_by(NearMiss.timestamp.desc())
        .first()
    )
    recent_conflict = None
    if recent_nm:
        recent_conflict = TrafficConflictDetailOut(
            conflict_id=f"NM-{recent_nm.id}",
            timestamp_str=recent_nm.timestamp.strftime("%H:%M:%S"),
            timestamp_seconds=0.0,
            object_types=recent_nm.object_types or ["vehicle", "pedestrian"],
            track_ids=[1, 2],
            ttc=recent_nm.ttc or 1.4,
            risk_level=recent_nm.risk_level,
            conflict_zone=recent_nm.conflict_zone or "Crosswalk Conflict Zone",
            frame_index=0,
            snapshot_url=None,
        )

    # Determine display mode based on junction risk score
    if junction.risk_score >= 75.0 or (recent_nm and recent_nm.risk_level in ["CRITICAL", "HIGH"]):
        display_mode = "HIGH RISK"
        signal_state = "RED"
        countdown = 12
        ped_warning = True
        hazard_warning = True
        ai_risk_state = "HIGH RISK — PEDESTRIAN–VEHICLE CONFLICT — SLOW DOWN"
    elif junction.risk_score >= 50.0:
        display_mode = "CAUTION"
        signal_state = "AMBER"
        countdown = 5
        ped_warning = True
        hazard_warning = False
        ai_risk_state = "CAUTION — ELEVATED TRAFFIC INTERACTION — YIELD"
    else:
        display_mode = "NORMAL"
        signal_state = "GREEN"
        countdown = 24
        ped_warning = False
        hazard_warning = False
        ai_risk_state = "NORMAL — NO IMMEDIATE CONFLICTS DETECTED"

    active_nm_count = db.query(NearMiss).filter(NearMiss.junction_id == junction.id).count()

    return SmartJunctionDisplayStateOut(
        junction_id=junction.id,
        junction_name=junction.name,
        display_mode=display_mode,
        signal_state=signal_state,
        countdown_seconds=countdown,
        pedestrian_warning=ped_warning,
        road_hazard_warning=hazard_warning,
        ai_risk_state=ai_risk_state,
        risk_score=junction.risk_score,
        active_near_misses_count=active_nm_count,
        recent_conflict=recent_conflict,
    )


@router.post("/junctions/{junction_id}/simulate-event", response_model=SmartJunctionDisplayStateOut)
def simulate_junction_event(
    junction_id: int,
    payload: JunctionSimulationRequest,
    db: Session = Depends(get_db),
):
    """
    Simulates traffic interaction event:
    Near Miss -> Junction Risk increases -> Smart Junction Display changes state -> Recorded in database.
    """
    junction = db.query(Junction).filter(Junction.id == junction_id).first()
    if not junction:
        junction = db.query(Junction).first()
        if not junction:
            raise HTTPException(status_code=404, detail="Junction not found.")

    if payload.conflict_type == "reset":
        junction.risk_score = 35.0
        junction.status = "active"
        db.commit()
        return get_smart_junction_display(junction.id, db)

    # 1. Record Near Miss in database
    if payload.conflict_type == "pedestrian-vehicle":
        object_types = ["vehicle", "pedestrian"]
        zone = "Crosswalk Conflict Zone"
    else:
        object_types = ["vehicle", "vehicle"]
        zone = "Intersection Merge Zone"

    nm = NearMiss(
        junction_id=junction.id,
        timestamp=datetime.utcnow(),
        object_types=object_types,
        ttc=payload.ttc,
        risk_level=payload.risk_level,
        conflict_zone=zone,
    )
    db.add(nm)

    # 2. Increase junction risk score
    junction.risk_score = min(round(junction.risk_score + 18.0, 1), 96.0)
    junction.status = "high-risk"
    db.commit()
    db.refresh(junction)

    return get_smart_junction_display(junction.id, db)
