"""
SafeCity Loop V2 — AI Vision Router
Endpoints:
- POST /api/potholes/analyze
- POST /api/traffic/analyze
- GET /api/ai/events
- GET /api/ai/status
"""
import os
import random
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Road, Hazard, NearMiss, Junction
from backend.schemas import (
    PotholeAnalysisOut, TrafficAnalysisOut, AIEvent, AIModelStatusOut,
    PotholeDetectionItemOut, BoundingBoxOut, TrafficConflictDetailOut
)
from backend.services.pothole_detection import PotholeDetectionService
from backend.services.traffic_analysis import TrafficAnalysisService

router = APIRouter()

pothole_service = PotholeDetectionService()
traffic_service = TrafficAnalysisService()

MAX_IMAGE_SIZE = 15 * 1024 * 1024  # 15 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}


@router.get("/ai/status", response_model=AIModelStatusOut)
def get_ai_status():
    """Returns local model loading status and demo mode state."""
    p_loaded = pothole_service.is_configured()
    t_loaded = traffic_service.model is not None

    msg = (
        "YOLOv8 Vision pipeline active." if p_loaded and t_loaded
        else "YOLOv8 traffic detection active. Pothole detector running in Demo AI Mode (custom weights unconfigured)."
    )

    return AIModelStatusOut(
        pothole_model_path=pothole_service.model_path,
        pothole_model_loaded=p_loaded,
        traffic_model_path=traffic_service.model_path,
        traffic_model_loaded=t_loaded,
        is_pothole_demo_mode=not p_loaded,
        is_traffic_demo_mode=not t_loaded,
        message=msg,
    )


@router.post("/potholes/analyze", response_model=PotholeAnalysisOut)
async def analyze_pothole_image(
    file: UploadFile = File(...),
    road_id: Optional[int] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload road image -> Run local YOLOv8 / Demo AI inference ->
    Compute visual severity, contextual severity, confidence, risk score ->
    Save Hazard + Evidence Record + Audit Log to DB -> Return result.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image extension '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP.",
        )

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty.",
        )
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image file exceeds maximum allowable size of 15MB ({len(image_bytes)/(1024*1024):.1f}MB).",
        )

    # Resolve target road if specified
    target_road = None
    if road_id:
        target_road = db.query(Road).filter(Road.id == road_id).first()
    if not target_road:
        target_road = db.query(Road).first()

    road_name = target_road.name if target_road else "General Corridor"
    road_type = target_road.road_type if target_road else "urban_arterial"
    traffic_exp = target_road.traffic_exposure if target_road else "HIGH"

    assigned_lat = latitude if latitude is not None else (target_road.latitude if target_road else 13.0827)
    assigned_lng = longitude if longitude is not None else (target_road.longitude if target_road else 80.2707)

    try:
        result = pothole_service.analyze_image(
            image_bytes=image_bytes,
            filename=file.filename or "upload.jpg",
            road_id=target_road.id if target_road else None,
            road_type=road_type,
            traffic_exposure=traffic_exp,
            custom_lat=assigned_lat,
            custom_lng=assigned_lng,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process image with YOLO vision pipeline: {str(e)}",
        )

    hazard_id = None
    if target_road:
        if result.pothole_count > 0:
            hazard = Hazard(
                road_id=target_road.id,
                type="pothole",
                severity=result.contextual_severity,
                visual_severity=result.visual_severity,
                contextual_severity=result.contextual_severity,
                confidence=result.confidence,
                risk_score=result.risk_score,
                latitude=assigned_lat + random.uniform(-0.0003, 0.0003),
                longitude=assigned_lng + random.uniform(-0.0003, 0.0003),
                detected_at=datetime.utcnow(),
                status="active",
                evidence_id=result.evidence_id,
                evidence_code=result.evidence_id,
                source="Local YOLOv8 Inference" if not result.is_demo_mode else "Demo AI Mode (Optical Scanner)",
                direction="Monitored Lane",
            )
            db.add(hazard)
            db.flush()
            hazard_id = hazard.id

            # Register Evidence File
            from backend.models import EvidenceFile, AuditLog
            evidence_rec = EvidenceFile(
                evidence_code=result.evidence_id,
                road_id=target_road.id,
                hazard_id=hazard_id,
                file_type="IMAGE",
                file_url=result.processed_image_url,
                thumbnail_url=result.processed_image_url,
                captured_at=datetime.utcnow(),
                metadata_json={
                    "pothole_count": result.pothole_count,
                    "confidence": result.confidence,
                    "visual_severity": result.visual_severity,
                    "contextual_severity": result.contextual_severity,
                    "model_status": result.model_status,
                },
                verified=False,
                notes=f"YOLO detection on {target_road.name}: {result.pothole_count} defect(s) found.",
            )
            db.add(evidence_rec)

            # Audit Trail
            audit_entry = AuditLog(
                actor="AI_POTHOLE_INFERENCE",
                action="POTHOLE_DEFECT_REGISTERED",
                target_type="RoadSegment",
                target_id=target_road.id,
                details=f"Pothole defect #{hazard_id} registered with code {result.evidence_id}. Risk: {result.risk_score}",
            )
            db.add(audit_entry)

            # Update road risk score if this defect introduces higher risk
            if result.risk_score > target_road.risk_score:
                target_road.risk_score = min(round((target_road.risk_score * 0.65) + (result.risk_score * 0.35), 1), 100.0)
                target_road.safe_city_score = max(round(100.0 - target_road.risk_score, 1), 0.0)

            db.commit()

    detections_out = [
        PotholeDetectionItemOut(
            box=BoundingBoxOut(**d.box.to_dict()),
            confidence=d.confidence,
            class_name=d.class_name,
            severity=d.severity,
            risk_score=d.risk_score,
            is_demo=d.is_demo,
        )
        for d in result.detections
    ]

    return PotholeAnalysisOut(
        is_demo_mode=result.is_demo_mode,
        model_status=result.model_status,
        status_message=result.status_message,
        model_path=result.model_path,
        pothole_count=result.pothole_count,
        confidence=result.confidence,
        visual_severity=result.visual_severity,
        contextual_severity=result.contextual_severity,
        severity=result.severity,
        risk_score=result.risk_score,
        risk_formula=result.risk_formula,
        detections=detections_out,
        original_image_url=result.original_image_url,
        processed_image_url=result.processed_image_url,
        hazard_id=hazard_id,
        road_id=target_road.id if target_road else None,
        road_name=road_name,
        evidence_id=result.evidence_id,
        latitude=assigned_lat,
        longitude=assigned_lng,
        gps_accuracy=result.gps_accuracy,
        is_simulated_gps=result.is_simulated_gps,
        timestamp=result.timestamp,
        disclaimer=result.disclaimer,
    )


@router.post("/traffic/analyze", response_model=TrafficAnalysisOut)
async def analyze_traffic_video(
    file: UploadFile = File(...),
    junction_id: Optional[int] = Form(None),
    road_id: Optional[int] = Form(None),
    ttc_threshold: Optional[float] = Form(2.0),
    apply_privacy: Optional[bool] = Form(True),
    db: Session = Depends(get_db),
):
    """
    Upload traffic video (MP4/MOV/AVI) -> Extract frames -> YOLOv8 + ByteTrack tracking ->
    Compute approximate TTC & PET -> Flag surrogate safety conflicts ->
    Apply privacy masking (face/plate blurring) -> Persist to DB -> Return analysis.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format '{ext}'. Allowed formats: MP4, MOV, AVI.",
        )

    video_bytes = await file.read()
    if len(video_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded video file is empty.",
        )
    if len(video_bytes) > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video file exceeds maximum allowable size of 50MB ({len(video_bytes)/(1024*1024):.1f}MB).",
        )

    try:
        result = traffic_service.analyze_video(
            video_bytes=video_bytes,
            filename=file.filename or "traffic.mp4",
            junction_id=junction_id,
            road_id=road_id,
            ttc_threshold=ttc_threshold or 2.0,
            apply_privacy=bool(apply_privacy),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process video with traffic analytics pipeline: {str(e)}",
        )

    created_nm_ids: List[int] = []
    target_junction = None
    target_road = None

    if junction_id:
        target_junction = db.query(Junction).filter(Junction.id == junction_id).first()
    if not target_junction:
        target_junction = db.query(Junction).first()

    if road_id:
        target_road = db.query(Road).filter(Road.id == road_id).first()
    if not target_road and target_junction:
        target_road = db.query(Road).first()

    junction_name = target_junction.name if target_junction else "Monitored Junction"
    assigned_junction_id = target_junction.id if target_junction else None
    assigned_road_id = target_road.id if target_road else (target_junction.id if target_junction else 1)

    for nm in result.near_misses:
        nm_record = NearMiss(
            junction_id=assigned_junction_id,
            road_id=assigned_road_id,
            video_id=file.filename,
            timestamp=datetime.utcnow() - timedelta(seconds=max(result.duration_seconds - nm.timestamp_seconds, 0)),
            object_types=nm.object_types,
            object_type_a=nm.object_type_a,
            object_type_b=nm.object_type_b,
            ttc=nm.ttc,
            pet=nm.pet,
            minimum_distance=nm.minimum_distance,
            risk_level=nm.risk_level,
            event_severity=nm.event_severity,
            conflict_zone=nm.conflict_zone,
            direction=nm.direction,
            evidence_clip=nm.snapshot_url,
            confidence=nm.confidence,
            source="YOLOv8 + ByteTrack (Local Edge)",
            review_status="pending_review",
        )
        db.add(nm_record)
        db.flush()
        created_nm_ids.append(nm_record.id)

        # Store Evidence file for each conflict snapshot
        if nm.snapshot_url:
            from backend.models import EvidenceFile
            ev_code = f"EV-NM-{nm_record.id:04d}"
            ev_file = EvidenceFile(
                evidence_code=ev_code,
                road_id=assigned_road_id,
                conflict_id=nm_record.id,
                file_type="KEYFRAME",
                file_url=nm.snapshot_url,
                thumbnail_url=nm.snapshot_url,
                captured_at=datetime.utcnow(),
                metadata_json={
                    "ttc": nm.ttc,
                    "pet": nm.pet,
                    "minimum_distance": nm.minimum_distance,
                    "conflict_zone": nm.conflict_zone,
                    "object_types": nm.object_types,
                },
                verified=False,
                notes=f"Surrogate safety conflict candidate between {nm.object_type_a} and {nm.object_type_b} (TTC ~{nm.ttc:.2f}s).",
            )
            db.add(ev_file)

    if target_junction and result.near_misses:
        target_junction.risk_score = min(round(target_junction.risk_score + len(result.near_misses) * 2.5, 1), 98.0)

    # Log to audit trail
    if result.near_misses:
        from backend.models import AuditLog
        db.add(AuditLog(
            actor="AI_TRAFFIC_TRACKER",
            action="CONFLICT_EVENTS_FLAGGED",
            target_type="Junction",
            target_id=assigned_junction_id,
            details=f"Flagged {len(result.near_misses)} near-miss candidate(s) at {junction_name}. Privacy masking: {apply_privacy}",
        ))

    db.commit()

    near_misses_out = [
        TrafficConflictDetailOut(
            conflict_id=nm.conflict_id,
            timestamp_str=nm.timestamp_str,
            timestamp_seconds=nm.timestamp_seconds,
            object_type_a=nm.object_type_a,
            object_type_b=nm.object_type_b,
            object_types=nm.object_types,
            track_ids=nm.track_ids,
            ttc=nm.ttc,
            pet=nm.pet,
            minimum_distance=nm.minimum_distance,
            risk_level=nm.risk_level,
            event_severity=nm.event_severity,
            conflict_zone=nm.conflict_zone,
            direction=nm.direction,
            frame_index=nm.frame_index,
            confidence=nm.confidence,
            snapshot_url=nm.snapshot_url,
            review_status=nm.review_status,
            disclaimer=nm.disclaimer,
        )
        for nm in result.near_misses
    ]

    return TrafficAnalysisOut(
        is_demo_mode=result.is_demo_mode,
        model_status=result.model_status,
        status_message=result.status_message,
        junction_id=assigned_junction_id,
        junction_name=junction_name,
        road_id=assigned_road_id,
        duration_seconds=result.duration_seconds,
        total_frames=result.total_frames,
        processed_frames=result.processed_frames,
        tracked_objects_count=result.tracked_objects_count,
        object_class_counts=result.object_class_counts,
        near_miss_count=result.near_miss_count,
        near_misses=near_misses_out,
        original_video_url=result.original_video_url,
        processed_video_url=result.processed_video_url,
        conflict_snapshots=result.conflict_snapshots,
        created_near_miss_ids=created_nm_ids,
        privacy_applied=result.privacy_applied,
        privacy_notice=result.privacy_notice,
        tracked_objects_summary=result.tracked_objects_summary,
    )


@router.get("/ai/events", response_model=List[AIEvent])
def get_ai_events(db: Session = Depends(get_db)):
    """
    Returns unified chronological log of AI detection events.
    Combines hazards, near misses, and system updates.
    """
    events: List[AIEvent] = []
    now = datetime.utcnow()

    # Get recent hazards
    recent_hazards = db.query(Hazard).order_by(Hazard.detected_at.desc()).limit(8).all()
    for h in recent_hazards:
        road_name = h.road.name if h.road else f"Road #{h.road_id}"
        events.append(AIEvent(
            time=h.detected_at.strftime("%I:%M %p"),
            event=f"{h.type.replace('-', ' ').capitalize()} detected ({h.severity}) — {road_name}",
            type="pothole" if h.type == "pothole" else "danger-zone",
            severity=h.severity,
        ))

    # Get recent near misses
    recent_nms = db.query(NearMiss).order_by(NearMiss.timestamp.desc()).limit(8).all()
    for nm in recent_nms:
        junction_name = nm.junction.name if nm.junction else "Smart Junction"
        objs = " + ".join([o.capitalize() for o in nm.object_types]) if nm.object_types else "Road Users"
        ttc_info = f" (TTC: {nm.ttc:.1f}s)" if nm.ttc else ""
        events.append(AIEvent(
            time=nm.timestamp.strftime("%I:%M %p"),
            event=f"Near miss detected: {objs}{ttc_info} — {junction_name}",
            type="near-miss",
            severity=nm.risk_level,
        ))

    # If few events exist, supplement with demo stream
    if len(events) < 4:
        seed_events = [
            ("10:42 AM", "Pothole detected — School Road [DEMO]", "pothole", "HIGH"),
            ("10:47 AM", "Near miss detected (TTC 1.4s) — Market Junction North [DEMO]", "near-miss", "HIGH"),
            ("10:52 AM", "Danger zone updated — School Road Crossing [DEMO]", "danger-zone", "CRITICAL"),
            ("11:05 AM", "Repair priority elevated — School Road [DEMO]", "repair", "HIGH"),
        ]
        for t, ev, tp, sev in seed_events:
            events.append(AIEvent(time=t, event=ev, type=tp, severity=sev))

    return events[:12]
