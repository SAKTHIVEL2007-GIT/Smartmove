"""
SafeCity Loop V2 — Pothole Video Diagnostic Test Suite
Runs raw frame extraction, YOLO inference verification, spatial IoU tracking,
debug snapshot rendering, and JSON report generation as specified in Steps 2, 3, & 22.
"""
import os
import sys
import time
import json
import cv2
import numpy as np
from ultralytics import YOLO

# Add current workspace to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from backend.services.pothole_detection import PotholeDetectionService, SpatialTemporalPotholeTracker

def run_diagnostic():
    print("=" * 75)
    print("SAFECITY LOOP V2 — POTHOLE VIDEO DIAGNOSTIC SUITE")
    print("=" * 75)

    # 1. Verify Model Existence & Loading (Step 2)
    model_path = "models/pothole_yolov8.pt"
    print(f"[STEP 2] MODEL PATH: {os.path.abspath(model_path)}")
    if not os.path.exists(model_path):
        print("❌ CRITICAL: Model file 'models/pothole_yolov8.pt' NOT FOUND!")
        return

    print("✔ Model file exists.")
    try:
        model = YOLO(model_path)
        print("✔ MODEL LOADED: True")
        print(f"✔ MODEL CLASSES: {model.names}")
        
        # Dynamically identify pothole class ID
        pothole_cls_id = None
        pothole_cls_name = None
        for cid, cname in model.names.items():
            if str(cname).lower() in ["0", "pothole", "defect", "crater"]:
                pothole_cls_id = cid
                pothole_cls_name = cname
                break
        
        if pothole_cls_id is None:
            pothole_cls_id = list(model.names.keys())[0]
            pothole_cls_name = model.names[pothole_cls_id]

        print(f"✔ POTHOLE CLASS ID: {pothole_cls_id}")
        print(f"✔ POTHOLE CLASS NAME: '{pothole_cls_name}'")
    except Exception as e:
        print(f"❌ Failed to load YOLO model: {e}")
        return

    # 2. Check Device (Step 25)
    try:
        import torch
        device = "CUDA (GPU)" if torch.cuda.is_available() else "CPU"
    except Exception:
        device = "CPU"
    print(f"✔ DEVICE: {device}")

    # 3. Locate or Create Test Road Video (Step 3 & Step 22)
    debug_dir = "debug"
    os.makedirs(os.path.join(debug_dir, "raw"), exist_ok=True)
    os.makedirs(os.path.join(debug_dir, "detections"), exist_ok=True)
    os.makedirs(os.path.join(debug_dir, "best"), exist_ok=True)

    test_video_path = None
    possible_sources = [
        "uploads/demo/demo_road_pothole.mp4",
        "uploads/potholes/test_road.mp4",
        "demo_pothole_road.mp4"
    ]
    for p in possible_sources:
        if os.path.exists(p):
            test_video_path = p
            break

    if not test_video_path:
        # Create a synthetic road video with a pothole pattern for diagnostic validation
        print("[INFO] No existing test video found. Creating synthetic road video 'debug/synthetic_road.mp4'...")
        test_video_path = os.path.join(debug_dir, "synthetic_road.mp4")
        fps = 25.0
        width, height = 1280, 720
        writer = cv2.VideoWriter(test_video_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
        
        for fidx in range(75): # 3-second video
            # Draw road surface
            frame = np.ones((height, width, 3), dtype=np.uint8) * 60
            # Draw lane lines
            cv2.line(frame, (100, 720), (500, 200), (255, 255, 255), 4)
            cv2.line(frame, (1180, 720), (780, 200), (255, 255, 255), 4)
            
            # Simulate a moving pothole crater in the lower road region for frames 15 to 60
            if 15 <= fidx <= 60:
                # Crater location moves down as car approaches
                cy = int(350 + (fidx - 15) * 6)
                cx = int(600 + (fidx - 15) * 2)
                rx = int(40 + (fidx - 15) * 1.5)
                ry = int(25 + (fidx - 15) * 1.0)
                # Dark asphalt crater
                cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, (25, 20, 18), -1)
                cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, (10, 8, 5), 3)

            writer.write(frame)
        writer.release()
        print(f"✔ Synthetic test road video created: {test_video_path}")

    # 4. Open Video & Print Parameters (Step 6)
    cap = cv2.VideoCapture(test_video_path)
    if not cap.isOpened():
        print(f"❌ Failed to open test video: {test_video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"\n[STEP 6] VIDEO OPENED: {test_video_path}")
    print(f"   FPS: {fps:.1f}")
    print(f"   RESOLUTION: {width}x{height}")
    print(f"   FRAME COUNT: {total_frames}")

    # 5. Run Frame Extraction & Inference (Step 3 & 4)
    service = PotholeDetectionService()
    tracker = SpatialTemporalPotholeTracker(iou_thresh=0.20, max_disappeared=30)
    
    output_video_path = os.path.join(debug_dir, "test_output.mp4")
    writer = cv2.VideoWriter(output_video_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))

    frames_analyzed = 0
    frames_with_pothole = 0
    total_raw_detections = 0
    best_conf = 0.0

    fidx = 0
    start_t = time.time()

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        fidx += 1
        if fidx % 2 != 0:
            writer.write(frame)
            continue

        frames_analyzed += 1
        raw_path = os.path.join(debug_dir, "raw", f"frame_{fidx:04d}.jpg")
        cv2.imwrite(raw_path, frame)

        # Run unified detector
        dets = service.detect_frame(frame, conf_threshold=0.25, imgsz=1280)
        
        annotated = frame.copy()
        if dets:
            frames_with_pothole += 1
            total_raw_detections += len(dets)
            for det in dets:
                if det.confidence > best_conf:
                    best_conf = det.confidence

            # Track
            active_tracks = tracker.update(fidx, fidx / fps, dets, frame)

            # Draw boxes
            for det in dets:
                b = det.box
                x1, y1, x2, y2 = int(b.x1), int(b.y1), int(b.x2), int(b.y2)
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 3)
                label = f"POTHOLE {det.confidence*100:.0f}% [{det.severity}]"
                cv2.putText(annotated, label, (x1, max(y1 - 6, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            det_path = os.path.join(debug_dir, "detections", f"frame_{fidx:04d}.jpg")
            cv2.imwrite(det_path, annotated)

        cv2.putText(annotated, f"Frame {fidx}/{total_frames} | Raw Dets: {len(dets)}", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 180), 2)
        writer.write(annotated)

        if fidx % 20 == 0 or fidx == total_frames:
            print(f"   Processing frame {fidx}/{total_frames} (Detections: {total_raw_detections})...")

    cap.release()
    writer.release()

    unique_tracks = [t for t in tracker.all_tracks if len(t.confidences) >= 2 or t.max_confidence >= 0.60]
    elapsed_sec = time.time() - start_t

    # Save best snapshot
    if unique_tracks:
        best_track = max(unique_tracks, key=lambda t: t.max_confidence)
        if best_track.best_frame_img is not None:
            best_snap_path = os.path.join(debug_dir, "best", "best_pothole_snapshot.jpg")
            cv2.imwrite(best_snap_path, best_track.best_frame_img)
            print(f"✔ Saved best keyframe snapshot to: {best_snap_path}")

    # Generate JSON Diagnostic Report (Step 22)
    report = {
        "video_path": test_video_path,
        "total_frames": total_frames,
        "frames_analyzed": frames_analyzed,
        "frames_containing_pothole": frames_with_pothole,
        "total_raw_detections": total_raw_detections,
        "unique_potholes": len(unique_tracks),
        "maximum_confidence": round(best_conf, 3),
        "processing_time_sec": round(elapsed_sec, 2),
        "output_video_path": output_video_path,
        "unique_tracks": [
            {
                "track_id": f"pothole_{t.pothole_id:03d}",
                "first_seen_frame": t.first_seen_frame,
                "last_seen_frame": t.last_seen_frame,
                "total_confirmations": len(t.confidences),
                "max_confidence": round(t.max_confidence, 3),
                "severity": t.highest_severity,
                "best_timestamp_seconds": round(t.first_seen_seconds, 2)
            }
            for t in unique_tracks
        ]
    }

    report_path = os.path.join(debug_dir, "detection_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 75)
    print("DIAGNOSTIC SUITE SUMMARY")
    print("=" * 75)
    print(f"Total Frames:             {total_frames}")
    print(f"Frames Analyzed:          {frames_analyzed}")
    print(f"Frames With Potholes:     {frames_with_pothole}")
    print(f"Total Raw Detections:     {total_raw_detections}")
    print(f"Unique Potholes Counted:  {len(unique_tracks)}")
    print(f"Maximum Confidence:       {best_conf * 100:.1f}%")
    print(f"Annotated Video Output:   {output_video_path}")
    print(f"Diagnostic Report:        {report_path}")
    print("=" * 75)

if __name__ == "__main__":
    run_diagnostic()
