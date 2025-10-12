from __future__ import annotations

from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from backend.app import models  # noqa: F401
from backend.app.main import app, _get_db
from backend.app.models import Exam, Mistake, MistakeAnalysis, Question, QuestionType, Response, Student, Submission


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


def _bootstrap_student_with_mistake(session: Session) -> Student:
    student = Student(name="测试学生", grade_level="初三")
    session.add(student)
    session.commit()
    session.refresh(student)

    exam = Exam(title="诊断卷", teacher_id=1)
    session.add(exam)
    session.commit()
    session.refresh(exam)

    question = Question(
        exam_id=exam.id,
        number="1",
        type=QuestionType.multiple_choice,
        prompt="1+1=?",
        knowledge_tags="加法",
        max_score=1.0,
        answer_key={"correct": "A"},
    )
    session.add(question)
    session.commit()
    session.refresh(question)

    submission = Submission(student_id=student.id, exam_id=exam.id)
    session.add(submission)
    session.commit()
    session.refresh(submission)

    response = Response(
        submission_id=submission.id,
        question_id=question.id,
        student_answer="B",
        applies_to_student=True,
    )
    session.add(response)
    session.commit()
    session.refresh(response)

    mistake = Mistake(
        student_id=student.id,
        response_id=response.id,
        question_id=question.id,
        knowledge_tags="加法",
        data_status="complete",
        error_count=2,
    )
    session.add(mistake)
    session.commit()

    return student


def test_student_profile_and_analysis_flow(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    student = _bootstrap_student_with_mistake(db_session)

    profile_resp = client.get(f"/demo/students/{student.id}/profile")
    assert profile_resp.status_code == 200
    profile_payload = profile_resp.json()
    assert profile_payload["student"]["id"] == student.id
    assert profile_payload["profile_status"] == "missing_core_fields"

    update_resp = client.patch(
        f"/demo/students/{student.id}/profile",
        json={"study_goal": "稳固加法", "teacher_notes": "注意审题"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["study_goal"] == "稳固加法"

    mistake_resp = client.get(f"/demo/students/{student.id}/mistakes", params={"status": "complete"})
    assert mistake_resp.status_code == 200
    mistakes = mistake_resp.json()
    assert len(mistakes) == 1
    assert mistakes[0]["data_status"] == "complete"

    # Mock LLM output
    monkeypatch.setattr(
        "backend.app.services.student_analysis.analyze_student_profile",
        lambda context: {
            "overall_summary": f"样本 {len(context['mistakes'])} 道错题",
            "knowledge_focus": ["加法"],
            "teaching_advice": ["补充口算训练"],
            "root_causes": ["易混淆选项"]
        },
    )

    preview_resp = client.post(
        f"/demo/students/{student.id}/analysis/context",
        json={"mistake_ids": [mistakes[0]["id"]]},
    )
    assert preview_resp.status_code == 200
    preview_payload = preview_resp.json()
    assert preview_payload["mistakes"] and len(preview_payload["mistakes"]) == 1

    analysis_resp = client.post(
        f"/demo/students/{student.id}/analysis",
        json={"mistake_ids": [mistakes[0]["id"]]},
    )
    assert analysis_resp.status_code == 200
    analysis_payload = analysis_resp.json()
    assert analysis_payload["llm_summary"]["overall_summary"].startswith("样本")

    history_resp = client.get(f"/demo/students/{student.id}/analysis/history")
    assert history_resp.status_code == 200
    history_items = history_resp.json()["items"]
    assert len(history_items) == 1
    assert history_items[0]["status"] == "success"

    cleanup_resp = client.post(
        f"/demo/students/{student.id}/analysis/cleanup",
        json={"before_timestamp": history_items[0]["created_at"]},
    )
    assert cleanup_resp.status_code == 200
    assert cleanup_resp.json()["deleted_ids"] == []

    # Creating another analysis should now trigger limit reminder when cap reached
    monkeypatch.setattr(
        "backend.app.services.student_analysis.MAX_ANALYSIS_HISTORY",
        1,
        raising=False,
    )

    conflict_resp = client.post(
        f"/demo/students/{student.id}/analysis",
        json={"mistake_ids": [mistakes[0]["id"]]},
    )
    assert conflict_resp.status_code == 409
