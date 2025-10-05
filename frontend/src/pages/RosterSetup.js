import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Divider, Form, Input, List, Modal, Row, Select, Space, Statistic, Steps, Typography, } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import PageLayout from "../components/PageLayout";
import { createClassroom, createEnrollment, createExam, createStudent, createTeacher, fetchClassrooms, fetchExams, fetchStudents, fetchTeachers, } from "../api/services";
const { Title, Paragraph, Text } = Typography;
const defaultQuestion = {
    number: "1",
    type: "multiple_choice",
    prompt: "",
    max_score: 1,
    knowledge_tags: "",
    answer_key: { correct: "A", options: ["A", "B", "C", "D"] },
};
const questionTypeOptions = [
    { label: "选择题", value: "multiple_choice" },
    { label: "填空题", value: "fill_in_blank" },
    { label: "主观题", value: "subjective" },
];
const renderQuestionType = (type) => {
    switch (type) {
        case "multiple_choice":
            return "选择题";
        case "fill_in_blank":
            return "填空题";
        case "subjective":
            return "主观题";
        default:
            return type;
    }
};
const RosterSetup = () => {
    const [teachers, setTeachers] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [students, setStudents] = useState([]);
    const [examCount, setExamCount] = useState(0);
    const [questionDrafts, setQuestionDrafts] = useState([defaultQuestion]);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        void refreshAll();
    }, []);
    const refreshAll = async () => {
        const [teacherList, classroomList, studentList, examList] = await Promise.all([
            fetchTeachers(),
            fetchClassrooms(),
            fetchStudents(),
            fetchExams(),
        ]);
        setTeachers(teacherList);
        setClassrooms(classroomList);
        setStudents(studentList);
        setExamCount(examList.length);
    };
    const handleTeacherSubmit = async (values) => {
        setSubmitting(true);
        try {
            await createTeacher(values);
            await refreshAll();
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleClassroomSubmit = async (values) => {
        setSubmitting(true);
        try {
            await createClassroom(values);
            await refreshAll();
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleStudentSubmit = async (values) => {
        setSubmitting(true);
        try {
            const student = await createStudent(values);
            if (values.classroom_id) {
                await createEnrollment({ classroom_id: values.classroom_id, student_id: student.id });
            }
            await refreshAll();
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleAddQuestion = () => {
        setQuestionDrafts((prev) => [
            ...prev,
            {
                ...defaultQuestion,
                number: String(prev.length + 1),
            },
        ]);
    };
    const handleQuestionChange = (index, patch) => {
        setQuestionDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };
    const handleRemoveQuestion = (index) => {
        setQuestionDrafts((prev) => prev.filter((_, i) => i !== index));
    };
    const examPreview = useMemo(() => {
        return questionDrafts.map((item, index) => (_jsxs(List.Item, { children: [_jsx(List.Item.Meta, { title: `第 ${item.number} 题 · ${renderQuestionType(item.type)}`, description: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsx(Paragraph, { style: { marginBottom: 0 }, children: item.prompt || "题干待完善" }), _jsxs(Text, { type: "secondary", children: ["\u77E5\u8BC6\u70B9\uFF1A", item.knowledge_tags || "未标注"] }), _jsxs(Text, { type: "secondary", children: ["\u6EE1\u5206 ", item.max_score, " \u5206"] })] }) }), _jsx(Button, { type: "link", danger: true, onClick: () => handleRemoveQuestion(index), children: "\u5220\u9664" })] }, `${item.number}-${index}`)));
    }, [questionDrafts]);
    const handleCreateExam = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                questions: questionDrafts.map((item, idx) => ({
                    number: item.number || String(idx + 1),
                    type: item.type,
                    prompt: item.prompt,
                    max_score: item.max_score,
                    knowledge_tags: item.knowledge_tags,
                    answer_key: item.answer_key,
                })),
            };
            await createExam(payload);
            await refreshAll();
            Modal.success({
                title: "试卷创建成功",
                content: "接下来可前往“上传批改”体验自动批改流程。",
            });
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs(Space, { direction: "vertical", size: 28, style: { width: "100%" }, children: [_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 28 }, children: _jsxs(Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [_jsx(Title, { level: 3, style: { marginBottom: 0 }, children: "\u4E00\u6B21\u642D\u5EFA\uFF0C\u6301\u7EED\u590D\u7528" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 12 }, children: "\u5F55\u5165\u6559\u5E08\u3001\u73ED\u7EA7\u3001\u5B66\u751F\u4E0E\u8BD5\u5377\u7ED3\u6784\u540E\uFF0C\u540E\u7EED\u6279\u6539\u4E0E\u5B66\u60C5\u5206\u6790\u5373\u53EF\u5373\u523B\u4F7F\u7528\u3002" }), _jsx(Steps, { responsive: true, items: [
                                { title: "录入教师", description: "建立授课老师与账号信息" },
                                { title: "创建班级", description: "关联教师并添加学生" },
                                { title: "配置试卷", description: "补充题目与答案规则" },
                            ] })] }) }), _jsxs(Row, { gutter: [20, 20], children: [_jsx(Col, { xs: 24, lg: 8, children: _jsx(PageLayout, { title: "\u6559\u5E08\u4FE1\u606F", description: "\u4FDD\u5B58\u6388\u8BFE\u6559\u5E08\u59D3\u540D\u4E0E\u90AE\u7BB1\uFF0C\u7CFB\u7EDF\u5C06\u81EA\u52A8\u540C\u6B65\u6279\u6539\u6743\u9650\u3002", children: _jsxs(Form, { layout: "vertical", onFinish: handleTeacherSubmit, autoComplete: "off", children: [_jsx(Form.Item, { name: "name", label: "\u6559\u5E08\u59D3\u540D", rules: [{ required: true, message: "请输入教师姓名" }], children: _jsx(Input, { placeholder: "\u5982\uFF1A\u674E\u8001\u5E08", allowClear: true }) }), _jsx(Form.Item, { name: "email", label: "\u90AE\u7BB1", children: _jsx(Input, { placeholder: "teacher@example.com", allowClear: true }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: submitting, block: true, icon: _jsx(PlusOutlined, {}), children: "\u4FDD\u5B58\u6559\u5E08" }) })] }) }) }), _jsx(Col, { xs: 24, lg: 8, children: _jsx(PageLayout, { title: "\u73ED\u7EA7\u4FE1\u606F", description: "\u8BBE\u7F6E\u73ED\u7EA7\u540D\u79F0\u4E0E\u5E74\u7EA7\uFF0C\u5E76\u6307\u5B9A\u73ED\u4E3B\u4EFB\u3002", children: _jsxs(Form, { layout: "vertical", onFinish: handleClassroomSubmit, autoComplete: "off", children: [_jsx(Form.Item, { name: "name", label: "\u73ED\u7EA7\u540D\u79F0", rules: [{ required: true, message: "请输入班级名称" }], children: _jsx(Input, { placeholder: "\u5982\uFF1A\u4E5D\u5E74\u7EA7\u4E00\u73ED", allowClear: true }) }), _jsx(Form.Item, { name: "grade_level", label: "\u5E74\u7EA7", children: _jsx(Input, { placeholder: "\u5982\uFF1A\u4E5D\u5E74\u7EA7", allowClear: true }) }), _jsx(Form.Item, { name: "teacher_id", label: "\u73ED\u4E3B\u4EFB", rules: [{ required: true, message: "请选择班主任" }], children: _jsx(Select, { placeholder: "\u8BF7\u9009\u62E9\u6559\u5E08", options: teachers.map((teacher) => ({ value: teacher.id, label: teacher.name })) }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: submitting, block: true, icon: _jsx(PlusOutlined, {}), children: "\u521B\u5EFA\u73ED\u7EA7" }) })] }) }) }), _jsx(Col, { xs: 24, lg: 8, children: _jsx(PageLayout, { title: "\u5B66\u751F\u4FE1\u606F", description: "\u53EF\u968F\u65F6\u6DFB\u52A0\u6216\u8C03\u6574\u5B66\u751F\uFF0C\u7075\u6D3B\u5173\u8054\u73ED\u7EA7\u3002", children: _jsxs(Form, { layout: "vertical", onFinish: handleStudentSubmit, autoComplete: "off", children: [_jsx(Form.Item, { name: "name", label: "\u5B66\u751F\u59D3\u540D", rules: [{ required: true, message: "请输入学生姓名" }], children: _jsx(Input, { placeholder: "\u5982\uFF1A\u5F20\u540C\u5B66", allowClear: true }) }), _jsx(Form.Item, { name: "email", label: "\u90AE\u7BB1", children: _jsx(Input, { placeholder: "student@example.com", allowClear: true }) }), _jsx(Form.Item, { name: "grade_level", label: "\u5E74\u7EA7", children: _jsx(Input, { placeholder: "\u5982\uFF1A\u4E5D\u5E74\u7EA7", allowClear: true }) }), _jsx(Form.Item, { name: "classroom_id", label: "\u52A0\u5165\u73ED\u7EA7", children: _jsx(Select, { allowClear: true, placeholder: "\u53EF\u9009", options: classrooms.map((classroom) => ({ value: classroom.id, label: classroom.name })) }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: submitting, block: true, icon: _jsx(PlusOutlined, {}), children: "\u4FDD\u5B58\u5B66\u751F" }) })] }) }) })] }), _jsxs(Row, { gutter: [20, 20], children: [_jsx(Col, { xs: 24, lg: 8, children: _jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 24 }, children: _jsxs(Space, { direction: "vertical", children: [_jsx(Text, { type: "secondary", children: "\u5F53\u524D\u6570\u636E\u6982\u89C8" }), _jsx(Statistic, { title: "\u6559\u5E08\u6570\u91CF", value: teachers.length, suffix: "\u4EBA" }), _jsx(Statistic, { title: "\u73ED\u7EA7\u6570\u91CF", value: classrooms.length, suffix: "\u4E2A" }), _jsx(Statistic, { title: "\u5B66\u751F\u6570\u91CF", value: students.length, suffix: "\u4EBA" }), _jsx(Statistic, { title: "\u5DF2\u914D\u7F6E\u8BD5\u5377", value: examCount, suffix: "\u4EFD" })] }) }) }), _jsx(Col, { xs: 24, lg: 16, children: _jsxs(PageLayout, { title: "\u8BD5\u5377\u7ED3\u6784\u8BBE\u8BA1", description: "\u8BB0\u5F55\u9898\u76EE\u7C7B\u578B\u3001\u7B54\u6848\u4E0E\u77E5\u8BC6\u70B9\u6807\u7B7E\uFF0C\u540E\u7EED\u81EA\u52A8\u6279\u6539\u5373\u53EF\u751F\u6548\u3002", extra: _jsx(Button, { type: "text", icon: _jsx(PlusOutlined, {}), onClick: handleAddQuestion, children: "\u6DFB\u52A0\u9898\u76EE" }), children: [_jsxs(Form, { layout: "vertical", onFinish: handleCreateExam, autoComplete: "off", children: [_jsxs(Row, { gutter: [20, 20], children: [_jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: "title", label: "\u8BD5\u5377\u6807\u9898", rules: [{ required: true, message: "请输入试卷标题" }], children: _jsx(Input, { placeholder: "\u5982\uFF1A\u671F\u4E2D\u6D4B\u8BD5", allowClear: true }) }) }), _jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: "subject", label: "\u5B66\u79D1", children: _jsx(Input, { placeholder: "\u5982\uFF1A\u6570\u5B66", allowClear: true }) }) }), _jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: "teacher_id", label: "\u51FA\u5377\u6559\u5E08", rules: [{ required: true, message: "请选择教师" }], children: _jsx(Select, { placeholder: "\u8BF7\u9009\u62E9\u6559\u5E08", options: teachers.map((teacher) => ({ value: teacher.id, label: teacher.name })) }) }) }), _jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: "classroom_id", label: "\u9002\u7528\u73ED\u7EA7", children: _jsx(Select, { allowClear: true, placeholder: "\u53EF\u9009", options: classrooms.map((classroom) => ({ value: classroom.id, label: classroom.name })) }) }) })] }), _jsx(Divider, { orientation: "left", children: "\u9898\u76EE\u5217\u8868" }), _jsx(List, { dataSource: questionDrafts, renderItem: (item, index) => (_jsx(List.Item, { children: _jsxs(Row, { gutter: 16, style: { width: "100%" }, children: [_jsx(Col, { xs: 12, md: 4, children: _jsx(Input, { value: item.number, onChange: (event) => handleQuestionChange(index, { number: event.target.value }), addonBefore: "\u9898\u53F7" }) }), _jsx(Col, { xs: 12, md: 5, children: _jsx(Select, { value: item.type, onChange: (value) => handleQuestionChange(index, { type: value }), options: questionTypeOptions }) }), _jsx(Col, { xs: 24, md: 7, children: _jsx(Input.TextArea, { value: item.prompt, onChange: (event) => handleQuestionChange(index, { prompt: event.target.value }), placeholder: "\u9898\u5E72\u63CF\u8FF0", autoSize: { minRows: 2, maxRows: 4 } }) }), _jsx(Col, { xs: 12, md: 4, children: _jsx(Input, { type: "number", min: 0, value: item.max_score, onChange: (event) => handleQuestionChange(index, { max_score: Number(event.target.value) || 0 }), addonBefore: "\u6EE1\u5206" }) }), _jsx(Col, { xs: 12, md: 4, children: _jsx(Input, { value: item.knowledge_tags, onChange: (event) => handleQuestionChange(index, { knowledge_tags: event.target.value }), placeholder: "\u77E5\u8BC6\u70B9\u6807\u7B7E" }) })] }) }, index)) }), _jsxs(Space, { style: { marginTop: 16 }, children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAddQuestion, children: "\u6DFB\u52A0\u9898\u76EE" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: submitting, children: "\u4FDD\u5B58\u8BD5\u5377" })] })] }), _jsx(Divider, { orientation: "left", children: "\u8BD5\u5377\u9884\u89C8" }), _jsx(List, { bordered: true, dataSource: questionDrafts, renderItem: (_, index) => examPreview[index] })] }) })] })] }));
};
export default RosterSetup;
