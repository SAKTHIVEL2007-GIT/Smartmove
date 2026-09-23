"""
SafeCity Loop V2 — Citizen Reports & GPS Hazard Creation Router
Endpoints:
- POST /api/reports (Submit citizen report -> generates SC-R-XXXX -> initial status 'Submitted')
- GET /api/reports
- PATCH /api/reports/{id}/status (Municipal officer verification workflow: Submitted, Under Review, Verified, Rejected, Converted to Hazard)
"""
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import CitizenReport, Hazard, Road, AuditLog
from backend.schemas import CitizenReportCreate, CitizenReportOut, CitizenReportStatusUpdate
from backend.services.risk_engine import risk_engine

router = APIRouter()


@router.post("/reports", response_model=CitizenReportOut, status_code=201)
def submit_report(payload: CitizenReportCreate, db: Session = Depends(get_db)):
    """
    Submits citizen road hazard report.
    Flow: Report (Photo + GPS location) -> Create CitizenReport -> SC-R-XXXX code -> Initial status 'Submitted'.
    ⚠️ Citizen reports must NOT automatically become high-risk hazards. Municipal verification is required.
    """
    if not payload.type:
        raise HTTPException(status_code=422, detail="Report type is required.")

    data = payload.model_dump()
    report = CitizenReport(**data)
    report.status = "Submitted"
    db.add(report)
    db.commit()
    db.refresh(report)

    report.report_code = f"SC-R-{report.id:04d}"
    db.commit()
    db.refresh(report)

    # Find closest road to GPS coordinates, or default to first road
    target_road = None
    if payload.latitude and payload.longitude:
        roads = db.query(Road).all()
        if roads:
            target_road = min(
                roads,
                key=lambda r: (r.latitude - payload.latitude)**2 + (r.longitude - payload.longitude)**2
            )
    if not target_road:
        target_road = db.query(Road).first()

    # Create unverified hazard marker on map (unverified state with moderate initial score)
    if target_road:
        lat = payload.latitude or (target_road.latitude + random.uniform(-0.0006, 0.0006))
        lon = payload.longitude or (target_road.longitude + random.uniform(-0.0006, 0.0006))
        hazard = Hazard(
            road_id=target_road.id,
            type=payload.type.lower().replace(" ", "-"),
            severity=payload.severity.upper() if payload.severity else "MEDIUM",
            confidence=0.65,
            risk_score=45.0,  # Moderate score until human officer verifies
            latitude=lat,
            longitude=lon,
            detected_at=datetime.utcnow(),
            status="pending_verification",
            evidence_code=f"CR-{report.report_code}",
        )
        db.add(hazard)
        db.commit()

    # Log submission audit
    db.add(AuditLog(
        actor=payload.reporter_name or "Citizen Reporter",
        action="CITIZEN_REPORT_SUBMITTED",
        target_type="CitizenReport",
        target_id=report.id,
        details=f"Report {report.report_code} submitted for {payload.type} at ({payload.latitude}, {payload.longitude}). Status: Submitted.",
    ))
    db.commit()

    return report


@router.get("/reports", response_model=list[CitizenReportOut])
def get_reports(db: Session = Depends(get_db)):
    reports = db.query(CitizenReport).order_by(CitizenReport.submitted_at.desc()).all()
    for r in reports:
        if not r.report_code:
            r.report_code = f"SC-R-{r.id:04d}"
    return reports


@router.patch("/reports/{report_id}/status", response_model=CitizenReportOut)
def update_report_status(
    report_id: int,
    payload: CitizenReportStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Municipal officer verification workflow.
    Allowed statuses: Submitted, Under Review, Verified, Rejected, Converted to Hazard.
    """
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Citizen report not found.")

    old_status = report.status
    report.status = payload.status

    # Find associated hazard marker if any
    linked_hazard = db.query(Hazard).filter(Hazard.evidence_code == f"CR-{report.report_code}").first()

    if payload.status in ["Verified", "Converted to Hazard"]:
        if linked_hazard:
            linked_hazard.status = "active"
            linked_hazard.confidence = 0.92
            linked_hazard.risk_score = 75.0 if report.severity == "HIGH" else 60.0
            # Recalculate road risk
            road = db.query(Road).filter(Road.id == linked_hazard.road_id).first()
            if road:
                risk_engine.evaluate_road(road, db)
    elif payload.status == "Rejected":
        if linked_hazard:
            linked_hazard.status = "rejected"
            linked_hazard.risk_score = 0.0

    # Log audit entry
    db.add(AuditLog(
        actor=payload.reviewer or "Municipal Officer",
        action=f"CITIZEN_REPORT_{payload.status.upper().replace(' ', '_')}",
        target_type="CitizenReport",
        target_id=report.id,
        details=f"Report {report.report_code} transitioned from '{old_status}' to '{payload.status}'. Notes: {payload.notes or 'Officer review completed.'}",
    ))
    db.commit()
    db.refresh(report)
    return report
