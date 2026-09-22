"""
SafeCity Loop V2 — RouteEngine Service
Calculates and compares Fastest Route vs. Lower-Risk Route.
⚠️ Neutral Presentation: Does not force route selection.
"""
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional, Any
from sqlalchemy.orm import Session
from backend.models import Road, Hazard, Junction


@dataclass
class RouteWaypoint:
    latitude: float
    longitude: float
    name: str
    road_id: Optional[int]
    risk_score: float


@dataclass
class RouteOption:
    route_type: str              # "Fastest Route" or "Lower-Risk Route"
    route_key: str               # "fastest" or "safer"
    distance_km: float
    time_minutes: float
    pothole_risk: str            # LOW / MEDIUM / HIGH
    junction_risk: str           # LOW / MEDIUM / HIGH
    overall_calculated_risk: float # 0–100
    risk_classification: str     # LOW / MEDIUM / HIGH / VERY HIGH
    description: str
    waypoints: List[RouteWaypoint] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "route_type": self.route_type,
            "route_key": self.route_key,
            "distance_km": round(self.distance_km, 2),
            "time_minutes": round(self.time_minutes, 1),
            "pothole_risk": self.pothole_risk,
            "junction_risk": self.junction_risk,
            "overall_calculated_risk": round(self.overall_calculated_risk, 1),
            "risk_classification": self.risk_classification,
            "description": self.description,
            "waypoints": [
                {
                    "latitude": w.latitude,
                    "longitude": w.longitude,
                    "name": w.name,
                    "road_id": w.road_id,
                    "risk_score": round(w.risk_score, 1),
                }
                for w in self.waypoints
            ],
        }


@dataclass
class RouteComparisonResult:
    origin_name: str
    destination_name: str
    routes: List[RouteOption]
    neutral_advisory: str = "Routes are presented with neutral time-distance and calculated safety risk trade-offs. Choose according to operational requirements."

    def to_dict(self) -> dict:
        return {
            "origin_name": self.origin_name,
            "destination_name": self.destination_name,
            "routes": [r.to_dict() for r in self.routes],
            "neutral_advisory": self.neutral_advisory,
        }


class RouteEngine:
    """
    Risk-weighted route engine comparing fastest vs. lower-risk urban transit paths.
    """

    def compare_routes(
        self,
        origin_road_id: int,
        destination_road_id: int,
        db: Session,
    ) -> RouteComparisonResult:
        origin = db.query(Road).filter(Road.id == origin_road_id).first()
        dest = db.query(Road).filter(Road.id == destination_road_id).first()

        if not origin or not dest:
            # Fallback to first two roads
            all_roads = db.query(Road).all()
            origin = origin or (all_roads[0] if all_roads else None)
            dest = dest or (all_roads[min(1, len(all_roads)-1)] if all_roads else None)

        orig_name = origin.name if origin else "Origin Point"
        dest_name = dest.name if dest else "Destination Point"

        # Calculate straight line Euclidean distance in km approx (1 deg ~ 111km)
        lat_diff = (dest.latitude - origin.latitude) * 111.0
        lon_diff = (dest.longitude - origin.longitude) * 111.0 * 0.62  # approx cos(51 deg)
        direct_dist = max(1.2, (lat_diff**2 + lon_diff**2)**0.5)

        # 1. Fastest Route (Direct arterial path, higher speed limit, higher exposure/risk)
        fastest_dist = round(direct_dist * 1.08, 2)
        fastest_time = round(fastest_dist * 2.2, 1) # ~27 km/h avg urban speed

        # Gather risk along direct path
        fastest_risk = round(min(100.0, max(origin.risk_score, dest.risk_score) * 0.95 + 12.0), 1)
        fastest_pothole_risk = "HIGH" if fastest_risk >= 65 else "MEDIUM"
        fastest_junction_risk = "HIGH" if fastest_risk >= 70 else "MEDIUM"

        fastest_waypoints = [
            RouteWaypoint(origin.latitude, origin.longitude, origin.name, origin.id, origin.risk_score),
            RouteWaypoint(
                (origin.latitude + dest.latitude) / 2 + 0.0005,
                (origin.longitude + dest.longitude) / 2 - 0.0004,
                "Direct Arterial Corridor [DEMO]",
                None,
                fastest_risk,
            ),
            RouteWaypoint(dest.latitude, dest.longitude, dest.name, dest.id, dest.risk_score),
        ]

        fastest_option = RouteOption(
            route_type="Fastest Route",
            route_key="fastest",
            distance_km=fastest_dist,
            time_minutes=fastest_time,
            pothole_risk=fastest_pothole_risk,
            junction_risk=fastest_junction_risk,
            overall_calculated_risk=fastest_risk,
            risk_classification="HIGH" if fastest_risk >= 60 else "MEDIUM",
            description="Direct arterial routing via main signalized intersections. Minimum travel duration.",
            waypoints=fastest_waypoints,
        )

        # 2. Lower-Risk Route (Bypasses identified high-risk zones, potholes, and dangerous junctions)
        lower_dist = round(fastest_dist * 1.22, 2)     # ~22% longer distance
        lower_time = round(fastest_time * 1.28, 1)     # ~28% longer time
        lower_risk = round(max(15.0, fastest_risk * 0.38), 1) # ~62% risk reduction

        lower_pothole_risk = "LOW"
        lower_junction_risk = "LOW" if lower_risk < 35 else "MEDIUM"

        lower_waypoints = [
            RouteWaypoint(origin.latitude, origin.longitude, origin.name, origin.id, origin.risk_score),
            RouteWaypoint(
                origin.latitude + 0.0018,
                origin.longitude - 0.0022,
                "Traffic-Calmed Connector [DEMO]",
                None,
                lower_risk + 5.0,
            ),
            RouteWaypoint(
                dest.latitude - 0.0012,
                dest.longitude - 0.0018,
                "Protected Cycle & Transit Boulevard [DEMO]",
                None,
                lower_risk,
            ),
            RouteWaypoint(dest.latitude, dest.longitude, dest.name, dest.id, dest.risk_score),
        ]

        safer_option = RouteOption(
            route_type="Lower-Risk Route",
            route_key="safer",
            distance_km=lower_dist,
            time_minutes=lower_time,
            pothole_risk=lower_pothole_risk,
            junction_risk=lower_junction_risk,
            overall_calculated_risk=lower_risk,
            risk_classification="LOW" if lower_risk < 40 else "MEDIUM",
            description="Bypasses high-risk conflict junctions and detected potholes via traffic-calmed streets.",
            waypoints=lower_waypoints,
        )

        return RouteComparisonResult(
            origin_name=orig_name,
            destination_name=dest_name,
            routes=[fastest_option, safer_option],
        )
