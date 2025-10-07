import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Drawer, List, Space, Steps, Table, Tag, Typography } from "antd";
const { Paragraph, Title, Text } = Typography;
const stepStatusMap = {
    success: "finish",
    warning: "process",
    error: "error",
};
const SubmissionResultDrawer = ({ open, onClose, result }) => {
    const columns = [
        {
            title: "题号",
            dataIndex: "question_id",
            width: 80,
            align: "center",
        },
        {
            title: "学生作答",
            dataIndex: "student_answer",
            render: (value, record) => record.applies_to_student ? value || "—" : _jsx(Tag, { color: "default", children: "\u5B9A\u5411\u9898 \u00B7 \u672A\u53C2\u4E0E" }),
        },
        {
            title: "得分",
            dataIndex: "score",
            width: 110,
            align: "center",
            render: (value, record) => {
                if (!record.applies_to_student) {
                    return _jsx(Tag, { color: "default", children: "\u2014" });
                }
                return value ?? "待批改";
            },
        },
        {
            title: "判定",
            dataIndex: "is_correct",
            width: 110,
            align: "center",
            render: (value, record) => {
                if (!record.applies_to_student) {
                    return _jsx(Tag, { children: "\u8DF3\u8FC7" });
                }
                if (value === true)
                    return _jsx(Tag, { color: "green", children: "\u6B63\u786E" });
                if (value === false)
                    return _jsx(Tag, { color: "red", children: "\u9519\u8BEF" });
                return _jsx(Tag, { color: "blue", children: "\u5F85\u786E\u8BA4" });
            },
        },
        {
            title: "置信度",
            dataIndex: "ocr_confidence",
            width: 110,
            align: "center",
            render: (value, record) => record.applies_to_student && value !== undefined && value !== null ? `${Math.round(value * 100)}%` : "—",
        },
        {
            title: "AI 反馈",
            dataIndex: "comments",
            render: (value, record) => {
                if (!record.applies_to_student) {
                    return record.comments || "本题为定向错题巩固题，系统自动跳过评分";
                }
                return value || "—";
            },
        },
        {
            title: "教师批注",
            dataIndex: "teacher_annotation",
            render: (annotation) => annotation?.raw || "—",
        },
    ];
    const mistakes = result?.mistakes ?? [];
    const processingSteps = result?.processing_steps ?? [];
    const aiSummary = result?.ai_summary;
    return (_jsx(Drawer, { title: "\u6279\u6539\u7ED3\u679C\u8BE6\u60C5", placement: "right", open: open, width: 620, onClose: onClose, destroyOnClose: true, children: !result ? (_jsx(Paragraph, { type: "secondary", children: "\u6682\u65E0\u6570\u636E" })) : (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs("div", { children: [_jsx(Title, { level: 5, style: { marginBottom: 4 }, children: "\u63D0\u4EA4\u6458\u8981" }), _jsxs(Paragraph, { style: { marginBottom: 4 }, children: ["\u63D0\u4EA4\u7F16\u53F7\uFF1A", result.submission.id, " \u00B7 \u5B66\u751F ID\uFF1A", result.submission.student_id] }), _jsxs(Paragraph, { style: { marginBottom: 0 }, children: ["\u603B\u5206\uFF1A", result.submission.total_score ?? "待计算", " \u00B7 \u72B6\u6001\uFF1A", result.submission.status] })] }), aiSummary && (_jsx(Alert, { type: "success", showIcon: true, message: "AI \u6279\u6539\u603B\u7ED3", description: aiSummary })), processingSteps.length > 0 && (_jsxs("div", { children: [_jsx(Title, { level: 5, style: { marginBottom: 12 }, children: "\u5904\u7406\u6D41\u7A0B" }), _jsx(Steps, { size: "small", direction: "vertical", items: processingSteps.map((step) => ({
                                title: step.name,
                                description: step.detail,
                                status: stepStatusMap[step.status] ?? "process",
                            })) })] })), _jsx(Table, { size: "small", rowKey: "id", columns: columns, dataSource: result.responses, pagination: false }), _jsxs("div", { children: [_jsx(Title, { level: 5, children: "\u9519\u9898\u660E\u7EC6" }), mistakes.length === 0 ? (_jsx(Paragraph, { type: "secondary", children: "\u672C\u6B21\u63D0\u4EA4\u6682\u672A\u8BC6\u522B\u9519\u9898\u3002" })) : (_jsx(List, { dataSource: mistakes, renderItem: (item) => (_jsx(List.Item, { children: _jsx(List.Item.Meta, { title: `题目 ID：${item.question_id}`, description: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsxs(Paragraph, { style: { marginBottom: 0 }, children: ["\u77E5\u8BC6\u70B9\uFF1A", item.knowledge_tags || "未标注"] }), _jsxs(Paragraph, { style: { marginBottom: 0 }, type: "secondary", children: ["\u521B\u5EFA\u65F6\u95F4\uFF1A", item.created_at] })] }) }) })) }))] }), _jsx(Text, { type: "secondary", children: "\u6E29\u99A8\u63D0\u793A\uFF1A\u5B9A\u5411\u9519\u9898\u9898\u76EE\u4EC5\u5BF9\u6307\u5B9A\u5B66\u751F\u7EB3\u5165\u7EDF\u8BA1\uFF0C\u5176\u4F59\u5B66\u751F\u81EA\u52A8\u8DF3\u8FC7\u3002" })] })) }));
};
export default SubmissionResultDrawer;
