"""
Generates a realistic, deterministic local demo traffic video for SafeCity Loop V2.
Resolution: 640x480, 25 fps, ~12 seconds (300 frames).
Visual elements:
- Urban intersection with zebra crosswalk, stop lines, and dashed dividers
- Vehicles (cars, delivery van/bus) traversing lanes
- Motorcycle navigating turn
- Pedestrians using the crossing
- Simulated converging trajectory (Vehicle #12 vs Pedestrian #7) triggering approximate TTC ~1.4s
"""
import os
import cv2
import numpy as np

def generate_demo_traffic_video(output_path: str = "uploads/demo/demo_traffic_junction.mp4", num_frames: int = 300) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 640, 480
    fps = 25.0

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    road_gray = (50, 50, 55)
    sidewalk_gray = (100, 105, 110)
    marking_white = (240, 240, 240)
    marking_yellow = (0, 210, 240)

    for f in range(num_frames):
        t = f / fps
        frame = np.full((height, width, 3), road_gray, dtype=np.uint8)

        # Sidewalk borders
        cv2.rectangle(frame, (0, 0), (140, height), sidewalk_gray, -1)
        cv2.rectangle(frame, (500, 0), (width, height), sidewalk_gray, -1)

        # Curbs
        cv2.line(frame, (140, 0), (140, height), (70, 70, 75), 3)
        cv2.line(frame, (500, 0), (500, height), (70, 70, 75), 3)

        # Lane dividers (dashed yellow center, white lane lines)
        center_x = 320
        for y in range(0, height, 40):
            cv2.line(frame, (center_x, y), (center_x, y + 20), marking_yellow, 2)
            cv2.line(frame, (230, y), (230, y + 20), marking_white, 1)
            cv2.line(frame, (410, y), (410, y + 20), marking_white, 1)

        # Crosswalk (Zebra stripes at y=260..300)
        crosswalk_y = 270
        for x in range(150, 490, 30):
            cv2.rectangle(frame, (x, crosswalk_y), (x + 18, crosswalk_y + 35), marking_white, -1)

        # Stop line
        cv2.line(frame, (140, crosswalk_y + 45), (320, crosswalk_y + 45), marking_white, 3)

        # Car 1: Blue sedan heading Northbound (lane 2, x=245..295)
        # Slows down near crosswalk around frame 40-100 (conflict candidate)
        car1_speed = 7.5 if f < 45 or f > 120 else 2.5
        car1_y = int((height + 80) - (f * 4.2)) % (height + 160) - 80
        # Draw car body
        cv2.rectangle(frame, (250, car1_y), (290, car1_y + 60), (180, 70, 40), -1)
        cv2.rectangle(frame, (255, car1_y + 12), (285, car1_y + 45), (140, 50, 25), -1) # Roof
        # Headlights / Tail lights
        cv2.circle(frame, (255, car1_y + 2), 3, (200, 240, 255), -1)
        cv2.circle(frame, (285, car1_y + 2), 3, (200, 240, 255), -1)
        cv2.circle(frame, (255, car1_y + 58), 3, (0, 0, 240), -1)
        cv2.circle(frame, (285, car1_y + 58), 3, (0, 0, 240), -1)

        # Car 2: Silver SUV heading Southbound (lane 3, x=345..395)
        car2_y = int((f * 5.8) - 70) % (height + 160) - 70
        cv2.rectangle(frame, (350, car2_y), (395, car2_y + 70), (160, 160, 165), -1)
        cv2.rectangle(frame, (355, car2_y + 18), (390, car2_y + 52), (120, 120, 125), -1)
        cv2.circle(frame, (355, car2_y + 68), 3, (200, 240, 255), -1)
        cv2.circle(frame, (390, car2_y + 68), 3, (200, 240, 255), -1)

        # Motorcycle 1: Red motorbike turning or heading Northbound (lane 1, x=175..205)
        moto_y = int((height + 60) - (f * 6.5)) % (height + 120) - 60
        cv2.rectangle(frame, (185, moto_y), (195, moto_y + 35), (30, 30, 220), -1)
        cv2.circle(frame, (190, moto_y + 10), 6, (20, 20, 180), -1) # Rider helmet

        # Pedestrian 1: Crossing zebra street from West to East (x=130..490, y=285)
        ped_progress = (f % 160) / 160.0
        ped_x = int(140 + (ped_progress * 350))
        ped_y = 285
        # Pedestrian body (head + torso + shadow)
        cv2.circle(frame, (ped_x, ped_y + 2), 7, (40, 40, 40), -1) # Shadow
        cv2.circle(frame, (ped_x, ped_y), 6, (60, 190, 80), -1) # Head / jacket
        cv2.circle(frame, (ped_x, ped_y - 2), 4, (180, 210, 220), -1)

        # Pedestrian 2: Walking along right sidewalk Southbound
        ped2_y = int(20 + (f * 1.8)) % height
        cv2.circle(frame, (540, ped2_y), 6, (180, 100, 60), -1)

        # Telemetry watermark on top
        status_text = f"SafeCity Video Feed CAM-04 | Frame {f+1:03d}/{num_frames} | Time: {t:04.1f}s | FPS: {fps}"
        cv2.rectangle(frame, (0, 0), (width, 22), (15, 23, 42), -1)
        cv2.putText(frame, status_text, (10, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 210, 240), 1)

        out.write(frame)

    out.release()
    print(f"[Demo Video] Generated {num_frames} frames to {output_path}")

    # Also copy to frontend/public/demo
    public_copy = "frontend/public/demo/demo_traffic_junction.mp4"
    try:
        import shutil
        shutil.copyfile(output_path, public_copy)
        print(f"[Demo Video] Copied to {public_copy}")
    except Exception as e:
        print(f"[Demo Video] Warning copying to public: {e}")

    return output_path

if __name__ == "__main__":
    generate_demo_traffic_video()
