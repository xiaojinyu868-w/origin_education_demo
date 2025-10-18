from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, Float, JSON, String
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


class QuestionType(str, Enum):
    multiple_choice = "multiple_choice"
    fill_in_blank = "fill_in_blank"
    subjective = "subjective"


class SubmissionStatus(str, Enum):
    pending = "pending"
    graded = "graded"
    needs_review = "needs_review"


class ResponseReviewStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    needs_review = "needs_review"



class AnswerStatus(str, Enum):
    draft = "draft"
    confirmed = "confirmed"


class SessionStatus(str, Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class PracticeStatus(str, Enum):
    scheduled = "scheduled"
    assigned = "assigned"
    completed = "completed"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    hashed_password: str = Field(sa_column=Column(String, nullable=False))
    name: str = Field(sa_column=Column(String, nullable=False))
    is_demo: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    teachers: list["Teacher"] = Relationship(
        back_populates="owner",
        sa_relationship=relationship("Teacher", back_populates="owner"),
    )
    classrooms: list["Classroom"] = Relationship(
        back_populates="owner",
        sa_relationship=relationship("Classroom", back_populates="owner"),
    )
    exams: list["Exam"] = Relationship(
        back_populates="owner",
        sa_relationship=relationship("Exam", back_populates="owner"),
    )
    grading_sessions: list["GradingSession"] = Relationship(
        back_populates="owner",
        sa_relationship=relationship("GradingSession", back_populates="owner"),
    )
    submissions: list["Submission"] = Relationship(
        back_populates="owner",
        sa_relationship=relationship("Submission", back_populates="owner"),
    )
    students: list["Student"] = Relationship(
        back_populates="owner",
        sa_relationship=relationship("Student", back_populates="owner"),
    )
    practice_assignments: list["PracticeAssignment"] = Relationship(
        back_populates="owner",
        sa_relationship=relationship("PracticeAssignment", back_populates="owner"),
    )


class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    email: Optional[str] = Field(default=None, index=True)
    grade_level: Optional[str] = None
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    enrollments: list["ClassEnrollment"] = Relationship(
        back_populates="student",
        sa_relationship=relationship("ClassEnrollment", back_populates="student"),
    )
    submissions: list["Submission"] = Relationship(
        back_populates="student",
        sa_relationship=relationship("Submission", back_populates="student"),
    )
    mistake_sets: list["Mistake"] = Relationship(
        back_populates="student",
        sa_relationship=relationship("Mistake", back_populates="student"),
    )
    practice_assignments: list["PracticeAssignment"] = Relationship(
        back_populates="student",
        sa_relationship=relationship("PracticeAssignment", back_populates="student"),
    )
    profile: Optional["StudentProfile"] = Relationship(
        back_populates="student",
        sa_relationship=relationship("StudentProfile", back_populates="student", uselist=False),
    )
    mistake_analyses: list["MistakeAnalysis"] = Relationship(
        back_populates="student",
        sa_relationship=relationship("MistakeAnalysis", back_populates="student"),
    )
    owner: Optional["User"] = Relationship(
        back_populates="students",
        sa_relationship=relationship("User", back_populates="students"),
    )


class StudentProfile(SQLModel, table=True):
    student_id: int = Field(foreign_key="student.id", primary_key=True)
    study_goal: Optional[str] = None
    teacher_notes: Optional[str] = None
    contact_info: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    profile_status: str = Field(default="complete", index=True)
    latest_mistake_stats: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_by: Optional[int] = Field(default=None, index=True)

    student: Student = Relationship(
        back_populates="profile",
        sa_relationship=relationship("Student", back_populates="profile"),
    )


class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: Optional[str] = Field(default=None, index=True)
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    classes: list["Classroom"] = Relationship(
        back_populates="teacher",
        sa_relationship=relationship("Classroom", back_populates="teacher"),
    )
    exams: list["Exam"] = Relationship(
        back_populates="teacher",
        sa_relationship=relationship("Exam", back_populates="teacher"),
    )
    grading_sessions: list["GradingSession"] = Relationship(
        back_populates="teacher",
        sa_relationship=relationship("GradingSession", back_populates="teacher"),
    )
    feedbacks: list["TeacherFeedback"] = Relationship(
        back_populates="teacher",
        sa_relationship=relationship("TeacherFeedback", back_populates="teacher"),
    )
    owner: Optional["User"] = Relationship(
        back_populates="teachers",
        sa_relationship=relationship("User", back_populates="teachers"),
    )



class GradingSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="teacher.id", index=True)
    exam_id: Optional[int] = Field(default=None, foreign_key="exam.id")
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    current_step: int = Field(default=1)
    status: SessionStatus = Field(default=SessionStatus.active, index=True)
    payload: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    last_error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    teacher: Optional["Teacher"] = Relationship(
        back_populates="grading_sessions",
        sa_relationship=relationship("Teacher", back_populates="grading_sessions"),
    )
    exam: Optional["Exam"] = Relationship(
        back_populates="grading_sessions",
        sa_relationship=relationship("Exam", back_populates="grading_sessions"),
    )
    owner: Optional["User"] = Relationship(
        back_populates="grading_sessions",
        sa_relationship=relationship("User", back_populates="grading_sessions"),
    )

class Classroom(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    grade_level: Optional[str] = None
    teacher_id: int = Field(foreign_key="teacher.id")
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    teacher: Optional["Teacher"] = Relationship(
        back_populates="classes",
        sa_relationship=relationship("Teacher", back_populates="classes"),
    )
    enrollments: list["ClassEnrollment"] = Relationship(
        back_populates="classroom",
        sa_relationship=relationship("ClassEnrollment", back_populates="classroom"),
    )
    owner: Optional["User"] = Relationship(
        back_populates="classrooms",
        sa_relationship=relationship("User", back_populates="classrooms"),
    )


class ClassEnrollment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    classroom_id: int = Field(foreign_key="classroom.id")
    student_id: int = Field(foreign_key="student.id")

    classroom: Optional["Classroom"] = Relationship(
        back_populates="enrollments",
        sa_relationship=relationship("Classroom", back_populates="enrollments"),
    )
    student: Optional["Student"] = Relationship(
        back_populates="enrollments",
        sa_relationship=relationship("Student", back_populates="enrollments"),
    )


class Exam(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    subject: Optional[str] = Field(default=None, index=True)
    scheduled_date: Optional[date] = None
    teacher_id: int = Field(foreign_key="teacher.id")
    classroom_id: Optional[int] = Field(default=None, foreign_key="classroom.id")
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    answer_key_version: int = Field(default=1)
    source_image_path: Optional[str] = None
    parsed_outline: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    teacher: Optional["Teacher"] = Relationship(
        back_populates="exams",
        sa_relationship=relationship("Teacher", back_populates="exams"),
    )
    questions: list["Question"] = Relationship(
        back_populates="exam",
        sa_relationship=relationship("Question", back_populates="exam"),
    )
    submissions: list["Submission"] = Relationship(
        back_populates="exam",
        sa_relationship=relationship("Submission", back_populates="exam"),
    )

    grading_sessions: list["GradingSession"] = Relationship(
        back_populates="exam",
        sa_relationship=relationship("GradingSession", back_populates="exam"),
    )
    owner: Optional["User"] = Relationship(
        back_populates="exams",
        sa_relationship=relationship("User", back_populates="exams"),
    )


class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    exam_id: int = Field(foreign_key="exam.id")
    number: str = Field(index=True)
    type: QuestionType = Field(default=QuestionType.multiple_choice, index=True)
    prompt: Optional[str] = None
    max_score: float = Field(default=1.0)
    knowledge_tags: Optional[str] = Field(default=None, description="Comma separated tags")
    answer_key: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    rubric: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    extra_metadata: Optional[dict] = Field(default=None, sa_column=Column("question_extra_metadata", JSON))
    target_student_ids: Optional[list[int]] = Field(default=None, sa_column=Column(JSON))
    answer_status: AnswerStatus = Field(
        default=AnswerStatus.draft,
        sa_column=Column("answer_status", String, default=AnswerStatus.draft.value),
    )
    answer_confidence: Optional[float] = Field(
        default=None,
        sa_column=Column("answer_confidence", Float),
    )

    exam: Optional["Exam"] = Relationship(
        back_populates="questions",
        sa_relationship=relationship("Exam", back_populates="questions"),
    )
    responses: list["Response"] = Relationship(
        back_populates="question",
        sa_relationship=relationship("Response", back_populates="question"),
    )


class Submission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="student.id")
    exam_id: int = Field(foreign_key="exam.id")
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    total_score: Optional[float] = None
    status: SubmissionStatus = Field(default=SubmissionStatus.pending, index=True)
    raw_ocr_payload: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    extra_metadata: Optional[dict] = Field(default=None, sa_column=Column("submission_extra_metadata", JSON))

    student: Optional["Student"] = Relationship(
        back_populates="submissions",
        sa_relationship=relationship("Student", back_populates="submissions"),
    )
    exam: Optional["Exam"] = Relationship(
        back_populates="submissions",
        sa_relationship=relationship("Exam", back_populates="submissions"),
    )
    responses: list["Response"] = Relationship(
        back_populates="submission",
        sa_relationship=relationship("Response", back_populates="submission"),
    )
    processing_logs: list["ProcessingLog"] = Relationship(
        back_populates="submission",
        sa_relationship=relationship(
            "ProcessingLog",
            back_populates="submission",
            cascade="all, delete-orphan",
        ),
    )
    owner: Optional["User"] = Relationship(
        back_populates="submissions",
        sa_relationship=relationship("User", back_populates="submissions"),
    )


class Response(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    submission_id: int = Field(foreign_key="submission.id")
    question_id: int = Field(foreign_key="question.id")
    student_answer: Optional[str] = None
    normalized_answer: Optional[str] = None
    score: Optional[float] = None
    is_correct: Optional[bool] = None
    ocr_confidence: Optional[float] = None
    teacher_annotation: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    comments: Optional[str] = None
    applies_to_student: bool = Field(default=True, index=True)
    ai_confidence: Optional[float] = None
    review_status: ResponseReviewStatus = Field(default=ResponseReviewStatus.pending, index=True)
    teacher_comment: Optional[str] = None
    ai_raw: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    submission: Optional["Submission"] = Relationship(
        back_populates="responses",
        sa_relationship=relationship("Submission", back_populates="responses"),
    )
    question: Optional["Question"] = Relationship(
        back_populates="responses",
        sa_relationship=relationship("Question", back_populates="responses"),
    )
    mistake: Optional["Mistake"] = Relationship(
        back_populates="response",
        sa_relationship=relationship("Mistake", back_populates="response"),
    )


class Mistake(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="student.id")
    response_id: int = Field(foreign_key="response.id")
    question_id: int = Field(foreign_key="question.id")
    knowledge_tags: Optional[str] = None
    misconception_label: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)
    times_practiced: int = Field(default=0)
    error_count: int = Field(default=1, index=True)
    data_status: str = Field(default="complete", index=True)
    root_cause: Optional[str] = None

    student: Optional["Student"] = Relationship(
        back_populates="mistake_sets",
        sa_relationship=relationship("Student", back_populates="mistake_sets"),
    )
    response: Optional["Response"] = Relationship(
        back_populates="mistake",
        sa_relationship=relationship("Response", back_populates="mistake"),
    )


class PracticeAssignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="student.id")
    scheduled_for: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    status: PracticeStatus = Field(default=PracticeStatus.scheduled, index=True)
    config: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    generated_pdf_path: Optional[str] = None
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    student: Optional["Student"] = Relationship(
        back_populates="practice_assignments",
        sa_relationship=relationship("Student", back_populates="practice_assignments"),
    )
    items: list["PracticeItem"] = Relationship(
        back_populates="assignment",
        sa_relationship=relationship("PracticeItem", back_populates="assignment"),
    )
    owner: Optional["User"] = Relationship(
        back_populates="practice_assignments",
        sa_relationship=relationship("User", back_populates="practice_assignments"),
    )


class PracticeItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="practiceassignment.id")
    question_id: int = Field(foreign_key="question.id")
    source_mistake_id: Optional[int] = Field(default=None, foreign_key="mistake.id")
    order_index: int = Field(default=0)

    assignment: Optional["PracticeAssignment"] = Relationship(
        back_populates="items",
        sa_relationship=relationship("PracticeAssignment", back_populates="items"),
    )
    question: Optional["Question"] = Relationship(
        sa_relationship=relationship("Question"),
    )
    source_mistake: Optional["Mistake"] = Relationship(
        sa_relationship=relationship("Mistake"),
    )


class MistakeAnalysis(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="student.id", index=True)
    context_meta: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    context_snapshot: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    llm_summary: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    status: str = Field(default="success", index=True)
    error_message: Optional[str] = None
    created_by: Optional[int] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    student: Student = Relationship(
        back_populates="mistake_analyses",
        sa_relationship=relationship("Student", back_populates="mistake_analyses"),
    )

class TeacherFeedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: Optional[int] = Field(default=None, foreign_key="teacher.id")
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    is_anonymous: bool = Field(default=False, index=True)
    content: str
    attachments: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = Field(default="pending", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    teacher: Optional["Teacher"] = Relationship(
        back_populates="feedbacks",
        sa_relationship=relationship("Teacher", back_populates="feedbacks"),
    )


class ProcessingLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    submission_id: int = Field(foreign_key="submission.id", index=True)
    step: str = Field(index=True)
    actor_type: str = Field(default="system", index=True)
    actor_id: Optional[int] = Field(default=None, index=True)
    detail: Optional[str] = None
    ai_trace_id: Optional[str] = Field(default=None, index=True)
    extra: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    submission: Optional["Submission"] = Relationship(
        back_populates="processing_logs",
        sa_relationship=relationship("Submission", back_populates="processing_logs"),
    )



