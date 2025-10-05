import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useEffect, useState } from "react";
import { Button, DatePicker, Empty, Select, Space, Table, Tag, Typography } from "antd";
import { completePractice, fetchPracticeAssignments, fetchStudents, } from "../api/services";
import PageLayout from "../components/PageLayout";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
const { Paragraph, Title } = Typography;
const PracticeCenter = () => {
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState();
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const loadData = async (studentId) => {
        setLoading(true);
        try {
            const [studentList, assignmentList] = await Promise.all([
                students.length ? Promise.resolve(students) : fetchStudents(),
                fetchPracticeAssignments(studentId ? { student_id: studentId } : {}),
            ]);
            if (!students.length) {
                setStudents(studentList);
            }
            setAssignments(assignmentList);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void loadData();
    }, []);
    const handleStudentChange = async (studentId) => {
        setSelectedStudent(studentId);
        await loadData(studentId);
    };
    const filteredAssignments = assignments.filter((assignment) => {
        if (!dateRange[0] || !dateRange[1])
            return true;
        const scheduled = dayjs(assignment.scheduled_for);
        return scheduled.isSameOrAfter(dateRange[0], "day") && scheduled.isSameOrBefore(dateRange[1], "day");
    });
    const handleComplete = async (assignmentId, completed) => {
        await completePractice({ assignment_id: assignmentId, completed });
        await loadData(selectedStudent);
    };
    return (_jsx(Space, { direction: "vertical", size: 28, style: { width: "100%" }, children: _jsx(PageLayout, { title: "\u7EC3\u4E60\u6D3E\u9001\u6307\u6325\u53F0", description: "\u67E5\u770B\u6240\u6709\u5B66\u751F\u7684\u7EC3\u4E60\u63A8\u9001\u4E0E\u5B8C\u6210\u5EA6\uFF0C\u6309\u9700\u7B5B\u9009\u5B66\u751F\u4E0E\u65F6\u95F4\u8303\u56F4\u3002", extra: _jsxs(Space, { children: [_jsx(Select, { allowClear: true, placeholder: "\u6309\u5B66\u751F\u7B5B\u9009", value: selectedStudent, onChange: handleStudentChange, style: { width: 220 }, options: students.map((student) => ({ value: student.id, label: student.name })) }), _jsx(DatePicker.RangePicker, { value: dateRange, onChange: (values) => setDateRange(values) }), _jsx(Button, { onClick: () => void loadData(selectedStudent), children: "\u5237\u65B0" })] }), children: _jsx(Table, { loading: loading, rowKey: "id", dataSource: filteredAssignments, pagination: { pageSize: 8 }, locale: { emptyText: _jsx(Empty, { description: "\u6682\u65E0\u7EC3\u4E60\u4EFB\u52A1" }) }, columns: [
                    { title: "练习编号", dataIndex: "id", width: 100 },
                    { title: "学生", dataIndex: "student_id", width: 100 },
                    {
                        title: "安排日期",
                        dataIndex: "scheduled_for",
                        render: (value) => dayjs(value).format("YYYY-MM-DD"),
                    },
                    {
                        title: "状态",
                        dataIndex: "status",
                        render: (value) => (_jsx(Tag, { color: value === "completed" ? "green" : value === "assigned" ? "blue" : "volcano", children: value === "completed" ? "已完成" : value === "assigned" ? "待完成" : value })),
                    },
                    {
                        title: "题量",
                        dataIndex: "items",
                        render: (items) => items?.length ?? 0,
                    },
                    {
                        title: "操作",
                        dataIndex: "actions",
                        render: (_, record) => (_jsxs(Space, { children: [_jsx(Button, { type: "link", onClick: () => handleComplete(record.id, record.status !== "completed"), children: record.status === "completed" ? "标记为未完成" : "标记为已完成" }), record.generated_pdf_path && (_jsx(Button, { type: "link", href: `/api/practice/${record.id}/pdf`, target: "_blank", children: "\u4E0B\u8F7D PDF" }))] })),
                    },
                ] }) }) }));
};
export default PracticeCenter;
