import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Card, Divider, Input, Progress, Row, Space, Statistic, Tag, Typography, message, } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { updateExamAnswerKey } from "../../api/services";
import { useWizardStore } from "../useWizardStore";
const { Title, Text, Paragraph } = Typography;
const stringifyAnswer = (answer) => {
    try {
        return JSON.stringify(answer ?? {}, null, 2);
    }
    catch (_error) {
        return "{}";
    }
};
const StepAnswerReview = () => {
    const { state: { exams, selectedExamId, savingStep }, actions: { refreshExams, goToStep }, } = useWizardStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editorValue, setEditorValue] = useState("{}");
    const [saving, setSaving] = useState(false);
    const exam = useMemo(() => exams.find((item) => item.id === selectedExamId), [exams, selectedExamId]);
    const questions = exam?.questions ?? [];
    const total = questions.length;
    const currentQuestion = questions[currentIndex];
    useEffect(() => {
        if (!exam || total === 0) {
            return;
        }
        const safeIndex = Math.min(currentIndex, Math.max(total - 1, 0));
        if (safeIndex !== currentIndex) {
            setCurrentIndex(safeIndex);
            return;
        }
        const answer = stringifyAnswer(currentQuestion?.answer_key ?? {});
        setEditorValue(answer);
    }, [exam, currentQuestion, currentIndex, total]);
    const confirmedCount = useMemo(() => questions.filter((question) => question.answer_status === "confirmed").length, [questions]);
    const handleSwitch = (direction) => {
        if (!exam)
            return;
        setCurrentIndex((prev) => {
            if (direction === "prev") {
                return prev === 0 ? prev : prev - 1;
            }
            return prev >= total - 1 ? prev : prev + 1;
        });
    };
    const handleSave = async (navigateNext) => {
        if (!exam || !currentQuestion)
            return;
        let parsed;
        try {
            parsed = JSON.parse(editorValue || "{}");
        }
        catch (error) {
            message.error(error instanceof Error ? error.message : "答案 JSON 无法解析，请检查格式");
            return;
        }
        const payload = {
            questions: [
                {
                    question_id: currentQuestion.id,
                    answer_key: parsed,
                    answer_status: "confirmed",
                    answer_confidence: 1,
                },
            ],
        };
        try {
            setSaving(true);
            await updateExamAnswerKey(exam.id, payload);
            message.success(`题目 ${currentQuestion.number} 已保存`);
            await refreshExams();
            if (navigateNext) {
                if (currentIndex >= total - 1) {
                    return;
                }
                setCurrentIndex((prev) => Math.min(prev + 1, total - 1));
            }
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "保存失败"));
            message.error(detail);
        }
        finally {
            setSaving(false);
        }
    };
    const handleProceedNextPhase = async () => {
        if (!exam)
            return;
        try {
            await goToStep(3, { examId: exam.id });
            message.success("标准答案校对完成，进入学生上传阶段");
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "无法进入下一步"));
            message.error(detail);
        }
    };
    if (!exam) {
        return (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5C1A\u672A\u9009\u62E9\u8BD5\u5377", description: "\u8BF7\u8FD4\u56DE\u4E0A\u4E00\u6B65\u9009\u62E9\u6216\u65B0\u5EFA\u8BD5\u5377\u540E\u518D\u8FDB\u884C\u7B54\u6848\u6821\u5BF9\u3002" }));
    }
    if (total === 0) {
        return (_jsx(Alert, { type: "info", showIcon: true, message: "\u5F53\u524D\u8BD5\u5377\u5C1A\u672A\u89E3\u6790\u9898\u76EE", description: "\u8BF7\u8FD4\u56DE\u4E0A\u4E00\u9636\u6BB5\u68C0\u67E5\u8BD5\u5377\u7ED3\u6784\u6216\u91CD\u65B0\u4E0A\u4F20\u626B\u63CF\u4EF6\u3002" }));
    }
    const allConfirmed = confirmedCount === total;
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "\u6838\u5BF9\u6807\u51C6\u7B54\u6848" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u6309\u987A\u5E8F\u6838\u5BF9\u7CFB\u7EDF\u8BC6\u522B\u7684\u7B54\u6848\u4FE1\u606F\uFF0C\u786E\u8BA4\u540E\u5C06\u81EA\u52A8\u8BB0\u5F55\u5728\u9898\u5E93\u4E2D\u3002\u5B8C\u6210\u6240\u6709\u9898\u76EE\u540E\u5373\u53EF\u8FDB\u5165\u5B66\u751F\u5377\u9762\u4E0A\u4F20\u9636\u6BB5\u3002" })] }), _jsx(Card, { bordered: false, style: { borderRadius: 18, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }, children: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsxs(Row, { gutter: 24, align: "middle", children: [_jsx(Statistic, { title: "\u5F53\u524D\u9898\u76EE", value: `${currentIndex + 1} / ${total}` }), _jsx(Statistic, { title: "\u5DF2\u786E\u8BA4", value: confirmedCount, suffix: ` / ${total}`, valueStyle: { color: "#16a34a" } }), _jsx("div", { style: { flex: 1 }, children: _jsx(Progress, { percent: Math.round(((currentIndex + 1) / total) * 100), showInfo: false }) })] }), _jsx(Divider, {}), _jsxs(Space, { direction: "vertical", size: 18, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 6, children: [_jsxs(Tag, { color: "geekblue", children: ["\u9898\u53F7 ", currentQuestion.number] }), _jsxs(Space, { size: 8, wrap: true, children: [_jsxs(Tag, { color: "blue", children: ["\u9898\u578B\uFF1A", currentQuestion.type] }), currentQuestion.knowledge_tags && (_jsxs(Tag, { color: "purple", children: ["\u77E5\u8BC6\u70B9\uFF1A", currentQuestion.knowledge_tags] })), _jsxs(Tag, { color: "gray", children: ["\u5206\u503C\uFF1A", currentQuestion.max_score] })] })] }), _jsx(Paragraph, { children: currentQuestion.prompt || "题干暂无描述" }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "\u6807\u51C6\u7B54\u6848\uFF08JSON\uFF09" }), _jsx(Input.TextArea, { style: { marginTop: 8 }, autoSize: { minRows: 8, maxRows: 16 }, value: editorValue, onChange: (event) => setEditorValue(event.target.value), spellCheck: false })] })] }), _jsx(Divider, {}), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }, children: [_jsxs(Space, { size: 12, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => handleSwitch("prev"), disabled: currentIndex === 0 || saving, children: "\u4E0A\u4E00\u9898" }), _jsx(Button, { type: "primary", ghost: true, icon: _jsx(ArrowRightOutlined, {}), onClick: () => handleSwitch("next"), disabled: currentIndex >= total - 1 || saving, children: "\u4E0B\u4E00\u9898" })] }), _jsxs(Space, { size: 12, children: [_jsx(Button, { onClick: () => handleSave(false), loading: saving, children: "\u4FDD\u5B58\u5F53\u524D\u9898\u76EE" }), _jsx(Button, { type: "primary", icon: _jsx(CheckCircleOutlined, {}), onClick: () => handleSave(true), loading: saving, children: "\u4FDD\u5B58\u5E76\u4E0B\u4E00\u9898" })] })] })] }) }), allConfirmed && (_jsx(Alert, { type: "success", showIcon: true, message: "\u6240\u6709\u9898\u76EE\u5747\u5DF2\u786E\u8BA4", description: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsx(Text, { children: "\u6240\u6709\u9898\u76EE\u5DF2\u5B8C\u6210\u6807\u51C6\u7B54\u6848\u6821\u5BF9\uFF0C\u53EF\u7EE7\u7EED\u4E0A\u4F20\u5B66\u751F\u5377\u9762\u8FDB\u884C\u6279\u6539\u3002" }), _jsx(Button, { type: "primary", size: "large", shape: "round", loading: savingStep, onClick: handleProceedNextPhase, children: "\u524D\u5F80\u5B66\u751F\u8BD5\u5377\u4E0A\u4F20" })] }) }))] }));
};
export default StepAnswerReview;
