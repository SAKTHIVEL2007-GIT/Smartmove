"""
SafeCity Loop V2 — Repair Decision & Municipal Queue Router
Endpoints:
- GET /api/repair-priority (AI-prioritized queue with explanations)
- PATCH /api/repairs/{id} (Update repair status: New/Verified/High Priority/Assigned/Under Repair/Completed)
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from backend.database import get_db
from backend.models import Repair, Road
from backend.schemas import PrioritizedRepairItemOut, RepairStatusUpdate
from backend.services.repair_decision import RepairDecisionEngine

router = APIRouter()
decision_engine = RepairDecisionEngine()


@router.get("/repair-priority", response_model=List[PrioritizedRepairItemOut])
def get_repair_priority(db: Session = Depends(get_db)):
    """
    Returns AI-prioritized municipal repair queue.
    Explains WHY each road is prioritized using severity, traffic, vulnerability, near misses, reports.
    """
    queue = decision_engine.generate_repair_queue(db)

    results = []
    for item in queue:
        results.append(
            PrioritizedRepairItemOut(
                road_id=item.road_id,
                road_name=item.road_name,
                repair_id=item.repair_id,
                priority_level=item.priority_level,
                priority_rank=item.priority_rank,
                urgency_score=item.urgency_score,
                hazard_summary=item.hazard_summary,
                risk_score=item.risk_score,
                status=item.status,
                assigned_to=item.assigned_to,
                reasons=item.reasons,
                created_at=item.created_at.isoformat() if item.created_at else None,
            )
        )
    return results


@router.patch("/repairs/{repair_id}", response_model=PrioritizedRepairItemOut)
def update_repair_status(
    repair_id: int,
    payload: RepairStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Updates the status or assigned team for a municipal repair task.
    Allowed statuses: New, Verified, High Priority, Assigned, Under Repair, Completed.
    """
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        # If repair record doesn't exist, check if repair_id corresponds to a road_id
        road = db.query(Road).filter(Road.id == repair_id).first()
        if road:
            repair = Repair(
                road_id=road.id,
                priority=2,
                status=payload.status,
                assigned_to=payload.assigned_to or "Maintenance Team A [DEMO]",
                before_risk=road.risk_score,
            )
            db.add(repair)
            db.commit()
            db.refresh(repair)
        else:
            raise HTTPException(status_code=404, detail="Repair task not found.")

    repair.status = payload.status
    if payload.assigned_to:
        repair.assigned_to = payload.assigned_to
    repair.updated_at = datetime.utcnow()

    # If completed, reduce road risk score
    if payload.status.lower() in ["completed", "repaired"]:
        road = db.query(Road).filter(Road.id == repair.road_id).first()
        if road:
            road.risk_score = max(15.0, round(road.risk_score * 0.45, 1))
            road.safe_city_score = round(100.0 - road.risk_score, 1)
            road.status = "repaired"
            repair.after_risk = road.risk_score

    db.commit()
    db.refresh(repair)

    road = db.query(Road).filter(Road.id == repair.road_id).first()
    item = decision_engine.compute_road_priority(road, db)
    item.status = repair.status
    item.assigned_to = repair.assigned_to

    return PrioritizedRepairItemOut(
        road_id=item.road_id,
        road_name=item.road_name,
        repair_id=repair.id,
        priority_level=item.priority_level,
        priority_rank=item.priority_rank,
        urgency_score=item.urgency_score,
        hazard_summary=item.hazard_summary,
        risk_score=item.risk_score,
        status=item.status,
        assigned_to=item.assigned_to,
        reasons=item.reasons,
        created_at=repair.created_at.isoformat() if repair.created_at else None,
    )
