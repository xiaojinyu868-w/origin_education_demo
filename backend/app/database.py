from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = "sqlite:///./app.db"
_db_path = Path(DATABASE_URL.split("///")[-1]).resolve()
_db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    apply_lightweight_migrations()


def apply_lightweight_migrations() -> None:
    """轻量级迁移：为旧版 SQLite 库补充新增字段。"""

    with engine.begin() as connection:
        def _column_names(table: str) -> set[str]:
            rows = connection.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
            return {row[1] for row in rows}

        question_columns = _column_names("question")
        if "target_student_ids" not in question_columns:
            connection.exec_driver_sql("ALTER TABLE question ADD COLUMN target_student_ids JSON")
        if "answer_status" not in question_columns:
            connection.exec_driver_sql("ALTER TABLE question ADD COLUMN answer_status VARCHAR DEFAULT 'draft'")
            connection.exec_driver_sql(
                "UPDATE question SET answer_status = 'draft' WHERE answer_status IS NULL",
            )
        if "answer_confidence" not in question_columns:
            connection.exec_driver_sql("ALTER TABLE question ADD COLUMN answer_confidence FLOAT")

        response_columns = _column_names("response")
        if "applies_to_student" not in response_columns:
            connection.exec_driver_sql(
                "ALTER TABLE response ADD COLUMN applies_to_student BOOLEAN DEFAULT 1",
            )
            connection.exec_driver_sql(
                "UPDATE response SET applies_to_student = 1 WHERE applies_to_student IS NULL",
            )
        if "ai_confidence" not in response_columns:
            connection.exec_driver_sql("ALTER TABLE response ADD COLUMN ai_confidence FLOAT")
        if "review_status" not in response_columns:
            connection.exec_driver_sql(
                "ALTER TABLE response ADD COLUMN review_status VARCHAR DEFAULT 'pending'",
            )
            connection.exec_driver_sql(
                "UPDATE response SET review_status = 'pending' WHERE review_status IS NULL",
            )
        if "teacher_comment" not in response_columns:
            connection.exec_driver_sql("ALTER TABLE response ADD COLUMN teacher_comment TEXT")
        if "ai_raw" not in response_columns:
            connection.exec_driver_sql("ALTER TABLE response ADD COLUMN ai_raw JSON")

        exam_columns = _column_names("exam")
        if "source_image_path" not in exam_columns:
            connection.exec_driver_sql("ALTER TABLE exam ADD COLUMN source_image_path TEXT")
        if "parsed_outline" not in exam_columns:
            connection.exec_driver_sql("ALTER TABLE exam ADD COLUMN parsed_outline JSON")

        submission_columns = _column_names("submission")
        if "session_id" not in submission_columns:
            connection.exec_driver_sql("ALTER TABLE submission ADD COLUMN session_id INTEGER")
        if "overall_confidence" not in submission_columns:
            connection.exec_driver_sql("ALTER TABLE submission ADD COLUMN overall_confidence FLOAT")
        if "status_detail" not in submission_columns:
            connection.exec_driver_sql("ALTER TABLE submission ADD COLUMN status_detail TEXT")
        if "ai_trace_id" not in submission_columns:
            connection.exec_driver_sql("ALTER TABLE submission ADD COLUMN ai_trace_id TEXT")


@contextmanager
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
