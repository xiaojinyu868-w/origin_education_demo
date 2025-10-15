from __future__ import annotations

import io
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from backend.app import models  # noqa: F401 - ensure SQLModel metadata is populated
from backend.app.main import app, _get_db
from backend.app.models import Exam, Question, QuestionType, Student, SubmissionStatus, Teacher
from backend.app.services.grading import GradingArtifacts, PipelineStep


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
    teacher = Teacher(name="测试教师", email="teacher@example.com")
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)

    exam = Exam(title="单元测试", teacher_id=teacher.id)
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

    student = Student(name="测试学生", email="student@example.com")
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
