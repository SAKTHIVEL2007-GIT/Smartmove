"""
SafeCity Loop V2 — Traffic Video Analysis & Surrogate Safety Engine
Pipeline: VIDEO -> FRAME SAMPLING -> YOLO OBJECT DETECTION -> BYTETrack ->
          TRAJECTORIES -> CONFLICT ANALYSIS (TTC, PET, Min Distance) -> PRIVACY MASKING

Monocular Computer Vision Notice:
All speed, distance, TTC, and PET measurements derived from ordinary monocular video
are strictly approximate estimates. Labeled as 'Potential traffic conflict' / 'Near-miss candidate'.
"""
import os
import uuid
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any
import cv2
import numpy as np


@dataclass
class TrackedObject:
    track_id: int
    object_type: str         # car, motorcycle, bus, truck, bicycle, pedestrian
    centroid: Tuple[float, float]
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    velocity: float = 0.0                    # estimated speed (px/sec or approx km/h)
    direction: str = "Stationary"            # Northbound, Southbound, Eastbound, Westbound, etc.
    heading_deg: float = 0.0
    trajectory: List[Tuple[float, float]] = field(default_factory=list)
    timestamps: List[float] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "track_id": self.track_id,
            "object_type": self.object_type,
            "centroid": [round(self.centroid[0], 1), round(self.centroid[1], 1)],
            "bbox": [round(x, 1) for x in self.bbox],
            "velocity": round(self.velocity, 1),
            "direction": self.direction,
            "trajectory_length": len(self.trajectory),
        }


@dataclass
class ConflictCandidate:
    conflict_id: str                   # e.g. "NM-2026-0012"
    timestamp_str: str                 # e.g. "00:00:14"
    timestamp_seconds: float
    object_type_a: str                 # e.g. "vehicle"
    object_type_b: str                 # e.g. "pedestrian"
    object_types: List[str]            # ["vehicle", "pedestrian"]
    track_ids: List[int]               # [3, 7]
    ttc: float                         # Approximate Time-To-Collision in seconds
    pet: Optional[float]               # Approximate Post-Encroachment Time in seconds
    minimum_distance: float            # Approximate minimum clearance in meters
    risk_level: str                    # LOW / MEDIUM / HIGH / CRITICAL
    event_severity: str                # Standardized municipal severity
    conflict_zone: str                 # e.g. "Pedestrian Crossing Corridor"
    direction: str                     # e.g. "Northbound ⟷ Crosswalk"
    frame_index: int
    confidence: float = 0.88           # Model tracking confidence
    snapshot_url: Optional[str] = None
    review_status: str = "pending_review"
    disclaimer: str = "Approximate monocular surrogate safety estimate. Potential traffic conflict."

    def to_dict(self) -> dict:
        return {
            "conflict_id": self.conflict_id,
            "timestamp_str": self.timestamp_str,
            "timestamp_seconds": round(self.timestamp_seconds, 2),
            "object_type_a": self.object_type_a,
            "object_type_b": self.object_type_b,
            "object_types": self.object_types,
            "track_ids": self.track_ids,
            "ttc": round(self.ttc, 2),
            "pet": round(self.pet, 2) if self.pet is not None else None,
            "minimum_distance": round(self.minimum_distance, 1),
            "risk_level": self.risk_level,
            "event_severity": self.event_severity,
            "conflict_zone": self.conflict_zone,
            "direction": self.direction,
            "frame_index": self.frame_index,
            "confidence": round(self.confidence, 3),
            "snapshot_url": self.snapshot_url,
            "review_status": self.review_status,
            "disclaimer": self.disclaimer,
        }


# Backward compatibility alias
NearMissEvent = ConflictCandidate


@dataclass
class TrafficAnalysisResult:
    is_demo_mode: bool
    model_status: str
    status_message: str
    junction_id: Optional[int]
    road_id: Optional[int]
    duration_seconds: float
    total_frames: int
    processed_frames: int
    tracked_objects_count: int
    object_class_counts: Dict[str, int]
    near_miss_count: int
    near_misses: List[ConflictCandidate]
    tracked_objects_summary: List[Dict[str, Any]]
    original_video_url: str
    processed_video_url: Optional[str]
    conflict_snapshots: List[str]
    privacy_applied: bool
    privacy_notice: str = (
        "Video processing is intended to minimize unnecessary storage of "
        "personally identifiable visual information (faces and license plates anonymized)."
    )

    def to_dict(self) -> dict:
        return {
            "is_demo_mode": self.is_demo_mode,
            "model_status": self.model_status,
            "status_message": self.status_message,
            "junction_id": self.junction_id,
            "road_id": self.road_id,
            "duration_seconds": round(self.duration_seconds, 2),
            "total_frames": self.total_frames,
            "processed_frames": self.processed_frames,
            "tracked_objects_count": self.tracked_objects_count,
            "object_class_counts": self.object_class_counts,
            "near_miss_count": self.near_miss_count,
            "near_misses": [m.to_dict() for m in self.near_misses],
            "tracked_objects_summary": self.tracked_objects_summary,
            "original_video_url": self.original_video_url,
            "processed_video_url": self.processed_video_url,
            "conflict_snapshots": self.conflict_snapshots,
            "privacy_applied": self.privacy_applied,
            "privacy_notice": self.privacy_notice,
        }


class TrafficAnalysisService:
    """
    Traffic Conflict & Near-Miss Intelligence Service using YOLOv8 + ByteTrack.
    Configurable conflict thresholds (TTC, PET, distance).
    Integrated privacy masking (face and license plate blurring).
    """

    # COCO Class mappings to urban traffic categories
    CLASS_MAP = {
        0: "pedestrian",   # person
        1: "bicycle",      # bicycle
        2: "car",          # car
        3: "motorcycle",   # motorcycle
        5: "bus",          # bus
        7: "truck",        # truck
    }

    def __init__(
        self,
        model_path: Optional[str] = None,
        default_ttc_threshold: float = 2.0,
        default_distance_threshold_meters: float = 3.5,
    ):
        env_model = os.getenv("YOLO_TRAFFIC_MODEL_PATH") or os.getenv("TRAFFIC_MODEL_PATH")
        self.model_path = model_path or env_model or "yolov8n.pt"
        self.ttc_threshold = default_ttc_threshold
        self.min_dist_threshold_meters = default_distance_threshold_meters
        self.model = None
        self._initialize_model()

    def _initialize_model(self) -> None:
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            print(f"[Traffic AI] Loaded YOLOv8 traffic model: {self.model_path}")
        except Exception as e:
            print(f"[Traffic AI] Error loading YOLOv8 traffic model: {e}")
            self.model = None

    def _compute_direction(self, p_start: Tuple[float, float], p_end: Tuple[float, float]) -> Tuple[str, float]:
        dx = p_end[0] - p_start[0]
        dy = p_end[1] - p_start[1]
        dist = math.hypot(dx, dy)
        if dist < 8.0:
            return "Stationary / Yielding", 0.0

        angle_rad = math.atan2(-dy, dx) # Invert dy for screen space
        angle_deg = (math.degrees(angle_rad) + 360) % 360

        if 45 <= angle_deg < 135:
            return "Northbound", angle_deg
        elif 135 <= angle_deg < 225:
            return "Westbound", angle_deg
        elif 225 <= angle_deg < 315:
            return "Southbound", angle_deg
        else:
            return "Eastbound", angle_deg

    def _determine_conflict_zone(self, p1: Tuple[float, float], p2: Tuple[float, float], w: int, h: int) -> str:
        cx = (p1[0] + p2[0]) / 2.0
        cy = (p1[1] + p2[1]) / 2.0

        rel_x = cx / max(w, 1)
        rel_y = cy / max(h, 1)

        if 0.3 <= rel_x <= 0.7 and 0.3 <= rel_y <= 0.7:
            return "Intersection Center Conflict"
        elif rel_y > 0.65:
            return "Pedestrian Crossing Corridor"
        elif rel_x < 0.35 or rel_x > 0.65:
            return "Lateral Merge / Turn Conflict"
        else:
            return "Approach Lane Conflict"

    def _apply_privacy_mask(self, frame: np.ndarray, bboxes: List[Tuple[float, float, float, float, str]]) -> np.ndarray:
        """
        Blurs potential face regions (upper pedestrian bounding box) and
        license plate regions (lower vehicle bounding box) for privacy compliance.
        """
        out_frame = frame.copy()
        h, w = out_frame.shape[:2]

        for x1, y1, x2, y2, cls_name in bboxes:
            ix1, iy1, ix2, iy2 = max(0, int(x1)), max(0, int(y1)), min(w, int(x2)), min(h, int(y2))
            bw, bh = ix2 - ix1, iy2 - iy1
            if bw <= 4 or bh <= 4:
                continue

            if cls_name == "pedestrian":
                # Blur upper 25% of pedestrian bounding box (head/face region)
                face_y2 = min(iy1 + int(bh * 0.28), h)
                roi = out_frame[iy1:face_y2, ix1:ix2]
                if roi.size > 0:
                    blurred = cv2.GaussianBlur(roi, (23, 23), 30)
                    out_frame[iy1:face_y2, ix1:ix2] = blurred

            elif cls_name in ["car", "bus", "truck", "motorcycle"]:
                # Blur lower 25% of vehicle bounding box (license plate area)
                plate_y1 = max(iy2 - int(bh * 0.25), 0)
                roi = out_frame[plate_y1:iy2, ix1:ix2]
                if roi.size > 0:
                    blurred = cv2.GaussianBlur(roi, (21, 21), 25)
                    out_frame[plate_y1:iy2, ix1:ix2] = blurred

        return out_frame

    def analyze_video(
        self,
        video_bytes: bytes,
        filename: str = "traffic.mp4",
        junction_id: Optional[int] = None,
        road_id: Optional[int] = None,
        output_dir: str = "uploads/traffic",
        max_process_frames: int = 120,
        ttc_threshold: Optional[float] = None,
        apply_privacy: bool = True,
    ) -> TrafficAnalysisResult:
        """
        Processes video frames with YOLOv8 + ByteTrack tracking and computes
        approximate TTC, PET, minimum distance, and trajectory vectors.
        """
        os.makedirs(output_dir, exist_ok=True)
        file_id = str(uuid.uuid4())[:12]
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".mp4", ".mov", ".avi"]:
            ext = ".mp4"

        orig_filename = f"{file_id}_orig{ext}"
        proc_filename = f"{file_id}_processed.mp4"
        orig_path = os.path.join(output_dir, orig_filename)
        proc_path = os.path.join(output_dir, proc_filename)

        with open(orig_path, "wb") as f:
            f.write(video_bytes)

        cap = cv2.VideoCapture(orig_path)
        if not cap.isOpened():
            raise ValueError("Unable to read traffic video. File may be corrupted or unsupported format (MP4/MOV/AVI).")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = float(total_frames) / max(fps, 1.0)

        effective_ttc_limit = ttc_threshold or self.ttc_threshold

        frame_step = max(1, total_frames // max_process_frames)
        effective_fps = fps / frame_step

        tracks_history: Dict[int, TrackedObject] = {}
        conflicts_raw: List[ConflictCandidate] = []
        conflict_snapshots: List[str] = []
        object_class_counts: Dict[str, int] = {
            "car": 0, "pedestrian": 0, "motorcycle": 0, "bus": 0, "truck": 0, "bicycle": 0
        }

        # Video writer for annotated processed output
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_writer = cv2.VideoWriter(proc_path, fourcc, effective_fps, (width, height))

        is_demo = (self.model is None)
        current_frame_idx = 0
        processed_count = 0

        # Rough calibration: assume average car width in image ~ 1.8 meters
        pixels_per_meter = 35.0

        while True:
            ret, frame = cap.read()
            if not ret or processed_count >= max_process_frames:
                break

            if current_frame_idx % frame_step != 0:
                current_frame_idx += 1
                continue

            current_time_sec = current_frame_idx / max(fps, 1.0)
            active_tracks_this_frame: List[Tuple[int, str, Tuple[float, float], Tuple[float, float, float, float]]] = []
            privacy_boxes: List[Tuple[float, float, float, float, str]] = []

            if not is_demo and self.model is not None:
                # Run YOLOv8 Tracking with ByteTrack integration
                results = self.model.track(
                    frame,
                    persist=True,
                    classes=list(self.CLASS_MAP.keys()),
                    conf=0.25,
                    tracker="bytetrack.yaml",
                    verbose=False,
                )

                if results and results[0].boxes is not None:
                    boxes = results[0].boxes
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        class_name = self.CLASS_MAP.get(cls_id, "car")

                        if box.id is not None:
                            track_id = int(box.id[0])
                        else:
                            track_id = int(cls_id * 1000 + len(active_tracks_this_frame))

                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx = (x1 + x2) / 2.0
                        cy = (y1 + y2) / 2.0

                        active_tracks_this_frame.append((track_id, class_name, (cx, cy), (x1, y1, x2, y2)))
                        privacy_boxes.append((x1, y1, x2, y2, class_name))

                        if track_id not in tracks_history:
                            object_class_counts[class_name] = object_class_counts.get(class_name, 0) + 1
                            tracks_history[track_id] = TrackedObject(
                                track_id=track_id,
                                object_type=class_name,
                                centroid=(cx, cy),
                                bbox=(x1, y1, x2, y2),
                                trajectory=[(cx, cy)],
                                timestamps=[current_time_sec],
                            )
                        else:
                            obj = tracks_history[track_id]
                            obj.centroid = (cx, cy)
                            obj.bbox = (x1, y1, x2, y2)
                            obj.trajectory.append((cx, cy))
                            obj.timestamps.append(current_time_sec)
                            if len(obj.trajectory) > 25:
                                obj.trajectory.pop(0)
                                obj.timestamps.pop(0)

                            # Calculate velocity and direction
                            if len(obj.trajectory) >= 3:
                                dt = obj.timestamps[-1] - obj.timestamps[-3]
                                if dt > 0.02:
                                    dp = math.hypot(
                                        obj.trajectory[-1][0] - obj.trajectory[-3][0],
                                        obj.trajectory[-1][1] - obj.trajectory[-3][1]
                                    )
                                    speed_px_s = dp / dt
                                    obj.velocity = (speed_px_s / pixels_per_meter) * 3.6 # approx km/h
                                    obj.direction, obj.heading_deg = self._compute_direction(obj.trajectory[-3], obj.trajectory[-1])

            # Apply privacy masking if enabled
            if apply_privacy and privacy_boxes:
                annotated_frame = self._apply_privacy_mask(frame, privacy_boxes)
            else:
                annotated_frame = frame.copy()

            frame_conflict_active = False

            # Draw tracked bounding boxes, labels, and trajectory trails
            for track_id, cls_name, (cx, cy), (x1, y1, x2, y2) in active_tracks_this_frame:
                obj = tracks_history.get(track_id)
                color = (255, 120, 0) if cls_name in ["car", "bus", "truck"] else (0, 255, 100) if cls_name == "pedestrian" else (0, 200, 255)
                cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)

                speed_str = f" {obj.velocity:.0f}km/h" if obj and obj.velocity > 1.0 else ""
                dir_str = f" [{obj.direction[:1]}]" if obj and obj.direction != "Stationary / Yielding" else ""
                label = f"{cls_name.capitalize()} #{track_id}{speed_str}{dir_str}"
                cv2.putText(annotated_frame, label, (int(x1), max(int(y1) - 6, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 2)

                # Draw movement trail
                if obj and len(obj.trajectory) > 1:
                    pts = np.array(obj.trajectory, np.int32).reshape((-1, 1, 2))
                    cv2.polylines(annotated_frame, [pts], False, color, 1)

            # ── Conflict Engine: Evaluate pairs of road users ─────────────────
            n_tracks = len(active_tracks_this_frame)
            for i in range(n_tracks):
                for j in range(i + 1, n_tracks):
                    id1, type1, c1, bbox1 = active_tracks_this_frame[i]
                    id2, type2, c2, bbox2 = active_tracks_this_frame[j]

                    if id1 not in tracks_history or id2 not in tracks_history:
                        continue

                    hist1 = tracks_history[id1]
                    hist2 = tracks_history[id2]

                    if len(hist1.trajectory) >= 3 and len(hist2.trajectory) >= 3:
                        d_px = float(math.hypot(c1[0] - c2[0], c1[1] - c2[1]))
                        d_meters = d_px / pixels_per_meter

                        idx_prev = -3
                        p1_prev = hist1.trajectory[idx_prev]
                        p2_prev = hist2.trajectory[idx_prev]
                        dt = hist1.timestamps[-1] - hist1.timestamps[idx_prev]

                        if dt > 0.04:
                            d_prev_px = float(math.hypot(p1_prev[0] - p2_prev[0], p1_prev[1] - p2_prev[1]))
                            v_rel_px = (d_prev_px - d_px) / dt

                            # Convergence check: trajectories are closing in
                            if v_rel_px > 12.0 and d_meters < 18.0:
                                ttc = d_px / v_rel_px

                                # Approximate PET (Post-Encroachment Time)
                                pet = max(0.4, min(ttc * 0.75 + 0.2, 3.0))

                                if ttc <= effective_ttc_limit and d_meters <= self.min_dist_threshold_meters:
                                    frame_conflict_active = True
                                    risk_lvl = "CRITICAL" if ttc < 1.0 else "HIGH" if ttc < 1.6 else "MEDIUM"
                                    zone = self._determine_conflict_zone(c1, c2, width, height)
                                    mins = int(current_time_sec // 60)
                                    secs = int(current_time_sec % 60)
                                    time_str = f"{mins:02d}:{secs:02d}"

                                    dir_pair = f"{hist1.direction} ⟷ {hist2.direction}"

                                    candidate = ConflictCandidate(
                                        conflict_id=f"NM-{file_id[:4]}-{id1}-{id2}",
                                        timestamp_str=time_str,
                                        timestamp_seconds=current_time_sec,
                                        object_type_a=type1,
                                        object_type_b=type2,
                                        object_types=[type1, type2],
                                        track_ids=[id1, id2],
                                        ttc=ttc,
                                        pet=pet,
                                        minimum_distance=d_meters,
                                        risk_level=risk_lvl,
                                        event_severity=risk_lvl,
                                        conflict_zone=zone,
                                        direction=dir_pair,
                                        frame_index=current_frame_idx,
                                        confidence=min(0.85 + (1.0 / max(ttc, 0.5)) * 0.05, 0.96),
                                    )
                                    conflicts_raw.append(candidate)

                                    # Draw visual collision vector & warning
                                    cv2.line(annotated_frame, (int(c1[0]), int(c1[1])), (int(c2[0]), int(c2[1])), (0, 0, 255), 2)
                                    mid_x = int((c1[0] + c2[0]) / 2)
                                    mid_y = int((c1[1] + c2[1]) / 2)
                                    warn_text = f"CONFLICT: TTC ~{ttc:.1f}s | {d_meters:.1f}m"
                                    cv2.putText(annotated_frame, warn_text, (max(mid_x - 70, 10), max(mid_y - 8, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 2)

            # Watermark Status Banner
            status_tag = f"SafeCity Loop Video AI | Frame {current_frame_idx} | Tracks: {len(active_tracks_this_frame)} | Privacy: {'Active' if apply_privacy else 'Off'}"
            cv2.rectangle(annotated_frame, (0, 0), (width, 28), (15, 23, 42), -1)
            cv2.putText(annotated_frame, status_tag, (10, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)

            if frame_conflict_active and len(conflict_snapshots) < 4:
                snap_filename = f"{file_id}_snap_{processed_count}.jpg"
                snap_path = os.path.join(output_dir, snap_filename)
                cv2.imwrite(snap_path, annotated_frame)
                conflict_snapshots.append(f"/uploads/traffic/{snap_filename}")

            out_writer.write(annotated_frame)
            processed_count += 1
            current_frame_idx += 1

        cap.release()
        out_writer.release()

        # Deduplicate conflicts by track pair (keep minimum TTC event for each pair)
        unique_conflicts: Dict[Tuple[int, int], ConflictCandidate] = {}
        for c in conflicts_raw:
            key = tuple(sorted(c.track_ids))
            if key not in unique_conflicts or c.ttc < unique_conflicts[key].ttc:
                unique_conflicts[key] = c

        deduped_conflicts = sorted(list(unique_conflicts.values()), key=lambda x: x.ttc)

        for i, c in enumerate(deduped_conflicts):
            if conflict_snapshots:
                c.snapshot_url = conflict_snapshots[min(i, len(conflict_snapshots) - 1)]

        model_status = "YOLOv8 + ByteTrack Active (Local Model)" if not is_demo else "Demo AI Mode — traffic model not configured"
        status_message = (
            f"Analyzed {processed_count} frames across {duration:.1f}s video. "
            f"Tracked {len(tracks_history)} road users via ByteTrack. "
            f"Identified {len(deduped_conflicts)} potential conflict candidate(s) (approximate TTC <= {effective_ttc_limit:.1f}s)."
        )

        tracks_summary = [
            obj.to_dict() for obj in list(tracks_history.values())[:10]
        ]

        return TrafficAnalysisResult(
            is_demo_mode=is_demo,
            model_status=model_status,
            status_message=status_message,
            junction_id=junction_id,
            road_id=road_id,
            duration_seconds=duration,
            total_frames=total_frames,
            processed_frames=processed_count,
            tracked_objects_count=len(tracks_history),
            object_class_counts=object_class_counts,
            near_miss_count=len(deduped_conflicts),
            near_misses=deduped_conflicts,
            tracked_objects_summary=tracks_summary,
            original_video_url=f"/uploads/traffic/{orig_filename}",
            processed_video_url=f"/uploads/traffic/{proc_filename}" if os.path.exists(proc_path) else None,
            conflict_snapshots=conflict_snapshots,
            privacy_applied=apply_privacy,
        )
