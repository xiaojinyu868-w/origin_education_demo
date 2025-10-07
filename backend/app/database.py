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
        question_columns = {
            row[1] for row in connection.exec_driver_sql("PRAGMA table_info(question)").fetchall()
        }
        if "target_student_ids" not in question_columns:
            connection.exec_driver_sql("ALTER TABLE question ADD COLUMN target_student_ids JSON")

        response_columns = {
            row[1] for row in connection.exec_driver_sql("PRAGMA table_info(response)").fetchall()
        }
        if "applies_to_student" not in response_columns:
            connection.exec_driver_sql(
                "ALTER TABLE response ADD COLUMN applies_to_student BOOLEAN DEFAULT 1",
            )
            connection.exec_driver_sql(
                "UPDATE response SET applies_to_student = 1 WHERE applies_to_student IS NULL",
            )


@contextmanager
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
