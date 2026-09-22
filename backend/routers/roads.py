"""GET /api/roads — All monitored roads."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import Road
from backend.schemas import RoadOut

router = APIRouter()

@router.get("/roads", response_model=List[RoadOut])
def get_roads(
    status: Optional[str] = Query(None),
    min_risk: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Road)
    if status:
        q = q.filter(Road.status == status)
    if min_risk is not None:
        q = q.filter(Road.risk_score >= min_risk)
    return q.order_by(Road.risk_score.desc()).all()
