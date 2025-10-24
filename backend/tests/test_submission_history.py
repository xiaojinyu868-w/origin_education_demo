from __future__ import annotations

import io
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from backend.app import models  # noqa: F401 - ensure SQLModel metadata is populated
from backend.app.main import app, _get_db
from backend.app.models import (
    Exam,
    Question,
    QuestionType,
    Response,
    ResponseReviewStatus,
    Student,
    Submission,
    SubmissionStatus,
    Teacher,
    User,
)
from backend.app.services.grading import GradingArtifacts, PipelineStep
from backend.app.security import get_current_user, get_password_hash


@pytest.fixture(name="engine")
def engine_fixture() -> Generator[Engine, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(name="client")
def client_fixture(engine: Engine) -> Generator[TestClient, None, None]:
    def get_session_override() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[_get_db] = get_session_override

    def get_user_override() -> User:
        with Session(engine) as session:
            user = session.exec(select(User)).first()
            if user is None:
                user = User(
                    email="demo@local",
                    name="演示教师",
                    hashed_password=get_password_hash("demo"),
                    is_demo=True,
                )
                session.add(user)
                session.commit()
                session.refresh(user)
            return user

    app.dependency_overrides[get_current_user] = get_user_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(name="db_session")
def db_session_fixture(engine: Engine) -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def test_upload_submission_populates_history(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    demo_user = db_session.exec(select(User)).first()
    if demo_user is None:
        demo_user = User(
            email="demo@local",
            name="演示教师",
            hashed_password=get_password_hash("demo"),
            is_demo=True,
        )
        db_session.add(demo_user)
        db_session.commit()
        db_session.refresh(demo_user)

    teacher = Teacher(name="测试教师", email="teacher@example.com", owner_id=demo_user.id)
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)

    exam = Exam(title="单元测试", teacher_id=teacher.id, owner_id=demo_user.id)
    db_session.add(exam)
    db_session.commit()
    db_session.refresh(exam)

    question = Question(
        exam_id=exam.id,
        number="1",
        type=QuestionType.multiple_choice,
        prompt="2 + 3 = ?",
        max_score=1.0,
        answer_key={"options": ["A", "B", "C", "D"], "correct": "C"},
    )
    db_session.add(question)

    student = Student(name="测试学生", email="student@example.com", owner_id=demo_user.id)
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    def fake_run_ocr_pipeline(_: bytes):
        return (
            [
                {"question_number": "1", "raw_text": "C", "annotation": None, "confidence": 0.99},
            ],
            [
                {"name": "OCR 解析", "status": "success", "detail": "识别出 1 道题目"},
            ],
        )

    def fake_auto_grade(session: Session, submission, _rows):
        submission.status = SubmissionStatus.graded
        session.add(submission)
        session.commit()
        return GradingArtifacts(
            responses=[],
            mistakes=[],
            steps=[PipelineStep(name="自动批改", status="success", detail="Mocked pipeline")],
            ai_summary="Summary ready",
        )

    monkeypatch.setattr("backend.app.main.run_ocr_pipeline", fake_run_ocr_pipeline)
    monkeypatch.setattr("backend.app.main.auto_grade_submission", fake_auto_grade)

    response = client.post(
        "/submissions/upload",
        data={"student_id": student.id, "exam_id": exam.id},
        files={"image": ("sheet.png", io.BytesIO(b"fake-bytes"), "image/png")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert pytest.approx(payload["matching_score"], 1e-6) == 1.0
    assert payload["processing_steps"] and len(payload["processing_steps"]) == 2
    assert payload["processing_logs"] and len(payload["processing_logs"]) == 3
    assert payload["ai_summary"] == "Summary ready"

    submission_id = payload["submission"]["id"]

    history_resp = client.get("/submissions/history", params={"limit": 5})
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) == 1
    entry = history[0]
    assert entry["submission"]["id"] == submission_id
    assert entry["student"]["id"] == student.id
    assert entry["matching_score"] == payload["matching_score"]
    assert len(entry["processing_steps"]) == 2

    log_resp = client.get(f"/submissions/{submission_id}/logs")
    assert log_resp.status_code == 200
    logs = log_resp.json()["items"]
    assert len(logs) == 3
    assert logs[0]["step"] == "OCR 解析"
    assert logs[-1]["step"] == "AI 批改摘要"


def test_bulk_confirm_allows_target_status_updates(
    client: TestClient,
    db_session: Session,
) -> None:
    user = db_session.exec(select(User)).first()
    if user is None:
        user = User(
            email="demo@local",
            name="演示教师",
            hashed_password=get_password_hash("demo"),
            is_demo=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    teacher = Teacher(name="批量测试教师", email="teacher+bulk@example.com", owner_id=user.id)
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)

    exam = Exam(title="批量确认测试卷", teacher_id=teacher.id, owner_id=user.id)
    db_session.add(exam)
    db_session.commit()
    db_session.refresh(exam)

    question = Question(
        exam_id=exam.id,
        number="1",
        type=QuestionType.multiple_choice,
        prompt="1 + 1 = ?",
        max_score=1.0,
        answer_key={"options": ["A", "B"], "correct": "A"},
    )
    db_session.add(question)
    db_session.commit()
    db_session.refresh(question)

    student = Student(name="批量学生", email="bulk-student@example.com", owner_id=user.id)
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    submission = Submission(
        student_id=student.id,
        exam_id=exam.id,
        owner_id=user.id,
        status=SubmissionStatus.pending,
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)

    response_pending = Response(
        submission_id=submission.id,
        question_id=question.id,
        student_answer="A",
        review_status=ResponseReviewStatus.pending,
    )
    response_confirmed = Response(
        submission_id=submission.id,
        question_id=question.id,
        student_answer="B",
        review_status=ResponseReviewStatus.confirmed,
    )
    db_session.add(response_pending)
    db_session.add(response_confirmed)
    db_session.commit()
    db_session.refresh(response_pending)
    db_session.refresh(response_confirmed)

    confirm_payload = {
        "response_ids": [response_pending.id, response_confirmed.id],
        "target_status": "confirmed",
    }
    confirm_resp = client.post(
        f"/submissions/{submission.id}/responses/bulk_confirm",
        json=confirm_payload,
    )
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["updated_count"] == 1

    db_session.refresh(response_pending)
    db_session.refresh(response_confirmed)
    db_session.refresh(submission)
    assert response_pending.review_status == ResponseReviewStatus.confirmed
    assert response_confirmed.review_status == ResponseReviewStatus.confirmed
    assert submission.status == SubmissionStatus.graded

    flag_payload = {
        "response_ids": [response_pending.id, response_confirmed.id],
        "target_status": "needs_review",
    }
    flag_resp = client.post(
        f"/submissions/{submission.id}/responses/bulk_confirm",
        json=flag_payload,
    )
    assert flag_resp.status_code == 200
    flag_data = flag_resp.json()
    assert flag_data["updated_count"] == 2

    db_session.refresh(response_pending)
    db_session.refresh(response_confirmed)
    db_session.refresh(submission)
    assert response_pending.review_status == ResponseReviewStatus.needs_review
    assert response_confirmed.review_status == ResponseReviewStatus.needs_review
    assert submission.status == SubmissionStatus.needs_review
