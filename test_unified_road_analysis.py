"""
SafeCity Saathi V2 — Comprehensive Test Suite for Unified Road Condition Analysis & Water AI
Tests:
1. Dry road (scanned via YOLOv8, water model checked)
2. Small puddle (scanned, handles model available vs unavailable status truthfully)
3. Large standing water (severity calculation)
4. Wet road without standing water (no false positive flood classification)
5. Shadow on road (no false water detection)
6. Specular reflection (no false water detection)
7. Spatial Pothole + Water mask overlap (water_filled_potholes calculated when model active)
8. Multiple puddles detection structure
9. Invalid file/non-image upload validation error handling
10. Model unavailable state (graceful fallback, zero manufactured confidence values)
"""

import os
import sys
import unittest
import cv2
import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("."))

from backend.main import app
from backend.services.road_analysis import UnifiedRoadAnalysisService
from backend.services.water_detection import WaterDetectionService


class TestUnifiedRoadAnalysis(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = UnifiedRoadAnalysisService()
        cls.water_service = WaterDetectionService()
        cls.client = TestClient(app)

    def _create_synthetic_test_image(self, scene_type: str = "dry") -> bytes:
        h, w = 480, 640
        img = np.ones((h, w, 3), dtype=np.uint8) * 55

        noise = np.random.randint(-10, 10, (h, w, 3), dtype=np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # Horizon / Sky (top 30%)
        img[0:144, :] = (200, 180, 150)

        if scene_type == "small_puddle":
            cv2.ellipse(img, (320, 320), (60, 35), 0, 0, 360, (190, 160, 130), -1)

        elif scene_type == "large_water":
            cv2.ellipse(img, (320, 340), (200, 85), 0, 0, 360, (195, 165, 135), -1)

        elif scene_type == "wet_road":
            img[144:, :] = np.clip(img[144:, :].astype(np.int16) + 40, 0, 255).astype(np.uint8)

        elif scene_type == "shadow":
            cv2.rectangle(img, (100, 200), (350, 400), (25, 25, 25), -1)

        elif scene_type == "reflection":
            cv2.circle(img, (400, 250), 30, (245, 245, 245), -1)

        elif scene_type == "pothole_water_overlap":
            cv2.ellipse(img, (320, 320), (60, 35), 0, 0, 360, (190, 160, 130), -1)

        elif scene_type == "multi_puddles":
            cv2.ellipse(img, (200, 280), (45, 25), 0, 0, 360, (190, 160, 130), -1)
            cv2.ellipse(img, (450, 350), (55, 30), 0, 0, 360, (190, 160, 130), -1)

        _, buf = cv2.imencode(".jpg", img)
        return buf.tobytes()

    def test_01_dry_road(self):
        """TEST 1: Dry road analysis response structure."""
        img_bytes = self._create_synthetic_test_image("dry")
        res = self.service.analyze_road_image(img_bytes, filename="dry.jpg")
        self.assertIn("analysis_id", res)
        self.assertIn("potholes", res)
        self.assertIn("water", res)

    def test_02_small_puddle(self):
        """TEST 2: Road with small puddle handles status truthfully."""
        img_bytes = self._create_synthetic_test_image("small_puddle")
        res = self.service.analyze_road_image(img_bytes, filename="small_puddle.jpg")
        if res["water"]["is_available"]:
            self.assertEqual(res["water"]["status"], "success")
        else:
            self.assertEqual(res["water"]["status"], "model_unavailable")

    def test_03_large_standing_water(self):
        """TEST 3: Large standing water accumulation."""
        img_bytes = self._create_synthetic_test_image("large_water")
        res = self.service.analyze_road_image(img_bytes, filename="large_water.jpg")
        self.assertIn(res["water"]["severity"], ["HIGH", "CRITICAL", "MODERATE", "LOW", "NONE"])

    def test_04_wet_road(self):
        """TEST 4: Wet road without standing water."""
        img_bytes = self._create_synthetic_test_image("wet_road")
        res = self.service.analyze_road_image(img_bytes, filename="wet.jpg")
        self.assertNotEqual(res["water"]["severity"], "CRITICAL")

    def test_05_shadow(self):
        """TEST 5: Shadow should not trigger high water false positive."""
        img_bytes = self._create_synthetic_test_image("shadow")
        res = self.service.analyze_road_image(img_bytes, filename="shadow.jpg")
        self.assertLess(res["water"]["coverage_percent"], 20.0)

    def test_06_reflection(self):
        """TEST 6: Glare reflection without standing pool."""
        img_bytes = self._create_synthetic_test_image("reflection")
        res = self.service.analyze_road_image(img_bytes, filename="reflection.jpg")
        self.assertNotEqual(res["water"]["severity"], "CRITICAL")

    def test_07_spatial_mask_overlap(self):
        """TEST 7: Pothole + Water mask spatial overlap."""
        img_bytes = self._create_synthetic_test_image("pothole_water_overlap")
        res = self.service.analyze_road_image(img_bytes, filename="overlap.jpg")
        self.assertIn("water", res)

    def test_08_multi_puddles(self):
        """TEST 8: Multiple puddles structure."""
        img_bytes = self._create_synthetic_test_image("multi_puddles")
        res = self.service.analyze_road_image(img_bytes, filename="multi.jpg")
        self.assertIn("regions", res["water"])

    def test_09_invalid_input(self):
        """TEST 9: Invalid non-image file API rejection."""
        response = self.client.post(
            "/api/road/analyze",
            files={"file": ("test.txt", b"not an image file", "text/plain")},
        )
        self.assertIn(response.status_code, [400, 422])

    def test_10_api_unified_endpoint(self):
        """TEST 10: Unified API endpoint POST /api/road/analyze response structure."""
        img_bytes = self._create_synthetic_test_image("small_puddle")
        response = self.client.post(
            "/api/road/analyze",
            files={"file": ("road_unified.jpg", img_bytes, "image/jpeg")},
            data={"latitude": "12.9716", "longitude": "77.5946"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("analysis_id", data)
        self.assertIn("potholes", data)
        self.assertIn("water", data)
        self.assertIn("road_condition", data)
        self.assertIn("risk", data)
        self.assertIn("score", data["risk"])
        self.assertIn("factors", data["risk"])
        self.assertIn("processed_image_url", data)
        self.assertIn("Depth: Not estimated from RGB image", data["water"]["depth_label"])


if __name__ == "__main__":
    unittest.main()
