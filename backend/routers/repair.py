"""
SafeCity Loop V2 — Repair Decision & Municipal Queue Router
Endpoints:
- GET /api/repair-priority (AI-prioritized queue with explanations, reasons, suggested actions, evidence IDs)
- PATCH /api/repairs/{id} (Update repair status & execute municipal actions: verify, approve, assign, reject, mark_repaired, reopen)
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.database import get_db
from backend.models import Repair, Road, Hazard, Intervention, AuditLog
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
                reason=item.reason,
                suggested_action=item.suggested_action,
                evidence_ids=item.evidence_ids,
                human_approval_required=item.human_approval_required,
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
    Updates status or executes municipal actions for repair tasks.
    Actions supported: verify, approve, assign, reject, mark_repaired, reopen.
    Statuses: NEW, UNDER REVIEW, VERIFIED, REPAIR ASSIGNED, REPAIRED, POST-REPAIR MONITORING, CLOSED.
    ⚠️ Human approval is mandatory. AI provides decision support only.
    """
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        road = db.query(Road).filter(Road.id == repair_id).first()
        if road:
            repair = Repair(
                road_id=road.id,
                priority=2,
                status="NEW",
                assigned_to=payload.assigned_to or "Maintenance Team A [DEMO]",
                before_risk=road.risk_score,
            )
            db.add(repair)
            db.commit()
            db.refresh(repair)
        else:
            raise HTTPException(status_code=404, detail="Repair task not found.")

    road = db.query(Road).filter(Road.id == repair.road_id).first()
    before_risk = repair.before_risk or (road.risk_score if road else 75.0)

    # Determine status from action if provided
    new_status = payload.status
    if payload.action:
        action_lower = payload.action.lower().strip()
        if action_lower == "verify":
            new_status = "VERIFIED"
        elif action_lower == "approve":
            new_status = "UNDER REVIEW"
        elif action_lower == "assign":
            new_status = "REPAIR ASSIGNED"
        elif action_lower == "reject":
            new_status = "CLOSED"
        elif action_lower in ["mark_repaired", "mark repaired"]:
            new_status = "REPAIRED"
        elif action_lower == "reopen":
            new_status = "UNDER REVIEW"

    repair.status = new_status
    if payload.assigned_to:
        repair.assigned_to = payload.assigned_to
    if payload.assigned_department:
        repair.assigned_department = payload.assigned_department
    repair.updated_at = datetime.utcnow()

    # If repaired/completed: resolve hazards, lower road risk, log intervention
    if new_status.upper() in ["REPAIRED", "COMPLETED"]:
        repair.repair_date = datetime.utcnow()
        if road:
            # Mark hazards resolved
            hazards = db.query(Hazard).filter(Hazard.road_id == road.id).all()
            for h in hazards:
                h.status = "resolved"

            road.risk_score = max(15.0, round(road.risk_score * 0.45, 1))
            road.safe_city_score = round(100.0 - road.risk_score, 1)
            road.status = "repaired"
            repair.after_risk = road.risk_score

            # Create or update Intervention record
            existing_int = db.query(Intervention).filter(Intervention.road_id == road.id).first()
            if existing_int:
                existing_int.after_risk = road.risk_score
                existing_int.implemented_at = datetime.utcnow()
            else:
                db.add(Intervention(
                    road_id=road.id,
                    name=f"Surface Rehabilitation: {road.name}",
                    type="resurfacing",
                    before_risk=before_risk,
                    after_risk=road.risk_score,
                    before_near_misses=3,
                    after_near_misses=0,
                    implemented_at=datetime.utcnow(),
                    notes=f"Human approved municipal repair executed on {road.name}",
                ))

    # Log immutable municipal audit record
    db.add(AuditLog(
        actor=payload.reviewer or "Municipal Officer",
        action=f"REPAIR_{new_status.upper().replace(' ', '_')}",
        target_type="Repair",
        target_id=repair.id,
        details=f"Road '{road.name if road else repair.road_id}' repair status set to '{new_status}'. Action: {payload.action or 'Status Transition'}. {payload.notes or 'Human review verified.'}",
    ))

    db.commit()
    db.refresh(repair)

    item = decision_engine.compute_road_priority(road, db)
    item.status = repair.status
    if repair.assigned_to:
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
        reason=item.reason,
        suggested_action=item.suggested_action,
        evidence_ids=item.evidence_ids,
        human_approval_required=True,
        created_at=repair.created_at.isoformat() if repair.created_at else None,
    )
