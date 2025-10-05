import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FileSearchOutlined, InboxOutlined, } from "@ant-design/icons";
import { Alert, Button, Card, Empty, Form, Select, Space, Typography, Upload, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import SubmissionResultDrawer from "../components/SubmissionResultDrawer";
import { fetchExams, fetchStudents, fetchSubmissions, uploadSubmission, } from "../api/services";
const { Paragraph, Title, Text } = Typography;
const UploadCenter = () => {
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const loadData = async () => {
        const [studentList, examList, submissionList] = await Promise.all([
            fetchStudents(),
            fetchExams(),
            fetchSubmissions(),
        ]);
        setStudents(studentList);
        setExams(examList);
        setSubmissions(submissionList.slice(0, 10));
    };
    useEffect(() => {
        void loadData();
    }, []);
    const handleUpload = async (values) => {
        if (!selectedFile) {
            message.warning("请先选择试卷图片");
            return;
        }
        const formData = new FormData();
        formData.append("student_id", String(values.student_id));
        formData.append("exam_id", String(values.exam_id));
        formData.append("image", selectedFile);
        setLoading(true);
        try {
            const uploadResult = await uploadSubmission(formData);
            setResult(uploadResult);
            setDrawerOpen(true);
            message.success("上传成功，自动批改已完成");
            await loadData();
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(Space, { direction: "vertical", size: 28, style: { width: "100%" }, children: [_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 28 }, children: _jsxs(Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [_jsx(Title, { level: 3, style: { marginBottom: 0 }, children: "\u62CD\u7167\u3001\u62D6\u62FD\u3001\u4E0A\u4F20 \u2014\u2014 \u6279\u6539\u4E0D\u518D\u7B49\u5F85" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u652F\u6301 JPG\u3001PNG\u3001PDF \u7B49\u683C\u5F0F\uFF0C\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u8BC6\u522B\u9898\u53F7\u3001\u7B54\u6848\u4EE5\u53CA\u7EA2\u7B14\u6279\u6CE8\uFF0C\u5B9E\u73B0\u65E0\u7EB8\u5316\u6279\u6539\u3002" })] }) }), _jsxs(PageLayout, { title: "\u4E0A\u4F20\u8BD5\u5377", description: "\u9009\u62E9\u5B66\u751F\u4E0E\u5BF9\u5E94\u8BD5\u5377\u540E\uFF0C\u62D6\u5165\u7167\u7247\u6216\u626B\u63CF\u4EF6\u5373\u53EF\u5F00\u59CB\u6279\u6539\u3002", extra: _jsx(Button, { icon: _jsx(FileSearchOutlined, {}), onClick: () => setDrawerOpen(true), children: "\u67E5\u770B\u4E0A\u4E00\u4EFD\u7ED3\u679C" }), children: [_jsx(Alert, { type: "info", showIcon: true, message: "\u62CD\u6444\u5EFA\u8BAE", description: "\u8BF7\u786E\u4FDD\u9898\u53F7\u6E05\u6670\u3001\u6BCF\u9898\u72EC\u5360\u4E00\u884C\uFF1B\u4E3B\u89C2\u9898\u6279\u6CE8\u5EFA\u8BAE\u4F7F\u7528\u7EA2\u8272\u7B14\u8FF9\uFF0C\u4EE5\u63D0\u5347\u8BC6\u522B\u7387\u3002", style: { marginBottom: 20 } }), _jsxs(Form, { layout: "vertical", onFinish: handleUpload, disabled: loading, children: [_jsx(Form.Item, { name: "student_id", label: "\u9009\u62E9\u5B66\u751F", rules: [{ required: true, message: "请选择学生" }], children: _jsx(Select, { placeholder: "\u8BF7\u9009\u62E9\u5B66\u751F", options: students.map((student) => ({ value: student.id, label: student.name })) }) }), _jsx(Form.Item, { name: "exam_id", label: "\u9009\u62E9\u8BD5\u5377", rules: [{ required: true, message: "请选择试卷" }], children: _jsx(Select, { placeholder: "\u8BF7\u9009\u62E9\u8BD5\u5377", options: exams.map((exam) => ({ value: exam.id, label: `${exam.title} · ${exam.subject || "未分类"}` })) }) }), _jsx(Form.Item, { label: "\u4E0A\u4F20\u6587\u4EF6", required: true, children: _jsxs(Upload.Dragger, { multiple: false, maxCount: 1, accept: ".jpg,.jpeg,.png,.pdf", beforeUpload: (file) => {
                                        setSelectedFile(file);
                                        return false;
                                    }, onRemove: () => setSelectedFile(null), children: [_jsx("p", { className: "ant-upload-drag-icon", children: _jsx(InboxOutlined, {}) }), _jsx("p", { className: "ant-upload-text", children: "\u62D6\u62FD\u6216\u70B9\u51FB\u4E0A\u4F20" }), _jsx("p", { className: "ant-upload-hint", children: "\u5355\u4E2A\u6587\u4EF6\u5EFA\u8BAE\u5C0F\u4E8E 10MB\uFF0C\u8D8A\u6E05\u6670\u8BC6\u522B\u8D8A\u51C6\u786E" })] }) }), _jsx(Form.Item, { children: _jsxs(Space, { children: [_jsx(Button, { type: "default", icon: _jsx(FileSearchOutlined, {}), onClick: () => setDrawerOpen(true), children: "\u6253\u5F00\u6700\u65B0\u6279\u6539" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: loading, children: "\u5F00\u59CB\u4E0A\u4F20\u5E76\u6279\u6539" })] }) })] })] }), _jsx(PageLayout, { title: "\u6700\u8FD1\u4E0A\u4F20\u8BB0\u5F55", description: "\u7CFB\u7EDF\u4FDD\u7559\u6700\u8FD1 10 \u4EFD\u6279\u6539\u8BB0\u5F55\uFF0C\u65B9\u4FBF\u5FEB\u901F\u56DE\u770B\u3002", children: submissions.length === 0 ? (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\u8FD8\u6CA1\u6709\u6279\u6539\u8BB0\u5F55\uFF0C\u9A6C\u4E0A\u4E0A\u4F20\u7B2C\u4E00\u4EFD\u8BD5\u5377\u5427\uFF01" })) : (_jsx(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: submissions.map((submission) => (_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 16 }, children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsxs(Space, { style: { justifyContent: "space-between", width: "100%" }, children: [_jsx(Text, { strong: true, children: `学生 ${submission.student_id}` }), _jsxs(Text, { type: "secondary", children: ["\u8BD5\u5377 ID \u00B7 ", submission.exam_id] })] }), _jsxs(Text, { type: "secondary", children: ["\u63D0\u4EA4\u65F6\u95F4\uFF1A", dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm")] }), _jsxs(Text, { type: "secondary", children: ["\u6279\u6539\u72B6\u6001\uFF1A", submission.status === "graded" ? "已完成" : "待人工确认"] })] }) }, submission.id))) })) }), _jsx(SubmissionResultDrawer, { open: drawerOpen, onClose: () => setDrawerOpen(false), result: result })] }));
};
export default UploadCenter;
