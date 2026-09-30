"""
SafeCity Loop V2 — Risk Engine & What-If Simulator Router
Endpoints:
- GET  /api/risk/evaluate/{road_id} — Current risk calculation & transparent factor breakdown (Part 1)
- POST /api/interventions/simulate — What-If Municipal Simulator (Part 2)
- GET  /api/interventions/compare/{road_id} — Dynamic comparison chart data (Part 2)
- GET  /api/interventions/effects — Configurable intervention effect metadata (Part 2)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.database import get_db
from backend.schemas import (
    RiskEvaluationOut, InterventionSimulationRequest, InterventionSimulationOut,
    InterventionComparisonOut
)
from backend.services.risk_engine import (
    evaluate_road_risk, simulate_road_intervention, compare_road_interventions,
    INTERVENTION_EFFECTS, RISK_WEIGHTS
)

router = APIRouter()


@router.get("/risk/evaluate/{road_id}", response_model=RiskEvaluationOut)
def evaluate_risk(road_id: int, db: Session = Depends(get_db)):
    """Calculates current road risk score (0-100) and transparent factor breakdown."""
    try:
        return evaluate_road_risk(road_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Risk engine evaluation error: {str(e)}")


@router.post("/interventions/simulate", response_model=InterventionSimulationOut)
def simulate_intervention(payload: InterventionSimulationRequest, db: Session = Depends(get_db)):
    """Simulates projected safety impact of candidate intervention on road segment."""
    try:
        return simulate_road_intervention(payload.road_id, payload.intervention, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Intervention simulation error: {str(e)}")


@router.get("/interventions/compare/{road_id}", response_model=InterventionComparisonOut)
def compare_interventions(road_id: int, db: Session = Depends(get_db)):
    """Generates dynamic chart comparison dataset for candidate interventions."""
    try:
        return compare_road_interventions(road_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Intervention comparison error: {str(e)}")


@router.get("/interventions/effects")
def get_intervention_effects():
    """Returns configurable intervention simulation effect assumptions and risk weights."""
    return {
        "weights": RISK_WEIGHTS,
        "effects": INTERVENTION_EFFECTS,
    }
