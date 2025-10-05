import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ApartmentOutlined, BarChartOutlined, CloudUploadOutlined, HeartOutlined, ReadOutlined, RocketOutlined, } from "@ant-design/icons";
import { Badge, Button, Card, Col, Empty, Row, Space, Spin, Statistic, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { bootstrapDemo, fetchAnalytics, fetchClassrooms, fetchExams, fetchStudents, fetchSubmissions, fetchTeachers, } from "../api/services";
import QuickActionCard from "../components/QuickActionCard";
import PageLayout from "../components/PageLayout";
import { emitNavigation } from "../utils/navigation";
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
];
const Dashboard = () => {
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
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadData();
    }, [loadData]);
    const handleBootstrap = async () => {
        setLoading(true);
        try {
            await bootstrapDemo();
        }
        finally {
            await loadData();
        }
    };
    const timeline = useMemo(() => {
        if (!submissions.length) {
            return (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\u6682\u65E0\u6279\u6539\u8BB0\u5F55\uFF0C\u7ACB\u5373\u4E0A\u4F20\u7B2C\u4E00\u4EFD\u8BD5\u5377\u5427\uFF01" }));
        }
        return (_jsx(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: submissions.map((submission) => (_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 16 }, children: _jsxs(Space, { align: "center", size: 16, style: { width: "100%", justifyContent: "space-between" }, children: [_jsxs(Space, { align: "center", size: 14, children: [_jsx(Badge, { color: "#2563eb" }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: `学生 ${submission.student_id}` }), _jsx(Paragraph, { style: { marginBottom: 0 }, type: "secondary", children: dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm") })] })] }), _jsxs(Text, { type: "secondary", children: ["\u8BD5\u5377 ID \u00B7 ", submission.exam_id] })] }) }, submission.id))) }));
    }, [submissions]);
    const knowledgeSummary = useMemo(() => {
        if (!analytics || analytics.knowledge_breakdown.length === 0) {
            return (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\u6682\u65E0\u5B66\u60C5\u6570\u636E\uFF0C\u5F85\u5B66\u751F\u4E0A\u4F20\u8BD5\u5377\u540E\u5373\u53EF\u67E5\u770B\u3002" }));
        }
        return (_jsx(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: analytics.knowledge_breakdown.slice(0, 5).map((item) => (_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 18 }, children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsx(Text, { strong: true, children: item.knowledge_tag || "未标注知识点" }), _jsxs(Text, { type: "secondary", children: ["\u6B63\u786E\u7387 ", Math.round(item.accuracy * 100), "%\uFF0C\u5E73\u5747\u5F97\u5206 ", item.average_score] })] }) }, item.knowledge_tag))) }));
    }, [analytics]);
    return (_jsx(Spin, { spinning: loading, size: "large", children: _jsxs(Space, { direction: "vertical", size: 28, style: { width: "100%" }, children: [_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 28 }, children: _jsxs(Space, { align: "center", style: { width: "100%", justifyContent: "space-between" }, children: [_jsxs("div", { children: [_jsx(Title, { level: 3, style: { marginBottom: 8 }, children: "\u6B22\u8FCE\u56DE\u6765\uFF0C\u8BA9\u6559\u5B66\u5DE5\u4F5C\u59CB\u7EC8\u9886\u5148\u4E00\u6B65" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u81EA\u52A8\u6279\u6539\u3001\u9519\u9898\u8BCA\u65AD\u3001\u7EC3\u4E60\u6D3E\u9001\u4E0E\u5B66\u60C5\u6D1E\u5BDF\uFF0C\u90FD\u5728\u8FD9\u4E00\u5F20\u5DE5\u4F5C\u53F0\u91CC\u5B8C\u6210\u3002" })] }), _jsxs(Space, { children: [_jsx(Button, { onClick: () => loadData(), children: "\u5237\u65B0\u6570\u636E" }), _jsx(Button, { type: "primary", icon: _jsx(RocketOutlined, {}), onClick: handleBootstrap, children: "\u4E00\u952E\u751F\u6210\u6F14\u793A\u6570\u636E" })] })] }) }), _jsxs(Row, { gutter: [20, 20], children: [_jsx(Col, { xs: 24, sm: 12, xl: 6, children: _jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 24 }, children: _jsx(Statistic, { title: "\u5728\u5C97\u6559\u5E08", value: overview.teachers, suffix: "\u4EBA", valueStyle: { color: "#2563eb" } }) }) }), _jsx(Col, { xs: 24, sm: 12, xl: 6, children: _jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 24 }, children: _jsx(Statistic, { title: "\u6559\u5B66\u73ED\u7EA7", value: overview.classrooms, suffix: "\u4E2A", valueStyle: { color: "#1f2937" } }) }) }), _jsx(Col, { xs: 24, sm: 12, xl: 6, children: _jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 24 }, children: _jsx(Statistic, { title: "\u53C2\u4E0E\u5B66\u751F", value: overview.students, suffix: "\u4EBA", valueStyle: { color: "#16a34a" } }) }) }), _jsx(Col, { xs: 24, sm: 12, xl: 6, children: _jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 24 }, children: _jsx(Statistic, { title: "\u5DF2\u6279\u6539\u8BD5\u5377", value: overview.submissions, suffix: "\u4EFD", valueStyle: { color: "#f97316" } }) }) })] }), _jsx(Row, { gutter: [20, 20], children: quickActions.map((action) => (_jsx(Col, { xs: 24, md: 12, xl: 6, children: _jsx(QuickActionCard, { icon: action.icon, title: action.title, description: action.description, onClick: () => emitNavigation(action.key) }) }, action.key))) }), _jsxs(Row, { gutter: [20, 20], align: "stretch", children: [_jsx(Col, { xs: 24, xl: 14, children: _jsx(PageLayout, { title: "\u6700\u65B0\u6279\u6539\u52A8\u6001", description: "\u6BCF\u4E00\u6B21\u4E0A\u4F20\u90FD\u4F1A\u5F62\u6210\u65F6\u95F4\u7EBF\uFF0C\u65B9\u4FBF\u56DE\u770B\u6279\u6539\u7ED3\u679C\u3002", extra: _jsx(Button, { type: "text", onClick: () => emitNavigation("upload"), children: "\u53BB\u4E0A\u4F20" }), children: timeline }) }), _jsx(Col, { xs: 24, xl: 10, children: _jsx(PageLayout, { title: "\u73ED\u7EA7\u5065\u5EB7\u6307\u6570", description: "\u4E86\u89E3\u73ED\u7EA7\u6574\u4F53\u638C\u63E1\u60C5\u51B5\uFF0C\u8FC5\u901F\u5B9A\u4F4D\u9700\u8981\u5F3A\u5316\u7684\u77E5\u8BC6\u70B9\u3002", extra: analytics && (_jsxs(Space, { size: 18, children: [_jsx(Statistic, { title: "\u8986\u76D6\u5B66\u751F", value: analytics.total_students, suffix: "\u4EBA" }), _jsx(Statistic, { title: "\u5E73\u5747\u5F97\u5206", value: analytics.average_score, precision: 1, suffix: "\u5206" })] })), children: knowledgeSummary }) })] }), _jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 24 }, children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [_jsx(Title, { level: 4, style: { marginBottom: 0 }, children: "\u4E0A\u624B\u653B\u7565\uFF1A\u4E09\u6B65\u5B8C\u6210\u521D\u59CB\u90E8\u7F72" }), _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, sm: 8, children: _jsx(Card, { bordered: false, bodyStyle: { minHeight: 130 }, children: _jsxs(Space, { direction: "vertical", children: [_jsx(HeartOutlined, { style: { fontSize: 24, color: "#2563eb" } }), _jsx(Text, { strong: true, children: "1. \u5BFC\u5165\u57FA\u7840\u6570\u636E" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u5F55\u5165\u6559\u5E08\u3001\u73ED\u7EA7\u4E0E\u5B66\u751F\u4FE1\u606F\uFF0C\u4EC5\u9700\u4E00\u6B21\u5373\u53EF\u957F\u671F\u590D\u7528\u3002" })] }) }) }), _jsx(Col, { xs: 24, sm: 8, children: _jsx(Card, { bordered: false, bodyStyle: { minHeight: 130 }, children: _jsxs(Space, { direction: "vertical", children: [_jsx(ReadOutlined, { style: { fontSize: 24, color: "#16a34a" } }), _jsx(Text, { strong: true, children: "2. \u914D\u7F6E\u8BD5\u5377\u7ED3\u6784" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u5F55\u5165\u9898\u76EE\u7C7B\u578B\u4E0E\u7B54\u6848\uFF0C\u7CFB\u7EDF\u81EA\u52A8\u5339\u914D\u6279\u6539\u89C4\u5219\u4E0E\u9519\u9898\u5F52\u6863\u3002" })] }) }) }), _jsx(Col, { xs: 24, sm: 8, children: _jsx(Card, { bordered: false, bodyStyle: { minHeight: 130 }, children: _jsxs(Space, { direction: "vertical", children: [_jsx(RocketOutlined, { style: { fontSize: 24, color: "#f97316" } }), _jsx(Text, { strong: true, children: "3. \u4E0A\u4F20\u8BD5\u5377\u4F53\u9A8C AI \u6279\u6539" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u62CD\u7167\u6216\u626B\u63CF\u540E\u4E00\u952E\u4E0A\u4F20\uFF0C\u5F00\u542F\u81EA\u52A8\u6279\u6539\u4E0E\u9519\u9898\u540C\u6B65\u4F53\u9A8C\u3002" })] }) }) })] })] }) })] }) }));
};
export default Dashboard;
