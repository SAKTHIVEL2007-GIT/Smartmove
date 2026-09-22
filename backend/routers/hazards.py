"""GET /api/hazards — All hazards, optionally filtered."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import Hazard
from backend.schemas import HazardOut

router = APIRouter()

@router.get("/hazards", response_model=List[HazardOut])
def get_hazards(
    type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    road_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Hazard)
    if type:
        q = q.filter(Hazard.type == type)
    if severity:
        q = q.filter(Hazard.severity == severity)
    if road_id:
        q = q.filter(Hazard.road_id == road_id)
    return q.order_by(Hazard.risk_score.desc()).all()
