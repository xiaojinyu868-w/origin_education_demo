from __future__ import annotations

from datetime import date

from sqlmodel import Session, select

from .database import engine, init_db
from .models import ClassEnrollment, Classroom, Exam, Question, QuestionType, Student, Teacher


def ensure_teacher(session: Session, name: str, email: str) -> Teacher:
    teacher = session.exec(select(Teacher).where(Teacher.email == email)).first()
    if teacher:
        return teacher
    teacher = Teacher(name=name, email=email)
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


def ensure_classroom(session: Session, teacher: Teacher, name: str) -> Classroom:
    classroom = session.exec(select(Classroom).where(Classroom.name == name)).first()
    if classroom:
        return classroom
    classroom = Classroom(name=name, grade_level="Grade 9", teacher_id=teacher.id)
    session.add(classroom)
    session.commit()
    session.refresh(classroom)
    return classroom


def ensure_students(session: Session, classroom: Classroom) -> list[Student]:
    demo_students = [
        ("Alice Zhang", "alice@example.com"),
        ("Brian Li", "brian@example.com"),
        ("Chen Wu", "chen@example.com"),
    ]
    students: list[Student] = []
    for name, email in demo_students:
        student = session.exec(select(Student).where(Student.email == email)).first()
        if not student:
            student = Student(name=name, email=email, grade_level="9")
            session.add(student)
            session.commit()
            session.refresh(student)
        enrollment = session.exec(
            select(ClassEnrollment).where(
                ClassEnrollment.classroom_id == classroom.id,
                ClassEnrollment.student_id == student.id,
            ),
        ).first()
        if not enrollment:
            enrollment = ClassEnrollment(classroom_id=classroom.id, student_id=student.id)
            session.add(enrollment)
            session.commit()
        students.append(student)
    return students


def ensure_exam(session: Session, teacher: Teacher, classroom: Classroom) -> Exam:
    exam = session.exec(select(Exam).where(Exam.title == "Algebra Midterm")).first()
    if exam:
        session.refresh(exam, attribute_names=["questions"])
        return exam

    exam = Exam(
        title="Algebra Midterm",
        subject="Math",
        scheduled_date=date.today(),
        teacher_id=teacher.id,
        classroom_id=classroom.id,
    )
    session.add(exam)
    session.commit()
    session.refresh(exam)

    questions = [
        Question(
            exam_id=exam.id,
            number="1",
            type=QuestionType.multiple_choice,
            prompt="Simplify: 2x + 3x",
            max_score=1,
            knowledge_tags="algebraic_expressions",
            answer_key={"options": ["A", "B", "C", "D"], "correct": "B", "choices": {
                "A": "4x",
                "B": "5x",
                "C": "6x",
                "D": "x/5",
            }},
        ),
        Question(
            exam_id=exam.id,
            number="2",
            type=QuestionType.fill_in_blank,
            prompt="Solve for x: 3x = 18",
            max_score=2,
            knowledge_tags="linear_equations",
            answer_key={"acceptable_answers": ["6"], "numeric": True, "numeric_tolerance": 0.01},
        ),
        Question(
            exam_id=exam.id,
            number="3",
            type=QuestionType.subjective,
            prompt="Explain how to find the slope of a line given two points.",
            max_score=5,
            knowledge_tags="coordinate_geometry",
            rubric={"full_credit": "Correct formula and substitution", "partial_credit": "Formula only"},
        ),
    ]

    session.add_all(questions)
    session.commit()
    session.refresh(exam, attribute_names=["questions"])
    return exam


if __name__ == "__main__":
    init_db()
    with Session(engine) as session:
        teacher = ensure_teacher(session, "Ms. Liu", "liu.teacher@example.com")
        classroom = ensure_classroom(session, teacher, "Grade 9 - Class 1")
        ensure_students(session, classroom)
        ensure_exam(session, teacher, classroom)
        print("Demo data ready.")
