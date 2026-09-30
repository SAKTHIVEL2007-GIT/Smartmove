"""
SafeCity Saathi V2 — Unified AI Road Condition Analysis Service
Combines:
1. Local YOLOv8 Pothole Detection
2. Local YOLOv8-Seg Water Accumulation Segmentation
3. Spatial Mask Intersection (Water-Filled Potholes Detection)
4. Overall Road Surface Condition Classification (EXCELLENT / GOOD / FAIR / POOR / CRITICAL)
5. Unified Explainable Risk Engine Factor Breakdown
6. Unified Visual Hazard Overlay Mask Rendering
"""
import os
import uuid
import json
import cv2
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session

from backend.services.pothole_detection import PotholeDetectionService
from backend.services.water_detection import WaterDetectionService
from backend.services.risk_engine import calculate_risk_score, clamp
from backend.models import Road, Hazard, EvidenceFile, AuditLog

pothole_service = PotholeDetectionService()
water_service = WaterDetectionService()


class UnifiedRoadAnalysisService:
    def analyze_road_image(
        self,
        image_bytes: bytes,
        filename: str = "upload.jpg",
        road_id: Optional[int] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        db: Session = None,
    ) -> Dict[str, Any]:
        """
        Runs unified multi-hazard AI detection pipeline on a single road image upload.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Corrupted or unreadable image file.")

        h, w, _ = img_bgr.shape

        # Resolve Target Road Segment
        target_road = None
        if db and road_id:
            target_road = db.query(Road).filter(Road.id == road_id).first()
        if db and not target_road:
            target_road = db.query(Road).first()

        road_name = target_road.name if target_road else "General Corridor"
        road_type = target_road.road_type if target_road else "urban_arterial"
        traffic_exp_str = target_road.traffic_exposure if target_road else "HIGH"

        assigned_lat = latitude if latitude is not None else (target_road.latitude if target_road else 13.0827)
        assigned_lng = longitude if longitude is not None else (target_road.longitude if target_road else 80.2707)

        # Step 1: Run Pothole Detection
        pothole_res = pothole_service.analyze_image(
            image_bytes=image_bytes,
            filename=filename,
            road_id=target_road.id if target_road else None,
            road_type=road_type,
            traffic_exposure=traffic_exp_str,
            custom_lat=assigned_lat,
            custom_lng=assigned_lng,
            is_demo_sample=False,
        )

        # Step 2: Run Water Segmentation Detection
        water_res = water_service.analyze_image(
            image_bytes=image_bytes,
            filename=filename,
        )

        # Step 3: Spatial Mask Intersection (Water-Filled Pothole Detection)
        pothole_items_out = []
        water_filled_count = 0
        water_mask = water_res.water_mask if water_res.water_mask is not None else np.zeros((h, w), dtype=np.uint8)

        for p_det in pothole_res.detections:
            box = p_det.box
            x1, y1, x2, y2 = int(box.x1), int(box.y1), int(box.x2), int(box.y2)

            # Create binary box mask
            box_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.rectangle(box_mask, (x1, y1), (x2, y2), 255, -1)

            box_area = max(1, (x2 - x1) * (y2 - y1))
            overlap_pixels = int(np.count_nonzero(cv2.bitwise_and(box_mask, water_mask)))
            overlap_pct = (overlap_pixels / box_area) * 100.0

            is_water_filled = overlap_pct > 10.0 and water_res.detected

            if is_water_filled:
                water_filled_count += 1

            pothole_items_out.append({
                "box": {"x1": box.x1, "y1": box.y1, "x2": box.x2, "y2": box.y2, "width": box.width, "height": box.height},
                "confidence": round(p_det.confidence, 2),
                "severity": p_det.severity,
                "risk_score": p_det.risk_score,
                "is_water_filled": is_water_filled,
                "water_overlap_percent": round(overlap_pct, 1),
            })

        # Step 4: Evaluate Road Surface Condition Classification
        if water_filled_count > 0 or pothole_res.highest_severity == "CRITICAL" or water_res.severity == "CRITICAL":
            road_classification = "CRITICAL"
        elif pothole_res.pothole_count >= 2 or water_res.severity == "HIGH":
            road_classification = "POOR"
        elif pothole_res.pothole_count > 0 or water_res.severity in ("MODERATE", "LOW"):
            road_classification = "FAIR"
        else:
            road_classification = "GOOD"

        # Step 5: Unified Transparent Risk Calculation
        pothole_sev_map = {"NONE": 0.0, "LOW": 0.25, "MEDIUM": 0.50, "HIGH": 0.75, "CRITICAL": 1.0}
        pothole_factor = pothole_sev_map.get(pothole_res.highest_severity, 0.0)

        water_sev_map = {"NONE": 0.0, "LOW": 0.20, "MODERATE": 0.45, "HIGH": 0.70, "CRITICAL": 0.95}
        water_factor = water_sev_map.get(water_res.severity, 0.0) if water_res.detected else 0.0

        # Combine hazard factor with interaction boost
        combined_hazard_factor = max(pothole_factor, water_factor)
        if water_filled_count > 0:
            combined_hazard_factor = clamp(combined_hazard_factor + 0.15, 0.0, 1.0)

        traffic_factor = 0.85 if traffic_exp_str == "HIGH" else 0.50
        vuln_factor = 0.65 if "arterial" in road_type else 0.40
        road_cond_factor = {"CRITICAL": 0.90, "POOR": 0.70, "FAIR": 0.45, "GOOD": 0.20}[road_classification]

        risk_factors = {
            "hazard_severity": combined_hazard_factor,
            "traffic_exposure": traffic_factor,
            "vulnerable_users": vuln_factor,
            "near_miss_risk": 0.30,
            "road_condition": road_cond_factor,
            "aging": 0.40,
        }

        overall_risk_score, risk_breakdown = calculate_risk_score(risk_factors)

        # Step 6: Render Unified Visual Overlay Image
        analysis_id = f"road-{uuid.uuid4().hex[:10]}"
        processed_url = self._render_unified_overlay(
            img_bgr=img_bgr,
            pothole_items=pothole_items_out,
            water_res=water_res,
            analysis_id=analysis_id,
            road_classification=road_classification,
            risk_score=overall_risk_score,
        )

        # Step 7: Database Persistence (if DB session provided)
        hazard_ids = []
        if db and target_road:
            # Register Pothole Hazard if present
            if pothole_res.pothole_count > 0:
                h_pot = Hazard(
                    road_id=target_road.id,
                    type="pothole",
                    severity=pothole_res.highest_severity,
                    confidence=pothole_res.confidence,
                    risk_score=pothole_res.risk_score,
                    latitude=assigned_lat,
                    longitude=assigned_lng,
                    detected_at=datetime.utcnow(),
                    status="active",
                    evidence_id=analysis_id,
                    evidence_code=analysis_id,
                    image_path=processed_url,
                    source="AI Road Analysis",
                )
                db.add(h_pot)
                db.flush()
                hazard_ids.append(h_pot.id)

            # Register Water Hazard if present
            if water_res.detected:
                h_wat = Hazard(
                    road_id=target_road.id,
                    type="water_accumulation",
                    severity=water_res.severity,
                    confidence=water_res.confidence,
                    risk_score=water_res.risk_contribution,
                    latitude=assigned_lat,
                    longitude=assigned_lng,
                    detected_at=datetime.utcnow(),
                    status="active",
                    evidence_id=analysis_id,
                    evidence_code=analysis_id,
                    image_path=processed_url,
                    source="AI Road Analysis (YOLOv8-Seg)" if water_res.is_available else "AI Road Analysis",
                )
                db.add(h_wat)
                db.flush()
                hazard_ids.append(h_wat.id)

            # Audit Trail
            audit_entry = AuditLog(
                actor="AI_UNIFIED_ROAD_ANALYSIS",
                action="ROAD_CONDITION_EVALUATED",
                target_type="RoadSegment",
                target_id=target_road.id,
                details=f"Unified road analysis {analysis_id}: Classification: {road_classification}, Risk: {overall_risk_score}/100. Potholes: {pothole_res.pothole_count}, Water: {water_res.water_area_percent}%.",
            )
            db.add(audit_entry)

            # Update Road Scores
            target_road.risk_score = overall_risk_score
            target_road.safe_city_score = max(round(100.0 - overall_risk_score, 1), 0.0)
            db.commit()

        # Build Clean Truthful JSON Response
        return {
            "analysis_id": analysis_id,
            "image": {
                "width": w,
                "height": h,
                "filename": filename,
            },
            "potholes": {
                "count": pothole_res.pothole_count,
                "highest_severity": pothole_res.highest_severity,
                "confidence": round(pothole_res.confidence, 2),
                "water_filled_count": water_filled_count,
                "detections": pothole_items_out,
            },
            "water": {
                "status": water_res.status,
                "is_available": water_res.is_available,
                "detected": water_res.detected,
                "confidence": water_res.confidence,
                "coverage_percent": water_res.water_area_percent,
                "water_pixel_count": water_res.water_pixel_count,
                "road_pixel_count": water_res.road_pixel_count,
                "severity": water_res.severity,
                "depth_label": water_res.depth_label,
                "regions": [r.to_dict() for r in water_res.regions],
                "mask_url": water_res.mask_image_url,
            },
            "road_condition": {
                "classification": road_classification,
                "road_name": road_name,
                "road_type": road_type,
            },
            "risk": {
                "score": overall_risk_score,
                "factors": risk_breakdown,
            },
            "processed_image_url": processed_url,
            "metadata": {
                "source": "REAL INFERENCE",
                "inference_device": water_res.inference_device,
                "timestamp": datetime.utcnow().isoformat(),
                "models": {
                    "pothole": "YOLOv8 Custom Pothole Detector",
                    "water": water_res.model_status,
                },
            },
        }

    def _render_unified_overlay(
        self,
        img_bgr: np.ndarray,
        pothole_items: list,
        water_res: Any,
        analysis_id: str,
        road_classification: str,
        risk_score: float,
    ) -> str:
        """Renders green/amber/red bounding boxes + cyan water masks + water-filled pothole tags."""
        output_dir = os.path.join("uploads", "road_analysis")
        os.makedirs(output_dir, exist_ok=True)

        h, w, _ = img_bgr.shape
        overlay = img_bgr.copy()

        # 1. Cyan Water Segmentation Mask (if water detected and model available)
        if water_res.is_available and water_res.detected and water_res.water_mask is not None:
            cyan_layer = np.zeros((h, w, 3), dtype=np.uint8)
            cyan_layer[water_res.water_mask > 0] = (255, 200, 0)
            overlay = cv2.addWeighted(overlay, 0.65, cyan_layer, 0.35, 0)

        # 2. Potholes Bounding Boxes & Water-Filled Overlap Tags
        for item in pothole_items:
            box = item["box"]
            x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])
            is_wf = item["is_water_filled"]
            sev = item["severity"]

            if is_wf:
                color = (0, 215, 255)  # Bright Gold / Amber for Water-Filled Pothole
                label = f"WATER-FILLED POTHOLE ({item['water_overlap_percent']}% Overlap)"
            elif sev in ("HIGH", "CRITICAL"):
                color = (0, 0, 255)    # Red
                label = f"POTHOLE | {sev} ({int(item['confidence']*100)}%)"
            else:
                color = (0, 165, 255)  # Orange
                label = f"POTHOLE | {sev} ({int(item['confidence']*100)}%)"

            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 3)

            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(overlay, (x1, max(0, y1 - 22)), (x1 + tw + 8, y1), color, -1)
            cv2.putText(overlay, label, (x1 + 4, max(12, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # 3. Top Banner
        cv2.rectangle(overlay, (0, 0), (w, 42), (15, 23, 42), -1)
        water_str = f"{water_res.water_area_percent:.1f}% ({water_res.severity})" if water_res.is_available and water_res.detected else ("UNAVAILABLE" if not water_res.is_available else "NONE")
        banner_text = f"AI ROAD ANALYSIS | RISK: {risk_score}/100 ({road_classification}) | POTHOLES: {len(pothole_items)} | WATER: {water_str}"
        cv2.putText(overlay, banner_text, (12, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 255, 255), 1, cv2.LINE_AA)

        filename = f"{analysis_id}_overlay.jpg"
        cv2.imwrite(os.path.join(output_dir, filename), overlay)
        return f"/uploads/road_analysis/{filename}"
