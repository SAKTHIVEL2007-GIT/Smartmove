"""
SafeCity Loop V2 — Road Intelligence Router
Detailed road segment dossier, data quality, risk factor decomposition,
and longitudinal evidence timeline.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Road, Hazard, NearMiss, Repair, RiskSnapshot, EvidenceFile
from backend.schemas import (
    RoadSegmentOut, RoadSegmentDossierOut, DataQualityOut,
    ContributingFactorDetail, HazardOut, ConflictEventOut,
    EvidenceFileOut, RepairOut, RiskSnapshotOut
)
from backend.services.risk_engine import risk_engine
from backend.services.data_quality_service import data_quality_service

router = APIRouter(prefix="/road-intelligence", tags=["Road Intelligence"])


@router.get("", response_model=List[RoadSegmentOut])
def list_road_segments(db: Session = Depends(get_db)):
    """
    Returns all monitored road segments with calculated risk, confidence, and data coverage.
    """
    roads = db.query(Road).all()
    # Refresh risk scores via RiskEngine
    for r in roads:
        risk_engine.evaluate_road(r, db)
    return roads


@router.get("/{segment_id}", response_model=RoadSegmentDossierOut)
def get_road_segment_dossier(segment_id: int, db: Session = Depends(get_db)):
    """
    Returns a full decision-support dossier for a specific road segment:
    - Calculated risk (0.30H + 0.20E + 0.20C + 0.15V + 0.10P + 0.05U)
    - Data quality & coverage (No data != safe)
    - Contributing factors decomposition
    - Active defects, conflicts, and repairs
    - Longitudinal evidence timeline
    """
    road = db.query(Road).filter(Road.id == segment_id).first()
    if not road:
        raise HTTPException(status_code=404, detail=f"Road segment #{segment_id} not found.")

    eval_result = risk_engine.evaluate_road(road, db)
    quality_result = data_quality_service.evaluate_road_data_quality(road, db)

    hazards = db.query(Hazard).filter(Hazard.road_id == road.id).order_by(Hazard.detected_at.desc()).all()
    conflicts = db.query(NearMiss).filter(NearMiss.road_id == road.id).order_by(NearMiss.timestamp.desc()).all()
    repairs = db.query(Repair).filter(Repair.road_id == road.id).order_by(Repair.created_at.desc()).all()
    evidence_files = db.query(EvidenceFile).filter(EvidenceFile.road_id == road.id).order_by(EvidenceFile.captured_at.desc()).all()
    snapshots = db.query(RiskSnapshot).filter(RiskSnapshot.road_id == road.id).order_by(RiskSnapshot.timestamp.asc()).all()

    # Formulate suggested intervention based on highest risk driver
    factors = eval_result["factors"]
    if factors["H"] >= 75.0:
        suggested = "Milling & High-Friction Asphalt Infill (Severe surface fatigue identified)"
    elif factors["C"] >= 70.0 and factors["V"] >= 70.0:
        suggested = "Raised Pedestrian Crossing, Speed Table & Dynamic LED Warning Beacons"
    elif factors["E"] >= 80.0:
        suggested = "Automated Adaptive Signal Timing & Dedicated Turning Bays"
    else:
        suggested = "Preventative Seal-Coating & Regular LiDAR Defect Monitoring"

    # Format contributing factors
    cf_dict = {}
    for k, v in eval_result["contributing_factors"].items():
        cf_dict[k] = ContributingFactorDetail(
            score=v["score"],
            weight=v["weight"],
            weighted_contribution=v["weighted_contribution"],
            label=v["label"]
        )

    return RoadSegmentDossierOut(
        segment_id=road.id,
        road_name=road.name,
        road_type=getattr(road, "road_type", "urban_arterial"),
        calculated_risk=eval_result["risk_score"],
        risk_score=eval_result["risk_score"],
        safe_city_score=eval_result["safe_city_score"],
        classification=eval_result["classification"],
        is_danger_zone=eval_result["is_danger_zone"],
        confidence=eval_result["confidence"],
        data_coverage=eval_result["data_coverage"],
        traffic_exposure=road.traffic_exposure or "MEDIUM",
        vulnerable_user_exposure=road.vulnerability or "MEDIUM",
        repair_status=road.status or "monitored",
        suggested_intervention=suggested,
        quality=DataQualityOut(**quality_result),
        contributing_factors=cf_dict,
        contributors_summary=eval_result.get("contributors_summary", []),
        hazards=hazards,
        conflicts=conflicts,
        evidence_timeline=evidence_files,
        repairs=repairs,
        risk_history=snapshots,
        disclaimer=eval_result["disclaimer"]
    )
