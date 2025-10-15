import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Badge, Button, Card, Descriptions, Drawer, Empty, Form, List, Select, Space, Spin, Tag, Typography, message, } from "antd";
import { CloudUploadOutlined, FileSearchOutlined, HistoryOutlined, ReloadOutlined, } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchActiveGradingSession, fetchExams, fetchStudents, fetchSubmission, fetchSubmissionHistory, fetchSubmissionLogs, } from "../api/services";
import PageLayout from "../components/PageLayout";
import useResponsive from "../hooks/useResponsive";
const { Title, Paragraph, Text } = Typography;
const HISTORY_LIMIT = 20;
const STATUS_OPTIONS = [
    { label: "全部状态", value: undefined },
    { label: "待处理", value: "pending" },
    { label: "待人工确认", value: "needs_review" },
    { label: "已完成", value: "graded" },
];
const statusDisplay = (raw) => {
    const value = (raw ?? "").toLowerCase();
    if (value.includes("needs"))
        return "待人工确认";
    if (value.includes("pending"))
        return "待处理";
    if (value.includes("graded"))
        return "已完成";
    return value || "--";
};
const pickWizardStep = (submission) => {
    const status = (submission.status ?? "").toLowerCase();
    if (status.includes("needs") || submission.responses.some((item) => item.review_status === "needs_review")) {
        return 4;
    }
    if (status.includes("pending")) {
        return 3;
    }
    return 5;
};
const resolveStatusColor = (status) => {
    const value = (status ?? "").toLowerCase();
    if (value === "error")
        return "red";
    if (value === "warning")
        return "orange";
    if (value === "success")
        return "green";
    return "blue";
};
const resolveStepColor = (status) => resolveStatusColor(status);
const resolveLogColor = (log) => {
    const metadataStatus = typeof log.metadata?.status === "string" ? log.metadata?.status : undefined;
    const base = resolveStatusColor(metadataStatus);
    if (base === "blue") {
        if (log.actor_type === "assistant")
            return "geekblue";
        if (log.actor_type === "teacher")
            return "purple";
    }
    return base;
};
const translateActorType = (actorType) => {
    if (actorType === "teacher")
        return "教师";
    if (actorType === "assistant")
        return "AI";
    return "系统";
};
const UploadCenter = () => {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsive();
    const isCompact = isMobile || isTablet;
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [filters, setFilters] = useState({});
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [sessionLoading, setSessionLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailSubmission, setDetailSubmission] = useState(null);
    const [detailLogs, setDetailLogs] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const loadMetadata = useCallback(async () => {
        try {
            const [examList, studentList] = await Promise.all([fetchExams(), fetchStudents()]);
            setExams(examList);
            setStudents(studentList);
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "基础数据加载失败"));
            message.error(detail);
        }
    }, []);
    const ensureActiveSession = useCallback(async () => {
        const teacherId = exams.find((exam) => exam.teacher_id)?.teacher_id;
        if (!teacherId) {
            setActiveSession(null);
            return;
        }
        try {
            setSessionLoading(true);
            const session = await fetchActiveGradingSession(teacherId).catch(() => null);
            setActiveSession(session);
        }
        finally {
            setSessionLoading(false);
        }
    }, [exams]);
    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const data = await fetchSubmissionHistory({
                exam_id: filters.examId,
                student_id: filters.studentId,
                status: filters.status,
                limit: HISTORY_LIMIT,
            });
            setHistory(data);
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "历史记录获取失败"));
            message.error(detail);
        }
        finally {
            setHistoryLoading(false);
        }
    }, [filters.examId, filters.studentId, filters.status]);
    const openSubmissionDetail = useCallback(async (submissionId) => {
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const [submission, logList] = await Promise.all([
                fetchSubmission(submissionId),
                fetchSubmissionLogs(submissionId).catch(() => ({ items: [] })),
            ]);
            setDetailSubmission(submission);
            setDetailLogs(logList.items ?? []);
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "提交详情加载失败"));
            message.error(detail);
        }
        finally {
            setDetailLoading(false);
        }
    }, []);
    const closeDetail = () => {
        setDetailOpen(false);
        setDetailSubmission(null);
        setDetailLogs([]);
    };
    useEffect(() => {
        void loadMetadata();
    }, [loadMetadata]);
    useEffect(() => {
        void ensureActiveSession();
    }, [ensureActiveSession]);
    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);
    const examOptions = useMemo(() => {
        const base = [{ value: undefined, label: "全部试卷" }];
        return base.concat(exams.map((exam) => ({ value: exam.id, label: exam.title })));
    }, [exams]);
    const studentOptions = useMemo(() => {
        const base = [{ value: undefined, label: "全部学生" }];
        return base.concat(students.map((student) => ({ value: student.id, label: student.name })));
    }, [students]);
    const navigateToWizard = (step, submissionId) => {
        const safeStep = Math.min(5, Math.max(1, step));
        const query = submissionId ? `?step=${safeStep}&resume=${submissionId}` : `?step=${safeStep}`;
        navigate(`/grading/wizard${query}`);
    };
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsx(Card, { bordered: false, style: { borderRadius: 22, padding: 0, overflow: "hidden" }, bodyStyle: { padding: 0 }, children: _jsxs("div", { style: {
                        display: "flex",
                        flexDirection: isCompact ? "column" : "row",
                        gap: isCompact ? 24 : 32,
                        justifyContent: "space-between",
                        alignItems: isCompact ? "flex-start" : "center",
                        padding: isCompact ? "28px 24px" : "36px 40px",
                        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
                    }, children: [_jsxs(Space, { direction: "vertical", size: 12, style: { maxWidth: isCompact ? "100%" : 640 }, children: [_jsx(Title, { level: isCompact ? 4 : 3, style: { margin: 0 }, children: "\u4E0A\u4F20\u6279\u6539\u4E2D\u5FC3" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u5C06\u4E0A\u4F20\u3001\u590D\u6838\u3001\u5BFC\u51FA\u62C6\u89E3\u4E3A\u4E94\u4E2A\u6B65\u9AA4\uFF0C\u4FDD\u8BC1\u6BCF\u4E00\u6B21\u6279\u6539\u90FD\u6709\u8FF9\u53EF\u5FAA\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5373\u53EF\u56DE\u5230\u6C89\u6D78\u5F0F\u6279\u6539\u5411\u5BFC\u3002" }), _jsxs(Space, { size: 12, wrap: true, style: { width: isCompact ? "100%" : "auto" }, children: [_jsx(Button, { block: isCompact, type: "primary", size: isCompact ? "middle" : "large", shape: "round", icon: _jsx(CloudUploadOutlined, {}), onClick: () => navigate(`/grading/wizard?step=1`), children: "\u5F00\u59CB\u65B0\u4E00\u8F6E\u6279\u6539" }), _jsx(Button, { block: isCompact, size: isCompact ? "middle" : "large", shape: "round", icon: _jsx(FileSearchOutlined, {}), onClick: () => loadHistory(), loading: historyLoading, children: "\u5237\u65B0\u5386\u53F2\u8BB0\u5F55" })] }), sessionLoading ? (_jsx(Spin, { size: "small", "aria-live": "polite" })) : (activeSession && activeSession.status === "active" && (_jsx(Alert, { showIcon: true, type: "info", message: "\u68C0\u6D4B\u5230\u672A\u5B8C\u6210\u7684\u6279\u6539\u6D41\u7A0B", description: `当前停留在第 ${activeSession.current_step} 步，可随时继续。`, action: _jsx(Button, { type: "primary", size: "small", onClick: () => navigateToWizard(activeSession.current_step ?? 1), children: "\u7EE7\u7EED\u6279\u6539" }) })))] }), _jsxs(Card, { bordered: false, style: {
                                borderRadius: 20,
                                width: isCompact ? "100%" : 280,
                                background: "rgba(37, 99, 235, 0.08)",
                                border: "1px solid rgba(37, 99, 235, 0.16)",
                                boxShadow: "0 18px 42px rgba(37, 99, 235, 0.15)",
                            }, bodyStyle: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsxs(Space, { align: "center", size: 10, children: [_jsx(HistoryOutlined, { style: { fontSize: 20, color: "#1d4ed8" } }), _jsx(Text, { strong: true, style: { fontSize: 18 }, children: "\u5411\u5BFC\u5168\u5C40\u8FDB\u5EA6" })] }), _jsx(Text, { type: "secondary", children: "\u652F\u6301\u968F\u65F6\u9000\u51FA\u5E76\u6062\u590D\u4E0A\u4E0B\u6587\uFF0C\u672A\u5B8C\u6210\u4EFB\u52A1\u4F1A\u5728\u9996\u9875\u63D0\u9192\u7EE7\u7EED\u5B8C\u6210\u3002" }), _jsx(Tag, { color: "blue", style: { alignSelf: "flex-start" }, children: "\u652F\u6301\u65AD\u70B9\u7EED\u529E" })] })] }) }), _jsx(Card, { bordered: false, style: { borderRadius: 20 }, children: _jsxs(Form, { layout: isCompact ? "vertical" : "inline", style: { rowGap: 12, width: "100%" }, children: [_jsx(Form.Item, { label: "\u8BD5\u5377", style: { width: isCompact ? "100%" : "auto" }, children: _jsx(Select, { style: { width: isCompact ? "100%" : 200 }, value: filters.examId, options: examOptions, onChange: (value) => setFilters((prev) => ({ ...prev, examId: value })) }) }), _jsx(Form.Item, { label: "\u5B66\u751F", style: { width: isCompact ? "100%" : "auto" }, children: _jsx(Select, { style: { width: isCompact ? "100%" : 200 }, value: filters.studentId, showSearch: true, options: studentOptions, onChange: (value) => setFilters((prev) => ({ ...prev, studentId: value })) }) }), _jsx(Form.Item, { label: "\u72B6\u6001", style: { width: isCompact ? "100%" : "auto" }, children: _jsx(Select, { style: { width: isCompact ? "100%" : 160 }, value: filters.status, options: STATUS_OPTIONS, onChange: (value) => setFilters((prev) => ({ ...prev, status: value })) }) }), _jsx(Form.Item, { style: { width: isCompact ? "100%" : "auto" }, children: _jsxs(Space, { style: { width: isCompact ? "100%" : "auto" }, wrap: isCompact, children: [_jsx(Button, { block: isCompact, type: "primary", icon: _jsx(FileSearchOutlined, {}), onClick: () => loadHistory(), loading: historyLoading, children: "\u67E5\u8BE2" }), _jsx(Button, { block: isCompact, icon: _jsx(ReloadOutlined, {}), onClick: () => {
                                            setFilters({});
                                        }, children: "\u91CD\u7F6E" })] }) })] }) }), _jsx(PageLayout, { title: "\u6279\u6539\u5386\u53F2\u56DE\u653E", description: "\u6700\u8FD1\u7684\u6279\u6539\u8BB0\u5F55\u4F1A\u6C89\u6DC0\u5728\u6B64\u5904\uFF0C\u53EF\u5FEB\u901F\u67E5\u770B\u8BE6\u60C5\u6216\u7EE7\u7EED\u8865\u6279\u3002", children: _jsx(Spin, { spinning: historyLoading, tip: "\u52A0\u8F7D\u5386\u53F2\u8BB0\u5F55...", "aria-live": "polite", children: history.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u5386\u53F2\u8BB0\u5F55\uFF0C\u7ACB\u5373\u53D1\u8D77\u7B2C\u4E00\u8F6E\u6279\u6539\u5427\uFF01", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { className: "history-list", itemLayout: "vertical", dataSource: history, renderItem: (entry) => {
                            const { submission, student, exam, processing_steps: steps, matching_score } = entry;
                            return (_jsx(List.Item, { actions: [
                                    _jsx(Button, { type: "link", onClick: () => openSubmissionDetail(submission.id), children: "\u67E5\u770B\u8BE6\u60C5" }, "detail"),
                                    _jsx(Button, { type: "link", onClick: () => navigateToWizard(pickWizardStep(submission), submission.id), children: "\u7EE7\u7EED\u5904\u7406" }, "resume"),
                                ], children: _jsxs(Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 12, wrap: true, children: [_jsxs(Text, { strong: true, style: { fontSize: 16 }, children: [student.name, " \u7684 ", exam?.title ?? `试卷 #${submission.exam_id}`] }), _jsx(Tag, { color: submission.status === "graded" ? "green" : "orange", children: statusDisplay(submission.status) }), typeof matching_score === "number" && (_jsxs(Tag, { color: "blue", children: ["\u5339\u914D\u5EA6 ", Math.round(matching_score * 100), "%"] })), submission.overall_confidence !== null && submission.overall_confidence !== undefined && (_jsxs(Tag, { color: "geekblue", children: ["\u7F6E\u4FE1\u5EA6 ", Math.round((submission.overall_confidence ?? 0) * 100), "%"] }))] }), _jsxs(Text, { type: "secondary", children: ["\u4E0A\u4F20\u65F6\u95F4\uFF1A", dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm")] }), _jsx(Space, { size: 8, wrap: true, children: steps.slice(0, 4).map((step, index) => (_jsx(Tag, { color: resolveStepColor(step.status), style: { marginBottom: 4 }, children: step.name }, `${submission.id}-${index}`))) })] }) }, submission.id));
                        } })) }) }), _jsx(Drawer, { title: "\u63D0\u4EA4\u8BE6\u60C5", width: isCompact ? "100%" : 520, open: detailOpen, onClose: closeDetail, destroyOnClose: true, children: detailLoading || !detailSubmission ? (_jsx("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", height: 240 }, children: _jsx(Spin, {}) })) : (_jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsxs(Descriptions, { column: 1, bordered: true, size: "small", children: [_jsx(Descriptions.Item, { label: "\u5B66\u751F", children: detailSubmission.student_id }), _jsx(Descriptions.Item, { label: "\u8BD5\u5377", children: detailSubmission.exam_id }), _jsx(Descriptions.Item, { label: "\u72B6\u6001", children: statusDisplay(detailSubmission.status) }), _jsx(Descriptions.Item, { label: "\u603B\u5206", children: detailSubmission.total_score ?? "--" }), _jsx(Descriptions.Item, { label: "\u63D0\u4EA4\u65F6\u95F4", children: dayjs(detailSubmission.submitted_at).format("YYYY-MM-DD HH:mm") })] }), _jsx(Alert, { type: "info", showIcon: true, message: "\u5FEB\u901F\u64CD\u4F5C", description: _jsxs(Space, { children: [_jsx(Button, { type: "primary", onClick: () => navigateToWizard(pickWizardStep(detailSubmission), detailSubmission.id), children: "\u524D\u5F80\u5411\u5BFC" }), _jsx(Button, { onClick: () => navigate(`/grading/wizard?step=4`), children: "\u6253\u5F00\u590D\u6838\u754C\u9762" })] }) }), _jsx(Card, { title: "\u5904\u7406\u65E5\u5FD7", size: "small", children: detailLogs.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u65E5\u5FD7", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { size: "small", dataSource: detailLogs, renderItem: (log) => (_jsx(List.Item, { children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, children: [_jsx(Badge, { color: resolveLogColor(log), text: log.step }), _jsx(Tag, { bordered: false, children: translateActorType(log.actor_type) }), _jsx(Text, { type: "secondary", children: dayjs(log.created_at).format("MM-DD HH:mm") })] }), log.detail && _jsx(Text, { children: log.detail })] }) }, log.id)) })) })] })) })] }));
};
export default UploadCenter;
