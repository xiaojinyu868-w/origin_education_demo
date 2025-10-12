from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlmodel import Session, select

from ..models import Mistake, MistakeAnalysis, Question, Response, Student
from .llm import analyze_student_profile
from .profile import ensure_student_profile, refresh_student_profile_stats

MAX_ANALYSIS_HISTORY = 20


class AnalysisHistoryLimitExceeded(RuntimeError):
    """Raised when analysis history reaches the configured cap."""


def build_analysis_context(
    session: Session,
    *,
    student_id: int,
    mistake_ids: List[int],
) -> Tuple[Dict[str, object], List[Mistake]]:
    if not mistake_ids:
        raise ValueError("请至少选择一条错题。")

    student = session.get(Student, student_id)
    if student is None:
        raise ValueError("未找到对应学生。")

    profile = refresh_student_profile_stats(session, student_id)

    requested_ids = {mid for mid in mistake_ids}
    stmt = select(Mistake).where(Mistake.student_id == student_id, Mistake.id.in_(requested_ids))
    mistakes = session.exec(stmt).all()

    found_ids = {mistake.id for mistake in mistakes}
    missing_ids = sorted(requested_ids - found_ids)

    usable_mistakes: List[Mistake] = []
    skipped_ids: List[int] = []

    for mistake in mistakes:
        if mistake.data_status != "complete":
            skipped_ids.append(mistake.id)
            continue
        usable_mistakes.append(mistake)

    if not usable_mistakes:
        raise ValueError("所选错题信息不完整，请补充后再试。")

    mistakes_payload: List[Dict[str, object]] = []
    tag_counter: Counter[str] = Counter()

    for mistake in usable_mistakes:
        question = session.get(Question, mistake.question_id)
        response = session.get(Response, mistake.response_id) if mistake.response_id else None

        if mistake.knowledge_tags:
            tags = [
                tag.strip()
                for tag in mistake.knowledge_tags.split(",")
                if tag.strip()
            ]
            tag_counter.update(tags)

        mistakes_payload.append(
            {
                "id": mistake.id,
                "question_id": mistake.question_id,
                "knowledge_tags": mistake.knowledge_tags,
                "error_count": mistake.error_count,
                "last_seen_at": mistake.last_seen_at.isoformat() if mistake.last_seen_at else None,
                "prompt": question.prompt if question else None,
                "standard_answer": question.answer_key if question else None,
                "student_answer": response.student_answer if response else None,
                "data_status": mistake.data_status,
            },
        )

    stats_payload = {
        "total_selected": len(usable_mistakes),
        "knowledge_distribution": [
            {"tag": tag, "count": count} for tag, count in tag_counter.most_common()
        ],
    }

    context = {
        "student_profile": {
            "id": student.id,
            "name": student.name,
            "grade_level": student.grade_level,
            "study_goal": profile.study_goal,
            "teacher_notes": profile.teacher_notes,
            "profile_status": profile.profile_status,
            "latest_mistake_stats": profile.latest_mistake_stats,
        },
        "mistakes": mistakes_payload,
        "stats": stats_payload,
        "missing_mistake_ids": missing_ids,
        "skipped_mistake_ids": skipped_ids,
    }

    return context, usable_mistakes


def perform_student_analysis(
    session: Session,
    *,
    student_id: int,
    mistake_ids: List[int],
    teacher_id: Optional[int] = None,
) -> MistakeAnalysis:
    context, usable_mistakes = build_analysis_context(
        session,
        student_id=student_id,
        mistake_ids=mistake_ids,
    )

    existing_ids = session.exec(
        select(MistakeAnalysis.id).where(MistakeAnalysis.student_id == student_id)
    ).all()
    if len(existing_ids) >= MAX_ANALYSIS_HISTORY:
        raise AnalysisHistoryLimitExceeded("分析记录已达上限，请先清理后再尝试。")

    summary = analyze_student_profile(context)

    analysis = MistakeAnalysis(
        student_id=student_id,
        context_meta={
            "student_id": student_id,
            "mistake_ids": mistake_ids,
            "skipped_mistake_ids": context["skipped_mistake_ids"],
            "missing_mistake_ids": context["missing_mistake_ids"],
        },
        context_snapshot=context,
        llm_summary=summary,
        status="success",
        error_message=None,
        created_by=teacher_id,
    )
    session.add(analysis)

    root_cause_text = "\n".join(summary.get("root_causes") or []) or summary.get("overall_summary") or ""
    if root_cause_text:
        for mistake in usable_mistakes:
            mistake.root_cause = root_cause_text
            session.add(mistake)

    refresh_student_profile_stats(session, student_id)
    session.add(analysis)
    session.commit()
    session.refresh(analysis)
    return analysis


def list_analysis_history(
    session: Session,
    *,
    student_id: int,
    limit: int = 10,
) -> List[MistakeAnalysis]:
    stmt = (
        select(MistakeAnalysis)
        .where(MistakeAnalysis.student_id == student_id)
        .order_by(MistakeAnalysis.created_at.desc())
        .limit(limit)
    )
    return session.exec(stmt).all()


def cleanup_analysis_history(
    session: Session,
    *,
    student_id: int,
    analysis_ids: Optional[List[int]] = None,
    before_timestamp: Optional[datetime] = None,
) -> List[int]:
    latest_stmt = (
        select(MistakeAnalysis)
        .where(MistakeAnalysis.student_id == student_id)
        .order_by(MistakeAnalysis.created_at.desc())
        .limit(1)
    )
    latest = session.exec(latest_stmt).first()
    if latest is None:
        return []

    stmt = select(MistakeAnalysis).where(MistakeAnalysis.student_id == student_id)

    if analysis_ids:
        stmt = stmt.where(MistakeAnalysis.id.in_(analysis_ids))
    if before_timestamp:
        stmt = stmt.where(MistakeAnalysis.created_at <= before_timestamp)

    targets = session.exec(stmt).all()
    deleted_ids: List[int] = []
    for record in targets:
        if record.id == latest.id:
            continue
        deleted_ids.append(record.id)
        session.delete(record)

    if deleted_ids:
        session.commit()
    return deleted_ids
