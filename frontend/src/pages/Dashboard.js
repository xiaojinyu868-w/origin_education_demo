import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ApartmentOutlined, BarChartOutlined, CloudUploadOutlined, ReadOutlined, RocketOutlined, ThunderboltOutlined, } from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Modal, Row, Space, Spin, Statistic, Typography, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAllData, fetchActiveGradingSession, fetchAnalytics, fetchClassrooms, fetchExams, fetchStudents, fetchSubmissions, fetchTeachers, refreshDemoData, } from "../api/services";
import QuickActionCard from "../components/QuickActionCard";
import PageLayout from "../components/PageLayout";
import { emitNavigation } from "../utils/navigation";
import useResponsive from "../hooks/useResponsive";
const { Title, Paragraph, Text } = Typography;
const quickActions = [
    {
        key: "upload",
        icon: _jsx(CloudUploadOutlined, { style: { fontSize: 22 } }),
        title: "上传试卷",
        description: "拖拽或拍照即可完成批改，错题自动归档。",
    },
    {
        key: "roster",
        icon: _jsx(ApartmentOutlined, { style: { fontSize: 22 } }),
        title: "搭建班级",
        description: "三步录入教师、班级、学生与试卷结构。",
    },
    {
        key: "mistake",
        icon: _jsx(ReadOutlined, { style: { fontSize: 22 } }),
        title: "查看错题",
        description: "电子错题本随时复盘，附带知识点标签。",
    },
    {
        key: "analytics",
        icon: _jsx(BarChartOutlined, { style: { fontSize: 22 } }),
        title: "洞察学情",
        description: "热力图掌握薄弱项，辅助下一堂课。",
    },
    {
        key: "assistant",
        icon: _jsx(ThunderboltOutlined, { style: { fontSize: 22 } }),
        title: "AI 教研助手",
        description: "一句话生成讲评提纲、作业建议与家校沟通话术。",
    },
];
const Dashboard = () => {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsive();
    const isCompact = isMobile || isTablet;
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState({
        teachers: 0,
        classrooms: 0,
        students: 0,
        exams: 0,
        submissions: 0,
    });
    const [analytics, setAnalytics] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [teachers, classrooms, students, exams, submissionsList] = await Promise.all([
                fetchTeachers(),
                fetchClassrooms(),
                fetchStudents(),
                fetchExams(),
                fetchSubmissions(),
            ]);
            setOverview({
                teachers: teachers.length,
                classrooms: classrooms.length,
                students: students.length,
                exams: exams.length,
                submissions: submissionsList.length,
            });
            setSubmissions(submissionsList.slice(0, 6));
            const analyticsData = await fetchAnalytics({});
            setAnalytics(analyticsData);
            const firstTeacherId = teachers[0]?.id;
            if (firstTeacherId) {
                const session = await fetchActiveGradingSession(firstTeacherId).catch(() => null);
                setActiveSession(session);
            }
            else {
                setActiveSession(null);
            }
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadData();
    }, [loadData]);
    const runMaintenance = useCallback(async (operation, successMessage) => {
        setLoading(true);
        try {
            await operation();
            message.success(successMessage);
        }
        catch (error) {
            const description = error instanceof Error ? error.message : "操作失败，请稍后重试";
            message.error(description);
            throw error;
        }
        finally {
            await loadData();
        }
    }, [loadData]);
    const handleRefreshDemo = useCallback(() => {
        Modal.confirm({
            title: "重新生成演示数据",
            content: "系统会清空当前数据并写入全新的演示样例，确定要继续吗？",
            okText: "重新生成",
            cancelText: "取消",
            onOk: () => runMaintenance(refreshDemoData, "演示数据已重新生成"),
        });
    }, [runMaintenance]);
    const handleClearData = useCallback(() => {
        Modal.confirm({
            title: "清空全部数据",
            content: "该操作会删除所有教师、学生、考试与提交记录，且无法恢复。是否确认？",
            okText: "立即清空",
            okType: "danger",
            cancelText: "取消",
            onOk: () => runMaintenance(clearAllData, "所有数据已清空"),
        });
    }, [runMaintenance]);
    const timeline = useMemo(() => {
        if (!submissions.length) {
            return (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\u6682\u65E0\u6279\u6539\u8BB0\u5F55\uFF0C\u7ACB\u5373\u4E0A\u4F20\u7B2C\u4E00\u4EFD\u8BD5\u5377\u5427\uFF01" }));
        }
        return submissions.map((submission) => (_jsx(Card, { bordered: false, children: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, size: 4, children: [_jsxs(Text, { strong: true, children: ["\u5B66\u751F ID\uFF1A", submission.student_id] }), _jsxs(Text, { type: "secondary", children: ["\u8BD5\u5377 ID\uFF1A", submission.exam_id] }), _jsxs(Text, { type: "secondary", children: ["\u63D0\u4EA4\u65F6\u95F4\uFF1A", dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm")] }), _jsxs(Text, { type: "secondary", children: ["\u72B6\u6001\uFF1A", submission.status === "graded" ? "已完成" : "待人工确认"] })] }) }, submission.id)));
    }, [submissions]);
    return (_jsx(Spin, { spinning: loading, tip: "\u6B63\u5728\u52A0\u8F7D\u6700\u65B0\u5B66\u60C5\u6570\u636E\u2026", children: _jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: isCompact ? 24 : 28 }, children: _jsxs(Space, { direction: "vertical", size: isCompact ? 20 : 16, style: { width: "100%" }, children: [_jsxs(Space, { direction: isCompact ? "vertical" : "horizontal", align: "start", style: { justifyContent: "space-between", width: "100%" }, size: isCompact ? 16 : 24, children: [_jsxs(Space, { direction: "vertical", size: 14, style: { flex: 1, maxWidth: isCompact ? "100%" : 620 }, children: [_jsx(Title, { level: isCompact ? 4 : 3, style: { marginBottom: 0 }, children: "\u6B22\u8FCE\u56DE\u6765\uFF0C\u8BA9\u6559\u5B66\u5DE5\u4F5C\u59CB\u7EC8\u9886\u5148\u4E00\u6B65" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u4ECE\u4E0A\u4F20\u8BD5\u5377\u5230\u5BFC\u51FA\u62A5\u544A\uFF0C\u7CFB\u7EDF\u5C06\u5F15\u5BFC\u60A8\u5B8C\u6210\u6574\u4E2A\u6279\u6539\u95ED\u73AF\u3002" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5373\u53EF\u5524\u8D77\u6C89\u6D78\u5F0F\u6279\u6539\u5411\u5BFC\uFF0C\u968F\u65F6\u4E2D\u65AD\u4EA6\u80FD\u81EA\u52A8\u7EED\u822A\u3002" }), _jsxs(Space, { wrap: true, size: 12, style: { width: isCompact ? "100%" : "auto" }, children: [_jsx(Button, { block: isCompact, type: "primary", size: isCompact ? "middle" : "large", shape: "round", icon: _jsx(RocketOutlined, { style: { marginRight: 6 } }), onClick: () => navigate("/grading/wizard?step=1"), children: "\u5F00\u59CB\u65B0\u4E00\u8F6E\u6279\u6539" }), _jsx(Button, { block: isCompact, size: isCompact ? "middle" : "large", shape: "round", onClick: () => emitNavigation("upload"), children: "\u67E5\u770B\u4E0A\u4F20\u4E2D\u5FC3" })] }), activeSession && activeSession.status === "active" && (_jsx(Alert, { className: "shadow-panel", showIcon: true, type: "info", message: "\u68C0\u6D4B\u5230\u672A\u5B8C\u6210\u7684\u6279\u6539\u6D41\u7A0B", description: `当前停留在第 ${activeSession.current_step} 步，可随时继续。`, action: _jsx(Button, { type: "primary", size: "small", onClick: () => navigate(`/grading/wizard?step=${Math.max(1, Math.min(5, activeSession.current_step ?? 1))}`), children: "\u7EE7\u7EED\u6279\u6539" }) }))] }), _jsxs(Space, { wrap: true, size: isCompact ? 12 : 16, style: { width: isCompact ? "100%" : "auto", justifyContent: isCompact ? "flex-start" : "flex-end" }, children: [_jsx(Button, { block: isCompact, onClick: () => loadData(), disabled: loading, children: "\u5237\u65B0\u6570\u636E" }), _jsx(Button, { block: isCompact, type: "primary", onClick: handleRefreshDemo, disabled: loading, children: "\u91CD\u65B0\u751F\u6210\u6F14\u793A\u6570\u636E" }), _jsx(Button, { block: isCompact, danger: true, onClick: handleClearData, disabled: loading, children: "\u6E05\u7A7A\u5168\u90E8\u6570\u636E" })] })] }), _jsx("div", { className: "stats-grid", children: [
                                    { title: "在岗教师", value: overview.teachers, suffix: "人" },
                                    { title: "教学班级", value: overview.classrooms, suffix: "个" },
                                    { title: "参与学生", value: overview.students, suffix: "人" },
                                    { title: "已批改试卷", value: overview.submissions, suffix: "份" },
                                ].map((item) => (_jsx(Card, { className: "shadow-panel", bordered: false, children: _jsx(Statistic, { title: item.title, value: item.value, suffix: item.suffix }) }, item.title))) })] }) }), _jsx("div", { className: `quick-actions-grid ${isCompact ? "quick-actions-grid--compact" : ""}`, children: quickActions.map((action) => (_jsx(QuickActionCard, { icon: action.icon, title: action.title, description: action.description, onClick: () => emitNavigation(action.key) }, action.key))) }), _jsxs(Row, { gutter: [24, 24], align: "stretch", children: [_jsx(Col, { xs: 24, xl: 14, children: _jsx(PageLayout, { title: "\u6700\u65B0\u6279\u6539\u52A8\u6001", description: "\u6BCF\u4E00\u6B21\u4E0A\u4F20\u90FD\u4F1A\u5F62\u6210\u65F6\u95F4\u7EBF\uFF0C\u65B9\u4FBF\u56DE\u770B\u6279\u6539\u7ED3\u679C\u3002", extra: _jsx(Button, { type: "text", onClick: () => emitNavigation("upload"), children: "\u53BB\u4E0A\u4F20" }), children: _jsx(Space, { direction: "vertical", style: { width: "100%" }, size: 16, children: timeline }) }) }), _jsx(Col, { xs: 24, xl: 10, children: _jsx(PageLayout, { title: "\u73ED\u7EA7\u5065\u5EB7\u6307\u6570", description: "\u4E86\u89E3\u73ED\u7EA7\u6574\u4F53\u638C\u63E1\u60C5\u51B5\uFF0C\u8FC5\u901F\u5B9A\u4F4D\u9700\u8981\u5F3A\u5316\u7684\u77E5\u8BC6\u70B9\u3002", extra: analytics && (_jsxs(Space, { size: 18, children: [_jsx(Statistic, { title: "\u8986\u76D6\u5B66\u751F", value: analytics.total_students, suffix: "\u4EBA" }), _jsx(Statistic, { title: "\u5E73\u5747\u5F97\u5206", value: analytics.average_score, precision: 1, suffix: "\u5206" })] })), children: _jsx(Space, { direction: "vertical", style: { width: "100%" }, size: 12, children: analytics?.knowledge_breakdown.map((item) => (_jsx(Card, { bordered: false, size: "small", children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsx(Text, { strong: true, children: item.knowledge_tag }), _jsxs(Text, { type: "secondary", children: ["\u6B63\u786E\u7387\uFF1A", Math.round(item.accuracy * 100), "%"] }), _jsxs(Text, { type: "secondary", children: ["\u5E73\u5747\u5F97\u5206\uFF1A", item.average_score] })] }) }, item.knowledge_tag))) ?? _jsx(Paragraph, { type: "secondary", children: "\u6682\u65E0\u77E5\u8BC6\u70B9\u6570\u636E\uFF0C\u7B49\u5F85\u7B2C\u4E00\u4EFD\u6279\u6539\u3002" }) }) }) })] })] }) }));
};
export default Dashboard;
