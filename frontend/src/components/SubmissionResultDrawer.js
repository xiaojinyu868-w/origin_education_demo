import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Drawer, List, Space, Table, Tag, Typography } from "antd";
const { Paragraph, Title } = Typography;
const SubmissionResultDrawer = ({ open, onClose, result }) => {
    const columns = [
        {
            title: "题号",
            dataIndex: "question_id",
            width: 80,
        },
        {
            title: "学生作答",
            dataIndex: "student_answer",
            render: (value) => value || "—",
        },
        {
            title: "得分",
            dataIndex: "score",
            width: 90,
            render: (value) => value ?? "待批改",
        },
        {
            title: "判定",
            dataIndex: "is_correct",
            width: 100,
            render: (value) => {
                if (value === true)
                    return _jsx(Tag, { color: "green", children: "\u6B63\u786E" });
                if (value === false)
                    return _jsx(Tag, { color: "red", children: "\u9519\u8BEF" });
                return _jsx(Tag, { color: "blue", children: "\u5F85\u786E\u8BA4" });
            },
        },
        {
            title: "批注",
            dataIndex: "teacher_annotation",
            render: (annotation) => annotation?.raw || "—",
        },
    ];
    const mistakes = result?.mistakes ?? [];
    return (_jsx(Drawer, { title: "\u6279\u6539\u7ED3\u679C\u8BE6\u60C5", placement: "right", open: open, width: 560, onClose: onClose, destroyOnClose: true, children: !result ? (_jsx(Paragraph, { type: "secondary", children: "\u6682\u65E0\u6570\u636E" })) : (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs("div", { children: [_jsx(Title, { level: 5, style: { marginBottom: 8 }, children: "\u63D0\u4EA4\u6458\u8981" }), _jsxs(Paragraph, { style: { marginBottom: 4 }, children: ["\u63D0\u4EA4\u7F16\u53F7\uFF1A", result.submission.id, " \u00B7 \u5B66\u751F ID\uFF1A", result.submission.student_id] }), _jsxs(Paragraph, { style: { marginBottom: 0 }, children: ["\u603B\u5206\uFF1A", result.submission.total_score ?? "待计算", " \u00B7 \u72B6\u6001\uFF1A", result.submission.status] })] }), _jsx(Table, { size: "small", rowKey: "id", columns: columns, dataSource: result.responses, pagination: false }), _jsxs("div", { children: [_jsx(Title, { level: 5, children: "\u9519\u9898\u660E\u7EC6" }), mistakes.length === 0 ? (_jsx(Paragraph, { type: "secondary", children: "\u672C\u6B21\u63D0\u4EA4\u6682\u672A\u8BC6\u522B\u9519\u9898\u3002" })) : (_jsx(List, { dataSource: mistakes, renderItem: (item) => (_jsx(List.Item, { children: _jsx(List.Item.Meta, { title: `题目 ID：${item.question_id}`, description: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsxs(Paragraph, { style: { marginBottom: 0 }, children: ["\u77E5\u8BC6\u70B9\uFF1A", item.knowledge_tags || "未标注"] }), _jsxs(Paragraph, { style: { marginBottom: 0 }, type: "secondary", children: ["\u521B\u5EFA\u65F6\u95F4\uFF1A", item.created_at] })] }) }) })) }))] })] })) }));
};
export default SubmissionResultDrawer;
