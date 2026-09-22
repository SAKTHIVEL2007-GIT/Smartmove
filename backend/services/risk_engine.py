"""
SafeCity Loop V2 — RiskEngine Service
Full composite risk scoring engine using DangerZoneService.
"""
from dataclasses import dataclass
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from backend.models import Road
from backend.services.danger_zone import DangerZoneService, RoadSafetyEvaluation


@dataclass
class RiskFactors:
    pothole_count: int
    near_miss_count: int
    traffic_exposure: str       # LOW / MEDIUM / HIGH
    vulnerability: str          # LOW / MEDIUM / HIGH
    road_age_years: Optional[float] = None
    weather_condition: Optional[str] = None


@dataclass
class RiskScore:
    road_id: int
    composite_score: float       # 0–100
    safe_city_score: float       # 0–100 (higher = safer)
    danger_zone_flag: bool
    risk_breakdown: dict         # {"potholes": 30, "near_misses": 25, ...}
    confidence: float            # 0.0–1.0


class RiskEngine:
    """
    Composite risk scoring engine.
    Combines pothole data, near-miss data, traffic, and environmental factors.
    """

    def __init__(self):
        self.danger_zone_service = DangerZoneService()

    def compute_road_risk(self, road_id: int, db: Session) -> RoadSafetyEvaluation:
        """
        Computes composite risk and SafeCity score for a road from database state.
        """
        road = db.query(Road).filter(Road.id == road_id).first()
        if not road:
            raise ValueError(f"Road with id {road_id} not found.")
        return self.danger_zone_service.evaluate_road(road, db)

    def compute_danger_zones(self, db: Session) -> List[RoadSafetyEvaluation]:
        """
        Identifies and scores all danger zones within city roads.
        """
        return self.danger_zone_service.evaluate_all(db)

    def predict_future_risk(self, road_id: int, days_ahead: int, db: Session) -> List[float]:
        """
        Predicts risk trajectory for the next N days based on current risk and degradation trend.
        """
        road = db.query(Road).filter(Road.id == road_id).first()
        current_risk = road.risk_score if road else 50.0
        # Simulated risk degradation curve (approx +0.15% per day without intervention)
        return [round(min(100.0, current_risk + (d * 0.18)), 1) for d in range(1, days_ahead + 1)]
