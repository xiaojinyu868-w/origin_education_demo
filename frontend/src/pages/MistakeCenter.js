import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button, Empty, Form, Input, List, Result, Select, Space, Tag, Typography, } from "antd";
import { completePractice, createPractice, fetchPracticeAssignments, fetchStudents, fetchStudentMistakes, } from "../api/services";
import PageLayout from "../components/PageLayout";
import useResponsive from "../hooks/useResponsive";
const { Paragraph, Title, Text } = Typography;
const MistakeCenter = () => {
    const { isMobile, isTablet } = useResponsive();
    const isCompact = isMobile || isTablet;
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [mistakes, setMistakes] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [latestAssignment, setLatestAssignment] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        void (async () => {
            const list = await fetchStudents();
            setStudents(list);
            if (list.length > 0) {
                await loadStudentData(list[0].id);
            }
        })();
    }, []);
    const loadStudentData = async (studentId) => {
        setSelectedStudent(studentId);
        const [mistakeList, assignmentList] = await Promise.all([
            fetchStudentMistakes(studentId),
            fetchPracticeAssignments({ student_id: studentId }),
        ]);
        setMistakes(mistakeList);
        setAssignments(assignmentList);
        setLatestAssignment(assignmentList[0] ?? null);
    };
    const handleCreatePractice = async (values) => {
        if (!selectedStudent)
            return;
        setLoading(true);
        try {
            const filters = values.knowledge_filters
                ? values.knowledge_filters
                    .split(/[，,]/)
                    .map((item) => item.trim())
                    .filter(Boolean)
                : undefined;
            const assignment = await createPractice({
                student_id: selectedStudent,
                knowledge_filters: filters,
                max_items: values.max_items || 10,
            });
            setLatestAssignment(assignment);
            const assignmentList = await fetchPracticeAssignments({ student_id: selectedStudent });
            setAssignments(assignmentList);
        }
        finally {
            setLoading(false);
        }
    };
    const handleComplete = async (assignmentId, completed) => {
        const updated = await completePractice({ assignment_id: assignmentId, completed });
        if (selectedStudent) {
            const assignmentList = await fetchPracticeAssignments({ student_id: selectedStudent });
            setAssignments(assignmentList);
            const latest = assignmentList.find((item) => item.id === updated.id) ?? assignmentList[0] ?? null;
            setLatestAssignment(latest);
        }
    };
    return (_jsxs(Space, { direction: "vertical", size: 28, style: { width: "100%" }, children: [_jsx(PageLayout, { title: "\u9519\u9898\u8BCA\u65AD\u4E2D\u5FC3", description: "\u7CFB\u7EDF\u81EA\u52A8\u6574\u7406\u7684\u9519\u9898\u672C\u4F1A\u4FDD\u7559\u7B54\u9898\u8FC7\u7A0B\u3001\u77E5\u8BC6\u70B9\u4E0E\u7EC3\u4E60\u8BB0\u5F55\u3002", children: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsx(Select, { placeholder: "\u8BF7\u9009\u62E9\u5B66\u751F", value: selectedStudent ?? undefined, onChange: (value) => void loadStudentData(value), options: students.map((student) => ({ value: student.id, label: student.name })), style: { width: isCompact ? "100%" : 280 } }), mistakes.length === 0 ? (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\u6682\u65E0\u9519\u9898\u8BB0\u5F55\uFF0C\u5F85\u4E0A\u4F20\u8BD5\u5377\u540E\u81EA\u52A8\u751F\u6210\u3002" })) : (_jsx(List, { bordered: false, split: false, className: "mistake-list", dataSource: mistakes, renderItem: (item) => (_jsxs(List.Item, { children: [_jsx(List.Item.Meta, { title: `题目 ID：${item.question_id}`, description: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsxs(Paragraph, { style: { marginBottom: 0 }, children: ["\u77E5\u8BC6\u70B9\uFF1A", item.knowledge_tags || "未标注"] }), _jsxs(Text, { type: "secondary", children: ["\u6700\u8FD1\u51FA\u73B0\uFF1A", item.last_seen_at] })] }) }), _jsxs(Tag, { color: "volcano", children: ["\u7EC3\u4E60\u6B21\u6570 ", item.times_practiced] })] })) }))] }) }), _jsxs(PageLayout, { title: "\u751F\u6210\u9519\u9898\u7EC3\u4E60", description: "\u8F93\u5165\u77E5\u8BC6\u70B9\u5173\u952E\u8BCD\u5373\u53EF\u7EC4\u5408\u9488\u5BF9\u6027\u7EC3\u4E60\uFF0C\u7CFB\u7EDF\u4F1A\u540C\u6B65\u751F\u6210 PDF \u7248\u672C\u3002", children: [_jsxs(Form, { layout: isCompact ? "vertical" : "inline", onFinish: handleCreatePractice, style: { width: "100%" }, children: [_jsx(Form.Item, { name: "knowledge_filters", label: "\u5173\u952E\u8BCD", style: { width: isCompact ? "100%" : "auto" }, children: _jsx(Input, { allowClear: true, placeholder: "\u4F8B\u5982\uFF1A\u4E00\u6B21\u51FD\u6570, \u4E8C\u6B21\u51FD\u6570", style: { width: isCompact ? "100%" : 260 } }) }), _jsx(Form.Item, { name: "max_items", label: "\u9898\u91CF", style: { width: isCompact ? "100%" : "auto" }, children: _jsx(Input, { type: "number", placeholder: "\u9ED8\u8BA4 10", style: { width: isCompact ? "100%" : 120 } }) }), _jsx(Form.Item, { style: { width: isCompact ? "100%" : "auto" }, children: _jsx(Button, { block: isCompact, type: "primary", htmlType: "submit", loading: loading, disabled: !selectedStudent, children: "\u751F\u6210\u7EC3\u4E60" }) })] }), latestAssignment ? (_jsx(Result, { status: "success", title: `练习编号 ${latestAssignment.id}`, subTitle: `状态：${latestAssignment.status} · 题量：${latestAssignment.items?.length ?? 0}`, extra: latestAssignment.generated_pdf_path ? (_jsx(Button, { type: "primary", href: `/api/practice/${latestAssignment.id}/pdf`, target: "_blank", children: "\u6253\u5F00 PDF \u7EC3\u4E60\u5377" })) : (_jsx(Button, { disabled: true, children: "PDF \u6B63\u5728\u751F\u6210" })) })) : (_jsx(Paragraph, { type: "secondary", style: { marginTop: 16 }, children: "\u751F\u6210\u4EFB\u610F\u4E00\u6B21\u7EC3\u4E60\u540E\uFF0C\u5C06\u5728\u6B64\u5C55\u793A\u6700\u65B0\u7EC3\u4E60\u7684\u72B6\u6001\u4E0E\u4E0B\u8F7D\u5165\u53E3\u3002" }))] }), _jsx(PageLayout, { title: "\u7EC3\u4E60\u8DDF\u8FDB\u6E05\u5355", description: "\u8FFD\u8E2A\u7EC3\u4E60\u6D3E\u9001\u4E0E\u5B8C\u6210\u60C5\u51B5\uFF0C\u53EF\u4E00\u952E\u6807\u8BB0\u72B6\u6001\u5E76\u4E0B\u8F7D PDF\u3002", children: _jsx(List, { bordered: false, split: false, className: "assignment-list", dataSource: assignments, locale: { emptyText: "暂无练习任务" }, renderItem: (item) => (_jsx(List.Item, { actions: [
                            _jsx(Button, { type: "link", onClick: () => handleComplete(item.id, item.status !== "completed"), children: item.status === "completed" ? "标记为未完成" : "标记为已完成" }, "toggle"),
                            item.generated_pdf_path ? (_jsx(Button, { type: "link", href: `/api/practice/${item.id}/pdf`, target: "_blank", children: "\u67E5\u770B PDF" }, "pdf")) : null,
                        ], children: _jsx(List.Item.Meta, { title: `练习编号：${item.id}`, description: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsxs(Text, { children: ["\u5B89\u6392\u65E5\u671F\uFF1A", item.scheduled_for] }), _jsxs(Text, { type: "secondary", children: ["\u72B6\u6001\uFF1A", item.status, " \u00B7 \u9898\u91CF\uFF1A", item.items?.length ?? 0] })] }) }) })) }) })] }));
};
export default MistakeCenter;
