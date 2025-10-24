import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Card, Col, Row, Space, Tooltip, Typography, message, } from "antd";
import { FileTextOutlined, HistoryOutlined, RedoOutlined, RocketOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWizardStore } from "../useWizardStore";
const { Title, Text, Paragraph } = Typography;
const StepCompletion = () => {
    const navigate = useNavigate();
    const { state: { selectedExamId, exams, progress, blocking, savingStep }, actions: { goToStep }, } = useWizardStore();
    const selectedExam = useMemo(() => exams.find((exam) => exam.id === selectedExamId), [exams, selectedExamId]);
    const blockingReasons = blocking[5] ?? [];
    const exportDisabled = blockingReasons.length > 0 || savingStep;
    const handleRestart = async () => {
        try {
            await goToStep(1, { examId: selectedExamId });
            navigate("/grading/wizard?step=1");
        }
        catch (error) {
            const detail = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "无法重新开始向导");
            message.error(detail);
        }
    };
    const handleReview = async () => {
        if (!selectedExamId) {
            message.warning("尚未选择试卷，无法返回批改确认");
            return;
        }
        try {
            await goToStep(4, { examId: selectedExamId });
            navigate("/grading/wizard?step=4");
        }
        catch (error) {
            const detail = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "无法跳转至批改确认");
            message.error(detail);
        }
    };
    const handleExport = () => {
        if (!selectedExamId) {
            message.warning("请选择试卷后再导出批改结果");
            return;
        }
        navigate(`/upload?exam_id=${selectedExamId}`);
    };
    const cards = [
        {
            key: "export",
            title: "导出批改成果",
            icon: _jsx(FileTextOutlined, {}),
            description: (_jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Paragraph, { style: { margin: 0 }, children: selectedExam ? (_jsxs(_Fragment, { children: ["\u5F53\u524D\u8BD5\u5377\uFF1A", _jsx(Text, { strong: true, children: selectedExam.title }), selectedExam.subject ? ` · ${selectedExam.subject}` : ""] })) : ("尚未选择试卷，导出前请返回向导确认。") }), _jsx(Text, { type: "secondary", children: "\u6279\u6539\u7ED3\u679C\u5DF2\u5199\u5165\u5386\u53F2\u8BB0\u5F55\uFF0C\u53EF\u5BFC\u51FA\u6210\u7EE9\u5355\u6216\u5206\u4EAB\u7ED9\u6388\u8BFE\u56E2\u961F\u3002" })] })),
            actions: (_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(RocketOutlined, {}), onClick: handleExport, disabled: exportDisabled, children: "\u5BFC\u51FA\u6279\u6539\u62A5\u544A" }), _jsx(Tooltip, { title: "\u67E5\u770B\u5168\u90E8\u6279\u6539\u8BB0\u5F55\u4E0E\u64CD\u4F5C\u65E5\u5FD7", children: _jsx(Button, { icon: _jsx(HistoryOutlined, {}), onClick: () => navigate("/upload") }) })] })),
        },
        {
            key: "practice",
            title: "布置后续练习",
            icon: _jsx(RocketOutlined, {}),
            description: (_jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Paragraph, { style: { margin: 0 }, children: progress.review.ready
                            ? "所有批改已确认，可直达练习中心生成个性化错题巩固任务。"
                            : `仍有 ${progress.review.pending} 项待确认，确认后可生成针对性练习。` }), _jsx(Text, { type: "secondary", children: "\u652F\u6301\u6309\u77E5\u8BC6\u70B9\u7B5B\u9009\u3001\u6309\u9519\u9898\u6B21\u6570\u6392\u5E8F\uFF0C\u81EA\u52A8\u751F\u6210\u9519\u9898\u7EC3\u4E60\u4E0E\u8DDF\u8FDB\u8BA1\u5212\u3002" })] })),
            actions: (_jsx(Button, { type: "default", onClick: () => navigate("/practice"), disabled: !progress.review.ready, children: "\u524D\u5F80\u5E03\u7F6E\u7EC3\u4E60" })),
        },
        {
            key: "actions",
            title: "向导操作",
            icon: _jsx(RedoOutlined, {}),
            description: (_jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Paragraph, { style: { margin: 0 }, children: "\u53EF\u4EE5\u91CD\u65B0\u56DE\u987E\u7B2C\u56DB\u6B65\u786E\u8BA4\u8FC7\u7A0B\uFF0C\u6216\u91CD\u65B0\u9009\u62E9\u8BD5\u5377\u5E76\u518D\u6B21\u4F53\u9A8C\u5168\u90E8\u6D41\u7A0B\u3002" }), _jsx(Text, { type: "secondary", children: "\u5EFA\u8BAE\u5728\u5BFC\u51FA\u524D\u518D\u6B21\u6838\u5BF9\u91CD\u70B9\u9898\u76EE\uFF0C\u786E\u8BA4\u6CA1\u6709\u9057\u6F0F\u7684\u5F85\u67E5\u9879\u76EE\u3002" })] })),
            actions: (_jsxs(Space, { children: [_jsx(Button, { onClick: handleReview, disabled: savingStep, children: "\u8FD4\u56DE\u6279\u6539\u8BE6\u60C5" }), _jsx(Button, { type: "dashed", danger: true, onClick: handleRestart, disabled: savingStep, children: "\u91CD\u65B0\u5F00\u59CB\u5411\u5BFC" })] })),
        },
    ];
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "\u6279\u6539\u6D41\u7A0B\u5B8C\u6210" }), _jsx(Text, { type: "secondary", children: "\u6240\u6709\u6279\u6539\u7ED3\u679C\u5DF2\u4FDD\u5B58\uFF0C\u53EF\u6839\u636E\u9700\u8981\u5BFC\u51FA\u62A5\u544A\u3001\u67E5\u770B\u5386\u53F2\u6216\u5E03\u7F6E\u540E\u7EED\u7EC3\u4E60\u3002" })] }), blockingReasons.length > 0 && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5BFC\u51FA\u524D\u987B\u5B8C\u6210\u4EE5\u4E0B\u4E8B\u9879", description: _jsx(Space, { direction: "vertical", size: 4, children: blockingReasons.map((reason) => (_jsx("span", { children: reason.message }, reason.code))) }) })), _jsx(Row, { gutter: [24, 24], children: cards.map((card) => (_jsx(Col, { xs: 24, xl: 8, children: _jsxs(Card, { bordered: false, style: { borderRadius: 18, height: "100%" }, bodyStyle: { display: "flex", flexDirection: "column", gap: 16 }, title: _jsxs(Space, { size: 8, align: "center", children: [card.icon, _jsx(Text, { strong: true, children: card.title })] }), children: [card.description, _jsx("div", { style: { marginTop: "auto" }, children: card.actions })] }) }, card.key))) })] }));
};
export default StepCompletion;
