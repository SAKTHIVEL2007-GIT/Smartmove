"""
SafeCity Loop V2 — Danger Zones & SafeCity Scores API
Endpoints:
- GET /api/danger-zones (Calculated Danger Zone Score & SafeCity Score evaluations)
- GET /api/danger-zones/{road_id} (Detailed single road evaluation)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import Road
from backend.schemas import RoadSafetyEvaluationOut, SafeCityFactorsOut
from backend.services.danger_zone import DangerZoneService

router = APIRouter()
danger_zone_service = DangerZoneService()


@router.get("/danger-zones", response_model=List[RoadSafetyEvaluationOut])
def get_danger_zones(db: Session = Depends(get_db)):
    """
    Returns Calculated Danger Zone Scores and SafeCity Scores for all roads.
    Combines: pothole risk, near misses, traffic exposure, pedestrian vulnerability, reports.
    ⚠️ Calculated Danger Zone Score (Not scientifically validated accident probability).
    """
    evaluations = danger_zone_service.evaluate_all(db)

    results = []
    for ev in evaluations:
        results.append(
            RoadSafetyEvaluationOut(
                road_id=ev.road_id,
                road_name=ev.road_name,
                danger_zone_score=ev.danger_zone_score,
                danger_zone_classification=ev.danger_zone_classification,
                safe_city_score=ev.safe_city_score,
                conflict_count=ev.conflict_count,
                hazard_count=ev.hazard_count,
                traffic_exposure=ev.traffic_exposure,
                main_contributing_factor=ev.main_contributing_factor,
                confidence=ev.confidence,
                coverage=ev.coverage,
                last_observed=ev.last_observed,
                is_hotspot=ev.is_hotspot,
                quality_warning=ev.quality_warning,
                factors=SafeCityFactorsOut(
                    pothole_risk=ev.factors.pothole_risk_level,
                    junction_risk=ev.factors.junction_risk_level,
                    traffic_exposure=ev.factors.traffic_exposure_level,
                    pedestrian_exposure=ev.factors.pedestrian_exposure_level,
                    pothole_score=ev.factors.pothole_score,
                    junction_score=ev.factors.junction_score,
                    traffic_score=ev.factors.traffic_score,
                    vulnerability_score=ev.factors.vulnerability_score,
                    report_count=ev.factors.report_count,
                    pothole_severity=ev.factors.pothole_severity,
                    hazard_frequency=ev.factors.hazard_frequency,
                    conflict_frequency=ev.factors.conflict_frequency,
                    conflict_severity=ev.factors.conflict_severity,
                    motorcycle_exposure=ev.factors.motorcycle_exposure,
                    persistence_score=ev.factors.persistence_score,
                    road_importance_score=ev.factors.road_importance_score,
                    data_confidence=ev.factors.data_confidence,
                    main_contributing_factor=ev.factors.main_contributing_factor,
                ),
                disclaimer=ev.disclaimer,
            )
        )
    return results


@router.get("/danger-zones/{road_id}", response_model=RoadSafetyEvaluationOut)
def get_road_danger_zone(road_id: int, db: Session = Depends(get_db)):
    """Returns detailed danger zone evaluation for a single road."""
    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=404, detail="Road not found")

    ev = danger_zone_service.evaluate_road(road, db)
    return RoadSafetyEvaluationOut(
        road_id=ev.road_id,
        road_name=ev.road_name,
        danger_zone_score=ev.danger_zone_score,
        danger_zone_classification=ev.danger_zone_classification,
        safe_city_score=ev.safe_city_score,
        conflict_count=ev.conflict_count,
        hazard_count=ev.hazard_count,
        traffic_exposure=ev.traffic_exposure,
        main_contributing_factor=ev.main_contributing_factor,
        confidence=ev.confidence,
        coverage=ev.coverage,
        last_observed=ev.last_observed,
        is_hotspot=ev.is_hotspot,
        quality_warning=ev.quality_warning,
        factors=SafeCityFactorsOut(
            pothole_risk=ev.factors.pothole_risk_level,
            junction_risk=ev.factors.junction_risk_level,
            traffic_exposure=ev.factors.traffic_exposure_level,
            pedestrian_exposure=ev.factors.pedestrian_exposure_level,
            pothole_score=ev.factors.pothole_score,
            junction_score=ev.factors.junction_score,
            traffic_score=ev.factors.traffic_score,
            vulnerability_score=ev.factors.vulnerability_score,
            report_count=ev.factors.report_count,
            pothole_severity=ev.factors.pothole_severity,
            hazard_frequency=ev.factors.hazard_frequency,
            conflict_frequency=ev.factors.conflict_frequency,
            conflict_severity=ev.factors.conflict_severity,
            motorcycle_exposure=ev.factors.motorcycle_exposure,
            persistence_score=ev.factors.persistence_score,
            road_importance_score=ev.factors.road_importance_score,
            data_confidence=ev.factors.data_confidence,
            main_contributing_factor=ev.factors.main_contributing_factor,
        ),
        disclaimer=ev.disclaimer,
    )
