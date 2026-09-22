"""
SafeCity Loop — Demo Data Seeder
Seeds realistic but clearly fictional data.
⚠️  ALL DATA IS DEMO DATA — NOT REAL MUNICIPAL DATA ⚠️
"""
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from backend.models import Road, Hazard, NearMiss, Junction, Repair, Intervention


def seed_all(db: Session) -> None:
    """Seed all demo data if tables are empty."""
    if db.query(Road).count() > 0:
        return  # Already seeded

    print("[SEED] Seeding DEMO DATA (not real municipal data)...")

    # ── Roads ─────────────────────────────────────────────────────────────────
    roads_data = [
        {
            "name": "School Road [DEMO]",
            "latitude": 51.5074, "longitude": -0.1278,
            "risk_score": 89.0, "safe_city_score": 11.0,
            "traffic_exposure": "HIGH", "vulnerability": "HIGH",
            "status": "pending-repair",
        },
        {
            "name": "Market Junction [DEMO]",
            "latitude": 51.5120, "longitude": -0.1190,
            "risk_score": 74.0, "safe_city_score": 26.0,
            "traffic_exposure": "HIGH", "vulnerability": "MEDIUM",
            "status": "at-risk",
        },
        {
            "name": "Hospital Road [DEMO]",
            "latitude": 51.5030, "longitude": -0.1350,
            "risk_score": 62.0, "safe_city_score": 38.0,
            "traffic_exposure": "MEDIUM", "vulnerability": "HIGH",
            "status": "monitored",
        },
        {
            "name": "Industrial Road [DEMO]",
            "latitude": 51.5200, "longitude": -0.1100,
            "risk_score": 55.0, "safe_city_score": 45.0,
            "traffic_exposure": "HIGH", "vulnerability": "MEDIUM",
            "status": "monitored",
        },
        {
            "name": "Main Road Segment 7 [DEMO]",
            "latitude": 51.4980, "longitude": -0.1400,
            "risk_score": 38.0, "safe_city_score": 62.0,
            "traffic_exposure": "MEDIUM", "vulnerability": "LOW",
            "status": "monitored",
        },
        {
            "name": "Residential Lane 3 [DEMO]",
            "latitude": 51.5150, "longitude": -0.1320,
            "risk_score": 21.0, "safe_city_score": 79.0,
            "traffic_exposure": "LOW", "vulnerability": "LOW",
            "status": "monitored",
        },
    ]
    roads = []
    for rd in roads_data:
        road = Road(**rd)
        db.add(road)
        roads.append(road)
    db.flush()

    # ── Junctions ─────────────────────────────────────────────────────────────
    junctions_data = [
        {"name": "Market Junction North [DEMO]", "latitude": 51.5125, "longitude": -0.1185, "risk_score": 78.0, "camera_id": "CAM-001", "status": "active"},
        {"name": "School Road Crossing [DEMO]", "latitude": 51.5080, "longitude": -0.1270, "risk_score": 91.0, "camera_id": "CAM-002", "status": "active"},
        {"name": "Hospital Entrance [DEMO]", "latitude": 51.5035, "longitude": -0.1345, "risk_score": 60.0, "camera_id": "CAM-003", "status": "active"},
        {"name": "Industrial Gate [DEMO]", "latitude": 51.5205, "longitude": -0.1095, "risk_score": 52.0, "camera_id": "CAM-004", "status": "active"},
    ]
    junctions = []
    for jd in junctions_data:
        j = Junction(**jd)
        db.add(j)
        junctions.append(j)
    db.flush()

    # ── Hazards ───────────────────────────────────────────────────────────────
    hazard_types = [
        ("pothole", "HIGH", 0.92),
        ("pothole", "CRITICAL", 0.97),
        ("near-miss", "HIGH", 0.85),
        ("near-miss", "CRITICAL", 0.91),
        ("dangerous-junction", "HIGH", 0.88),
        ("road-work", "MEDIUM", 0.75),
        ("high-risk-zone", "HIGH", 0.82),
    ]
    now = datetime.utcnow()
    hazards_created = []
    for road in roads:
        count = random.randint(1, 4)
        for i in range(count):
            htype, severity, confidence = random.choice(hazard_types)
            lat_offset = random.uniform(-0.001, 0.001)
            lon_offset = random.uniform(-0.001, 0.001)
            h = Hazard(
                road_id=road.id,
                type=htype,
                severity=severity,
                confidence=confidence,
                risk_score=round(road.risk_score * random.uniform(0.8, 1.0), 1),
                latitude=road.latitude + lat_offset,
                longitude=road.longitude + lon_offset,
                detected_at=now - timedelta(hours=random.randint(0, 72)),
                status="active",
            )
            db.add(h)
            hazards_created.append(h)
    db.flush()

    # ── Near Misses ───────────────────────────────────────────────────────────
    risk_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    conflict_zones = ["Zebra crossing", "Intersection", "Bus stop", "Roundabout exit", "School entrance"]
    object_combos = [
        ["vehicle", "pedestrian"],
        ["vehicle", "cyclist"],
        ["vehicle", "vehicle"],
        ["pedestrian", "cyclist"],
    ]
    for junction in junctions:
        count = random.randint(2, 6)
        for _ in range(count):
            nm = NearMiss(
                junction_id=junction.id,
                timestamp=now - timedelta(minutes=random.randint(0, 1440)),
                object_types=random.choice(object_combos),
                ttc=round(random.uniform(0.3, 3.0), 2),
                risk_level=random.choice(risk_levels),
                conflict_zone=random.choice(conflict_zones),
            )
            db.add(nm)
    db.flush()

    # ── Repairs (10 tasks across roads) ──────────────────────────────────────
    reasons = [
        "Critical pothole severity detected by local AI vision system",
        "High near-miss frequency and surface degradation",
        "AI risk engine flagged critical score threshold",
        "Citizen reports with photographic corroboration",
        "Predictive maintenance trigger: surface age and traffic load",
        "School zone perimeter safety reinforcement",
        "Junction approach asphalt unraveling",
        "Multiple severe depressions near pedestrian crosswalk",
        "Transit corridor heavy-vehicle rutting",
        "High water retention and aggregate loss after rain",
    ]
    statuses = [
        "High Priority", "Under Repair", "Assigned", "Verified", "Completed",
        "New", "High Priority", "Assigned", "Under Repair", "Completed"
    ]
    teams = [
        "Rapid Asphalt Team A [DEMO]", "Council Civil Works #3 [DEMO]",
        "Emergency Pothole Unit 1 [DEMO]", "Northern District Crew [DEMO]",
        "Highways Authority Taskforce [DEMO]"
    ]
    for i in range(10):
        target_road = roads[i % len(roads)]
        status = statuses[i]
        r = Repair(
            road_id=target_road.id,
            priority=i + 1,
            reason=reasons[i],
            status=status,
            assigned_to=teams[i % len(teams)],
            before_risk=target_road.risk_score,
            after_risk=round(target_road.risk_score * 0.42, 1) if status == "Completed" else None,
            created_at=now - timedelta(days=random.randint(1, 14)),
        )
        db.add(r)
    db.flush()

    # ── Interventions (5 historical before/after records) ──────────────────────
    interventions_data = [
        {
            "name": "School Road Safety Corridor [DEMO]",
            "type": "resurfacing",
            "road_id": roads[0].id,
            "before_risk": 89.0, "after_risk": 34.0,
            "before_near_misses": 14, "after_near_misses": 3,
            "implemented_at": now - timedelta(days=90),
            "notes": "Full micro-surfacing + speed cushions + high-friction surfacing at crosswalk",
        },
        {
            "name": "Market Junction Smart Signal Upgrade [DEMO]",
            "type": "signage",
            "road_id": roads[1].id,
            "before_risk": 78.0, "after_risk": 32.0,
            "before_near_misses": 19, "after_near_misses": 5,
            "implemented_at": now - timedelta(days=60),
            "notes": "Adaptive dynamic traffic signals + AI optical sensor pedestrian display",
        },
        {
            "name": "Hospital Road Emergency Access Resurface [DEMO]",
            "type": "resurfacing",
            "road_id": roads[2].id,
            "before_risk": 68.0, "after_risk": 29.0,
            "before_near_misses": 9, "after_near_misses": 2,
            "implemented_at": now - timedelta(days=45),
            "notes": "Deep asphalt patching and high-luminance LED road studs",
        },
        {
            "name": "Industrial Avenue Anti-Skid Treatment [DEMO]",
            "type": "resurfacing",
            "road_id": roads[3].id,
            "before_risk": 72.0, "after_risk": 38.0,
            "before_near_misses": 11, "after_near_misses": 4,
            "implemented_at": now - timedelta(days=30),
            "notes": "Calcined bauxite epoxy surface dressing on tight bend",
        },
        {
            "name": "Main Road Segment 7 Pedestrian Refuge [DEMO]",
            "type": "signage",
            "road_id": roads[4].id,
            "before_risk": 55.0, "after_risk": 22.0,
            "before_near_misses": 7, "after_near_misses": 1,
            "implemented_at": now - timedelta(days=15),
            "notes": "Raised pedestrian island with solar-powered reflective bollards",
        },
    ]
    for iv in interventions_data:
        db.add(Intervention(**iv))
    db.flush()

    # ── Citizen Reports (Sample initial reports) ───────────────────────────────
    citizen_reports_data = [
        {
            "report_code": "SC-DEMO-00128",
            "reporter_name": "Sarah Jenkins [DEMO]",
            "type": "pothole",
            "description": "Deep 10cm pothole right before the school crossing. Cyclists swerving into traffic.",
            "latitude": 51.5076,
            "longitude": -0.1275,
            "severity": "HIGH",
            "status": "AI Verification Pending",
            "submitted_at": now - timedelta(hours=3),
        },
        {
            "report_code": "SC-DEMO-00129",
            "reporter_name": "Marcus Vance [DEMO]",
            "type": "near-miss",
            "description": "Van almost struck student running across during amber light phase.",
            "latitude": 51.5122,
            "longitude": -0.1192,
            "severity": "CRITICAL",
            "status": "AI Verification Pending",
            "submitted_at": now - timedelta(hours=6),
        },
        {
            "report_code": "SC-DEMO-00130",
            "reporter_name": "Dr. Aris Thorne [DEMO]",
            "type": "pothole",
            "description": "Sunken utility trench near hospital ambulance bay entrance.",
            "latitude": 51.5032,
            "longitude": -0.1348,
            "severity": "MEDIUM",
            "status": "AI Verification Pending",
            "submitted_at": now - timedelta(hours=14),
        },
    ]
    from backend.models import CitizenReport
    for cr in citizen_reports_data:
        db.add(CitizenReport(**cr))

    db.commit()
    print("[DONE] DEMO DATA seeded successfully.")

