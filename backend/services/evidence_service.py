"""
SafeCity Loop V2 — Evidence & Audit Logging Service
Manages digital chain-of-custody for detection photos, video clips, GPS coordinates,
and municipal decision audit trails.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.models import EvidenceFile, AuditLog, Road


class EvidenceService:
    """
    Manages storage and indexing of road safety visual evidence and audit records.
    """

    @staticmethod
    def log_audit(
        db: Session,
        actor: str,
        action: str,
        target_type: str,
        target_id: Optional[int] = None,
        details: Optional[str] = None
    ) -> AuditLog:
        """
        Records an immutable audit entry in the municipal decision log.
        """
        entry = AuditLog(
            timestamp=datetime.utcnow(),
            actor=actor,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def register_evidence(
        db: Session,
        file_type: str,
        file_url: str,
        road_id: Optional[int] = None,
        hazard_id: Optional[int] = None,
        conflict_id: Optional[int] = None,
        thumbnail_url: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None
    ) -> EvidenceFile:
        """
        Creates a new indexed evidence record with a unique tracking code.
        """
        now = datetime.utcnow()
        count = db.query(EvidenceFile).count() + 1
        evidence_code = f"EV-{now.year}-{count:04d}"

        evidence = EvidenceFile(
            evidence_code=evidence_code,
            road_id=road_id,
            hazard_id=hazard_id,
            conflict_id=conflict_id,
            file_type=file_type,
            file_url=file_url,
            thumbnail_url=thumbnail_url or file_url,
            captured_at=now,
            metadata_json=metadata_json or {},
            verified=False,
            notes=notes
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)

        # Log audit trail for newly acquired evidence
        EvidenceService.log_audit(
            db=db,
            actor="Vision Pipeline",
            action="EVIDENCE_CAPTURED",
            target_type="EvidenceFile",
            target_id=evidence.id,
            details=f"Captured {file_type} evidence [{evidence_code}] on Road #{road_id or 'N/A'}"
        )

        return evidence

    @staticmethod
    def get_evidence_for_road(db: Session, road_id: int) -> List[EvidenceFile]:
        """
        Returns all evidence files linked to a specific road segment.
        """
        return db.query(EvidenceFile).filter(EvidenceFile.road_id == road_id).order_by(EvidenceFile.captured_at.desc()).all()

    @staticmethod
    def list_all_evidence(db: Session, limit: int = 50) -> List[EvidenceFile]:
        """
        Returns all evidence files sorted by timestamp descending.
        """
        return db.query(EvidenceFile).order_by(EvidenceFile.captured_at.desc()).limit(limit).all()

    @staticmethod
    def list_audit_logs(db: Session, limit: int = 50) -> List[AuditLog]:
        """
        Returns recent municipal and AI system audit logs.
        """
        return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()


evidence_service = EvidenceService()
