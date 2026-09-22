# SafeCity Loop V2 — AI-Powered Urban Road-Safety Platform

> **Detect danger. Predict risk. Prioritize action. Build safer cities.**

**Core Workflow:**
`DETECT → ANALYZE → PREDICT → PRIORITIZE → PREVENT → REPAIR → MEASURE`

---

> ⚠️ **DEMO DATA DISCLAIMER**
> All road names, hazard coordinates, near-miss events, and repair recommendations present in this prototype are **realistic but fictional demo data** (`[DEMO]`). They do not represent real municipal or road safety authority records.

---

## 🏛 Architecture & Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.10+, tested on Python 3.14)
- **Database:** SQLite (`safecity.db`) via SQLAlchemy ORM
- **Computer Vision & AI Inference:**
  - **Ultralytics YOLOv8** (Local CPU/GPU inference, no cloud AI dependencies)
  - **Pothole Detection Pipeline:** Configurable via `MODEL_PATH`. Includes bounding box extraction, confidence rating, severity classification, and prototype risk scoring.
  - **Demo AI Mode Architecture:** If custom pothole weights are not configured, runs uncalibrated optical surface anomaly analysis with transparent labels.
  - **Traffic Near-Miss Pipeline:** YOLOv8 + **ByteTrack** multi-object tracking (vehicles, pedestrians, motorcycles, cyclists) + **Time-To-Collision (TTC)** calculation. Flags potential near misses with TTC < 2.0s with wording: *AI-assisted near-miss detection*.
  - **Static Media Server:** Original and processed detection images and video footage served via `/uploads`.

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (Navy/Charcoal command center palette: `#0a0f1e`, `#111827`, `#1a2236`)
- **Mapping:** OpenStreetMap & Leaflet interactive abstraction (`MapProvider.tsx`, swappable to Google Maps via `VITE_MAP_PROVIDER=google`)
- **Data & State:** TanStack Query v5 + Axios
- **Analytics:** Recharts

---

## 👁 AI Vision Features (Part 2)

### 1. Pothole Detection (`POST /api/potholes/analyze`)
- **Input:** Roadway photo (JPG, PNG, WEBP, up to 15MB).
- **Processing:** Local YOLOv8 inference pipeline.
- **Outputs:**
  - Bounding box coordinates (`[x1, y1, x2, y2]`)
  - Detection confidence percentage
  - Severity classification: `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`
  - Prototype Risk Score:
    $$\text{Risk Score} = (\text{Severity Weight} \times 0.6) + (\text{Confidence} \times 100 \times 0.4)$$
- **Persistence:** Automatically saves newly detected potholes to the `Hazard` database table linked to the road, updating the dashboard, risk score, and interactive map.
- **Visualizer:** Side-by-side view of Original Image vs. Detection Overlay with bounding boxes and defect badges.

### 2. Traffic Near-Miss Detection (`POST /api/traffic/analyze`)
- **Input:** Traffic junction video (MP4, MOV, AVI, up to 50MB).
- **Processing:** OpenCV frame extraction + YOLOv8 + ByteTrack multi-object tracking.
- **Tracked Classes:** Vehicles (cars, buses, trucks), pedestrians, cyclists, motorcycles.
- **TTC Conflict Model:**
  $$\text{TTC} = \frac{D(t)}{V_{\text{rel}}} \quad (\text{flagged when } \text{TTC} < 2.0\text{s})$$
- **Outputs:** Annotated video, keyframe conflict snapshots, tracked user counts, and chronologically indexed near-miss events with timestamps (`00:00:17`), object types (`Vehicle + Pedestrian`), TTC (`1.4 sec`), risk level (`HIGH`), and conflict zones.

---

## 🚀 Quick Start (Run Locally)

### 1. Backend Setup & Run
From the root directory:
```bash
# Install Python dependencies (or: uv pip install -r requirements.txt)
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn backend.main:app --reload --port 8000
```
- API Docs & Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend Setup & Run
In a separate terminal, from `frontend/`:
```bash
cd frontend

# Install packages
npm install   # (on Windows PowerShell: cmd.exe /c npm install)

# Start Vite dev server
npm run dev
```
- Open browser at: `http://localhost:5173`

---

## ⚙️ Model Configuration

Model weights are located in `models/`:
- **Pothole model:** Configured via `MODEL_PATH` in `.env` (default: `models/pothole_yolov8.pt`).
- **Traffic model:** `yolov8n.pt` (automatically cached locally by Ultralytics).
- When `models/pothole_yolov8.pt` is not present, the system operates in **Demo AI Mode** and clearly displays a banner and settings guide rather than pretending a generic model is a pothole detector.

---

## 🧪 Test Suites

Run backend test suites:
```bash
# General API audit (all 8 foundation endpoints)
python test_backend.py

# AI Vision pipeline audit (YOLO, pothole upload, video analysis, TTC calculation, validation)
python test_vision_backend.py
```
