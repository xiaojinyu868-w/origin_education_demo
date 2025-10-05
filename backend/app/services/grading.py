from __future__ import annotations

import math
import statistics
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlmodel import Session, select

from ..models import (
    Mistake,
    Question,
    QuestionType,
    Response,
    Submission,
    SubmissionStatus,
)


class GradingResult(Tuple[List[Response], List[Mistake]]):
    responses: List[Response]
    mistakes: List[Mistake]


def _normalize_option_text(text: str) -> str:
    return text.strip().upper()


def _match_multiple_choice(answer: str, question: Question) -> Tuple[bool, float]:
    answer_key = question.answer_key or {}
    correct = _normalize_option_text(str(answer_key.get("correct", "")))
    student = _normalize_option_text(answer)

    if not correct:
        return False, 0.0

    is_correct = student == correct
    score = question.max_score if is_correct else 0.0
    return is_correct, score


def _match_fill_in_blank(answer: str, question: Question) -> Tuple[bool, float, Optional[str]]:
    answer_key = question.answer_key or {}
    acceptable_answers = answer_key.get("acceptable_answers", [])
    tolerance = float(answer_key.get("numeric_tolerance", 0.0))
    numeric = bool(answer_key.get("numeric", False))

    normalized_student = answer.strip()
    details = None

    if numeric:
        try:
            student_value = float(normalized_student.replace(",", ""))
            numeric_answers = [float(str(value)) for value in acceptable_answers]
            is_correct = any(abs(student_value - value) <= tolerance for value in numeric_answers)
        except (ValueError, TypeError):
            is_correct = False
    else:
        normalized_student = normalized_student.lower()
        normalized_keys = [str(item).strip().lower() for item in acceptable_answers]
        is_correct = normalized_student in normalized_keys

    score = question.max_score if is_correct else 0.0

    if not is_correct and acceptable_answers:
        details = f"Expected one of: {acceptable_answers}"

    return is_correct, score, details


def _annotation_to_score(annotation: Optional[str], question: Question) -> Optional[float]:
    if annotation is None:
        return None

    positive_tokens = {"\u2714", "\u221a", "\u5bf9", "V"}
    negative_tokens = {"\u2718", "\u00d7", "\u9519", "X"}

    if any(token in annotation for token in positive_tokens):
        return question.max_score
    if any(token in annotation for token in negative_tokens):
        return 0.0

    if "/" in annotation:
        try:
            earned, total = annotation.split("/", maxsplit=1)
            earned_value = float(earned)
            total_value = float(total)
            if total_value:
                ratio = earned_value / total_value
                return round(ratio * question.max_score, 2)
        except ValueError:
            return None

    try:
        raw_value = float(annotation)
        if raw_value <= question.max_score:
            return raw_value
    except ValueError:
        return None

    return None


def auto_grade_submission(
    session: Session,
    submission: Submission,
    question_rows: List[Dict[str, Optional[str]]],
) -> Tuple[List[Response], List[Mistake]]:
    question_map: Dict[str, Question] = {
        question.number: question for question in submission.exam.questions
    }
    row_map: Dict[str, Dict[str, Optional[str]]] = {
        str(row.get("question_number")): row for row in question_rows
    }

    responses: List[Response] = []
    mistakes: List[Mistake] = []

    total_scores: List[float] = []

    for number, question in question_map.items():
        row = row_map.get(str(number))
        student_answer = row.get("raw_text") if row else None
        annotation = row.get("annotation") if row else None
        confidence = float(row.get("confidence") or 0.0) if row else None

        response = Response(
            submission_id=submission.id,
            question_id=question.id,
            student_answer=student_answer,
            ocr_confidence=confidence,
        )

        if question.type == QuestionType.multiple_choice and student_answer:
            is_correct, score = _match_multiple_choice(student_answer, question)
            response.is_correct = is_correct
            response.score = score
            response.normalized_answer = _normalize_option_text(student_answer)
        elif question.type == QuestionType.fill_in_blank and student_answer:
            is_correct, score, details = _match_fill_in_blank(student_answer, question)
            response.is_correct = is_correct
            response.score = score
            response.normalized_answer = student_answer.strip()
            response.comments = details
        else:
            derived_score = _annotation_to_score(annotation, question)
            if derived_score is not None:
                response.score = derived_score
                response.is_correct = math.isclose(derived_score, question.max_score)
            else:
                response.score = None
                response.is_correct = None
                submission.status = SubmissionStatus.needs_review

        if annotation:
            response.teacher_annotation = {"raw": annotation}

        if response.score is not None:
            total_scores.append(response.score)

        session.add(response)
        session.flush()
        responses.append(response)

        _sync_mistake_record(session, submission, question, response)
        if response.mistake:
            mistakes.append(response.mistake)

    session.commit()

    if total_scores:
        submission.total_score = sum(total_scores)
        if submission.status == SubmissionStatus.pending:
            submission.status = SubmissionStatus.graded
    else:
        submission.total_score = None

    session.add(submission)
    session.commit()

    for response in responses:
        session.refresh(response)

    return responses, mistakes


def _sync_mistake_record(
    session: Session,
    submission: Submission,
    question: Question,
    response: Response,
) -> None:
    existing_stmt = select(Mistake).where(
        Mistake.student_id == submission.student_id,
        Mistake.question_id == question.id,
    )
    existing_mistake = session.exec(existing_stmt).first()

    if response.is_correct is False:
        if existing_mistake:
            existing_mistake.response_id = response.id
            existing_mistake.last_seen_at = datetime.utcnow()
            existing_mistake.times_practiced = existing_mistake.times_practiced or 0
        else:
            existing_mistake = Mistake(
                student_id=submission.student_id,
                response_id=response.id,
                question_id=question.id,
                knowledge_tags=question.knowledge_tags,
            )
            session.add(existing_mistake)
        response.mistake = existing_mistake
    elif response.is_correct is True and existing_mistake:
        existing_mistake.resolution_notes = "Mastered on latest attempt"
        existing_mistake.last_seen_at = datetime.utcnow()
        session.add(existing_mistake)

    session.flush()


def compute_submission_statistics(responses: List[Response]) -> Dict[str, float]:
    scored = [response.score for response in responses if response.score is not None]
    if not scored:
        return {"average": 0.0, "median": 0.0, "max": 0.0}

    return {
        "average": sum(scored) / len(scored),
        "median": statistics.median(scored),
        "max": max(scored),
    }
