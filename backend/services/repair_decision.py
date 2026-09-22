"""
SafeCity Loop V2 — Repair Decision Engine
Prioritizes road maintenance and explains WHY each road is prioritized.
Factors: severity, traffic exposure, vulnerability, near misses, repeated reports, persistence.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from backend.models import Road, Hazard, NearMiss, Junction, Repair, CitizenReport


@dataclass
class PrioritizedRepairItem:
    road_id: int
    road_name: str
    repair_id: Optional[int]
    priority_level: str          # VERY HIGH / HIGH / MEDIUM / LOW
    priority_rank: int           # 1, 2, 3...
    urgency_score: float         # 0–100
    hazard_summary: str          # e.g. "2 Potholes (1 Critical)"
    risk_score: float
    status: str                  # New / Verified / High Priority / Assigned / Under Repair / Completed
    assigned_to: Optional[str]
    reasons: List[str]           # Explanations of WHY road is prioritized
    created_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        return {
            "road_id": self.road_id,
            "road_name": self.road_name,
            "repair_id": self.repair_id,
            "priority_level": self.priority_level,
            "priority_rank": self.priority_rank,
            "urgency_score": round(self.urgency_score, 1),
            "hazard_summary": self.hazard_summary,
            "risk_score": round(self.risk_score, 1),
            "status": self.status,
            "assigned_to": self.assigned_to,
            "reasons": self.reasons,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RepairDecisionEngine:
    """
    AI-driven repair prioritization engine.
    Analyzes active hazards, traffic, vulnerability, and incident persistence to rank repairs with clear rationales.
    """

    EXPOSURE_POINTS = {"HIGH": 25.0, "MEDIUM": 15.0, "LOW": 5.0}
    VULNERABILITY_POINTS = {"HIGH": 25.0, "MEDIUM": 15.0, "LOW": 5.0}

    def compute_road_priority(self, road: Road, db: Session) -> PrioritizedRepairItem:
        hazards = db.query(Hazard).filter(Hazard.road_id == road.id, Hazard.status != "resolved").all()
        repairs = db.query(Repair).filter(Repair.road_id == road.id).order_by(Repair.priority).all()
        repair = repairs[0] if repairs else None

        reasons: List[str] = []
        score = 0.0

        # 1. Severity of active hazards
        potholes = [h for h in hazards if h.type == "pothole"]
        critical_potholes = [h for h in potholes if h.severity == "CRITICAL"]
        high_potholes = [h for h in potholes if h.severity == "HIGH"]

        if critical_potholes:
            score += 35.0
            reasons.append(f"Critical pothole severity detected ({len(critical_potholes)} critical hazard{'s' if len(critical_potholes)>1 else ''})")
        elif high_potholes:
            score += 25.0
            reasons.append(f"High pothole severity ({len(high_potholes)} high-severity defect{'s' if len(high_potholes)>1 else ''})")
        elif potholes:
            score += 12.0
            reasons.append(f"Active surface defects ({len(potholes)} pothole{'s' if len(potholes)>1 else ''} present)")

        # 2. Traffic Exposure
        exp_pts = self.EXPOSURE_POINTS.get(road.traffic_exposure.upper(), 10.0)
        score += exp_pts
        if road.traffic_exposure.upper() == "HIGH":
            reasons.append("High traffic corridor with heavy vehicle throughput")
        elif road.traffic_exposure.upper() == "MEDIUM":
            reasons.append("Moderate traffic load on collector route")

        # 3. Pedestrian / Context Vulnerability
        vuln_pts = self.VULNERABILITY_POINTS.get(road.vulnerability.upper(), 10.0)
        score += vuln_pts
        if "school" in road.name.lower():
            score += 10.0
            reasons.append("School zone proximity — elevated child pedestrian vulnerability")
        elif "hospital" in road.name.lower():
            score += 8.0
            reasons.append("Hospital & emergency response corridor — high vulnerability")
        elif road.vulnerability.upper() == "HIGH":
            reasons.append("High pedestrian vulnerability area")

        # 4. Near Misses at nearby junctions
        lat, lon = road.latitude, road.longitude
        nearby_junctions = (
            db.query(Junction)
            .filter(
                Junction.latitude.between(lat - 0.008, lat + 0.008),
                Junction.longitude.between(lon - 0.008, lon + 0.008),
            )
            .all()
        )
        near_miss_count = 0
        if nearby_junctions:
            junction_ids = [j.id for j in nearby_junctions]
            near_miss_count = db.query(NearMiss).filter(NearMiss.junction_id.in_(junction_ids)).count()
            if near_miss_count > 0:
                score += min(near_miss_count * 4.0, 15.0)
                reasons.append(f"Near misses detected ({near_miss_count} incidents recorded at nearby intersections)")

        # 5. Repeated citizen reports
        reports_count = db.query(CitizenReport).filter(
            CitizenReport.description.ilike(f"%{road.name.split('[')[0].strip()}%")
        ).count()
        if reports_count > 0:
            score += min(reports_count * 5.0, 15.0)
            reasons.append(f"Repeated citizen hazard reports ({reports_count} community report{'s' if reports_count>1 else ''})")

        # 6. Hazard persistence
        oldest_hazard = min((h.detected_at for h in hazards), default=datetime.utcnow())
        days_active = (datetime.utcnow() - oldest_hazard).days
        if days_active > 7:
            score += min(days_active * 0.5, 10.0)
            reasons.append(f"Unresolved hazard persistence ({days_active} days without completed repair)")

        urgency_score = round(min(100.0, score), 1)

        # Classification
        if urgency_score >= 80.0:
            priority_level = "VERY HIGH"
        elif urgency_score >= 60.0:
            priority_level = "HIGH"
        elif urgency_score >= 40.0:
            priority_level = "MEDIUM"
        else:
            priority_level = "LOW"

        # Hazard summary
        if potholes:
            p_types = [h.severity for h in potholes]
            hazard_summary = f"{len(potholes)} Pothole{'s' if len(potholes)>1 else ''} ({p_types[0].capitalize()})"
        elif hazards:
            hazard_summary = f"{len(hazards)} Active Hazard{'s' if len(hazards)>1 else ''}"
        else:
            hazard_summary = "Routine Maintenance"

        status = repair.status if repair else ("New" if hazards else "Completed")
        # Normalize status to prompt statuses
        status_map = {
            "pending": "New",
            "in-progress": "Under Repair",
            "completed": "Completed",
            "assigned": "Assigned",
            "verified": "Verified",
            "high-priority": "High Priority",
        }
        status = status_map.get(status.lower(), status)

        return PrioritizedRepairItem(
            road_id=road.id,
            road_name=road.name,
            repair_id=repair.id if repair else None,
            priority_level=priority_level,
            priority_rank=1,
            urgency_score=urgency_score,
            hazard_summary=hazard_summary,
            risk_score=road.risk_score,
            status=status,
            assigned_to=repair.assigned_to if repair else "Maintenance Team A [DEMO]",
            reasons=reasons,
            created_at=repair.created_at if repair else None,
        )

    def generate_repair_queue(self, db: Session) -> List[PrioritizedRepairItem]:
        roads = db.query(Road).all()
        items = [self.compute_road_priority(r, db) for r in roads]
        # Sort descending by urgency score
        items.sort(key=lambda x: x.urgency_score, reverse=True)
        # Assign 1-indexed ranks
        for idx, item in enumerate(items, start=1):
            item.priority_rank = idx
        return items
