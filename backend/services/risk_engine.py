"""
SafeCity Loop V2 — Centralized Risk Engine
Calculates normalized multi-factor road risk according to the GovTech formula:
Risk = 0.30H + 0.20E + 0.20C + 0.15V + 0.10P + 0.05U
Where:
  H = Hazard Severity (0–100)
  E = Traffic Exposure (0–100)
  C = Conflict Evidence (0–100)
  V = Vulnerable-User Exposure (0–100)
  P = Persistence / Repeated Observations (0–100)
  U = Road Importance / Urgency (0–100)
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.models import Road, Hazard, NearMiss, Junction
from backend.services.data_quality_service import data_quality_service


class RiskEngine:
    """
    Centralized scientific Risk Engine for SafeCity Loop V2.
    """

    # Weights
    WEIGHT_H = 0.30
    WEIGHT_E = 0.20
    WEIGHT_C = 0.20
    WEIGHT_V = 0.15
    WEIGHT_P = 0.10
    WEIGHT_U = 0.05

    @classmethod
    def classify_risk(cls, score: float) -> str:
        """
        Classifies risk into standard GovTech safety tiers.
        Never outputs 'SAFE' because an unmonitored or low-risk road is not guaranteed accident-free.
        """
        if score >= 80.0:
            return "VERY HIGH CALCULATED RISK"
        elif score >= 55.0:
            return "HIGH CALCULATED RISK"
        elif score >= 30.0:
            return "MODERATE CALCULATED RISK"
        else:
            return "LOWER CALCULATED RISK"

    @classmethod
    def calculate_factors(cls, road: Road, db: Session) -> Dict[str, float]:
        """
        Extracts and normalizes the 6 core components (0–100).
        """
        hazards = db.query(Hazard).filter(Hazard.road_id == road.id).all()
        conflicts = db.query(NearMiss).filter(
            (NearMiss.road_id == road.id) | 
            (NearMiss.junction_id.in_([j.id for j in db.query(Junction).all() if abs(j.latitude - road.latitude) < 0.008 and abs(j.longitude - road.longitude) < 0.008]))
        ).all()

        # 1. H: Hazard Severity (0–100)
        severity_map = {"CRITICAL": 100.0, "HIGH": 75.0, "MEDIUM": 45.0, "LOW": 20.0}
        if hazards:
            hazard_scores = [severity_map.get(h.severity.upper(), 45.0) for h in hazards]
            # Max severity + volume contribution
            max_h = max(hazard_scores)
            count_bonus = min(25.0, (len(hazards) - 1) * 6.0)
            H = min(100.0, max_h + count_bonus)
        else:
            H = 15.0  # Baseline residual uncertainty

        # 2. E: Traffic Exposure (0–100)
        exposure_map = {"VERY HIGH": 95.0, "HIGH": 80.0, "MEDIUM": 50.0, "LOW": 25.0}
        E = exposure_map.get((road.traffic_exposure or "MEDIUM").upper(), 50.0)

        # 3. C: Conflict Evidence (0–100)
        if conflicts:
            conflict_scores = []
            for c in conflicts:
                ttc = c.ttc if c.ttc is not None else 1.8
                # Shorter TTC = higher conflict score
                ttc_score = max(0.0, min(100.0, (2.5 - ttc) * 50.0))
                severity_bonus = 20.0 if (c.risk_level or "").upper() == "CRITICAL" else 10.0
                conflict_scores.append(min(100.0, ttc_score + severity_bonus))
            C = min(100.0, max(conflict_scores) + min(20.0, len(conflicts) * 5.0))
        else:
            C = 10.0  # Baseline residual conflict potential

        # 4. V: Vulnerable-User Exposure (0–100)
        vuln_map = {"HIGH": 90.0, "MEDIUM": 55.0, "LOW": 20.0}
        if getattr(road, "vulnerability_score", None) is not None and road.vulnerability_score > 0:
            V = float(road.vulnerability_score)
        else:
            V = vuln_map.get((road.vulnerability or "MEDIUM").upper(), 55.0)
        # Bonus for school zones or hospitals
        if "school" in road.name.lower() or getattr(road, "road_type", "") == "school_zone":
            V = max(V, 92.0)
        elif "hospital" in road.name.lower():
            V = max(V, 82.0)

        # 5. P: Persistence / Repeated Observations (0–100)
        total_obs = len(hazards) + len(conflicts)
        P = min(100.0, total_obs * 18.0)

        # 6. U: Road Importance / Urgency (0–100)
        type_importance = {
            "urban_arterial": 80.0,
            "school_zone": 95.0,
            "transit_corridor": 85.0,
            "industrial": 60.0,
            "local_residential": 35.0
        }
        road_type = getattr(road, "road_type", "urban_arterial")
        U = type_importance.get(road_type, getattr(road, "importance_score", 50.0) or 50.0)

        return {
            "H": round(H, 1),
            "E": round(E, 1),
            "C": round(C, 1),
            "V": round(V, 1),
            "P": round(P, 1),
            "U": round(U, 1),
        }

    @classmethod
    def evaluate_road(cls, road: Road, db: Session) -> Dict[str, Any]:
        """
        Executes full evaluation:
        Risk = 0.30H + 0.20E + 0.20C + 0.15V + 0.10P + 0.05U
        """
        factors = cls.calculate_factors(road, db)
        
        raw_risk = (
            cls.WEIGHT_H * factors["H"] +
            cls.WEIGHT_E * factors["E"] +
            cls.WEIGHT_C * factors["C"] +
            cls.WEIGHT_V * factors["V"] +
            cls.WEIGHT_P * factors["P"] +
            cls.WEIGHT_U * factors["U"]
        )
        
        risk_score = round(max(0.0, min(100.0, raw_risk)), 1)
        safe_city_score = round(max(0.0, min(100.0, 100.0 - risk_score)), 1)
        classification = cls.classify_risk(risk_score)
        quality = data_quality_service.evaluate_road_data_quality(road, db)

        # Sync back to road record in DB
        road.risk_score = risk_score
        road.safe_city_score = safe_city_score
        road.risk_confidence = quality["model_confidence"]
        road.data_coverage = quality["coverage_percentage"]
        db.commit()

        # Format factor breakdown with human-readable weights and contributions
        contributing_factors = {
            "hazard_severity": {
                "score": factors["H"],
                "weight": cls.WEIGHT_H,
                "weighted_contribution": round(cls.WEIGHT_H * factors["H"], 1),
                "max_points": 30,
                "points_display": f"{round(cls.WEIGHT_H * factors['H'])}/30",
                "label": "Observed Defects & Hazard Severity (30%)"
            },
            "traffic_exposure": {
                "score": factors["E"],
                "weight": cls.WEIGHT_E,
                "weighted_contribution": round(cls.WEIGHT_E * factors["E"], 1),
                "max_points": 20,
                "points_display": f"{round(cls.WEIGHT_E * factors['E'])}/20",
                "label": "Vehicle Traffic Volume & Exposure (20%)"
            },
            "conflict_evidence": {
                "score": factors["C"],
                "weight": cls.WEIGHT_C,
                "weighted_contribution": round(cls.WEIGHT_C * factors["C"], 1),
                "max_points": 20,
                "points_display": f"{round(cls.WEIGHT_C * factors['C'])}/20",
                "label": "Near-Miss & Traffic Conflict Evidence (20%)"
            },
            "vulnerable_user_exposure": {
                "score": factors["V"],
                "weight": cls.WEIGHT_V,
                "weighted_contribution": round(cls.WEIGHT_V * factors["V"], 1),
                "max_points": 15,
                "points_display": f"{round(cls.WEIGHT_V * factors['V'])}/15",
                "label": "Pedestrian & Cyclist Vulnerability (15%)"
            },
            "persistence": {
                "score": factors["P"],
                "weight": cls.WEIGHT_P,
                "weighted_contribution": round(cls.WEIGHT_P * factors["P"], 1),
                "max_points": 10,
                "points_display": f"{round(cls.WEIGHT_P * factors['P'])}/10",
                "label": "Recurring Hotspot / Defect Persistence (10%)"
            },
            "road_importance": {
                "score": factors["U"],
                "weight": cls.WEIGHT_U,
                "weighted_contribution": round(cls.WEIGHT_U * factors["U"], 1),
                "max_points": 5,
                "points_display": f"{round(cls.WEIGHT_U * factors['U'])}/5",
                "label": "Network Criticality & Urgency (5%)"
            }
        }

        contributors_summary = [
            {"factor": "hazard_severity", "label": "Hazard severity", "score": factors["H"], "points": round(cls.WEIGHT_H * factors["H"], 1), "max": 30, "display": f"{round(cls.WEIGHT_H * factors['H'])}/30"},
            {"factor": "traffic_exposure", "label": "Traffic exposure", "score": factors["E"], "points": round(cls.WEIGHT_E * factors["E"], 1), "max": 20, "display": f"{round(cls.WEIGHT_E * factors['E'])}/20"},
            {"factor": "conflict_evidence", "label": "Conflict evidence", "score": factors["C"], "points": round(cls.WEIGHT_C * factors["C"], 1), "max": 20, "display": f"{round(cls.WEIGHT_C * factors['C'])}/20"},
            {"factor": "vulnerable_user_exposure", "label": "Vulnerable users", "score": factors["V"], "points": round(cls.WEIGHT_V * factors["V"], 1), "max": 15, "display": f"{round(cls.WEIGHT_V * factors['V'])}/15"},
            {"factor": "persistence", "label": "Persistence", "score": factors["P"], "points": round(cls.WEIGHT_P * factors["P"], 1), "max": 10, "display": f"{round(cls.WEIGHT_P * factors['P'])}/10"},
            {"factor": "road_importance", "label": "Road importance", "score": factors["U"], "points": round(cls.WEIGHT_U * factors["U"], 1), "max": 5, "display": f"{round(cls.WEIGHT_U * factors['U'])}/5"},
        ]

        # Danger zone flag
        is_danger_zone = risk_score >= 55.0

        return {
            "road_id": road.id,
            "road_name": road.name,
            "road_type": getattr(road, "road_type", "urban_arterial"),
            "risk_score": risk_score,
            "safe_city_score": safe_city_score,
            "classification": classification,
            "is_danger_zone": is_danger_zone,
            "confidence": quality["model_confidence"],
            "confidence_tier": quality["confidence_tier"],
            "data_coverage": quality["coverage_percentage"],
            "coverage_tier": quality["coverage_tier"],
            "data_freshness": quality["data_freshness"],
            "quality_warning": quality["quality_warning"],
            "formula": "Risk = 0.30*H + 0.20*E + 0.20*C + 0.15*V + 0.10*P + 0.05*U",
            "factors": factors,
            "contributing_factors": contributing_factors,
            "contributors_summary": contributors_summary,
            "last_updated": datetime.utcnow().isoformat(),
            "disclaimer": "Calculated decision-support score from empirical observations. Does not claim certainty of future collision occurrence."
        }

    @classmethod
    def evaluate_all(cls, db: Session) -> List[Dict[str, Any]]:
        """
        Evaluates all road segments in the monitored network.
        """
        roads = db.query(Road).all()
        results = [cls.evaluate_road(r, db) for r in roads]
        # Sort by highest risk score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results


risk_engine = RiskEngine()
