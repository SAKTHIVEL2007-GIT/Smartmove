"""
SafeCity Loop V2 — Pothole Detection Service
Local YOLOv8 Inference Pipeline + Model Architecture + Demo AI Mode Fallback
Pipeline: IMAGE -> PREPROCESSING -> YOLOv8 -> POTHOLE DETECTION -> BOUNDING BOX ->
          CONFIDENCE -> VISUAL SEVERITY -> CONTEXTUAL SEVERITY -> RISK ENGINE -> EVIDENCE RECORD
"""
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
import cv2
import numpy as np


@dataclass
class BoundingBox:
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float

    def to_dict(self) -> dict:
        return {
            "x1": round(self.x1, 1),
            "y1": round(self.y1, 1),
            "x2": round(self.x2, 1),
            "y2": round(self.y2, 1),
            "width": round(self.width, 1),
            "height": round(self.height, 1),
        }


@dataclass
class PotholeDetectionItem:
    box: BoundingBox
    confidence: float
    class_name: str
    severity: str        # Visual Severity: LOW / MEDIUM / HIGH / CRITICAL
    risk_score: float    # 0–100
    is_demo: bool = False

    def to_dict(self) -> dict:
        return {
            "box": self.box.to_dict(),
            "confidence": round(self.confidence, 3),
            "class_name": self.class_name,
            "severity": self.severity,
            "risk_score": round(self.risk_score, 1),
            "is_demo": self.is_demo,
        }


@dataclass
class PotholeAnalysisResult:
    is_demo_mode: bool
    model_status: str
    status_message: str
    model_path: str
    pothole_count: int
    confidence: float                  # AI model detection confidence (NOT danger probability)
    visual_severity: str               # Physical dimension severity (LOW/MEDIUM/HIGH/CRITICAL)
    contextual_severity: str           # Exposure/speed/vulnerability contextual severity
    severity: str                      # Main severity (for backward-compatibility)
    risk_score: float                  # Calculated road risk (0–100) via Risk Engine
    risk_formula: str                  # Transparent formula explanation
    detections: List[PotholeDetectionItem] = field(default_factory=list)
    original_image_path: str = ""
    processed_image_path: str = ""
    original_image_url: str = ""
    processed_image_url: str = ""
    evidence_id: str = ""              # e.g. "SC-H-1042"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy: float = 2.5
    is_simulated_gps: bool = False
    timestamp: str = ""
    disclaimer: str = (
        "AI detection confidence measures visual pattern recognition accuracy only; "
        "it does not represent collision probability. NO DATA ≠ SAFE ROAD."
    )

    def to_dict(self) -> dict:
        return {
            "is_demo_mode": self.is_demo_mode,
            "model_status": self.model_status,
            "status_message": self.status_message,
            "model_path": self.model_path,
            "pothole_count": self.pothole_count,
            "confidence": round(self.confidence, 3),
            "visual_severity": self.visual_severity,
            "contextual_severity": self.contextual_severity,
            "severity": self.severity,
            "risk_score": round(self.risk_score, 1),
            "risk_formula": self.risk_formula,
            "detections": [d.to_dict() for d in self.detections],
            "original_image_url": self.original_image_url,
            "processed_image_url": self.processed_image_url,
            "evidence_id": self.evidence_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "gps_accuracy": self.gps_accuracy,
            "is_simulated_gps": self.is_simulated_gps,
            "timestamp": self.timestamp,
            "disclaimer": self.disclaimer,
        }


class PotholeDetectionService:
    """
    Local YOLOv8 Pothole Detection Service.
    Configurable via YOLO_MODEL_PATH or POTHOLE_MODEL_PATH environment variable.
    If custom trained weights are not found, runs deterministic Demo AI Mode.
    """

    SEVERITY_WEIGHTS = {
        "CRITICAL": 100.0,
        "HIGH": 85.0,
        "MEDIUM": 60.0,
        "LOW": 30.0,
        "NONE": 0.0,
    }

    def __init__(self, model_path: Optional[str] = None):
        # Allow YOLO_MODEL_PATH or POTHOLE_MODEL_PATH
        env_path = os.getenv("YOLO_MODEL_PATH") or os.getenv("POTHOLE_MODEL_PATH")
        self.model_path = model_path or env_path or "models/pothole_yolov8.pt"
        self.model = None
        self.is_custom_model_loaded = False
        self._initialize_model()

    def _initialize_model(self) -> None:
        """Attempt to load custom trained YOLOv8 pothole weights."""
        if os.path.exists(self.model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.model_path)
                self.is_custom_model_loaded = True
                print(f"[AI Vision] Loaded custom YOLOv8 pothole model from: {self.model_path}")
            except Exception as e:
                print(f"[AI Vision] Error loading model from {self.model_path}: {e}")
                self.model = None
                self.is_custom_model_loaded = False
        else:
            self.is_custom_model_loaded = False

    def is_configured(self) -> bool:
        return self.is_custom_model_loaded and self.model is not None

    def calculate_risk_score(self, visual_severity: str, contextual_severity: str, confidence: float) -> float:
        """
        Risk Engine Integration:
        Calculates road risk combining physical defect severity with municipal context.
        Formula: 0.6 * Contextual_Severity + 0.3 * Visual_Severity + 0.1 * Confidence
        """
        v_weight = self.SEVERITY_WEIGHTS.get(visual_severity.upper(), 30.0)
        c_weight = self.SEVERITY_WEIGHTS.get(contextual_severity.upper(), 30.0)
        score = (c_weight * 0.6) + (v_weight * 0.3) + (confidence * 100.0 * 0.1)
        return round(min(max(score, 0.0), 100.0), 1)

    def _classify_visual_severity(self, box_area: float, img_area: float, confidence: float) -> str:
        """Determines visual defect severity based on bounding box dimensions."""
        ratio = box_area / max(img_area, 1.0)
        if ratio > 0.08 or (ratio > 0.05 and confidence > 0.85):
            return "CRITICAL"
        elif ratio > 0.03 or (ratio > 0.02 and confidence > 0.75):
            return "HIGH"
        elif ratio > 0.008 or confidence > 0.6:
            return "MEDIUM"
        else:
            return "LOW"

    def _classify_contextual_severity(self, visual_sev: str, road_type: Optional[str] = None, traffic_exposure: Optional[str] = None) -> str:
        """
        Elevates or tempers visual severity based on corridor exposure and speed context.
        """
        rtype = (road_type or "urban_arterial").lower()
        exposure = (traffic_exposure or "HIGH").upper()

        sev_order = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        cur_idx = sev_order.index(visual_sev) if visual_sev in sev_order else 1

        # High vulnerability corridor (school zone, hospital, high traffic)
        if "school" in rtype or "hospital" in rtype or exposure == "HIGH":
            cur_idx = min(cur_idx + 1, len(sev_order) - 1)
        elif "residential" in rtype and exposure == "LOW":
            cur_idx = max(cur_idx - 1, 0)

        return sev_order[cur_idx]

    def analyze_image(
        self,
        image_bytes: bytes,
        filename: str = "upload.jpg",
        road_id: Optional[int] = None,
        road_type: Optional[str] = None,
        traffic_exposure: Optional[str] = None,
        output_dir: str = "uploads/potholes",
        custom_lat: Optional[float] = None,
        custom_lng: Optional[float] = None,
    ) -> PotholeAnalysisResult:
        """
        Full Pipeline:
        IMAGE -> PREPROCESSING -> YOLOv8 -> POTHOLE DETECTION -> BOUNDING BOX ->
        CONFIDENCE -> VISUAL SEVERITY -> CONTEXTUAL SEVERITY -> RISK ENGINE -> EVIDENCE RECORD
        """
        os.makedirs(output_dir, exist_ok=True)
        file_id = str(uuid.uuid4())[:12]
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".jpg"

        orig_filename = f"{file_id}_orig{ext}"
        proc_filename = f"{file_id}_proc.jpg"
        orig_path = os.path.join(output_dir, orig_filename)
        proc_path = os.path.join(output_dir, proc_filename)

        # 1. Image Preprocessing & Saving
        with open(orig_path, "wb") as f:
            f.write(image_bytes)

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid or corrupted image format. Supported formats: JPG, JPEG, PNG, WEBP.")

        h, w = img.shape[:2]
        img_area = float(h * w)

        detections: List[PotholeDetectionItem] = []
        is_demo = not self.is_configured()
        timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # Deterministic Evidence ID
        evidence_code = f"SC-H-{int(datetime.utcnow().timestamp()) % 9000 + 1000}"

        if not is_demo and self.model is not None:
            # ── 2. Real YOLOv8 Custom Pothole Inference ──────────────────────
            results = self.model(orig_path, conf=0.25)
            annotated_img = img.copy()

            for r in results:
                boxes = r.boxes
                for box in boxes:
                    xyxy = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = self.model.names.get(cls_id, "pothole")

                    bx1, by1, bx2, by2 = xyxy
                    bw = bx2 - bx1
                    bh = by2 - by1
                    box_area = bw * bh

                    v_sev = self._classify_visual_severity(box_area, img_area, conf)
                    c_sev = self._classify_contextual_severity(v_sev, road_type, traffic_exposure)
                    risk = self.calculate_risk_score(v_sev, c_sev, conf)

                    det = PotholeDetectionItem(
                        box=BoundingBox(x1=bx1, y1=by1, x2=bx2, y2=by2, width=bw, height=bh),
                        confidence=conf,
                        class_name=class_name,
                        severity=v_sev,
                        risk_score=risk,
                        is_demo=False,
                    )
                    detections.append(det)

            annotated_img = results[0].plot()

            # Watermark header
            header_text = f"SafeCity Loop YOLOv8 Inference | Evidence ID: {evidence_code} | Defects: {len(detections)}"
            cv2.rectangle(annotated_img, (0, 0), (w, 30), (15, 23, 42), -1)
            cv2.putText(annotated_img, header_text, (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 180), 1)

            cv2.imwrite(proc_path, annotated_img)
            model_status = "YOLOv8 Active (Local Model)"
            status_message = f"Local YOLOv8 model '{self.model_path}' executed inference on {w}x{h} image."

        else:
            # ── 2. Demo AI Mode (Model Architecture Active, Weights Pending) ──
            # Show "Demo AI Mode — YOLO model not configured"
            annotated_img = img.copy()
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (7, 7), 0)

            mean_val = float(np.mean(blurred))
            std_val = float(np.std(blurred))
            dark_thresh = (blurred < max(mean_val - 1.1 * std_val, 30.0)).astype(np.uint8) * 255

            adaptive_thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 6
            )
            combined_mask = cv2.bitwise_or(dark_thresh, adaptive_thresh)

            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            cleaned = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
            cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)

            contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            min_area = img_area * 0.003
            max_area = img_area * 0.35

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if min_area < area < max_area:
                    x, y, bw, bh = cv2.boundingRect(cnt)
                    aspect_ratio = float(bw) / max(bh, 1)
                    if 0.3 < aspect_ratio < 3.2:
                        conf = min(0.65 + (area / img_area) * 2.5, 0.94)
                        v_sev = self._classify_visual_severity(area, img_area, conf)
                        c_sev = self._classify_contextual_severity(v_sev, road_type, traffic_exposure)
                        risk = self.calculate_risk_score(v_sev, c_sev, conf)

                        det = PotholeDetectionItem(
                            box=BoundingBox(x1=float(x), y1=float(y), x2=float(x + bw), y2=float(y + bh), width=float(bw), height=float(bh)),
                            confidence=conf,
                            class_name="[DEMO] Surface Anomaly Candidate",
                            severity=v_sev,
                            risk_score=risk,
                            is_demo=True,
                        )
                        detections.append(det)

            detections = sorted(detections, key=lambda d: d.risk_score, reverse=True)[:5]

            for det in detections:
                b = det.box
                x1, y1, x2, y2 = int(b.x1), int(b.y1), int(b.x2), int(b.y2)
                color = (0, 0, 255) if det.severity in ["CRITICAL", "HIGH"] else (0, 165, 255)
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 3)

                label = f"DEMO ANOMALY {int(det.confidence * 100)}% | Risk {int(det.risk_score)}"
                (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
                cv2.rectangle(annotated_img, (x1, max(y1 - label_h - 8, 0)), (x1 + label_w + 6, max(y1, label_h + 8)), color, -1)
                cv2.putText(annotated_img, label, (x1 + 3, max(y1 - 4, label_h + 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

            # Prominent Demo Banner Watermark
            banner_text = "Demo AI Mode - YOLO model not configured"
            cv2.rectangle(annotated_img, (0, 0), (w, 32), (20, 20, 30), -1)
            cv2.putText(annotated_img, banner_text, (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 200, 255), 2)

            cv2.imwrite(proc_path, annotated_img)
            model_status = "Demo AI Mode — YOLO model not configured"
            status_message = (
                f"YOLO model weights not found at '{self.model_path}'. "
                f"Active in Demo AI Mode using uncalibrated optical contour scanning. "
                f"Set YOLO_MODEL_PATH or place weights in models/ to activate full YOLOv8 inference."
            )

        # 3. Compute Summary Metrics
        if detections:
            max_det = max(detections, key=lambda d: d.risk_score)
            overall_visual_sev = max_det.severity
            overall_context_sev = self._classify_contextual_severity(overall_visual_sev, road_type, traffic_exposure)
            overall_confidence = max_det.confidence
            overall_risk = self.calculate_risk_score(overall_visual_sev, overall_context_sev, overall_confidence)
        else:
            overall_visual_sev = "LOW"
            overall_context_sev = "LOW"
            overall_confidence = 0.0
            overall_risk = 0.0

        pothole_count = len(detections)
        formula = (
            f"Calculated Road Risk = 0.6 × Contextual [{self.SEVERITY_WEIGHTS.get(overall_context_sev, 0.0)}] + "
            f"0.3 × Visual [{self.SEVERITY_WEIGHTS.get(overall_visual_sev, 0.0)}] + "
            f"0.1 × Confidence [{int(overall_confidence * 100)}%] = {overall_risk}/100"
        )

        # GPS resolution: Use custom GPS if supplied, else assign default corridor coords
        lat = custom_lat if custom_lat is not None else 13.0827
        lng = custom_lng if custom_lng is not None else 80.2707
        is_simulated = (custom_lat is None)

        return PotholeAnalysisResult(
            is_demo_mode=is_demo,
            model_status=model_status,
            status_message=status_message,
            model_path=self.model_path,
            pothole_count=pothole_count,
            confidence=overall_confidence,
            visual_severity=overall_visual_sev,
            contextual_severity=overall_context_sev,
            severity=overall_context_sev,
            risk_score=overall_risk,
            risk_formula=formula,
            detections=detections,
            original_image_path=orig_path,
            processed_image_path=proc_path,
            original_image_url=f"/uploads/potholes/{orig_filename}",
            processed_image_url=f"/uploads/potholes/{proc_filename}",
            evidence_id=evidence_code,
            latitude=lat,
            longitude=lng,
            gps_accuracy=2.5 if not is_simulated else 15.0,
            is_simulated_gps=is_simulated,
            timestamp=timestamp_str,
        )
