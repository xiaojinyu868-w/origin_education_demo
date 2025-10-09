import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Card, Col, Empty, List, Row, Select, Space, Spin, Tag, Typography, Upload, message, } from "antd";
import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchStudents, uploadSubmission } from "../../api/services";
import { useWizardStore } from "../useWizardStore";
const { Title, Paragraph, Text } = Typography;
const StepStudentUpload = () => {
    const { state: { session, selectedExamId }, actions: { goToStep }, } = useWizardStore();
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(undefined);
    const [queue, setQueue] = useState([]);
    const loadStudents = useCallback(async () => {
        setStudentsLoading(true);
        try {
            const data = await fetchStudents();
            setStudents(data);
            if (!selectedStudentId && data.length > 0) {
                setSelectedStudentId(data[0].id);
            }
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "学生列表获取失败"));
            message.error(detail);
        }
        finally {
            setStudentsLoading(false);
        }
    }, [selectedStudentId]);
    useEffect(() => {
        void loadStudents();
    }, [loadStudents]);
    const selectedStudent = useMemo(() => students.find((item) => item.id === selectedStudentId), [students, selectedStudentId]);
    const handleUpload = async (file) => {
        if (!selectedExamId) {
            message.error("请选择试卷后再上传学生卷面");
            return Upload.LIST_IGNORE;
        }
        if (!selectedStudentId) {
            message.error("请选择学生后再上传");
            return Upload.LIST_IGNORE;
        }
        const queueId = `${Date.now()}-${file.uid}`;
        const newItem = {
            id: queueId,
            fileName: file.name,
            studentName: selectedStudent?.name ?? `学生 #${selectedStudentId}`,
            startedAt: new Date().toISOString(),
            status: "processing",
        };
        setQueue((prev) => [newItem, ...prev]);
        try {
            const formData = new FormData();
            formData.append("student_id", String(selectedStudentId));
            formData.append("exam_id", String(selectedExamId));
            formData.append("image", file);
            if (session?.id) {
                formData.append("session_id", String(session.id));
            }
            const result = await uploadSubmission(formData);
            setQueue((prev) => prev.map((item) => (item.id === queueId ? { ...item, status: "completed", result } : item)));
            message.success(`${file.name} 已加入批改队列`);
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "上传失败"));
            setQueue((prev) => prev.map((item) => (item.id === queueId ? { ...item, status: "error", error: detail } : item)));
            message.error(detail);
        }
        return Upload.LIST_IGNORE;
    };
    const uploadProps = {
        multiple: true,
        accept: "image/*",
        beforeUpload: handleUpload,
        showUploadList: false,
    };
    const completedCount = queue.filter((item) => item.status === "completed").length;
    const handleProceed = async () => {
        if (!selectedExamId)
            return;
        try {
            await goToStep(4, { examId: selectedExamId });
            message.success("学生卷面已上传，进入批改确认阶段");
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "无法进入下一步"));
            message.error(detail);
        }
    };
    if (!selectedExamId) {
        return (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5C1A\u672A\u9009\u62E9\u8BD5\u5377", description: "\u8BF7\u8FD4\u56DE\u8BD5\u5377\u914D\u7F6E\u9636\u6BB5\u9009\u62E9\u5DF2\u786E\u8BA4\u7B54\u6848\u7684\u8BD5\u5377\u3002" }));
    }
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "\u4E0A\u4F20\u5B66\u751F\u5377\u9762" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u652F\u6301\u62D6\u62FD\u6216\u6279\u91CF\u4E0A\u4F20\uFF0C\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u8BC6\u522B\u9898\u53F7\u5E76\u7ED9\u51FA\u7F6E\u4FE1\u5EA6\uFF1B\u82E5\u8BC6\u522B\u5EA6\u4F4E\uFF0C\u53EF\u5728\u4E0B\u4E00\u9636\u6BB5\u4EBA\u5DE5\u786E\u8BA4\u3002" })] }), _jsxs(Row, { gutter: 24, wrap: true, children: [_jsx(Col, { xs: 24, xl: 12, children: _jsx(Card, { title: "\u6279\u91CF\u4E0A\u4F20", bordered: false, style: { borderRadius: 18, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }, bodyStyle: { padding: 24 }, children: _jsxs(Space, { direction: "vertical", size: 20, style: { width: "100%" }, children: [_jsxs("div", { children: [_jsx(Text, { strong: true, style: { marginBottom: 8, display: "block" }, children: "\u9009\u62E9\u5B66\u751F" }), _jsx(Spin, { spinning: studentsLoading, indicator: _jsx(LoadingOutlined, { spin: true }), children: _jsx(Select, { showSearch: true, placeholder: "\u9009\u62E9\u5B66\u751F", optionFilterProp: "label", style: { width: "100%" }, value: selectedStudentId, options: students.map((student) => ({
                                                        label: `${student.name} · ${student.grade_level ?? "未分班"}`,
                                                        value: student.id,
                                                    })), onChange: (value) => setSelectedStudentId(value) }) })] }), _jsxs(Upload.Dragger, { ...uploadProps, disabled: studentsLoading, children: [_jsx("p", { className: "ant-upload-drag-icon", children: _jsx(InboxOutlined, {}) }), _jsx("p", { className: "ant-upload-text", children: "\u62D6\u62FD\u6216\u70B9\u51FB\u4E0A\u4F20\u5B66\u751F\u5377\u9762\u56FE\u7247" }), _jsx("p", { className: "ant-upload-hint", children: "\u652F\u6301 JPG/PNG\uFF0C\u5EFA\u8BAE\u4FDD\u6301\u6E05\u6670\u5EA6 > 300dpi" })] }), _jsx(Alert, { type: "info", showIcon: true, message: "\u63D0\u793A", description: "\u4E0A\u4F20\u540E\u7CFB\u7EDF\u4F1A\u7ACB\u5373\u8C03\u7528 AI \u6279\u6539\uFF0C\u5E76\u5C06\u7ED3\u679C\u8FDB\u5165\u961F\u5217\u3002\u60A8\u53EF\u4EE5\u5728\u53F3\u4FA7\u5B9E\u65F6\u67E5\u770B\u5904\u7406\u72B6\u6001\u3002" })] }) }) }), _jsx(Col, { xs: 24, xl: 12, children: _jsxs(Card, { title: "\u5904\u7406\u961F\u5217", bordered: false, style: { borderRadius: 18, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }, bodyStyle: { padding: 24 }, extra: _jsxs(Tag, { color: completedCount > 0 ? "green" : "orange", children: ["\u5DF2\u5B8C\u6210 ", completedCount] }), children: [queue.length === 0 ? (_jsx(Empty, { description: "\u961F\u5217\u4E3A\u7A7A\uFF0C\u7B49\u5F85\u4E0A\u4F20", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { dataSource: queue, renderItem: (item) => (_jsx(List.Item, { children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 10, wrap: true, children: [_jsx(Text, { strong: true, children: item.fileName }), _jsx(Tag, { color: "geekblue", children: item.studentName }), _jsx(Tag, { color: "gray", children: dayjs(item.startedAt).format("HH:mm:ss") }), item.status === "processing" && _jsx(Tag, { color: "blue", children: "\u5904\u7406\u4E2D" }), item.status === "completed" && _jsx(Tag, { color: "green", children: "\u5DF2\u5B8C\u6210" }), item.status === "error" && _jsx(Tag, { color: "red", children: "\u5931\u8D25" })] }), item.result?.matching_score !== undefined && (_jsxs(Text, { type: "secondary", children: ["\u5339\u914D\u5EA6\uFF1A", Math.round((item.result.matching_score ?? 0) * 100), "%"] })), item.error && _jsx(Text, { type: "danger", children: item.error })] }) }, item.id)) })), _jsx(Space, { style: { marginTop: 16 }, children: _jsx(Button, { type: "primary", disabled: completedCount === 0, onClick: handleProceed, children: "\u6240\u6709\u961F\u5217\u5B8C\u6210\uFF0C\u524D\u5F80AI\u6279\u6539\u786E\u8BA4" }) })] }) })] })] }));
};
export default StepStudentUpload;
