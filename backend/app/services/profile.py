from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Dict, List, Optional

from sqlmodel import Session, select

from ..models import ClassEnrollment, Mistake, Student, StudentProfile


def ensure_student_profile(session: Session, student_id: int) -> StudentProfile:
    profile = session.get(StudentProfile, student_id)
    if profile:
        return profile

    student = session.get(Student, student_id)
    if student is None:
        raise ValueError(f"student {student_id} does not exist")

    status = "complete" if _has_core_fields(session, student) else "missing_core_fields"
    profile = StudentProfile(
        student_id=student_id,
        profile_status=status,
        latest_mistake_stats=_empty_stats(),
        updated_at=datetime.utcnow(),
    )
    session.add(profile)
    session.flush()
    return profile


def refresh_student_profile_stats(session: Session, student_id: int) -> StudentProfile:
    profile = ensure_student_profile(session, student_id)
    stats = _build_mistake_stats(session, student_id)
    profile.latest_mistake_stats = stats

    student = session.get(Student, student_id)
    if student:
        profile.profile_status = "complete" if _has_core_fields(session, student) else "missing_core_fields"

    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.flush()
    return profile


def _build_mistake_stats(session: Session, student_id: int) -> Dict[str, Optional[object]]:
    mistakes: List[Mistake] = session.exec(
        select(Mistake).where(Mistake.student_id == student_id)
    ).all()

    total = len(mistakes)
    tag_counter: Counter[str] = Counter()
    incomplete_count = 0
    last_seen_at: Optional[datetime] = None

    for mistake in mistakes:
        if mistake.knowledge_tags:
            tags = [
                tag.strip()
                for tag in mistake.knowledge_tags.split(",")
                if tag.strip()
            ]
            tag_counter.update(tags)
        if mistake.data_status != "complete":
            incomplete_count += 1
        if mistake.last_seen_at:
            if last_seen_at is None or mistake.last_seen_at > last_seen_at:
                last_seen_at = mistake.last_seen_at

    distribution = [
        {"tag": tag, "count": count}
        for tag, count in tag_counter.most_common()
    ]

    return {
        "total_mistakes": total,
        "knowledge_distribution": distribution,
        "last_mistake_at": last_seen_at.isoformat() if last_seen_at else None,
        "incomplete_count": incomplete_count,
    }


def _has_core_fields(session: Session, student: Student) -> bool:
    if not student.name or not student.grade_level:
        return False

    enrollment_exists = session.exec(
        select(ClassEnrollment.id).where(ClassEnrollment.student_id == student.id).limit(1)
    ).first()
    return enrollment_exists is not None


def _empty_stats() -> Dict[str, Optional[object]]:
    return {
        "total_mistakes": 0,
        "knowledge_distribution": [],
        "last_mistake_at": None,
        "incomplete_count": 0,
    }
