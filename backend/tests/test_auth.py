from __future__ import annotations

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
    from backend.app import security

    from contextlib import contextmanager

    def session_dependency() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    @contextmanager
    def get_session_override() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    original_get_session = security.get_session
    security.get_session = get_session_override  # type: ignore[assignment]

    app.dependency_overrides[_get_db] = session_dependency
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    security.get_session = original_get_session  # type: ignore[assignment]


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/auth/token",
        data={
            "username": email,
            "password": password,
            "grant_type": "password",
            "scope": "",
            "client_id": "",
            "client_secret": "",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    return payload["access_token"]


def test_register_and_login_flow(client: TestClient) -> None:
    register_resp = client.post(
        "/auth/register",
        json={
            "email": "teacher1@example.com",
            "password": "StrongPass123!",
            "name": "Teacher One",
        },
    )
    assert register_resp.status_code == 201, register_resp.text
    user_payload = register_resp.json()
    assert user_payload["email"] == "teacher1@example.com"
    assert user_payload["name"] == "Teacher One"
    assert user_payload["is_demo"] is False

    token = _login(client, "teacher1@example.com", "StrongPass123!")

    me_resp = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200, me_resp.text
    me_payload = me_resp.json()
    assert me_payload["email"] == "teacher1@example.com"
    assert me_payload["name"] == "Teacher One"


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "email": "teacher2@example.com",
        "password": "AnotherPass123!",
        "name": "Teacher Two",
    }
    first_resp = client.post("/auth/register", json=payload)
    assert first_resp.status_code == 201, first_resp.text

    duplicate_resp = client.post("/auth/register", json=payload)
    assert duplicate_resp.status_code == 400
    assert duplicate_resp.json()["detail"] == "Email already registered"


def test_resource_isolation_between_users(client: TestClient) -> None:
    # User A registers and creates a teacher resource.
    register_a = client.post(
        "/auth/register",
        json={
            "email": "ownerA@example.com",
            "password": "OwnerAPass123!",
            "name": "Owner A",
        },
    )
    assert register_a.status_code == 201, register_a.text
    token_a = _login(client, "ownerA@example.com", "OwnerAPass123!")

    teacher_resp = client.post(
        "/teachers",
        json={"name": "Owner A Teacher", "email": "a.teacher@example.com"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert teacher_resp.status_code == 200, teacher_resp.text
    teacher_id = teacher_resp.json()["id"]

    list_a = client.get("/teachers", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    assert len(list_a.json()) == 1

    # User B registers independently.
    register_b = client.post(
        "/auth/register",
        json={
            "email": "ownerB@example.com",
            "password": "OwnerBPass123!",
            "name": "Owner B",
        },
    )
    assert register_b.status_code == 201, register_b.text
    token_b = _login(client, "ownerB@example.com", "OwnerBPass123!")

    list_b = client.get("/teachers", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    assert list_b.json() == []

    # User B cannot create a classroom referencing user A's teacher.
    classroom_resp = client.post(
        "/classrooms",
        json={"name": "Class B", "grade_level": "Grade 1", "teacher_id": teacher_id},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert classroom_resp.status_code == 404

    # User A still sees their own teacher, confirming data isolation.
    list_a_after = client.get("/teachers", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a_after.status_code == 200
    assert len(list_a_after.json()) == 1
