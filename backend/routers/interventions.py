"""GET /api/interventions — Before/after intervention impact data."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import Intervention
from backend.schemas import InterventionOut

router = APIRouter()

@router.get("/interventions", response_model=List[InterventionOut])
def get_interventions(db: Session = Depends(get_db)):
    return db.query(Intervention).order_by(Intervention.implemented_at.desc()).all()
