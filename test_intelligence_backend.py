"""
SafeCity Loop V2 — Road Safety Intelligence Layer Test Suite
Tests:
1. Danger Zone & SafeCity Score evaluations
2. AI Repair Priority Queue & Status Updates (PATCH)
3. RouteEngine: Fastest vs Lower-Risk Route neutral comparison
4. Smart Junction Display state & Near-Miss Simulation trigger
5. GPS hazard creation from citizen reports
"""
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def run_tests():
    print("=== STARTING ROAD SAFETY INTELLIGENCE LAYER TESTS ===\n")

    # 1. Danger Zones & SafeCity Scores
    res = client.get("/api/danger-zones")
    assert res.status_code == 200, f"Failed: {res.text}"
    dz_list = res.json()
    assert len(dz_list) > 0
    first_dz = dz_list[0]
    print(f"✓ GET /api/danger-zones: {len(dz_list)} roads evaluated. Top: {first_dz['road_name']}, "
          f"Danger Score: {first_dz['danger_zone_score']}/100 ({first_dz['danger_zone_classification']}), "
          f"SafeCity Score: {first_dz['safe_city_score']}/100")
    assert "Calculated Danger Zone Score" in first_dz["disclaimer"]
    assert "pothole_risk" in first_dz["factors"]
    assert "pedestrian_exposure" in first_dz["factors"]

    # 2. Repair Decision Engine Queue
    res = client.get("/api/repair-priority")
    assert res.status_code == 200, f"Failed: {res.text}"
    repairs = res.json()
    assert len(repairs) > 0
    first_repair = repairs[0]
    print(f"✓ GET /api/repair-priority: {len(repairs)} repairs prioritized. Rank #1: {first_repair['road_name']}, "
          f"Priority: {first_repair['priority_level']}, Urgency: {first_repair['urgency_score']}/100")
    assert len(first_repair["reasons"]) > 0
    print(f"  Explanation reason: \"{first_repair['reasons'][0]}\"")

    # 3. PATCH /api/repairs/{id} status update
    road_id = first_repair["road_id"]
    res = client.patch(f"/api/repairs/{road_id}", json={"status": "Under Repair", "assigned_to": "Metro Squad 4"})
    assert res.status_code == 200, f"Failed: {res.text}"
    updated = res.json()
    assert updated["status"] == "Under Repair"
    print(f"✓ PATCH /api/repairs/{road_id}: status updated to '{updated['status']}'")

    # 4. RouteEngine: Fastest vs Lower-Risk Route comparison
    res = client.get("/api/routes/compare?origin_id=1&destination_id=2")
    assert res.status_code == 200, f"Failed: {res.text}"
    route_data = res.json()
    assert len(route_data["routes"]) == 2
    fastest = next(r for r in route_data["routes"] if r["route_key"] == "fastest")
    safer = next(r for r in route_data["routes"] if r["route_key"] == "safer")
    print(f"✓ GET /api/routes/compare: Origin '{route_data['origin_name']}' -> Destination '{route_data['destination_name']}'")
    print(f"  Fastest Route: {fastest['distance_km']}km, {fastest['time_minutes']}min, Risk: {fastest['overall_calculated_risk']}/100")
    print(f"  Lower-Risk Route: {safer['distance_km']}km, {safer['time_minutes']}min, Risk: {safer['overall_calculated_risk']}/100")
    assert "neutral" in route_data["neutral_advisory"].lower()

    # 5. Smart Junction Display state
    res = client.get("/api/junctions/1/display")
    assert res.status_code == 200, f"Failed: {res.text}"
    display = res.json()
    print(f"✓ GET /api/junctions/1/display: Mode '{display['display_mode']}', Signal '{display['signal_state']}', Risk {display['risk_score']}")

    # 6. Junction Simulation: Near Miss -> Junction Risk Increases -> Display changes state
    res = client.post("/api/junctions/1/simulate-event", json={"conflict_type": "pedestrian-vehicle", "ttc": 1.2, "risk_level": "CRITICAL"})
    assert res.status_code == 200, f"Failed: {res.text}"
    sim_display = res.json()
    assert sim_display["display_mode"] == "HIGH RISK"
    assert sim_display["signal_state"] == "RED"
    assert "PEDESTRIAN" in sim_display["ai_risk_state"]
    print(f"✓ POST /api/junctions/1/simulate-event: Mode triggered to '{sim_display['display_mode']}', Signal '{sim_display['signal_state']}', Banner: \"{sim_display['ai_risk_state']}\"")

    # 7. Citizen Report with GPS -> Creates Hazard on Map
    report_payload = {
        "reporter_name": "Surveyor Priya",
        "type": "pothole",
        "description": "Deep asphalt trench near crosswalk",
        "latitude": 51.5076,
        "longitude": -0.1279,
        "severity": "HIGH",
    }
    res = client.post("/api/reports", json=report_payload)
    assert res.status_code == 201, f"Failed: {res.text}"
    print(f"✓ POST /api/reports with GPS: created report id={res.json()['id']} and mapped hazard")

    print("\nALL ROAD SAFETY INTELLIGENCE LAYER BACKEND TESTS PASSED 100%!")

if __name__ == "__main__":
    run_tests()
