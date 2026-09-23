"""
SafeCity Loop V2 — Deterministic Demo Data Seeder
Populates a realistic, cohesive smart city road safety network.
⚠️ ALL DATA IS DETERMINISTIC DEMO DATA — NOT REAL MUNICIPAL DATA.
Locations: School Road, Market Junction, Hospital Road, Industrial Road, Main Road Corridor, Residential Lane.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models import (
    Road, Hazard, NearMiss, Junction, Repair, Intervention,
    CitizenReport, RiskSnapshot, EvidenceFile, AuditLog
)
from backend.database import Base, engine, SessionLocal


def seed_all(db: Session, force_reseed: bool = False) -> None:
    """
    Deterministically seeds demo data if tables are empty or if force_reseed is True.
    Zero random generation — completely deterministic on every run.
    """
    if not force_reseed and db.query(Road).count() > 0:
        return

    print("[SEED] Seeding DETERMINISTIC SafeCity Loop V2 Demo Data...")

    # Recreate tables to ensure any new columns exist if force_reseed
    if force_reseed:
        db.rollback()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    now = datetime(2026, 9, 23, 12, 0, 0)

    # ── 1. Roads (RoadSegments) ───────────────────────────────────────────────
    roads_seed = [
        {
            "id": 1,
            "name": "School Road [DEMO]",
            "latitude": 51.5074,
            "longitude": -0.1278,
            "road_type": "school_zone",
            "traffic_exposure": "HIGH",
            "vulnerability": "HIGH",
            "vulnerability_score": 92.0,
            "importance_score": 95.0,
            "risk_score": 87.5,
            "risk_confidence": 0.91,
            "safe_city_score": 12.5,
            "data_coverage": 88.0,
            "last_observed": now - timedelta(hours=4),
            "status": "pending-repair",
            "geometry": [[51.5065, -0.1285], [51.5074, -0.1278], [51.5085, -0.1270]],
        },
        {
            "id": 2,
            "name": "Market Junction [DEMO]",
            "latitude": 51.5120,
            "longitude": -0.1190,
            "road_type": "urban_arterial",
            "traffic_exposure": "VERY HIGH",
            "vulnerability": "MEDIUM",
            "vulnerability_score": 68.0,
            "importance_score": 85.0,
            "risk_score": 76.0,
            "risk_confidence": 0.88,
            "safe_city_score": 24.0,
            "data_coverage": 92.0,
            "last_observed": now - timedelta(hours=2),
            "status": "at-risk",
            "geometry": [[51.5110, -0.1200], [51.5120, -0.1190], [51.5130, -0.1180]],
        },
        {
            "id": 3,
            "name": "Hospital Road [DEMO]",
            "latitude": 51.5030,
            "longitude": -0.1350,
            "road_type": "transit_corridor",
            "traffic_exposure": "MEDIUM",
            "vulnerability": "HIGH",
            "vulnerability_score": 82.0,
            "importance_score": 90.0,
            "risk_score": 64.0,
            "risk_confidence": 0.86,
            "safe_city_score": 36.0,
            "data_coverage": 84.0,
            "last_observed": now - timedelta(hours=8),
            "status": "monitored",
            "geometry": [[51.5020, -0.1360], [51.5030, -0.1350], [51.5040, -0.1340]],
        },
        {
            "id": 4,
            "name": "Industrial Road [DEMO]",
            "latitude": 51.5200,
            "longitude": -0.1100,
            "road_type": "industrial",
            "traffic_exposure": "HIGH",
            "vulnerability": "LOW",
            "vulnerability_score": 35.0,
            "importance_score": 60.0,
            "risk_score": 53.0,
            "risk_confidence": 0.79,
            "safe_city_score": 47.0,
            "data_coverage": 65.0,
            "last_observed": now - timedelta(hours=28),
            "status": "monitored",
            "geometry": [[51.5190, -0.1110], [51.5200, -0.1100], [51.5215, -0.1085]],
        },
        {
            "id": 5,
            "name": "Main Road Corridor [DEMO]",
            "latitude": 51.4980,
            "longitude": -0.1400,
            "road_type": "urban_arterial",
            "traffic_exposure": "MEDIUM",
            "vulnerability": "LOW",
            "vulnerability_score": 25.0,
            "importance_score": 75.0,
            "risk_score": 36.5,
            "risk_confidence": 0.82,
            "safe_city_score": 63.5,
            "data_coverage": 70.0,
            "last_observed": now - timedelta(hours=14),
            "status": "monitored",
            "geometry": [[51.4965, -0.1415], [51.4980, -0.1400], [51.4995, -0.1385]],
        },
        {
            "id": 6,
            "name": "Residential Lane [DEMO]",
            "latitude": 51.5150,
            "longitude": -0.1320,
            "road_type": "local_residential",
            "traffic_exposure": "LOW",
            "vulnerability": "LOW",
            "vulnerability_score": 20.0,
            "importance_score": 35.0,
            "risk_score": 19.0,
            "risk_confidence": 0.65,
            "safe_city_score": 81.0,
            "data_coverage": 42.0,
            "last_observed": now - timedelta(days=6),
            "status": "monitored",
            "geometry": [[51.5140, -0.1330], [51.5150, -0.1320], [51.5160, -0.1310]],
        },
    ]

    roads = []
    for rd in roads_seed:
        r = Road(**rd)
        db.add(r)
        roads.append(r)
    db.commit()

    # ── 2. Junctions ──────────────────────────────────────────────────────────
    junctions_seed = [
        {"id": 1, "name": "Market Junction North [DEMO]", "latitude": 51.5125, "longitude": -0.1185, "risk_score": 82.0, "camera_id": "CAM-001", "status": "active"},
        {"id": 2, "name": "School Road Crossing [DEMO]", "latitude": 51.5080, "longitude": -0.1270, "risk_score": 91.0, "camera_id": "CAM-002", "status": "active"},
        {"id": 3, "name": "Hospital Entrance [DEMO]", "latitude": 51.5035, "longitude": -0.1345, "risk_score": 62.0, "camera_id": "CAM-003", "status": "active"},
        {"id": 4, "name": "Industrial Gate [DEMO]", "latitude": 51.5205, "longitude": -0.1095, "risk_score": 54.0, "camera_id": "CAM-004", "status": "active"},
    ]
    junctions = []
    for jd in junctions_seed:
        j = Junction(**jd)
        db.add(j)
        junctions.append(j)
    db.commit()

    # ── 3. Hazards (HazardObservations) ───────────────────────────────────────
    hazards_seed = [
        # School Road
        {"road_id": 1, "type": "pothole", "severity": "CRITICAL", "visual_severity": "CRITICAL", "contextual_severity": "CRITICAL", "confidence": 0.94, "risk_score": 92.0, "latitude": 51.5076, "longitude": -0.1276, "gps_accuracy": 3.8, "detected_at": now - timedelta(hours=4), "status": "active", "source": "AI Vision", "verified": True, "evidence_id": "EV-2026-0001", "evidence_code": "SC-H-1001", "direction": "Northbound Lane 1"},
        {"road_id": 1, "type": "pothole", "severity": "HIGH", "visual_severity": "HIGH", "contextual_severity": "CRITICAL", "confidence": 0.89, "risk_score": 84.0, "latitude": 51.5072, "longitude": -0.1280, "gps_accuracy": 4.1, "detected_at": now - timedelta(hours=18), "status": "active", "source": "AI Vision", "verified": True, "evidence_id": "EV-2026-0002", "evidence_code": "SC-H-1002", "direction": "Northbound Lane 2"},
        {"road_id": 1, "type": "dangerous-junction", "severity": "HIGH", "visual_severity": "HIGH", "contextual_severity": "HIGH", "confidence": 0.92, "risk_score": 86.0, "latitude": 51.5080, "longitude": -0.1271, "gps_accuracy": 3.2, "detected_at": now - timedelta(days=1), "status": "active", "source": "Municipal Inspection", "verified": True, "evidence_id": "EV-2026-0003", "evidence_code": "SC-H-1003", "direction": "Intersection Crossing"},

        # Market Junction
        {"road_id": 2, "type": "pothole", "severity": "HIGH", "visual_severity": "HIGH", "contextual_severity": "HIGH", "confidence": 0.87, "risk_score": 78.0, "latitude": 51.5122, "longitude": -0.1188, "gps_accuracy": 4.5, "detected_at": now - timedelta(hours=6), "status": "active", "source": "AI Vision", "verified": True, "evidence_id": "EV-2026-0004", "evidence_code": "SC-H-1004", "direction": "Eastbound Bus Bay"},
        {"road_id": 2, "type": "road-work", "severity": "MEDIUM", "visual_severity": "MEDIUM", "contextual_severity": "HIGH", "confidence": 0.78, "risk_score": 62.0, "latitude": 51.5118, "longitude": -0.1192, "gps_accuracy": 5.0, "detected_at": now - timedelta(days=2), "status": "active", "source": "Citizen Report", "verified": False, "evidence_id": "EV-2026-0005", "evidence_code": "SC-H-1005", "direction": "Westbound Shoulder"},

        # Hospital Road
        {"road_id": 3, "type": "pothole", "severity": "MEDIUM", "visual_severity": "MEDIUM", "contextual_severity": "HIGH", "confidence": 0.85, "risk_score": 65.0, "latitude": 51.5032, "longitude": -0.1348, "gps_accuracy": 4.2, "detected_at": now - timedelta(hours=12), "status": "active", "source": "AI Vision", "verified": True, "evidence_id": "EV-2026-0006", "evidence_code": "SC-H-1006", "direction": "Ambulance Lane"},
        {"road_id": 3, "type": "near-miss", "severity": "HIGH", "visual_severity": "HIGH", "contextual_severity": "HIGH", "confidence": 0.88, "risk_score": 74.0, "latitude": 51.5036, "longitude": -0.1344, "gps_accuracy": 3.5, "detected_at": now - timedelta(days=1), "status": "active", "source": "AI Vision", "verified": True, "evidence_id": "EV-2026-0007", "evidence_code": "SC-H-1007", "direction": "Emergency Bay Crossing"},

        # Industrial Road
        {"road_id": 4, "type": "pothole", "severity": "HIGH", "visual_severity": "HIGH", "contextual_severity": "MEDIUM", "confidence": 0.82, "risk_score": 72.0, "latitude": 51.5202, "longitude": -0.1098, "gps_accuracy": 5.5, "detected_at": now - timedelta(hours=30), "status": "active", "source": "Citizen Report", "verified": True, "evidence_id": "EV-2026-0008", "evidence_code": "SC-H-1008", "direction": "Freight Lane"},

        # Main Road Corridor
        {"road_id": 5, "type": "pothole", "severity": "LOW", "visual_severity": "LOW", "contextual_severity": "LOW", "confidence": 0.79, "risk_score": 38.0, "latitude": 51.4982, "longitude": -0.1398, "gps_accuracy": 4.8, "detected_at": now - timedelta(days=3), "status": "monitoring", "source": "AI Vision", "verified": False, "evidence_id": "EV-2026-0009", "evidence_code": "SC-H-1009", "direction": "Southbound"},

        # Residential Lane
        {"road_id": 6, "type": "pothole", "severity": "LOW", "visual_severity": "LOW", "contextual_severity": "LOW", "confidence": 0.71, "risk_score": 28.0, "latitude": 51.5152, "longitude": -0.1318, "gps_accuracy": 6.2, "detected_at": now - timedelta(days=7), "status": "monitoring", "source": "Citizen Report", "verified": False, "evidence_id": "EV-2026-0010", "evidence_code": "SC-H-1010", "direction": "Cul-de-sac"},
    ]
    for hd in hazards_seed:
        db.add(Hazard(**hd))
    db.commit()

    # ── 4. Conflict Events (NearMisses) ───────────────────────────────────────
    conflicts_seed = [
        {
            "junction_id": 2,
            "road_id": 1,
            "video_id": "VID-2026-0922-01",
            "timestamp": now - timedelta(hours=3),
            "object_types": ["vehicle", "pedestrian"],
            "object_type_a": "car",
            "object_type_b": "pedestrian",
            "ttc": 1.15,
            "pet": 1.42,
            "minimum_distance": 1.8,
            "risk_level": "CRITICAL",
            "event_severity": "CRITICAL",
            "conflict_zone": "Pedestrian Crossing Corridor",
            "direction": "Northbound ⟷ Crosswalk",
            "confidence": 0.93,
            "source": "YOLOv8 + ByteTrack (Local Edge)",
            "review_status": "pending_review",
            "evidence_clip": "/uploads/traffic/sample_conflict_school.mp4",
        },
        {
            "junction_id": 1,
            "road_id": 2,
            "video_id": "VID-2026-0922-02",
            "timestamp": now - timedelta(hours=7),
            "object_types": ["motorcycle", "pedestrian"],
            "object_type_a": "motorcycle",
            "object_type_b": "pedestrian",
            "ttc": 1.45,
            "pet": 1.85,
            "minimum_distance": 2.2,
            "risk_level": "HIGH",
            "event_severity": "HIGH",
            "conflict_zone": "Intersection Center Merge",
            "direction": "Eastbound Turn ⟷ Median Crossing",
            "confidence": 0.90,
            "source": "YOLOv8 + ByteTrack (Local Edge)",
            "review_status": "reviewed",
            "evidence_clip": "/uploads/traffic/sample_conflict_market.mp4",
        },
        {
            "junction_id": 3,
            "road_id": 3,
            "video_id": "VID-2026-0921-01",
            "timestamp": now - timedelta(hours=19),
            "object_types": ["car", "pedestrian"],
            "object_type_a": "car",
            "object_type_b": "pedestrian",
            "ttc": 1.58,
            "pet": 2.10,
            "minimum_distance": 2.9,
            "risk_level": "HIGH",
            "event_severity": "HIGH",
            "conflict_zone": "Ambulance Bay Egress",
            "direction": "Southbound ⟷ Hospital Walkway",
            "confidence": 0.88,
            "source": "YOLOv8 + ByteTrack (Local Edge)",
            "review_status": "actioned",
            "evidence_clip": "/uploads/traffic/sample_conflict_hospital.mp4",
        },
        {
            "junction_id": 4,
            "road_id": 4,
            "video_id": "VID-2026-0920-01",
            "timestamp": now - timedelta(days=2),
            "object_types": ["truck", "car"],
            "object_type_a": "truck",
            "object_type_b": "car",
            "ttc": 1.82,
            "pet": 2.30,
            "minimum_distance": 3.4,
            "risk_level": "MEDIUM",
            "event_severity": "MEDIUM",
            "conflict_zone": "Industrial Gate T-Junction",
            "direction": "Westbound Turn ⟷ Gate Entry",
            "confidence": 0.86,
            "source": "YOLOv8 + ByteTrack (Local Edge)",
            "review_status": "reviewed",
            "evidence_clip": "/uploads/traffic/sample_conflict_industrial.mp4",
        },
    ]
    for cd in conflicts_seed:
        db.add(NearMiss(**cd))
    db.commit()

    # ── 5. Repairs (RepairRecords) ────────────────────────────────────────────
    repairs_seed = [
        {
            "road_id": 1,
            "priority": 1,
            "reason": "Severe pothole cluster in active school zone with 92% pedestrian vulnerability score",
            "status": "in-progress",
            "assigned_to": "Metro Asphalt Unit Alpha",
            "assigned_department": "Municipal Road Maintenance",
            "recommended_action": "Milling & Full-Depth Asphalt Infill",
            "approval_status": "approved",
            "repair_date": now + timedelta(days=1),
            "before_score": 87.5,
            "after_score": 28.0,
            "before_observations": 3,
            "after_observations": 0,
            "created_at": now - timedelta(days=2),
        },
        {
            "road_id": 2,
            "priority": 2,
            "reason": "Arterial junction surface fatigue causing lateral swerving across active lanes",
            "status": "pending",
            "assigned_to": "Contractor Rapid Patch Team",
            "assigned_department": "District Highways Division",
            "recommended_action": "Thermal Patch Resurfacing & Anti-Skid Re-texture",
            "approval_status": "approved",
            "repair_date": now + timedelta(days=3),
            "before_score": 76.0,
            "after_score": 32.0,
            "before_observations": 2,
            "after_observations": 0,
            "created_at": now - timedelta(days=1),
        },
        {
            "road_id": 3,
            "priority": 3,
            "reason": "Pavement depression near emergency corridor access",
            "status": "pending",
            "assigned_to": "City Maintenance Crew 4",
            "assigned_department": "Municipal Road Maintenance",
            "recommended_action": "Localized Micro-Surfacing",
            "approval_status": "pending_approval",
            "repair_date": now + timedelta(days=5),
            "before_score": 64.0,
            "after_score": 25.0,
            "before_observations": 2,
            "after_observations": 0,
            "created_at": now - timedelta(hours=16),
        },
        {
            "road_id": 4,
            "priority": 4,
            "reason": "Heavy axle load structural rutting on freight access corridor",
            "status": "completed",
            "assigned_to": "Heavy Freight Logistics Infrastructure Team",
            "assigned_department": "Port & Industrial Roads Board",
            "recommended_action": "Reinforced Concrete Base Replacement",
            "approval_status": "approved",
            "repair_date": now - timedelta(days=4),
            "before_score": 84.0,
            "after_score": 53.0,
            "before_observations": 4,
            "after_observations": 1,
            "created_at": now - timedelta(days=14),
        },
    ]
    for rd in repairs_seed:
        db.add(Repair(**rd))
    db.commit()

    # ── 6. Interventions (Before / After Evidence) ────────────────────────────
    interventions_seed = [
        {
            "road_id": 4,
            "name": "Industrial Gate Heavy Vehicle Surface Reconstruction [DEMO]",
            "type": "resurfacing",
            "before_risk": 84.0,
            "after_risk": 53.0,
            "before_near_misses": 6,
            "after_near_misses": 1,
            "implemented_at": now - timedelta(days=4),
            "notes": "Replaced fatigued asphalt top layer with polymer-modified bitumen. Reduced heavy brake slippage near access gates.",
        },
        {
            "road_id": 5,
            "name": "Main Road Pedestrian Island & High-Visibility Crossing [DEMO]",
            "type": "signage",
            "before_risk": 72.0,
            "after_risk": 36.5,
            "before_near_misses": 8,
            "after_near_misses": 2,
            "implemented_at": now - timedelta(days=21),
            "notes": "Installed central refuge island and solar-illuminated pedestrian signage. Noticeable drop in mid-block crossing conflicts.",
        },
        {
            "road_id": 6,
            "name": "Residential Lane Chicanes & 20mph Traffic Calming [DEMO]",
            "type": "speed-bump",
            "before_risk": 58.0,
            "after_risk": 19.0,
            "before_near_misses": 4,
            "after_near_misses": 0,
            "implemented_at": now - timedelta(days=35),
            "notes": "Added dual chicanes to eliminate rat-running shortcuts between commercial avenues.",
        },
    ]
    for idata in interventions_seed:
        db.add(Intervention(**idata))
    db.commit()

    # ── 7. Evidence Files ─────────────────────────────────────────────────────
    evidence_seed = [
        {
            "evidence_code": "EV-2026-0001",
            "road_id": 1,
            "hazard_id": 1,
            "file_type": "image",
            "file_url": "/uploads/potholes/school_rd_crater_01.jpg",
            "thumbnail_url": "/uploads/potholes/school_rd_crater_01.jpg",
            "captured_at": now - timedelta(hours=4),
            "metadata_json": {"bounding_boxes": [[120, 85, 260, 195]], "confidence": 0.94, "severity": "CRITICAL"},
            "verified": True,
            "notes": "Deep crater located directly in pedestrian walking path of school crossing.",
        },
        {
            "evidence_code": "EV-2026-0002",
            "road_id": 1,
            "hazard_id": 2,
            "file_type": "image",
            "file_url": "/uploads/potholes/school_rd_crater_02.jpg",
            "thumbnail_url": "/uploads/potholes/school_rd_crater_02.jpg",
            "captured_at": now - timedelta(hours=18),
            "metadata_json": {"bounding_boxes": [[90, 110, 210, 220]], "confidence": 0.89, "severity": "HIGH"},
            "verified": True,
            "notes": "Spalling road surface with loose gravel scatter.",
        },
        {
            "evidence_code": "EV-2026-0003",
            "road_id": 2,
            "conflict_id": 2,
            "file_type": "video_clip",
            "file_url": "/uploads/traffic/market_crossing_clip.mp4",
            "thumbnail_url": "/uploads/traffic/market_crossing_thumb.jpg",
            "captured_at": now - timedelta(hours=7),
            "metadata_json": {"ttc": 1.45, "minimum_distance_m": 2.2, "object_types": ["vehicle", "cyclist"]},
            "verified": True,
            "notes": "Left-turning van came within 2.2m of oncoming cyclist.",
        },
        {
            "evidence_code": "EV-2026-0004",
            "road_id": 3,
            "hazard_id": 6,
            "file_type": "image",
            "file_url": "/uploads/potholes/hospital_rd_pothole.jpg",
            "thumbnail_url": "/uploads/potholes/hospital_rd_pothole.jpg",
            "captured_at": now - timedelta(hours=12),
            "metadata_json": {"bounding_boxes": [[140, 95, 240, 180]], "confidence": 0.85, "severity": "MEDIUM"},
            "verified": True,
            "notes": "Depression on ambulance curb approach.",
        },
    ]
    for ev in evidence_seed:
        db.add(EvidenceFile(**ev))
    db.commit()

    # ── 8. Risk Snapshots (Historical Trend Analytics) ────────────────────────
    # 7-day risk trajectory for School Road, Market Junction, Hospital Road
    for day_offset in range(7, -1, -1):
        snap_time = now - timedelta(days=day_offset)
        # School Road trending slightly upwards due to defect growth
        db.add(RiskSnapshot(
            road_id=1,
            timestamp=snap_time,
            risk_score=round(78.0 + (7 - day_offset) * 1.35, 1),
            confidence=0.91,
            data_coverage=88.0,
            hazard_severity=92.0,
            traffic_exposure=80.0,
            conflict_evidence=90.0,
            vulnerable_exposure=92.0,
            persistence=85.0,
            road_importance=95.0,
            contributing_factors={"hazard": 92.0, "vulnerability": 92.0}
        ))
        # Market Junction stable high
        db.add(RiskSnapshot(
            road_id=2,
            timestamp=snap_time,
            risk_score=round(74.0 + (7 - day_offset) * 0.28, 1),
            confidence=0.88,
            data_coverage=92.0,
            hazard_severity=78.0,
            traffic_exposure=95.0,
            conflict_evidence=82.0,
            vulnerable_exposure=68.0,
            persistence=70.0,
            road_importance=85.0,
            contributing_factors={"traffic": 95.0, "conflict": 82.0}
        ))
        # Hospital Road stable moderate
        db.add(RiskSnapshot(
            road_id=3,
            timestamp=snap_time,
            risk_score=round(62.0 + (7 - day_offset) * 0.28, 1),
            confidence=0.86,
            data_coverage=84.0,
            hazard_severity=65.0,
            traffic_exposure=50.0,
            conflict_evidence=74.0,
            vulnerable_exposure=82.0,
            persistence=60.0,
            road_importance=90.0,
            contributing_factors={"vulnerability": 82.0}
        ))
    db.commit()

    # ── 9. Audit Logs ─────────────────────────────────────────────────────────
    audit_seed = [
        {"timestamp": now - timedelta(hours=2), "actor": "Municipal Officer (E. Vance)", "action": "REPAIR_WORK_ORDER_ISSUED", "target_type": "RepairRecord", "target_id": 1, "details": "Approved Milling & Asphalt infill work order for School Road [DEMO]"},
        {"timestamp": now - timedelta(hours=4), "actor": "Vision Pipeline (YOLOv8)", "action": "CRITICAL_HAZARD_FLAGGED", "target_type": "HazardObservation", "target_id": 1, "details": "Detected CRITICAL pothole (confidence: 94%) on School Road [DEMO]"},
        {"timestamp": now - timedelta(hours=7), "actor": "Conflict Engine (ByteTrack)", "action": "NEAR_MISS_CONFLICT_RECORDED", "target_type": "ConflictEvent", "target_id": 2, "details": "TTC 1.45s conflict flagged between vehicle and cyclist at Market Junction [DEMO]"},
        {"timestamp": now - timedelta(hours=14), "actor": "Risk Engine", "action": "RISK_SCORE_RECOMPUTED", "target_type": "RoadSegment", "target_id": 1, "details": "Updated School Road calculated risk score to 87.5/100 (HIGH RISK)"},
        {"timestamp": now - timedelta(days=1), "actor": "Road Authority Admin", "action": "INTERVENTION_EVALUATION_LOGGED", "target_type": "Intervention", "target_id": 1, "details": "Logged before/after outcome for Industrial Road resurfacing"},
    ]
    for al in audit_seed:
        db.add(AuditLog(**al))
    db.commit()

    # ── 10. Citizen Reports ───────────────────────────────────────────────────
    reports_seed = [
        {
            "report_code": "SC-DEMO-00128",
            "reporter_name": "Aanya Sharma",
            "type": "pothole",
            "description": "Deep crater developing on northbound lane near school crossing bus stop",
            "latitude": 51.5074,
            "longitude": -0.1278,
            "severity": "HIGH",
            "status": "AI Verified",
            "submitted_at": now - timedelta(hours=5),
        },
        {
            "report_code": "SC-DEMO-00129",
            "reporter_name": "Marcus Chen",
            "type": "dangerous-junction",
            "description": "Vehicles regularly fail to yield to pedestrians on zebra crossing during morning rush",
            "latitude": 51.5120,
            "longitude": -0.1190,
            "severity": "HIGH",
            "status": "Under Review",
            "submitted_at": now - timedelta(hours=22),
        },
        {
            "report_code": "SC-DEMO-00130",
            "reporter_name": "Sarah Jenkins",
            "type": "pothole",
            "description": "Sunken utility trench creating tire impact near hospital access",
            "latitude": 51.5030,
            "longitude": -0.1350,
            "severity": "MEDIUM",
            "status": "AI Verification Pending",
            "submitted_at": now - timedelta(days=2),
        },
    ]
    for rep in reports_seed:
        db.add(CitizenReport(**rep))
    db.commit()

    print(f"[SEED] Successfully seeded: {len(roads_seed)} roads, {len(junctions_seed)} junctions, "
          f"{len(hazards_seed)} hazards, {len(conflicts_seed)} conflicts, {len(repairs_seed)} repairs, "
          f"{len(evidence_seed)} evidence files, and {len(audit_seed)} audit logs.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_all(db, force_reseed=True)
    finally:
        db.close()
