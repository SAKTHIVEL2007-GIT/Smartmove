"""
SafeCity Loop V2 — Transparent Risk Calculation Engine & What-If Simulator
Implements transparent 0–100 road risk calculation formula, factor breakdown,
configurable intervention assumptions, factor transition clamping, and dynamic comparison.
"""
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
import math


RISK_WEIGHTS: Dict[str, float] = {
    "hazard_severity": 0.30,
    "traffic_exposure": 0.20,
    "vulnerable_users": 0.20,
    "near_miss_risk": 0.15,
    "road_condition": 0.10,
    "aging": 0.05,
}

# Configurable intervention simulation assumptions (Part 2)
# Factor deltas (negative = risk factor reduction)
INTERVENTION_EFFECTS: Dict[str, Dict[str, Any]] = {
    "speed_bump": {
        "name": "Speed Bump & Chicane Installation",
        "type": "speed-bump",
        "deltas": {
            "traffic_exposure": -0.15,
            "vulnerable_users": -0.05,
            "near_miss_risk": -0.25,
            "road_condition": 0.0,
            "hazard_severity": 0.0,
            "aging": 0.0,
        },
        "description": "Reduces traffic speed, vehicle throughput, and mid-block near-miss conflicts.",
    },
    "pedestrian_refuge_island": {
        "name": "Pedestrian Refuge Island & Solar Signage",
        "type": "signage",
        "deltas": {
            "traffic_exposure": 0.0,
            "vulnerable_users": -0.30,
            "near_miss_risk": -0.35,
            "road_condition": 0.0,
            "hazard_severity": 0.0,
            "aging": 0.0,
        },
        "description": "Protects crossing pedestrians and cyclists; dramatically lowers crossing conflicts.",
    },
    "road_resurfacing": {
        "name": "Full Road Surface Reconstruction",
        "type": "resurfacing",
        "deltas": {
            "hazard_severity": -0.40,
            "road_condition": -0.50,
            "near_miss_risk": -0.10,
            "traffic_exposure": 0.0,
            "vulnerable_users": 0.0,
            "aging": -0.30,
        },
        "description": "Eliminates asphalt fatigue, potholes, and rutting; improves skid resistance.",
    },
    "micro_surfacing": {
        "name": "Micro-Surfacing & Anti-Skid Epoxy",
        "type": "resurfacing",
        "deltas": {
            "hazard_severity": -0.45,
            "road_condition": -0.55,
            "near_miss_risk": -0.15,
            "traffic_exposure": 0.0,
            "vulnerable_users": 0.0,
            "aging": -0.40,
        },
        "description": "High-durability polymer seal coat for surface restoration and friction enhancement.",
    },
    "speed_cushions": {
        "name": "Dual Speed Cushions",
        "type": "speed-bump",
        "deltas": {
            "traffic_exposure": -0.10,
            "near_miss_risk": -0.20,
            "vulnerable_users": -0.05,
            "hazard_severity": 0.0,
            "road_condition": 0.0,
            "aging": 0.0,
        },
        "description": "Calibrates vehicle speeds without obstructing emergency vehicles.",
    },
}


def clamp(val: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """Utility to clamp float values to [min_val, max_val]."""
    return max(min_val, min(max_val, val))


def calculate_risk_score(
    factors: Dict[str, float],
    weights: Optional[Dict[str, float]] = None
) -> Tuple[float, Dict[str, Dict[str, Any]]]:
    """
    Transparent Risk Engine (Part 1).
    Formula:
    Risk Score = 100 * (
        0.30 * Hazard Severity
      + 0.20 * Traffic Exposure
      + 0.20 * Vulnerable User Exposure
      + 0.15 * Near-Miss Risk
      + 0.10 * Road Condition
      + 0.05 * Aging / SLA
    )
    All factors normalized between 0.0 and 1.0.
    Final score clamped to [0, 100].
    
    Returns:
        (total_score: float, breakdown: Dict[str, Dict[str, Any]])
    """
    w_map = weights or RISK_WEIGHTS
    
    # Ensure weights sum to 1.0
    total_w = sum(w_map.values())
    if abs(total_w - 1.0) > 1e-4:
        # Normalize weights if custom
        w_map = {k: v / total_w for k, v in w_map.items()}

    breakdown: Dict[str, Dict[str, Any]] = {}
    weighted_sum = 0.0

    factor_labels = {
        "hazard_severity": "Hazard Severity",
        "traffic_exposure": "Traffic Exposure",
        "vulnerable_users": "Vulnerable Users Exposure",
        "near_miss_risk": "Near-Miss Risk",
        "road_condition": "Road Condition / Degradation",
        "aging": "Aging / SLA Time",
    }

    for key, weight in w_map.items():
        raw_val = factors.get(key, 0.5)
        norm_val = clamp(float(raw_val), 0.0, 1.0)
        contrib = norm_val * weight * 100.0
        max_points = weight * 100.0

        weighted_sum += contrib
        breakdown[key] = {
            "label": factor_labels.get(key, key),
            "normalized_value": round(norm_val, 3),
            "weight": round(weight, 3),
            "max_points": round(max_points, 1),
            "contribution_points": round(contrib, 1),
            "status": "AVAILABLE" if key in factors else "DEFAULT_ESTIMATE",
        }

    final_score = round(clamp(weighted_sum, 0.0, 100.0), 1)
    return final_score, breakdown


def apply_intervention_effects(
    current_factors: Dict[str, float],
    intervention_key: str
) -> Tuple[Dict[str, float], Dict[str, Dict[str, Any]]]:
    """
    Applies configurable intervention deltas to current factors and clamps to [0.0, 1.0].
    Returns:
        (projected_factors: Dict, factor_transitions: Dict)
    """
    effect_data = INTERVENTION_EFFECTS.get(intervention_key, {})
    deltas = effect_data.get("deltas", {})

    projected_factors: Dict[str, float] = {}
    transitions: Dict[str, Dict[str, Any]] = {}

    all_keys = set(current_factors.keys()).union(RISK_WEIGHTS.keys())

    for key in all_keys:
        before_val = clamp(float(current_factors.get(key, 0.5)), 0.0, 1.0)
        delta = float(deltas.get(key, 0.0))
        after_val = clamp(before_val + delta, 0.0, 1.0)

        projected_factors[key] = after_val
        transitions[key] = {
            "factor_key": key,
            "before_normalized": round(before_val, 3),
            "after_normalized": round(after_val, 3),
            "delta": round(after_val - before_val, 3),
            "is_modified": abs(after_val - before_val) > 1e-4,
        }

    return projected_factors, transitions


def evaluate_road_risk(road_id: int, db: Session) -> Dict[str, Any]:
    """
    Evaluates current risk score for a road segment using DB data or seed metadata.
    """
    from backend.models import Road, Hazard, NearMiss

    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise ValueError(f"Road ID {road_id} not found.")

    hazards = db.query(Hazard).filter(Hazard.road_id == road_id, Hazard.status == "active").all()
    conflicts = db.query(NearMiss).filter(NearMiss.road_id == road_id).all()

    # 1. Hazard Severity Factor (Pothole + Water Accumulation + Combined Interaction)
    pothole_hazards = [h for h in hazards if h.type == "pothole"]
    water_hazards = [h for h in hazards if h.type == "water_accumulation"]

    if hazards:
        sev_map = {"CRITICAL": 1.0, "HIGH": 0.80, "MEDIUM": 0.55, "LOW": 0.30}
        highest_sev = max((h.severity or "MEDIUM").upper() for h in hazards)
        hazard_factor = sev_map.get(highest_sev, 0.50)

        # Combined Hazard Interaction (Standing water obscuring sub-surface potholes)
        if pothole_hazards and water_hazards:
            hazard_factor = clamp(hazard_factor + 0.15, 0.0, 1.0)
    else:
        hazard_factor = 0.20

    # 2. Traffic Exposure Factor
    exp = (road.traffic_exposure or "MEDIUM").upper()
    traffic_factor = 0.85 if exp == "HIGH" else 0.50 if exp == "MEDIUM" else 0.25

    # 3. Vulnerable Users Factor
    rtype = (road.road_type or "").lower()
    if "school" in rtype or "hospital" in rtype:
        vuln_factor = 0.85
    elif "arterial" in rtype:
        vuln_factor = 0.65
    else:
        vuln_factor = 0.40

    # 4. Near-Miss Risk Factor
    if conflicts:
        conflict_count = len(conflicts)
        min_ttc = min((getattr(c, "ttc", None) or getattr(c, "ttc_seconds", 2.0) or 2.0) for c in conflicts)
        near_miss_factor = clamp(0.30 + (conflict_count * 0.10) + (1.5 / max(min_ttc, 0.5)) * 0.20, 0.0, 1.0)
    else:
        near_miss_factor = 0.30

    # 5. Road Condition Factor
    road_cond_factor = clamp(road.risk_score / 100.0, 0.15, 0.95)

    # 6. Aging / SLA Factor
    aging_factor = 0.40

    factors = {
        "hazard_severity": hazard_factor,
        "traffic_exposure": traffic_factor,
        "vulnerable_users": vuln_factor,
        "near_miss_risk": near_miss_factor,
        "road_condition": road_cond_factor,
        "aging": aging_factor,
    }

    score, breakdown = calculate_risk_score(factors)

    # Provenance label
    data_source = "REAL VIDEO & DB DATA" if hazards or conflicts else "DEMO ROAD DATA"

    return {
        "mode": "current",
        "data_source": data_source,
        "road_id": road.id,
        "road_name": road.name,
        "risk_score": score,
        "observed_conflicts": len(conflicts),
        "observation_note": "Observed real-time corridor telemetry & active hazards",
        "factors": breakdown,
        "raw_factors": factors,
    }


def simulate_road_intervention(
    road_id: int,
    intervention_key: str,
    db: Session
) -> Dict[str, Any]:
    """
    Simulates projected safety impact of an intervention on a candidate road segment (Part 2).
    """
    current_eval = evaluate_road_risk(road_id, db)
    current_risk = current_eval["risk_score"]
    current_factors = current_eval["raw_factors"]

    if intervention_key not in INTERVENTION_EFFECTS:
        intervention_key = "speed_bump"

    effect_info = INTERVENTION_EFFECTS[intervention_key]
    projected_factors, transitions = apply_intervention_effects(current_factors, intervention_key)

    projected_risk, projected_breakdown = calculate_risk_score(projected_factors)

    change_points = round(projected_risk - current_risk, 1)
    reduction_percent = round(((current_risk - projected_risk) / max(current_risk, 1.0)) * 100.0, 1)

    return {
        "mode": "simulation",
        "data_source": "WHAT-IF SIMULATION",
        "road_id": road_id,
        "road_name": current_eval["road_name"],
        "intervention_key": intervention_key,
        "intervention_name": effect_info["name"],
        "intervention_type": effect_info["type"],
        "current_risk": current_risk,
        "projected_risk": projected_risk,
        "change_points": change_points,
        "reduction_percent": reduction_percent,
        "factor_transitions": transitions,
        "projected_factors_breakdown": projected_breakdown,
        "disclaimer": (
            "Projected results are generated from current measured road-risk factors and "
            "configurable intervention-effect assumptions. They are simulations, not guaranteed real-world outcomes."
        ),
    }


def compare_road_interventions(road_id: int, db: Session) -> Dict[str, Any]:
    """
    Generates dynamic comparison chart dataset comparing Current Risk vs all candidate interventions (Part 2).
    """
    current_eval = evaluate_road_risk(road_id, db)
    current_risk = current_eval["risk_score"]

    comparison_items = []
    for key, effect in INTERVENTION_EFFECTS.items():
        sim = simulate_road_intervention(road_id, key, db)
        comparison_items.append({
            "key": key,
            "name": effect["name"],
            "type": effect["type"],
            "projected_risk": sim["projected_risk"],
            "change_points": sim["change_points"],
            "reduction_percent": sim["reduction_percent"],
        })

    return {
        "road_id": road_id,
        "road_name": current_eval["road_name"],
        "current_risk": current_risk,
        "data_source": current_eval["data_source"],
        "interventions": comparison_items,
    }
