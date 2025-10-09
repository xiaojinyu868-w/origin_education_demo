from __future__ import annotations

import mimetypes
from pathlib import Path
from datetime import datetime
from typing import Iterator, List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from .database import get_session, init_db
from .models import (
    ClassEnrollment,
    Classroom,
    Exam,
    GradingSession,
    PracticeAssignment,
    PracticeStatus,
    Question,
    SessionStatus,
    Response,
    Student,
    Submission,
    Teacher,
    TeacherFeedback,
)
from .schemas import (
    AnalyticsFilter,
    AnalyticsSummary,
    AssistantChatRequest,
    AssistantChatResponse,
    LLMConfigStatus,
    LLMConfigUpdate,
    ClassroomCreate,
    ClassroomRead,
    EnrollmentCreate,
    EnrollmentRead,
    ExamCreate,
    ExamRead,
    ExamAnswerKeyUpdate,
    ExamDraftResponse,
    GradingSessionCreate,
    GradingSessionRead,
    GradingSessionUpdate,
    ManualScoreUpdate,
    MistakeRead,
    OCRResult,
    ProcessingStep,
    PracticeAssignmentCreate,
    PracticeAssignmentRead,
    PracticeCompletionUpdate,
    ResponseRead,
    StudentCreate,
    StudentRead,
    SubmissionCreate,
    SubmissionDetail,
    SubmissionProcessingResult,
    SubmissionRead,
    TeacherCreate,
    TeacherFeedbackCreate,
    TeacherFeedbackRead,
    TeacherRead,
)
from .services.analytics import build_analytics
from .services.grading import auto_grade_submission
from .services.llm import (
    LLMInvocationError,
    LLMNotConfiguredError,
    llm_available,
    parse_exam_outline,
    run_teacher_assistant,
    set_llm_credentials,
    stream_teacher_assistant,
)
from .services.mistakes import get_student_mistakes
from .services.ocr import OCRProcessingError, run_ocr_pipeline
from .services.practice import generate_practice_assignment
from uuid import uuid4

FEEDBACK_STORAGE_DIR = (Path(__file__).resolve().parent / "generated" / "feedback")
EXAM_DRAFT_STORAGE_DIR = (Path(__file__).resolve().parent / "generated" / "exams")
ALLOWED_FEEDBACK_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_FEEDBACK_ATTACHMENTS = 3
MAX_FEEDBACK_FILE_SIZE = 3 * 1024 * 1024


app = FastAPI(title="AI-Assisted Exam Analytics Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


def _get_db() -> Session:
    with get_session() as session:
        yield session


@app.post("/students", response_model=StudentRead)
def create_student(payload: StudentCreate, session: Session = Depends(_get_db)) -> Student:
    student = Student(**payload.model_dump())
    session.add(student)
    session.commit()
    session.refresh(student)
    return student


@app.get("/students", response_model=List[StudentRead])
def list_students(session: Session = Depends(_get_db)) -> List[Student]:
    stmt = select(Student)
    return session.exec(stmt).all()


@app.post("/teachers", response_model=TeacherRead)
def create_teacher(payload: TeacherCreate, session: Session = Depends(_get_db)) -> Teacher:
    teacher = Teacher(**payload.model_dump())
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


@app.get("/teachers", response_model=List[TeacherRead])
def list_teachers(session: Session = Depends(_get_db)) -> List[Teacher]:
    stmt = select(Teacher)
    return session.exec(stmt).all()


@app.post("/classrooms", response_model=ClassroomRead)
def create_classroom(payload: ClassroomCreate, session: Session = Depends(_get_db)) -> Classroom:
    classroom = Classroom(**payload.model_dump())
    session.add(classroom)
    session.commit()
    session.refresh(classroom)
    return classroom


@app.get("/classrooms", response_model=List[ClassroomRead])
def list_classrooms(session: Session = Depends(_get_db)) -> List[Classroom]:
    stmt = select(Classroom)
    return session.exec(stmt).all()


@app.post("/enrollments", response_model=EnrollmentRead)
def enroll_student(payload: EnrollmentCreate, session: Session = Depends(_get_db)) -> ClassEnrollment:
    enrollment = ClassEnrollment(**payload.model_dump())
    session.add(enrollment)
    session.commit()
    session.refresh(enrollment)
    return enrollment


@app.post("/exams/draft", response_model=ExamDraftResponse)
async def create_exam_draft(
    teacher_id: int = Form(...),
    image: UploadFile = File(...),
    session: Session = Depends(_get_db),
) -> ExamDraftResponse:
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="???????")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="?????????")

    content_type = (image.content_type or "").lower()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="???????????????")

    try:
        outline = parse_exam_outline(image_bytes)
    except LLMNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LLMInvocationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    extension = Path(image.filename or "").suffix.lower()
    if not extension and content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0])
        if guessed:
            extension = guessed
    if not extension:
        extension = ".png"

    EXAM_DRAFT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid4().hex}{extension}"
    file_path = EXAM_DRAFT_STORAGE_DIR / filename
    try:
        file_path.write_bytes(image_bytes)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="????????") from exc

    app_root = Path(__file__).resolve().parent
    try:
        relative_path = file_path.relative_to(app_root).as_posix()
    except ValueError:
        relative_path = file_path.as_posix()

    return ExamDraftResponse(source_image_path=relative_path, outline=outline)


@app.post("/exams", response_model=ExamRead)
def create_exam(payload: ExamCreate, session: Session = Depends(_get_db)) -> Exam:
    exam = Exam(**payload.model_dump(exclude={"questions"}))
    session.add(exam)
    session.flush()

    for question_payload in payload.questions:
        question = Question(exam_id=exam.id, **question_payload.model_dump())
        session.add(question)

    session.commit()
    session.refresh(exam)
    session.refresh(exam, attribute_names=["questions"])
    return exam


@app.get("/exams", response_model=List[ExamRead])
def list_exams(session: Session = Depends(_get_db)) -> List[ExamRead]:
    stmt = select(Exam)
    exams = session.exec(stmt).all()
    for exam in exams:
        session.refresh(exam, attribute_names=["questions"])
    return [ExamRead.model_validate(exam) for exam in exams]


@app.get("/exams/{exam_id}", response_model=ExamRead)
def get_exam(exam_id: int, session: Session = Depends(_get_db)) -> Exam:
    exam = session.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="未找到对应考试")
    session.refresh(exam, attribute_names=["questions"])
    return exam



@app.patch("/exams/{exam_id}/answer-key", response_model=ExamRead)
def update_exam_answer_key(
    exam_id: int,
    payload: ExamAnswerKeyUpdate,
    session: Session = Depends(_get_db),
) -> Exam:
    exam = session.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="未找到对应考试")

    if not payload.questions:
        session.refresh(exam, attribute_names=["questions"])
        return exam

    question_ids = [item.question_id for item in payload.questions]
    stmt = select(Question).where(Question.id.in_(question_ids))
    questions = session.exec(stmt).all()
    question_lookup = {question.id: question for question in questions if question.exam_id == exam_id}

    missing = [qid for qid in question_ids if qid not in question_lookup]
    if missing:
        raise HTTPException(status_code=404, detail=f"题目 {missing[0]} 未找到或不属于当前考试")

    updated = False
    for item in payload.questions:
        question = question_lookup[item.question_id]
        if item.answer_key is not None:
            question.answer_key = item.answer_key
            updated = True
        if item.answer_status is not None:
            question.answer_status = item.answer_status
            updated = True
        if item.answer_confidence is not None:
            question.answer_confidence = item.answer_confidence
            updated = True

    if updated:
        exam.answer_key_version += 1
        session.add(exam)
    session.commit()
    session.refresh(exam, attribute_names=["questions"])
    return exam


@app.get("/grading/sessions/active", response_model=GradingSessionRead)
def get_or_create_active_grading_session(
    teacher_id: int,
    session: Session = Depends(_get_db),
) -> GradingSession:
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="未找到教师信息")

    stmt = (
        select(GradingSession)
        .where(
            GradingSession.teacher_id == teacher_id,
            GradingSession.status == SessionStatus.active,
        )
        .order_by(GradingSession.updated_at.desc())
    )
    existing = session.exec(stmt).first()
    if existing:
        session.refresh(existing)
        return existing

    new_session = GradingSession(teacher_id=teacher_id)
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    return new_session


@app.post("/grading/sessions", response_model=GradingSessionRead)
def create_grading_session_endpoint(
    payload: GradingSessionCreate,
    session: Session = Depends(_get_db),
) -> GradingSession:
    stmt = (
        select(GradingSession)
        .where(
            GradingSession.teacher_id == payload.teacher_id,
            GradingSession.status == SessionStatus.active,
        )
        .order_by(GradingSession.updated_at.desc())
    )
    existing = session.exec(stmt).first()
    if existing:
        if payload.exam_id is not None:
            existing.exam_id = payload.exam_id
        if payload.payload is not None:
            existing.payload = payload.payload
        existing.status = SessionStatus.active
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    grading_session = GradingSession(
        teacher_id=payload.teacher_id,
        exam_id=payload.exam_id,
        payload=payload.payload,
    )
    session.add(grading_session)
    session.commit()
    session.refresh(grading_session)
    return grading_session


@app.patch("/grading/sessions/{session_id}", response_model=GradingSessionRead)
def update_grading_session_endpoint(
    session_id: int,
    payload: GradingSessionUpdate,
    session: Session = Depends(_get_db),
) -> GradingSession:
    grading_session = session.get(GradingSession, session_id)
    if not grading_session:
        raise HTTPException(status_code=404, detail="未找到批改向导会话")

    updates = payload.model_dump(exclude_unset=True)
    if "current_step" in updates:
        updates["current_step"] = min(5, max(1, int(updates["current_step"])))
    if "status" in updates and updates["status"] is None:
        updates.pop("status")

    for key, value in updates.items():
        setattr(grading_session, key, value)

    grading_session.updated_at = datetime.utcnow()
    session.add(grading_session)
    session.commit()
    session.refresh(grading_session)
    return grading_session

@app.post("/submissions", response_model=SubmissionDetail)
def create_submission(payload: SubmissionCreate, session: Session = Depends(_get_db)) -> SubmissionDetail:
    exam = session.get(Exam, payload.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="未找到对应考试")
    student = session.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="未找到对应学生")

    submission = Submission(**payload.model_dump())
    session.add(submission)
    session.commit()
    session.refresh(submission)
    session.refresh(submission, attribute_names=["responses"])

    return SubmissionDetail.model_validate(submission)


@app.get("/submissions", response_model=List[SubmissionDetail])
def list_submissions(
    exam_id: Optional[int] = None,
    student_id: Optional[int] = None,
    session: Session = Depends(_get_db),
) -> List[SubmissionDetail]:
    stmt = select(Submission)
    if exam_id is not None:
        stmt = stmt.where(Submission.exam_id == exam_id)
    if student_id is not None:
        stmt = stmt.where(Submission.student_id == student_id)
    stmt = stmt.order_by(Submission.submitted_at.desc())
    submissions = session.exec(stmt).all()
    for submission in submissions:
        session.refresh(submission, attribute_names=["responses"])
    return [SubmissionDetail.model_validate(item) for item in submissions]


@app.get("/submissions/{submission_id}", response_model=SubmissionDetail)
def get_submission(submission_id: int, session: Session = Depends(_get_db)) -> SubmissionDetail:
    submission = session.get(Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="未找到该份提交记录")
    session.refresh(submission, attribute_names=["responses"])
    return SubmissionDetail.model_validate(submission)


@app.post("/submissions/upload", response_model=SubmissionProcessingResult)
async def upload_submission(
    student_id: int = Form(...),
    exam_id: int = Form(...),
    image: UploadFile = File(...),
    session: Session = Depends(_get_db),
) -> SubmissionProcessingResult:
    exam = session.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="未找到对应考试")
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="未找到对应学生")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="上传的图片为空")

    submission = Submission(student_id=student_id, exam_id=exam_id)
    session.add(submission)
    session.commit()
    session.refresh(submission)
    session.refresh(exam, attribute_names=["questions"])
    submission.exam = exam

    try:
        ocr_rows, ocr_steps = run_ocr_pipeline(image_bytes)
    except OCRProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    submission.raw_ocr_payload = {"rows": ocr_rows, "steps": ocr_steps}
    session.add(submission)
    session.commit()

    grading_artifacts = auto_grade_submission(session, submission, ocr_rows)

    session.refresh(submission)
    session.refresh(submission, attribute_names=["responses"])

    submission_schema = SubmissionRead.model_validate(submission)
    responses_schema = [ResponseRead.model_validate(item) for item in grading_artifacts.responses]
    mistakes_schema = [MistakeRead.model_validate(item) for item in grading_artifacts.mistakes]
    ocr_schema = [OCRResult.model_validate(item) for item in ocr_rows]
    combined_steps = ocr_steps + [step.as_dict() for step in grading_artifacts.steps]
    step_schemas = [ProcessingStep(**step) for step in combined_steps]

    return SubmissionProcessingResult(
        submission=submission_schema,
        responses=responses_schema,
        mistakes=mistakes_schema,
        ocr_rows=ocr_schema,
        processing_steps=step_schemas,
        ai_summary=grading_artifacts.ai_summary,
    )


@app.post("/responses/manual-score", response_model=ResponseRead)
def update_manual_score(
    payload: ManualScoreUpdate,
    session: Session = Depends(_get_db),
) -> ResponseRead:
    response = session.get(Response, payload.response_id)
    if response is None:
        raise HTTPException(status_code=404, detail="未找到作答记录")

    response.score = payload.new_score
    response.comments = payload.new_comment
    if payload.override_annotation:
        response.teacher_annotation = payload.override_annotation

    session.add(response)
    session.commit()
    session.refresh(response)

    submission = session.get(Submission, response.submission_id)
    if submission is not None:
        session.refresh(submission, attribute_names=["responses"])
        scored = [
            item.score or 0.0
            for item in submission.responses
            if item.score is not None and item.applies_to_student
        ]
        submission.total_score = sum(scored) if scored else submission.total_score
        session.add(submission)
        session.commit()

    return ResponseRead.model_validate(response)


@app.get("/students/{student_id}/mistakes", response_model=List[MistakeRead])
def list_student_mistakes(student_id: int, session: Session = Depends(_get_db)) -> List[MistakeRead]:
    mistakes = get_student_mistakes(session, student_id)
    return [MistakeRead.model_validate(item) for item in mistakes]


@app.post("/practice", response_model=PracticeAssignmentRead)
def create_practice_assignment_endpoint(
    payload: PracticeAssignmentCreate,
    session: Session = Depends(_get_db),
) -> PracticeAssignmentRead:
    try:
        assignment = generate_practice_assignment(
            session,
            student_id=payload.student_id,
            target_date=payload.target_date,
            knowledge_filters=payload.knowledge_filters,
            max_items=payload.max_items,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session.refresh(assignment, attribute_names=["items"])
    return PracticeAssignmentRead.model_validate(assignment)


@app.get("/practice", response_model=List[PracticeAssignmentRead])
def list_practice_assignments(
    student_id: Optional[int] = None,
    session: Session = Depends(_get_db),
) -> List[PracticeAssignmentRead]:
    stmt = select(PracticeAssignment).options(selectinload(PracticeAssignment.items))
    if student_id is not None:
        stmt = stmt.where(PracticeAssignment.student_id == student_id)
    stmt = stmt.order_by(PracticeAssignment.scheduled_for.desc())
    assignments = session.exec(stmt).all()
    for assignment in assignments:
        session.refresh(assignment, attribute_names=["items"])
    return [PracticeAssignmentRead.model_validate(item) for item in assignments]


@app.post("/practice/complete", response_model=PracticeAssignmentRead)
def update_practice_completion(
    payload: PracticeCompletionUpdate,
    session: Session = Depends(_get_db),
) -> PracticeAssignmentRead:
    assignment = session.get(PracticeAssignment, payload.assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="未找到练习任务")

    assignment.status = PracticeStatus.completed if payload.completed else PracticeStatus.assigned
    session.add(assignment)
    session.commit()
    session.refresh(assignment, attribute_names=["items"])
    return PracticeAssignmentRead.model_validate(assignment)


@app.post("/analytics", response_model=AnalyticsSummary)
def analytics_summary(payload: AnalyticsFilter, session: Session = Depends(_get_db)) -> AnalyticsSummary:
    return build_analytics(session, payload)


@app.post("/assistant/chat", response_model=AssistantChatResponse)
def teacher_assistant_chat(
    payload: AssistantChatRequest,
    session: Session = Depends(_get_db),  # noqa: ARG001 - for future personalization
):
    llm_kwargs = {
        "temperature": payload.temperature,
        "top_p": payload.top_p,
        "presence_penalty": payload.presence_penalty,
        "frequency_penalty": payload.frequency_penalty,
    }
    message_payloads = [message.model_dump() for message in payload.messages]

    if payload.stream:
        def event_stream() -> Iterator[str]:
            yield from stream_teacher_assistant(message_payloads, **llm_kwargs)

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    try:
        answer, suggestions = run_teacher_assistant(message_payloads, **llm_kwargs)
    except LLMNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LLMInvocationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return AssistantChatResponse(
        reply={"role": "assistant", "content": answer},
        suggestions=suggestions,
    )

@app.get("/assistant/status", response_model=LLMConfigStatus)
def get_assistant_status() -> LLMConfigStatus:
    return LLMConfigStatus(available=llm_available())


@app.post("/assistant/config", response_model=LLMConfigStatus)
def update_assistant_config(payload: LLMConfigUpdate) -> LLMConfigStatus:
    try:
        set_llm_credentials(
            api_key=payload.api_key,
            base_url=payload.base_url,
            text_model=payload.text_model,
            vision_model=payload.vision_model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return LLMConfigStatus(available=llm_available())


@app.post("/feedback/teacher", response_model=TeacherFeedbackRead, status_code=201)
async def submit_teacher_feedback(
    content: str = Form(...),
    is_anonymous: bool = Form(False),
    teacher_id: Optional[int] = Form(None),
    teacher_name: Optional[str] = Form(None),
    teacher_email: Optional[str] = Form(None),
    attachments: Optional[List[UploadFile]] = File(default=None),
    session: Session = Depends(_get_db),
) -> TeacherFeedbackRead:
    cleaned_content = content.strip()
    if not cleaned_content:
        raise HTTPException(status_code=400, detail="反馈内容不能为空")

    files = attachments or []
    if len(files) > MAX_FEEDBACK_ATTACHMENTS:
        raise HTTPException(status_code=400, detail=f"一次最多可上传 {MAX_FEEDBACK_ATTACHMENTS} 张图片")

    FEEDBACK_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    stored_paths: List[str] = []
    for upload in files:
        if upload.content_type not in ALLOWED_FEEDBACK_MIME_TYPES:
            raise HTTPException(status_code=400, detail="仅支持上传 JPG/PNG/WebP 图片")
        data = await upload.read()
        if not data:
            continue
        if len(data) > MAX_FEEDBACK_FILE_SIZE:
            raise HTTPException(status_code=400, detail="单张图片需小于 3MB")
        extension_map = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/webp": ".webp",
        }
        suffix = extension_map.get(upload.content_type, Path(upload.filename or "").suffix.lower() or ".bin")
        filename = f"{uuid4().hex}{suffix}"
        file_path = FEEDBACK_STORAGE_DIR / filename
        file_path.write_bytes(data)
        stored_paths.append(f"feedback/{filename}")

    if is_anonymous:
        teacher_id_value = None
        teacher_name_value = None
        teacher_email_value = None
    else:
        teacher_id_value = teacher_id
        teacher_name_value = teacher_name
        teacher_email_value = teacher_email

    feedback = TeacherFeedback(
        content=cleaned_content,
        is_anonymous=is_anonymous,
        attachments=stored_paths,
        teacher_id=teacher_id_value,
        teacher_name=teacher_name_value,
        teacher_email=teacher_email_value,
    )
    session.add(feedback)
    session.commit()
    session.refresh(feedback)
    return TeacherFeedbackRead.model_validate(feedback)




@app.post("/bootstrap/demo")
def bootstrap_demo(session: Session = Depends(_get_db)):
    """初始化一份演示数据，便于测试前端流程。"""

    teacher = ensure_teacher(session, "演示教师", "demo.teacher@example.com")
    classroom = ensure_classroom(session, teacher, "九年级一班（演示）")
    students = ensure_students(session, classroom)
    exam = ensure_exam(session, teacher, classroom)

    return {
        "message": "演示数据已准备就绪",
        "teacher_id": teacher.id,
        "classroom_id": classroom.id,
        "student_ids": [student.id for student in students],
        "exam_id": exam.id,
    }


@app.get("/practice/{assignment_id}/pdf")
def download_practice_pdf(assignment_id: int, session: Session = Depends(_get_db)):
    assignment = session.get(PracticeAssignment, assignment_id)
    if assignment is None or not assignment.generated_pdf_path:
        raise HTTPException(status_code=404, detail="尚未生成对应的练习卷 PDF")
    pdf_path = Path(assignment.generated_pdf_path)
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF 文件不存在或已被删除")
    return FileResponse(str(pdf_path), filename=pdf_path.name)














