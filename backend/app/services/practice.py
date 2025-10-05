from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Iterable, List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlmodel import Session, select

from ..models import (
    Mistake,
    PracticeAssignment,
    PracticeItem,
    PracticeStatus,
    Question,
)


GENERATED_DIR = Path(__file__).resolve().parent.parent / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def _filter_mistakes(
    mistakes: Iterable[Mistake],
    knowledge_filters: Optional[List[str]],
) -> List[Mistake]:
    if not knowledge_filters:
        return list(mistakes)

    lowered_filters = [tag.lower() for tag in knowledge_filters]
    filtered: List[Mistake] = []
    for mistake in mistakes:
        tags = (mistake.knowledge_tags or "").lower().split(",")
        tags = [tag.strip() for tag in tags if tag.strip()]
        if any(tag in lowered_filters for tag in tags):
            filtered.append(mistake)
    return filtered


def _create_pdf(assignment: PracticeAssignment, items: List[PracticeItem]) -> str:
    pdf_path = GENERATED_DIR / f"practice_{assignment.id}.pdf"
    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    width, height = A4
    margin = 20 * mm
    y_position = height - margin

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y_position, f"Personalized Practice #{assignment.id}")
    y_position -= 15 * mm

    c.setFont("Helvetica", 11)
    c.drawString(margin, y_position, f"Student ID: {assignment.student_id}")
    y_position -= 6 * mm
    c.drawString(margin, y_position, f"Scheduled for: {assignment.scheduled_for.isoformat()}")
    y_position -= 10 * mm

    c.setFont("Helvetica", 11)
    for order, item in enumerate(items, start=1):
        question = item.question
        if y_position < 40 * mm:
            c.showPage()
            c.setFont("Helvetica", 11)
            y_position = height - margin
        prompt = question.prompt or "This question does not yet have a prompt description."
        knowledge = question.knowledge_tags or "Unspecified"
        c.drawString(margin, y_position, f"{order}. {prompt}")
        y_position -= 6 * mm
        c.drawString(margin + 8 * mm, y_position, f"Knowledge Points: {knowledge}")
        y_position -= 6 * mm
        c.line(margin, y_position, width - margin, y_position)
        y_position -= 10 * mm

    c.save()
    return str(pdf_path)


def generate_practice_assignment(
    session: Session,
    *,
    student_id: int,
    target_date: Optional[date] = None,
    knowledge_filters: Optional[List[str]] = None,
    max_items: int = 10,
) -> PracticeAssignment:
    mistake_stmt = select(Mistake).where(Mistake.student_id == student_id).order_by(Mistake.last_seen_at)
    mistake_results = session.exec(mistake_stmt).all()

    filtered_mistakes = _filter_mistakes(mistake_results, knowledge_filters)[:max_items]

    if not filtered_mistakes:
        raise ValueError("当前筛选条件下没有可用错题，请先完成考试上传或调整筛选条件。")

    assignment = PracticeAssignment(
        student_id=student_id,
        scheduled_for=target_date or date.today(),
        status=PracticeStatus.assigned,
        config={
            "knowledge_filters": knowledge_filters,
            "max_items": max_items,
        },
    )
    session.add(assignment)
    session.flush()

    items: List[PracticeItem] = []
    for index, mistake in enumerate(filtered_mistakes):
        practice_item = PracticeItem(
            assignment_id=assignment.id,
            question_id=mistake.question_id,
            source_mistake_id=mistake.id,
            order_index=index,
        )
        session.add(practice_item)
        session.flush()
        session.refresh(practice_item)
        items.append(practice_item)

    for item in items:
        session.refresh(item, attribute_names=["question"])

    pdf_path = _create_pdf(assignment, items)
    assignment.generated_pdf_path = pdf_path
    session.add(assignment)
    session.commit()

    session.refresh(assignment)
    return assignment

