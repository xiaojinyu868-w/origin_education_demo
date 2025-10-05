from __future__ import annotations

from collections import defaultdict
from statistics import median
from typing import Dict, Iterable, List, Optional

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from ..models import Exam, Question, Response, Submission
from ..schemas import AnalyticsFilter, AnalyticsSummary, KnowledgePointBreakdown


def _response_iterable(submissions: Iterable[Submission]) -> Iterable[Response]:
    for submission in submissions:
        for response in submission.responses:
            yield response


def build_analytics(session: Session, filters: AnalyticsFilter) -> AnalyticsSummary:
    stmt = (
        select(Submission)
        .options(
            selectinload(Submission.responses).selectinload(Response.question),
            selectinload(Submission.student),
            selectinload(Submission.exam),
        )
    )

    if filters.exam_id is not None:
        stmt = stmt.where(Submission.exam_id == filters.exam_id)
    if filters.start_date is not None:
        stmt = stmt.where(Submission.submitted_at >= filters.start_date)
    if filters.end_date is not None:
        stmt = stmt.where(Submission.submitted_at <= filters.end_date)
    if filters.classroom_id is not None:
        stmt = stmt.join(Exam).where(Exam.classroom_id == filters.classroom_id)

    submissions = session.exec(stmt).all()

    total_students = len({submission.student_id for submission in submissions})
    total_submissions = len(submissions)

    scored = [submission.total_score for submission in submissions if submission.total_score is not None]
    average_score = sum(scored) / len(scored) if scored else 0.0
    median_score = median(scored) if scored else 0.0

    breakdown: Dict[str, Dict[str, float]] = defaultdict(lambda: {
        "total_attempts": 0,
        "incorrect_count": 0,
        "score_sum": 0.0,
        "question_count": 0,
    })

    for response in _response_iterable(submissions):
        question: Question = response.question
        tags = (question.knowledge_tags or "Unspecified").split(",")
        tags = [tag.strip() or "Unspecified" for tag in tags]
        for tag in tags:
            data = breakdown[tag]
            data["total_attempts"] += 1
            if response.is_correct is False:
                data["incorrect_count"] += 1
            if response.score is not None:
                data["score_sum"] += response.score
            data["question_count"] += 1

    knowledge_breakdown = []
    for tag, data in breakdown.items():
        total_attempts = int(data["total_attempts"])
        incorrect_count = int(data["incorrect_count"])
        score_sum = float(data["score_sum"])
        question_count = max(int(data["question_count"]), 1)
        accuracy = 1 - incorrect_count / total_attempts if total_attempts else 0.0
        average_tag_score = score_sum / question_count if question_count else 0.0
        knowledge_breakdown.append(
            KnowledgePointBreakdown(
                knowledge_tag=tag,
                total_attempts=total_attempts,
                incorrect_count=incorrect_count,
                accuracy=round(accuracy, 3),
                average_score=round(average_tag_score, 2),
            ),
        )

    knowledge_breakdown.sort(key=lambda item: item.accuracy)

    return AnalyticsSummary(
        total_students=total_students,
        total_submissions=total_submissions,
        average_score=round(average_score, 2),
        median_score=round(median_score, 2),
        knowledge_breakdown=knowledge_breakdown,
    )
