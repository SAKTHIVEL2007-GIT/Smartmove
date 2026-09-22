"""
SafeCity Loop V2 — Pothole Detection Service
Local YOLOv8 Inference Pipeline + Model Architecture + Demo AI Mode Fallback
"""
import os
import uuid
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


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
    severity: str        # LOW / MEDIUM / HIGH / CRITICAL
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
    confidence: float
    severity: str
    risk_score: float
    risk_formula: str
    detections: List[PotholeDetectionItem] = field(default_factory=list)
    original_image_path: str = ""
    processed_image_path: str = ""
    original_image_url: str = ""
    processed_image_url: str = ""

    def to_dict(self) -> dict:
        return {
            "is_demo_mode": self.is_demo_mode,
            "model_status": self.model_status,
            "status_message": self.status_message,
            "model_path": self.model_path,
            "pothole_count": self.pothole_count,
            "confidence": round(self.confidence, 3),
            "severity": self.severity,
            "risk_score": round(self.risk_score, 1),
            "risk_formula": self.risk_formula,
            "detections": [d.to_dict() for d in self.detections],
            "original_image_url": self.original_image_url,
            "processed_image_url": self.processed_image_url,
        }


class PotholeDetectionService:
    """
    Local YOLOv8 Pothole Detection Service.
    Configurable via MODEL_PATH environment variable.
    If custom trained weights are not found, activates Demo AI Mode.
    """

    SEVERITY_WEIGHTS = {
        "CRITICAL": 100.0,
        "HIGH": 85.0,
        "MEDIUM": 60.0,
        "LOW": 30.0,
        "NONE": 0.0,
    }

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.getenv("MODEL_PATH", "models/pothole_yolov8.pt")
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

    def calculate_risk_score(self, severity: str, confidence: float) -> float:
        """
        Risk Score = (Severity Weight × 0.6) + (Detection Confidence × 100 × 0.4)
        """
        weight = self.SEVERITY_WEIGHTS.get(severity.upper(), 30.0)
        score = (weight * 0.6) + (confidence * 100.0 * 0.4)
        return round(min(max(score, 0.0), 100.0), 1)

    def _classify_severity(self, box_area: float, img_area: float, confidence: float) -> str:
        ratio = box_area / max(img_area, 1.0)
        if ratio > 0.08 or (ratio > 0.05 and confidence > 0.85):
            return "CRITICAL"
        elif ratio > 0.03 or (ratio > 0.02 and confidence > 0.75):
            return "HIGH"
        elif ratio > 0.008 or confidence > 0.6:
            return "MEDIUM"
        else:
            return "LOW"

    def analyze_image(
        self,
        image_bytes: bytes,
        filename: str = "upload.jpg",
        output_dir: str = "uploads/potholes",
    ) -> PotholeAnalysisResult:
        """
        Runs local inference or Demo AI Mode analysis on the provided image bytes.
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

        # Save original file
        with open(orig_path, "wb") as f:
            f.write(image_bytes)

        # Decode image using OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid or corrupted image format. Unable to decode.")

        h, w = img.shape[:2]
        img_area = float(h * w)

        detections: List[PotholeDetectionItem] = []
        is_demo = not self.is_configured()

        if not is_demo and self.model is not None:
            # ── 1. Real YOLOv8 Custom Pothole Inference ──────────────────────
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

                    severity = self._classify_severity(box_area, img_area, conf)
                    risk = self.calculate_risk_score(severity, conf)

                    det = PotholeDetectionItem(
                        box=BoundingBox(x1=bx1, y1=by1, x2=bx2, y2=by2, width=bw, height=bh),
                        confidence=conf,
                        class_name=class_name,
                        severity=severity,
                        risk_score=risk,
                        is_demo=False,
                    )
                    detections.append(det)

            # Use Ultralytics built-in visualization or draw custom boxes
            annotated_img = results[0].plot()
            cv2.imwrite(proc_path, annotated_img)

            model_status = "YOLOv8 Active (Local Model)"
            status_message = f"Local YOLOv8 model '{self.model_path}' executed inference on {w}x{h} image."

        else:
            # ── 2. Demo AI Mode (Model Architecture Active, Weights Pending) ──
            # Do NOT pretend a generic object detector is a pothole model.
            # Instead: run an uncalibrated optical surface anomaly detector using adaptive thresholding.
            annotated_img = img.copy()
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (7, 7), 0)

            # Detect dark pitted depressions typical of asphalt road damage
            mean_val = float(np.mean(blurred))
            std_val = float(np.std(blurred))
            dark_thresh = (blurred < max(mean_val - 1.1 * std_val, 30.0)).astype(np.uint8) * 255

            adaptive_thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 6
            )
            combined_mask = cv2.bitwise_or(dark_thresh, adaptive_thresh)

            # Morphological cleanup
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            cleaned = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
            cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)

            contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            # Filter candidates based on size and aspect ratio
            min_area = img_area * 0.003
            max_area = img_area * 0.35

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if min_area < area < max_area:
                    x, y, bw, bh = cv2.boundingRect(cnt)
                    aspect_ratio = float(bw) / max(bh, 1)
                    if 0.3 < aspect_ratio < 3.2:
                        # Deterministic confidence based on defect density
                        conf = min(0.65 + (area / img_area) * 2.5, 0.94)
                        severity = self._classify_severity(area, img_area, conf)
                        risk = self.calculate_risk_score(severity, conf)

                        det = PotholeDetectionItem(
                            box=BoundingBox(x1=float(x), y1=float(y), x2=float(x + bw), y2=float(y + bh), width=float(bw), height=float(bh)),
                            confidence=conf,
                            class_name="[DEMO] Surface Anomaly Candidate",
                            severity=severity,
                            risk_score=risk,
                            is_demo=True,
                        )
                        detections.append(det)

            # Sort by risk score descending
            detections = sorted(detections, key=lambda d: d.risk_score, reverse=True)[:5]

            # Draw visual overlay for demo mode
            for det in detections:
                b = det.box
                x1, y1, x2, y2 = int(b.x1), int(b.y1), int(b.x2), int(b.y2)

                # Color by severity
                color = (0, 0, 255) if det.severity in ["CRITICAL", "HIGH"] else (0, 165, 255)
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 3)

                label = f"DEMO ANOMALY {int(det.confidence * 100)}% | Risk {int(det.risk_score)}"
                (label_w, label_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
                cv2.rectangle(annotated_img, (x1, max(y1 - label_h - 8, 0)), (x1 + label_w + 6, max(y1, label_h + 8)), color, -1)
                cv2.putText(annotated_img, label, (x1 + 3, max(y1 - 4, label_h + 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

            # Add prominent Demo AI Mode watermark banner
            banner_text = "DEMO AI MODE - Real YOLOv8 pothole model not configured"
            cv2.rectangle(annotated_img, (0, 0), (w, 32), (20, 20, 30), -1)
            cv2.putText(annotated_img, banner_text, (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 255), 2)

            cv2.imwrite(proc_path, annotated_img)

            model_status = "Demo AI Mode — real model not configured"
            status_message = (
                f"Custom pothole weights not found at '{self.model_path}'. "
                f"Executed uncalibrated optical surface anomaly analysis. "
                f"Place trained 'pothole_yolov8.pt' in 'models/' or update MODEL_PATH in Settings to activate full model inference."
            )

        # Compute summary metrics
        if detections:
            max_risk_det = max(detections, key=lambda d: d.risk_score)
            overall_severity = max_risk_det.severity
            overall_confidence = max_risk_det.confidence
            overall_risk = max_risk_det.risk_score
        else:
            overall_severity = "LOW"
            overall_confidence = 0.0
            overall_risk = 0.0

        pothole_count = len(detections)
        formula = (
            f"Risk Score = (Severity Weight [{self.SEVERITY_WEIGHTS.get(overall_severity, 0.0)}] × 0.6) + "
            f"(Confidence [{int(overall_confidence * 100)}%] × 0.4) = {overall_risk}/100"
        )

        return PotholeAnalysisResult(
            is_demo_mode=is_demo,
            model_status=model_status,
            status_message=status_message,
            model_path=self.model_path,
            pothole_count=pothole_count,
            confidence=overall_confidence,
            severity=overall_severity,
            risk_score=overall_risk,
            risk_formula=formula,
            detections=detections,
            original_image_path=orig_path,
            processed_image_path=proc_path,
            original_image_url=f"/uploads/potholes/{orig_filename}",
            processed_image_url=f"/uploads/potholes/{proc_filename}",
        )
