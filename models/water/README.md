# SmartMove / SafeCity Saathi V2 — Water Segmentation Model Directory

This directory holds the local Ultralytics YOLOv8 instance segmentation model weights for road water accumulation detection.

## 📁 Model Weight Placement

Place your trained YOLOv8 segmentation model checkpoint file here:
```
models/water/best.pt
```
or
```
models/water_segmentation.pt
```

## ⚙️ Environment Variable Configuration
You can customize the model path in your `.env` file:
```env
WATER_MODEL_PATH=models/water/best.pt
```

## 🟢 Truthful Model Status Handling
- **If model file exists**: The system loads the PyTorch weights into memory and executes real neural segmentation inference (`task='segment'`).
- **If model file does NOT exist**: The system reports `Water AI: YOLOv8-Seg ⚠ Model unavailable` in status APIs and UI panels. **No fake water percentages, random confidences, or manufactured visual masks are generated.** Pothole analysis and surface condition evaluation continue normally.
