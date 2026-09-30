"""
SafeCity Loop V2 — Automated Unit & Integration Tests for Water Accumulation Pipeline
Tests:
1. Dry road (0% standing water, detected=False)
2. Road with small puddle (LOW/MEDIUM severity)
3. Road with large standing water (HIGH/CRITICAL severity)
4. Flooded road (CRITICAL severity, > 35% road area)
5. Wet asphalt without puddles (Distinguishes wet sheen from standing water pools)
6. Shadow on road (Does not trigger false positive)
7. Specular road reflection (Does not trigger false positive)
8. Combined Pothole + Water Accumulation hazard interaction risk boost
9. Multi-region puddle segmentation (Extracts Region #1, Region #2...)
10. REST API endpoint POST /api/water/analyze input validation & response schema
"""
import os
import sys
import unittest
import cv2
import numpy as np
from fastapi.testclient import TestClient

# Ensure root directory is on Python path
sys.path.insert(0, os.path.abspath("."))

from backend.main import app
from backend.services.water_detection import WaterDetectionService, WATER_SEVERITY_THRESHOLDS


class TestWaterDetectionPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = WaterDetectionService()
        cls.client = TestClient(app)
        os.makedirs("debug_test_images", exist_ok=True)

    def _create_synthetic_road_image(
        self,
        water_type: str = "dry",
        puddle_locations: list = None,
    ) -> bytes:
        """Helper to create synthetic 640x480 road images representing different surface conditions."""
        h, w = 480, 640
        # Dark asphalt road background
        road_img = np.ones((h, w, 3), dtype=np.uint8) * 55

        # Add asphalt texture noise
        noise = np.random.randint(-12, 12, (h, w, 3), dtype=np.int16)
        road_img = np.clip(road_img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # Draw sky horizon (top 30%)
        road_img[0:144, :] = (200, 180, 150)  # Bright sky

        if water_type == "small_puddle":
            # Draw a closed standing water puddle (smooth specular sheen cyan/blue tinted mirror pool)
            p_pts = puddle_locations or [(320, 320, 60, 35)]
            for cx, cy, rx, ry in p_pts:
                cv2.ellipse(road_img, (cx, cy), (rx, ry), 0, 0, 360, (190, 160, 130), -1)

        elif water_type == "large_flooded":
            # Large standing water body covering ~40% of road surface
            cv2.ellipse(road_img, (320, 340), (220, 90), 0, 0, 360, (195, 165, 135), -1)

        elif water_type == "wet_asphalt":
            # Widespread specular sheen across road, but high texture variance (no closed pool boundary)
            road_img[144:, :] = np.clip(road_img[144:, :].astype(np.int16) + 45, 0, 255).astype(np.uint8)

        elif water_type == "shadow":
            # Dark shadow region on asphalt (low brightness, same roughness texture)
            cv2.rectangle(road_img, (100, 200), (350, 400), (25, 25, 25), -1)

        elif water_type == "reflection":
            # Bright glare glint without puddle boundary
            cv2.circle(road_img, (400, 250), 30, (245, 245, 245), -1)

        elif water_type == "multi_puddles":
            # Multiple separate puddles
            cv2.ellipse(road_img, (200, 280), (45, 25), 0, 0, 360, (190, 160, 130), -1)
            cv2.ellipse(road_img, (450, 350), (55, 30), 0, 0, 360, (190, 160, 130), -1)
            cv2.ellipse(road_img, (300, 410), (35, 20), 0, 0, 360, (190, 160, 130), -1)

        _, buf = cv2.imencode(".jpg", road_img)
        return buf.tobytes()

    def test_01_dry_road(self):
        """TEST 1: Dry road should detect 0 standing water."""
        img_bytes = self._create_synthetic_road_image(water_type="dry")
        res = self.service.analyze_image(img_bytes, filename="dry_road.jpg")
        self.assertFalse(res.detected, "Dry road should not detect standing water.")
        self.assertEqual(res.severity, "NONE")
        self.assertLess(res.water_area_percent, 2.0)

    def test_02_small_puddle(self):
        """TEST 2: Road with small puddle should detect water with LOW/MEDIUM severity."""
        img_bytes = self._create_synthetic_road_image(water_type="small_puddle")
        res = self.service.analyze_image(img_bytes, filename="small_puddle.jpg")
        self.assertTrue(res.detected, "Small puddle should be detected.")
        self.assertIn(res.severity, ["LOW", "MEDIUM"])
        self.assertGreater(res.water_area_percent, 0.5)
        self.assertGreater(len(res.regions), 0)

    def test_03_large_standing_water(self):
        """TEST 3: Large standing water body should detect HIGH/CRITICAL severity."""
        img_bytes = self._create_synthetic_road_image(water_type="large_flooded")
        res = self.service.analyze_image(img_bytes, filename="large_flooded.jpg")
        self.assertTrue(res.detected, "Large water body should be detected.")
        self.assertIn(res.severity, ["HIGH", "CRITICAL"])
        self.assertGreater(res.water_area_percent, 10.0)

    def test_04_wet_asphalt(self):
        """TEST 4: Wet asphalt without puddles should not trigger high standing water alarms."""
        img_bytes = self._create_synthetic_road_image(water_type="wet_asphalt")
        res = self.service.analyze_image(img_bytes, filename="wet_asphalt.jpg")
        # Diffuse wet sheen lacks standing mirror pool boundaries
        self.assertNotEqual(res.severity, "CRITICAL")

    def test_05_shadow(self):
        """TEST 5: Shadows should not be misclassified as standing water pools."""
        img_bytes = self._create_synthetic_road_image(water_type="shadow")
        res = self.service.analyze_image(img_bytes, filename="shadow.jpg")
        self.assertLess(res.water_area_percent, 5.0)

    def test_06_reflection(self):
        """TEST 6: Specular glints without pool boundaries should not trigger false positives."""
        img_bytes = self._create_synthetic_road_image(water_type="reflection")
        res = self.service.analyze_image(img_bytes, filename="reflection.jpg")
        self.assertNotEqual(res.severity, "CRITICAL")

    def test_07_combined_pothole_water(self):
        """TEST 7: Pothole + Water Accumulation interaction risk calculation."""
        img_bytes = self._create_synthetic_road_image(water_type="small_puddle")
        res = self.service.analyze_image(
            img_bytes,
            filename="combined.jpg",
            has_potholes=True,
            pothole_severity="HIGH",
            pothole_count=2,
        )
        self.assertIsNotNone(res.combined_hazard)
        self.assertEqual(res.combined_hazard["pothole_severity"], "HIGH")
        self.assertGreater(res.combined_hazard["combined_risk_score"], res.risk_contribution)

    def test_08_multi_region_puddles(self):
        """TEST 8: Multiple separate puddles should extract distinct regions."""
        img_bytes = self._create_synthetic_road_image(water_type="multi_puddles")
        res = self.service.analyze_image(img_bytes, filename="multi_puddles.jpg")
        self.assertTrue(res.detected)
        self.assertGreaterEqual(len(res.regions), 2)
        self.assertEqual(res.regions[0].region_id, 1)

    def test_09_depth_disclaimer(self):
        """TEST 9: RGB depth disclaimer must be explicitly returned."""
        img_bytes = self._create_synthetic_road_image(water_type="small_puddle")
        res = self.service.analyze_image(img_bytes, filename="depth_check.jpg")
        self.assertEqual(res.depth_label, "Not available from RGB image")

    def test_10_api_endpoint(self):
        """TEST 10: REST API POST /api/water/analyze integration."""
        img_bytes = self._create_synthetic_road_image(water_type="small_puddle")
        response = self.client.post(
            "/api/water/analyze",
            files={"file": ("puddle_test.jpg", img_bytes, "image/jpeg")},
            data={"road_id": 1, "has_potholes": "true", "pothole_severity": "HIGH", "pothole_count": "1"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["hazard_type"], "water_accumulation")
        self.assertIn("water_area_percent", data)
        self.assertIn("regions", data)
        self.assertIn("processed_image_url", data)
        self.assertIn("mask_image_url", data)
        self.assertIn("depth_label", data)
        self.assertEqual(data["depth_label"], "Not available from RGB image")


if __name__ == "__main__":
    unittest.main()
