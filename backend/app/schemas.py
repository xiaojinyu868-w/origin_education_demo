from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from .models import PracticeStatus, QuestionType, SubmissionStatus


class StudentBase(BaseModel):
    name: str
    email: Optional[str] = None
    grade_level: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class StudentRead(StudentBase):
    id: int

    class Config:
        from_attributes = True


class TeacherBase(BaseModel):
    name: str
    email: Optional[str] = None


class TeacherCreate(TeacherBase):
    pass


class TeacherRead(TeacherBase):
    id: int

    class Config:
        from_attributes = True


class ClassroomBase(BaseModel):
    name: str
    grade_level: Optional[str] = None
    teacher_id: int


class ClassroomCreate(ClassroomBase):
    pass


class ClassroomRead(ClassroomBase):
    id: int

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    classroom_id: int
    student_id: int


class EnrollmentRead(EnrollmentCreate):
    id: int

    class Config:
        from_attributes = True


class QuestionBase(BaseModel):
    number: str
    type: QuestionType
    prompt: Optional[str] = None
    max_score: float = 1.0
    knowledge_tags: Optional[str] = Field(
        default=None,
        description="Comma separated list of knowledge tags",
    )
    answer_key: Optional[Dict] = None
    rubric: Optional[Dict] = None
    extra_metadata: Optional[Dict] = None
    target_student_ids: Optional[List[int]] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionRead(QuestionBase):
    id: int

    class Config:
        from_attributes = True


class ExamBase(BaseModel):
    title: str
    subject: Optional[str] = None
    scheduled_date: Optional[date] = None
    teacher_id: int
    classroom_id: Optional[int] = None


class ExamCreate(ExamBase):
    questions: List[QuestionCreate]


class ExamRead(ExamBase):
    id: int
    answer_key_version: int
    questions: List[QuestionRead]

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    student_id: int
    exam_id: int
    extra_metadata: Optional[Dict] = None


class SubmissionRead(BaseModel):
    id: int
    student_id: int
    exam_id: int
    submitted_at: datetime
    total_score: Optional[float]
    status: SubmissionStatus
    extra_metadata: Optional[Dict]

    class Config:
        from_attributes = True


class ResponseRead(BaseModel):
    id: int
    question_id: int
    student_answer: Optional[str]
    normalized_answer: Optional[str]
    score: Optional[float]
    is_correct: Optional[bool]
    ocr_confidence: Optional[float]
    teacher_annotation: Optional[Dict]
    comments: Optional[str]
    applies_to_student: bool

    class Config:
        from_attributes = True


class SubmissionDetail(SubmissionRead):
    responses: List[ResponseRead]


class MistakeRead(BaseModel):
    id: int
    question_id: int
    knowledge_tags: Optional[str]
    misconception_label: Optional[str]
    resolution_notes: Optional[str]
    created_at: datetime
    last_seen_at: datetime
    times_practiced: int

    class Config:
        from_attributes = True


class PracticeAssignmentCreate(BaseModel):
    student_id: int
    target_date: Optional[date] = None
    knowledge_filters: Optional[List[str]] = None
    max_items: int = 10


class PracticeItemRead(BaseModel):
    id: int
    question_id: int
    order_index: int
    source_mistake_id: Optional[int]

    class Config:
        from_attributes = True


class PracticeAssignmentRead(BaseModel):
    id: int
    student_id: int
    scheduled_for: date
    due_date: Optional[date]
    status: PracticeStatus
    generated_pdf_path: Optional[str]
    items: List[PracticeItemRead]

    class Config:
        from_attributes = True


class AnalyticsFilter(BaseModel):
    classroom_id: Optional[int] = None
    exam_id: Optional[int] = None
    knowledge_tags: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class KnowledgePointBreakdown(BaseModel):
    knowledge_tag: str
    total_attempts: int
    incorrect_count: int
    accuracy: float
    average_score: float


class AnalyticsSummary(BaseModel):
    total_students: int
    total_submissions: int
    average_score: float
    median_score: float
    knowledge_breakdown: List[KnowledgePointBreakdown]


class OCRResult(BaseModel):
    question_number: str
    raw_text: str
    annotation: Optional[str]
    confidence: float


class ProcessingStepStatus(str, Enum):
    success = "success"
    warning = "warning"
    error = "error"


class ProcessingStep(BaseModel):
    name: str
    status: ProcessingStepStatus = ProcessingStepStatus.success
    detail: Optional[str] = None


class SubmissionProcessingResult(BaseModel):
    submission: SubmissionRead
    responses: List[ResponseRead]
    mistakes: List[MistakeRead]
    ocr_rows: List[OCRResult]
    processing_steps: List[ProcessingStep] = Field(default_factory=list)
    ai_summary: Optional[str] = None


class ManualScoreUpdate(BaseModel):
    response_id: int
    new_score: float
    new_comment: Optional[str] = None
    override_annotation: Optional[Dict] = None


class PracticeCompletionUpdate(BaseModel):
    assignment_id: int
    completed: bool


class TeacherFeedbackCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    is_anonymous: bool = False
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None


class TeacherFeedbackRead(BaseModel):
    id: int
    content: str
    is_anonymous: bool
    attachments: List[str]
    status: str
    created_at: datetime
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None

    class Config:
        from_attributes = True


class AssistantMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    messages: List[AssistantMessage]
    temperature: float = 0.3
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    presence_penalty: Optional[float] = Field(default=None, ge=-2.0, le=2.0)
    frequency_penalty: Optional[float] = Field(default=None, ge=-2.0, le=2.0)
    stream: bool = True


class AssistantChatResponse(BaseModel):
    reply: AssistantMessage
    suggestions: Optional[List[str]] = None


class LLMConfigUpdate(BaseModel):
    api_key: str
    base_url: Optional[str] = None
    text_model: Optional[str] = None
    vision_model: Optional[str] = None


class LLMConfigStatus(BaseModel):
    available: bool

