from __future__ import annotations

from datetime import date

from sqlmodel import Session, select

from .database import engine, init_db
from .models import ClassEnrollment, Classroom, Exam, Question, QuestionType, Student, Teacher, User


def ensure_teacher(session: Session, name: str, email: str) -> Teacher:
    teacher = session.exec(select(Teacher).where(Teacher.email == email)).first()
    if teacher:
        return teacher
    teacher = Teacher(name=name, email=email, owner_id=user.id if "user" in locals() else None)
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

    classroom_students = session.exec(
        select(Student)
        .join(ClassEnrollment, ClassEnrollment.student_id == Student.id)
        .where(ClassEnrollment.classroom_id == classroom.id)
    ).all()
    targeted_student_id = classroom_students[0].id if classroom_students else None

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
            target_student_ids=[targeted_student_id] if targeted_student_id else None,
        ),
    ]

    session.add_all(questions)
    session.commit()
    session.refresh(exam, attribute_names=["questions"])
    return exam

def ensure_demo_dataset(session: Session) -> tuple[Teacher, Classroom, list[Student], Exam]:
    teacher = ensure_teacher(session, "演示教师", "demo.teacher@example.com")
    classroom = ensure_classroom(session, teacher, "九年级一班（演示）")
    students = ensure_students(session, classroom)
    exam = ensure_exam(session, teacher, classroom)
    return teacher, classroom, students, exam


def create_demo_dataset_for_user(session: Session, user: User) -> dict[str, object]:
    teacher = Teacher(name=user.name or "示例教师", email=user.email, owner_id=user.id)
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    classroom = Classroom(
        name=f"{user.name or '示例'}的班级",
        grade_level="演示年级",
        teacher_id=teacher.id,
        owner_id=user.id,
    )
    session.add(classroom)
    session.commit()
    session.refresh(classroom)

    demo_students = [
        ("示例学生一", f"student1+{user.id}@demo.local"),
        ("示例学生二", f"student2+{user.id}@demo.local"),
        ("示例学生三", f"student3+{user.id}@demo.local"),
    ]
    students: list[Student] = []
    for idx, (name, email) in enumerate(demo_students):
        student = Student(
            name=name,
            email=email,
            grade_level="演示年级",
            owner_id=user.id,
        )
        session.add(student)
        session.commit()
        session.refresh(student)
        enrollment = ClassEnrollment(classroom_id=classroom.id, student_id=student.id)
        session.add(enrollment)
        session.commit()
        students.append(student)

    exam = Exam(
        title="示例测验",
        subject="数学",
        scheduled_date=date.today(),
        teacher_id=teacher.id,
        classroom_id=classroom.id,
        owner_id=user.id,
    )
    session.add(exam)
    session.commit()
    session.refresh(exam)

    targeted_student_id = students[0].id if students else None

    questions = [
        Question(
            exam_id=exam.id,
            number="1",
            type=QuestionType.multiple_choice,
            prompt="化简：2x + 3x",
            max_score=1,
            knowledge_tags="algebraic_expressions",
            answer_key={
                "options": ["A", "B", "C", "D"],
                "correct": "B",
                "choices": {"A": "4x", "B": "5x", "C": "6x", "D": "x/5"},
            },
        ),
        Question(
            exam_id=exam.id,
            number="2",
            type=QuestionType.fill_in_blank,
            prompt="解方程：3x = 18",
            max_score=2,
            knowledge_tags="linear_equations",
            answer_key={"acceptable_answers": ["6"], "numeric": True, "numeric_tolerance": 0.01},
        ),
        Question(
            exam_id=exam.id,
            number="3",
            type=QuestionType.subjective,
            prompt="说明如何在给定两个点的情况下求直线的斜率。",
            max_score=5,
            knowledge_tags="coordinate_geometry",
            rubric={"full_credit": "正确写出公式并代入计算", "partial_credit": "仅写出公式"},
            target_student_ids=[targeted_student_id] if targeted_student_id else None,
        ),
    ]
    session.add_all(questions)
    session.commit()
    session.refresh(exam, attribute_names=["questions"])

    return {
        "teacher_id": teacher.id,
        "classroom_id": classroom.id,
        "student_ids": [student.id for student in students],
        "exam_id": exam.id,
    }

if __name__ == "__main__":
    init_db()
    with Session(engine) as session:
        ensure_demo_dataset(session)
        print("Demo data ready.")
