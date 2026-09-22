# SafeCity Loop V2 — Local AI Vision Models

This directory holds local YOLOv8 weights for on-device inference without cloud dependencies.

## 1. Pothole Detection Model (`MODEL_PATH`)

- **Default path:** `models/pothole_yolov8.pt`
- **Environment variable:** `MODEL_PATH` in `.env`

### How to configure:
1. Place your trained YOLOv8 pothole weights file into this directory:
   ```
   models/pothole_yolov8.pt
   ```
2. Or set a custom location in your `.env` file:
   ```env
   MODEL_PATH=models/pothole_yolov8.pt
   ```
3. Restart the backend server.
4. The system will automatically detect the custom weights and switch from **Demo AI Mode** to **YOLOv8 Active (Local Model)**.

### Demo AI Mode Fallback:
If no custom pothole weights file is present at `MODEL_PATH`:
- The system activates **Demo AI Mode — real model not configured**.
- The vision pipeline will run an uncalibrated optical surface contour analyzer to detect anomalies.
- All detections are clearly labeled with `[DEMO] Surface Anomaly Candidate` rather than fabricating predictions.

---

## 2. Traffic Near-Miss Model (`yolov8n.pt`)

- **Model:** Ultralytics YOLOv8 Nano (`yolov8n.pt`)
- **Tracking:** ByteTrack
- **Classes Tracked:**
  - `vehicle` (Cars, Trucks, Buses)
  - `pedestrian` (Persons)
  - `cyclist` (Bicycles)
  - `motorcycle` (Motorcycles)
- The model runs 100% locally on CPU/GPU to track centroids, project trajectories, and calculate Time-To-Collision (TTC).
