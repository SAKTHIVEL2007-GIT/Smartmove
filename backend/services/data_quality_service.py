"""
SafeCity Loop V2 — Data Quality Service
Evaluates observation freshness, GPS accuracy, model confidence, and overall coverage level.
Core principle: NO DATA ≠ SAFE ROAD.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import Road, Hazard, NearMiss


class DataQualityService:
    """
    Evaluates road segment data completeness, sensor freshness, and confidence.
    """

    @staticmethod
    def evaluate_road_data_quality(road: Road, db: Session) -> Dict[str, Any]:
        """
        Calculates data quality metrics for a road segment.
        """
        now = datetime.utcnow()
        hazards = db.query(Hazard).filter(Hazard.road_id == road.id).all()
        conflicts = db.query(NearMiss).filter(NearMiss.road_id == road.id).all()
        
        total_observations = len(hazards) + len(conflicts)
        
        # 1. Freshness & Last Observation
        last_obs = road.last_observed or now - timedelta(days=14)
        for h in hazards:
            if h.detected_at and h.detected_at > last_obs:
                last_obs = h.detected_at
        for c in conflicts:
            if c.timestamp and c.timestamp > last_obs:
                last_obs = c.timestamp
                
        age_hours = (now - last_obs).total_seconds() / 3600.0
        
        if age_hours <= 24:
            freshness = "FRESH"
            freshness_score = 95.0
        elif age_hours <= 72:
            freshness = "MODERATE"
            freshness_score = 75.0
        elif age_hours <= 168:
            freshness = "AGING"
            freshness_score = 50.0
        else:
            freshness = "STALE"
            freshness_score = 25.0

        # 2. GPS Accuracy
        gps_accuracies = [h.gps_accuracy for h in hazards if getattr(h, "gps_accuracy", None) is not None]
        avg_gps = round(sum(gps_accuracies) / len(gps_accuracies), 1) if gps_accuracies else 4.8
        
        # 3. Model Detection Confidence
        confidences = [h.confidence for h in hazards if h.confidence is not None]
        avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else round(road.risk_confidence or 0.82, 2)
        
        # 4. Coverage Level
        # Base coverage factor combines total observations and freshness
        base_coverage = min(100.0, (total_observations * 12.0) + (freshness_score * 0.4))
        coverage_level = round(base_coverage, 1)
        
        if coverage_level >= 75:
            coverage_tier = "HIGH"
        elif coverage_level >= 45:
            coverage_tier = "MODERATE"
        else:
            coverage_tier = "LOW"

        # Confidence Tier
        if avg_confidence >= 0.85 and coverage_tier in ["HIGH", "MODERATE"]:
            confidence_tier = "HIGH"
        elif avg_confidence >= 0.70:
            confidence_tier = "MODERATE"
        else:
            confidence_tier = "LOW"

        # Quality Warning (No data != Safe Road)
        warning = None
        if coverage_tier == "LOW":
            warning = "Caution: Low data coverage. Risk score may underestimate hazards due to sparse monitoring."
        elif freshness == "STALE":
            warning = "Data is over 7 days old. Scheduled mobile LiDAR / vision sweep recommended."

        return {
            "last_observation": last_obs.isoformat() if last_obs else None,
            "last_observation_hours_ago": round(age_hours, 1),
            "observation_count": total_observations,
            "hazard_count": len(hazards),
            "conflict_count": len(conflicts),
            "gps_accuracy_meters": avg_gps,
            "model_confidence": avg_confidence,
            "confidence_tier": confidence_tier,
            "data_freshness": freshness,
            "coverage_percentage": coverage_level,
            "coverage_tier": coverage_tier,
            "quality_warning": warning,
            "audit_disclaimer": "Evaluated by DataQualityService. Low coverage does not indicate road safety.",
        }


data_quality_service = DataQualityService()
