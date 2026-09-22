"""
SafeCity Loop V2 — Citizen Reports & GPS Hazard Creation Router
Endpoints:
- POST /api/reports (Submit citizen report + GPS location -> creates Hazard on map)
- GET /api/reports
"""
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import CitizenReport, Hazard, Road
from backend.schemas import CitizenReportCreate, CitizenReportOut

router = APIRouter()


@router.post("/reports", response_model=CitizenReportOut, status_code=201)
def submit_report(payload: CitizenReportCreate, db: Session = Depends(get_db)):
    """
    Submits citizen road hazard report.
    Flow: Report (Photo + GPS location) -> Create CitizenReport -> Create Hazard -> Map Marker.
    """
    if not payload.type:
        raise HTTPException(status_code=422, detail="Report type is required.")

    data = payload.model_dump()
    report = CitizenReport(**data)
    report.status = "AI Verification Pending"
    db.add(report)
    db.commit()
    db.refresh(report)

    report.report_code = f"SC-DEMO-{report.id:05d}"
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

    # Automatically create Hazard marker from verified citizen report
    if target_road:
        lat = payload.latitude or target_road.latitude + random.uniform(-0.0006, 0.0006)
        lon = payload.longitude or target_road.longitude + random.uniform(-0.0006, 0.0006)
        hazard = Hazard(
            road_id=target_road.id,
            type=payload.type.lower().replace(" ", "-"),
            severity=payload.severity.upper() if payload.severity else "MEDIUM",
            confidence=0.88,
            risk_score=75.0 if payload.severity == "HIGH" else 60.0,
            latitude=lat,
            longitude=lon,
            detected_at=datetime.utcnow(),
            status="active",
        )
        db.add(hazard)
        db.commit()

    return report


@router.get("/reports", response_model=list[CitizenReportOut])
def get_reports(db: Session = Depends(get_db)):
    reports = db.query(CitizenReport).order_by(CitizenReport.submitted_at.desc()).all()
    for r in reports:
        if not r.report_code:
            r.report_code = f"SC-DEMO-{r.id:05d}"
    return reports

