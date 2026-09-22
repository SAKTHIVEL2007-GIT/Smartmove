"""
SafeCity Loop V2 — Traffic Analysis Service
YOLOv8 + ByteTrack Object Tracking + Time-To-Collision (TTC) Near-Miss Detection
"""
import os
import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
import cv2
import numpy as np


@dataclass
class TrackedObject:
    track_id: int
    class_name: str         # vehicle, pedestrian, motorcycle, cyclist
    centroid: Tuple[float, float]
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    trajectory: List[Tuple[float, float]] = field(default_factory=list)
    timestamps: List[float] = field(default_factory=list)


@dataclass
class NearMissEvent:
    conflict_id: str
    timestamp_str: str                 # e.g. "00:00:17"
    timestamp_seconds: float
    object_types: List[str]            # ["vehicle", "pedestrian"]
    track_ids: List[int]
    ttc: float                         # Time-To-Collision in seconds
    risk_level: str                    # LOW / MEDIUM / HIGH / CRITICAL
    conflict_zone: str                 # e.g. "Pedestrian Crossing Corridor"
    frame_index: int
    snapshot_url: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "conflict_id": self.conflict_id,
            "timestamp_str": self.timestamp_str,
            "timestamp_seconds": round(self.timestamp_seconds, 2),
            "object_types": self.object_types,
            "track_ids": self.track_ids,
            "ttc": round(self.ttc, 2),
            "risk_level": self.risk_level,
            "conflict_zone": self.conflict_zone,
            "frame_index": self.frame_index,
            "snapshot_url": self.snapshot_url,
        }


@dataclass
class TrafficAnalysisResult:
    is_demo_mode: bool
    model_status: str
    status_message: str
    junction_id: Optional[int]
    duration_seconds: float
    total_frames: int
    processed_frames: int
    tracked_objects_count: int
    object_class_counts: Dict[str, int]
    near_miss_count: int
    near_misses: List[NearMissEvent]
    original_video_url: str
    processed_video_url: Optional[str]
    conflict_snapshots: List[str]

    def to_dict(self) -> dict:
        return {
            "is_demo_mode": self.is_demo_mode,
            "model_status": self.model_status,
            "status_message": self.status_message,
            "junction_id": self.junction_id,
            "duration_seconds": round(self.duration_seconds, 2),
            "total_frames": self.total_frames,
            "processed_frames": self.processed_frames,
            "tracked_objects_count": self.tracked_objects_count,
            "object_class_counts": self.object_class_counts,
            "near_miss_count": self.near_miss_count,
            "near_misses": [m.to_dict() for m in self.near_misses],
            "original_video_url": self.original_video_url,
            "processed_video_url": self.processed_video_url,
            "conflict_snapshots": self.conflict_snapshots,
        }


class TrafficAnalysisService:
    """
    Traffic near-miss analysis using YOLOv8 object detection & tracking.
    Monitors trajectories of vehicles, pedestrians, motorcycles, and cyclists.
    Calculates Time-To-Collision (TTC) to flag potential near misses.
    """

    # COCO Class mappings to urban traffic categories
    CLASS_MAP = {
        0: "pedestrian",   # person
        1: "cyclist",      # bicycle
        2: "vehicle",      # car
        3: "motorcycle",   # motorcycle
        5: "vehicle",      # bus
        7: "vehicle",      # truck
    }

    def __init__(self, model_path: str = "yolov8n.pt"):
        self.model_path = model_path
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

    def analyze_video(
        self,
        video_bytes: bytes,
        filename: str = "traffic.mp4",
        junction_id: Optional[int] = None,
        output_dir: str = "uploads/traffic",
        max_process_frames: int = 120,
    ) -> TrafficAnalysisResult:
        """
        Processes video frames with YOLOv8 tracking and computes TTC.
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
            raise ValueError("Unable to read traffic video. File may be corrupted or unsupported format.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = float(total_frames) / max(fps, 1.0)

        # Skip frames if video is long to stay within budget
        frame_step = max(1, total_frames // max_process_frames)
        effective_fps = fps / frame_step

        tracks_history: Dict[int, TrackedObject] = {}
        near_misses_raw: List[NearMissEvent] = []
        conflict_snapshots: List[str] = []
        object_class_counts: Dict[str, int] = {"vehicle": 0, "pedestrian": 0, "motorcycle": 0, "cyclist": 0}

        # Video writer for annotated processed output
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_writer = cv2.VideoWriter(proc_path, fourcc, effective_fps, (width, height))

        is_demo = self.model is None
        current_frame_idx = 0
        processed_count = 0

        while True:
            ret, frame = cap.read()
            if not ret or processed_count >= max_process_frames:
                break

            if current_frame_idx % frame_step != 0:
                current_frame_idx += 1
                continue

            current_time_sec = current_frame_idx / max(fps, 1.0)
            active_tracks_this_frame: List[Tuple[int, str, Tuple[float, float], Tuple[float, float, float, float]]] = []

            if not is_demo and self.model is not None:
                # Run YOLOv8 Tracking with COCO classes
                results = self.model.track(
                    frame,
                    persist=True,
                    classes=list(self.CLASS_MAP.keys()),
                    conf=0.25,
                    verbose=False,
                )

                if results and results[0].boxes is not None:
                    boxes = results[0].boxes
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        class_name = self.CLASS_MAP.get(cls_id, "vehicle")

                        # Tracking ID from ByteTrack / Ultralytics
                        if box.id is not None:
                            track_id = int(box.id[0])
                        else:
                            track_id = int(cls_id * 1000 + len(active_tracks_this_frame))

                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx = (x1 + x2) / 2.0
                        cy = (y1 + y2) / 2.0

                        active_tracks_this_frame.append((track_id, class_name, (cx, cy), (x1, y1, x2, y2)))

                        # Update object class counts
                        if track_id not in tracks_history:
                            object_class_counts[class_name] = object_class_counts.get(class_name, 0) + 1

                        # Record trajectory
                        if track_id not in tracks_history:
                            tracks_history[track_id] = TrackedObject(
                                track_id=track_id,
                                class_name=class_name,
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
                            if len(obj.trajectory) > 20:
                                obj.trajectory.pop(0)
                                obj.timestamps.pop(0)

            annotated_frame = frame.copy()
            frame_conflict_active = False

            # Draw tracked bounding boxes and trajectories
            for track_id, cls_name, (cx, cy), (x1, y1, x2, y2) in active_tracks_this_frame:
                color = (255, 100, 0) if cls_name == "vehicle" else (0, 255, 100) if cls_name == "pedestrian" else (0, 200, 255)
                cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)

                label = f"{cls_name.capitalize()} #{track_id}"
                cv2.putText(annotated_frame, label, (int(x1), max(int(y1) - 6, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 2)

                # Draw trajectory trail
                obj = tracks_history.get(track_id)
                if obj and len(obj.trajectory) > 1:
                    pts = np.array(obj.trajectory, np.int32).reshape((-1, 1, 2))
                    cv2.polylines(annotated_frame, [pts], False, color, 1)

            # ── Compute Time-To-Collision (TTC) for pairs of active tracks ────
            n_tracks = len(active_tracks_this_frame)
            for i in range(n_tracks):
                for j in range(i + 1, n_tracks):
                    id1, type1, c1, bbox1 = active_tracks_this_frame[i]
                    id2, type2, c2, bbox2 = active_tracks_this_frame[j]

                    # Only evaluate cross-object or vehicle-vehicle interactions
                    if id1 not in tracks_history or id2 not in tracks_history:
                        continue

                    hist1 = tracks_history[id1]
                    hist2 = tracks_history[id2]

                    if len(hist1.trajectory) >= 3 and len(hist2.trajectory) >= 3:
                        d_current = float(np.hypot(c1[0] - c2[0], c1[1] - c2[1]))

                        # Distance 2 samples ago
                        idx_prev = -3
                        p1_prev = hist1.trajectory[idx_prev]
                        p2_prev = hist2.trajectory[idx_prev]
                        dt = hist1.timestamps[-1] - hist1.timestamps[idx_prev]

                        if dt > 0.05:
                            d_prev = float(np.hypot(p1_prev[0] - p2_prev[0], p1_prev[1] - p2_prev[1]))
                            v_rel = (d_prev - d_current) / dt  # pixels / second

                            # If converging (v_rel > 0)
                            if v_rel > 15.0 and d_current < (width * 0.45):
                                ttc = d_current / v_rel

                                if ttc < 2.0:
                                    frame_conflict_active = True
                                    risk_lvl = "CRITICAL" if ttc < 1.0 else "HIGH" if ttc < 1.6 else "MEDIUM"
                                    zone = self._determine_conflict_zone(c1, c2, width, height)

                                    mins = int(current_time_sec // 60)
                                    secs = int(current_time_sec % 60)
                                    time_str = f"{mins:02d}:{secs:02d}"

                                    conflict_ev = NearMissEvent(
                                        conflict_id=f"NM-{file_id[:6]}-{id1}-{id2}",
                                        timestamp_str=time_str,
                                        timestamp_seconds=current_time_sec,
                                        object_types=[type1, type2],
                                        track_ids=[id1, id2],
                                        ttc=ttc,
                                        risk_level=risk_lvl,
                                        conflict_zone=zone,
                                        frame_index=current_frame_idx,
                                    )
                                    near_misses_raw.append(conflict_ev)

                                    # Draw visual conflict line between objects
                                    cv2.line(annotated_frame, (int(c1[0]), int(c1[1])), (int(c2[0]), int(c2[1])), (0, 0, 255), 2)
                                    mid_x = int((c1[0] + c2[0]) / 2)
                                    mid_y = int((c1[1] + c2[1]) / 2)
                                    warn_text = f"NEAR MISS! TTC {ttc:.1f}s"
                                    cv2.putText(annotated_frame, warn_text, (mid_x - 40, mid_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            # Header on annotated frame
            status_tag = f"SafeCity Loop AI Traffic Monitor | Frame {current_frame_idx} | Tracks: {len(active_tracks_this_frame)}"
            cv2.rectangle(annotated_frame, (0, 0), (width, 28), (15, 23, 42), -1)
            cv2.putText(annotated_frame, status_tag, (10, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

            if frame_conflict_active and len(conflict_snapshots) < 3:
                # Save keyframe conflict snapshot
                snap_filename = f"{file_id}_snap_{processed_count}.jpg"
                snap_path = os.path.join(output_dir, snap_filename)
                cv2.imwrite(snap_path, annotated_frame)
                conflict_snapshots.append(f"/uploads/traffic/{snap_filename}")

            out_writer.write(annotated_frame)
            processed_count += 1
            current_frame_idx += 1

        cap.release()
        out_writer.release()

        # Deduplicate near misses by track pair (keep minimum TTC for each unique pair)
        unique_conflicts: Dict[Tuple[int, int], NearMissEvent] = {}
        for nm in near_misses_raw:
            key = tuple(sorted(nm.track_ids))
            if key not in unique_conflicts or nm.ttc < unique_conflicts[key].ttc:
                unique_conflicts[key] = nm

        deduped_near_misses = sorted(list(unique_conflicts.values()), key=lambda x: x.ttc)

        # Attach snapshot to near-miss events if available
        for i, nm in enumerate(deduped_near_misses):
            if conflict_snapshots:
                nm.snapshot_url = conflict_snapshots[min(i, len(conflict_snapshots) - 1)]

        model_status = "YOLOv8 + ByteTrack Active (Local Model)" if not is_demo else "Demo AI Mode — traffic model not configured"
        status_message = (
            f"Analyzed {processed_count} frames across {duration:.1f}s video. "
            f"Detected {len(tracks_history)} tracked road users. "
            f"Identified {len(deduped_near_misses)} potential near-miss interaction(s) (AI-assisted detection)."
        )

        return TrafficAnalysisResult(
            is_demo_mode=is_demo,
            model_status=model_status,
            status_message=status_message,
            junction_id=junction_id,
            duration_seconds=duration,
            total_frames=total_frames,
            processed_frames=processed_count,
            tracked_objects_count=len(tracks_history),
            object_class_counts=object_class_counts,
            near_miss_count=len(deduped_near_misses),
            near_misses=deduped_near_misses,
            original_video_url=f"/uploads/traffic/{orig_filename}",
            processed_video_url=f"/uploads/traffic/{proc_filename}" if os.path.exists(proc_path) else None,
            conflict_snapshots=conflict_snapshots,
        )
