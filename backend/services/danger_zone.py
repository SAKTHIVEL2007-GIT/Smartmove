"""
SafeCity Loop V2 — Danger Zone & SafeCity Score Service
Calculates road-level Danger Zone Score (0–100) and SafeCity Score (0–100).
⚠️ Calculated Danger Zone Score — not scientifically validated accident probability.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from backend.models import Road, Hazard, NearMiss, Junction, CitizenReport


@dataclass
class SafeCityFactors:
    pothole_risk_level: str        # LOW / MEDIUM / HIGH
    junction_risk_level: str       # LOW / MEDIUM / HIGH
    traffic_exposure_level: str    # LOW / MEDIUM / HIGH
    pedestrian_exposure_level: str # LOW / MEDIUM / HIGH
    pothole_score: float           # 0–100
    junction_score: float          # 0–100
    traffic_score: float           # 0–100
    vulnerability_score: float     # 0–100
    report_count: int


@dataclass
class RoadSafetyEvaluation:
    road_id: int
    road_name: str
    danger_zone_score: float       # 0–100 (Calculated Danger Zone Score)
    danger_zone_classification: str # LOW / MEDIUM / HIGH / VERY HIGH
    safe_city_score: float         # 0–100 (higher = safer)
    factors: SafeCityFactors
    disclaimer: str = "Calculated Danger Zone Score (Not scientifically validated accident probability)"

    def to_dict(self) -> dict:
        return {
            "road_id": self.road_id,
            "road_name": self.road_name,
            "danger_zone_score": round(self.danger_zone_score, 1),
            "danger_zone_classification": self.danger_zone_classification,
            "safe_city_score": round(self.safe_city_score, 1),
            "factors": {
                "pothole_risk": self.factors.pothole_risk_level,
                "junction_risk": self.factors.junction_risk_level,
                "traffic_exposure": self.factors.traffic_exposure_level,
                "pedestrian_exposure": self.factors.pedestrian_exposure_level,
                "pothole_score": round(self.factors.pothole_score, 1),
                "junction_score": round(self.factors.junction_score, 1),
                "traffic_score": round(self.factors.traffic_score, 1),
                "vulnerability_score": round(self.factors.vulnerability_score, 1),
                "report_count": self.factors.report_count,
            },
            "disclaimer": self.disclaimer,
        }


class DangerZoneService:
    """
    Computes composite road risk and safe city scores combining:
    - Pothole severity & frequency
    - Nearby junction near-miss activity
    - Traffic exposure
    - Pedestrian vulnerability (schools/hospitals)
    - Repeated citizen hazard reports
    """

    EXPOSURE_WEIGHTS = {"HIGH": 90.0, "MEDIUM": 55.0, "LOW": 20.0}
    VULNERABILITY_WEIGHTS = {"HIGH": 90.0, "MEDIUM": 50.0, "LOW": 20.0}

    @staticmethod
    def classify_score(score: float) -> str:
        if score >= 80.0:
            return "VERY HIGH"
        elif score >= 60.0:
            return "HIGH"
        elif score >= 40.0:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    def level_from_score(score: float) -> str:
        if score >= 65.0:
            return "HIGH"
        elif score >= 35.0:
            return "MEDIUM"
        return "LOW"

    def evaluate_road(self, road: Road, db: Session) -> RoadSafetyEvaluation:
        # 1. Potholes score on this road
        hazards = db.query(Hazard).filter(Hazard.road_id == road.id).all()
        potholes = [h for h in hazards if h.type == "pothole"]
        if potholes:
            pothole_risk_sum = sum(h.risk_score for h in potholes)
            pothole_score = min(100.0, (pothole_risk_sum / len(potholes)) * 0.7 + (len(potholes) * 8.0))
        else:
            pothole_score = 15.0 if hazards else 5.0

        # 2. Junction / Near-miss activity in proximity
        # Find junctions within ~0.008 degrees (approx 800m)
        lat, lon = road.latitude, road.longitude
        nearby_junctions = (
            db.query(Junction)
            .filter(
                Junction.latitude.between(lat - 0.008, lat + 0.008),
                Junction.longitude.between(lon - 0.008, lon + 0.008),
            )
            .all()
        )
        if nearby_junctions:
            max_j_risk = max(j.risk_score for j in nearby_junctions)
            junction_ids = [j.id for j in nearby_junctions]
            near_miss_count = db.query(NearMiss).filter(NearMiss.junction_id.in_(junction_ids)).count()
            junction_score = min(100.0, max_j_risk * 0.65 + min(near_miss_count * 7.0, 35.0))
        else:
            near_miss_count = 0
            junction_score = 20.0

        # 3. Traffic Exposure
        traffic_score = self.EXPOSURE_WEIGHTS.get(road.traffic_exposure.upper(), 50.0)

        # 4. Pedestrian Vulnerability
        vulnerability_score = self.VULNERABILITY_WEIGHTS.get(road.vulnerability.upper(), 50.0)

        # 5. Citizen Reports
        reports_count = db.query(CitizenReport).filter(
            CitizenReport.description.ilike(f"%{road.name.split('[')[0].strip()}%")
        ).count()
        report_score = min(100.0, reports_count * 20.0)

        # ── Weighted Calculated Danger Zone Score (0–100) ─────────────────────
        # Wording constraint: Call it "Calculated Danger Zone Score"
        danger_zone_score = min(
            100.0,
            (pothole_score * 0.30)
            + (junction_score * 0.25)
            + (traffic_score * 0.20)
            + (vulnerability_score * 0.15)
            + (report_score * 0.10)
        )
        danger_zone_score = round(max(0.0, danger_zone_score), 1)

        # SafeCity Score: 0–100 (inversely proportional to danger, higher = safer)
        safe_city_score = round(max(0.0, min(100.0, 100.0 - danger_zone_score)), 1)

        classification = self.classify_score(danger_zone_score)

        factors = SafeCityFactors(
            pothole_risk_level=self.level_from_score(pothole_score),
            junction_risk_level=self.level_from_score(junction_score),
            traffic_exposure_level=road.traffic_exposure.upper(),
            pedestrian_exposure_level=road.vulnerability.upper(),
            pothole_score=pothole_score,
            junction_score=junction_score,
            traffic_score=traffic_score,
            vulnerability_score=vulnerability_score,
            report_count=reports_count,
        )

        return RoadSafetyEvaluation(
            road_id=road.id,
            road_name=road.name,
            danger_zone_score=danger_zone_score,
            danger_zone_classification=classification,
            safe_city_score=safe_city_score,
            factors=factors,
        )

    def evaluate_all(self, db: Session) -> List[RoadSafetyEvaluation]:
        roads = db.query(Road).all()
        evaluations = [self.evaluate_road(r, db) for r in roads]
        # Sync updated scores back into Road model for persistence
        for ev in evaluations:
            road = db.query(Road).filter(Road.id == ev.road_id).first()
            if road:
                road.risk_score = ev.danger_zone_score
                road.safe_city_score = ev.safe_city_score
        db.commit()
        return sorted(evaluations, key=lambda x: x.danger_zone_score, reverse=True)
