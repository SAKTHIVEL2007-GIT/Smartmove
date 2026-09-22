from fastapi.testclient import TestClient
from backend.main import app

with TestClient(app) as client:
    endpoints = [
        '/api/dashboard',
        '/api/roads',
        '/api/hazards',
        '/api/danger-zones',
        '/api/repair-priority',
        '/api/junctions',
        '/api/interventions',
        '/api/reports',
    ]
    for ep in endpoints:
        res = client.get(ep)
        data = res.json()
        item_count = len(data) if isinstance(data, list) else len(data.keys())
        print(f"GET {ep:<22} -> status={res.status_code} items/keys={item_count}")
        assert res.status_code == 200, f"Failed on {ep}"

    # Test POST /api/reports
    payload = {
        "reporter_name": "Citizen Alex",
        "type": "pothole",
        "description": "Deep pothole near school entrance",
        "severity": "HIGH",
    }
    post_res = client.post("/api/reports", json=payload)
    print(f"POST /api/reports            -> status={post_res.status_code} id={post_res.json().get('id')}")
    assert post_res.status_code == 201, "Failed on POST /api/reports"

print("\n ALL 8 BACKEND ENDPOINTS PASSED AUDIT SUCCESSFULLY!")
