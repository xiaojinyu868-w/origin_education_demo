from __future__ import annotations

from typing import List

from sqlmodel import Session, select

from ..models import Mistake


def get_student_mistakes(session: Session, student_id: int) -> List[Mistake]:
    stmt = select(Mistake).where(Mistake.student_id == student_id)
    return session.exec(stmt).all()
