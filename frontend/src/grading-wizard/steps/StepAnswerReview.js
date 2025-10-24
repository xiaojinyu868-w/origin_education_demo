import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Card, Divider, Input, Progress, Radio, Row, Space, Statistic, Tag, Typography, message, } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { confirmAllExamAnswers, updateExamAnswerKey, updateExamSettings } from "../../api/services";
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
const ensureRecord = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    return value;
};
const ensureStringSet = (value, transform) => {
    const set = new Set();
    const apply = (candidate) => {
        const trimmed = candidate.trim();
        if (!trimmed)
            return;
        const next = transform ? transform(trimmed) : trimmed;
        if (next) {
            set.add(next);
        }
    };
    const collect = (input) => {
        if (!input)
            return;
        if (typeof input === "string") {
            apply(input);
            return;
        }
        if (Array.isArray(input)) {
            input.forEach((item) => collect(item));
            return;
        }
        if (typeof input === "object") {
            const record = input;
            const nested = record.value ?? record.label ?? record.option ?? record.answer ?? record.text ?? record.title ?? record.key;
            if (typeof nested === "string") {
                apply(nested);
            }
        }
    };
    collect(value);
    return set;
};
const collectMultipleChoiceAnswers = (answerKey) => {
    const upper = (value) => value.toUpperCase();
    const set = ensureStringSet([
        answerKey.correct,
        answerKey.correctOption,
        answerKey.correct_option,
        answerKey.correctAnswer,
        answerKey.correct_answer,
        answerKey.answer,
        answerKey.correctOptions,
        answerKey.acceptableOptions,
        answerKey.answers,
    ], upper);
    const optionsField = answerKey.options;
    if (Array.isArray(optionsField)) {
        optionsField.forEach((item) => {
            if (item && typeof item === "object" && !Array.isArray(item)) {
                const record = item;
                const flagged = Boolean(record.isCorrect || record.is_correct || record.correct || record.answer === true);
                if (flagged) {
                    ensureStringSet(record, upper).forEach((value) => set.add(value));
                }
            }
        });
    }
    return Array.from(set).sort();
};
const collectFillInAnswers = (answerKey) => {
    return Array.from(ensureStringSet([
        answerKey.acceptableAnswers,
        answerKey.acceptable_answers,
        answerKey.correctAnswers,
        answerKey.correct_answers,
        answerKey.answers,
        answerKey.expectedAnswers,
        answerKey.expected_answers,
        answerKey.solutions,
    ]));
};
const collectSubjectiveReference = (answerKey) => {
    const fields = [
        "referenceAnswer",
        "modelAnswer",
        "sampleAnswer",
        "answer",
        "analysis",
        "reference",
        "solution",
    ];
    for (const key of fields) {
        const value = answerKey[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return "";
};
const formatAnswerSummary = (question, rawAnswer) => {
    if (!question)
        return "";
    const answerKey = ensureRecord(rawAnswer);
    switch (question.type) {
        case "multiple_choice": {
            const options = collectMultipleChoiceAnswers(answerKey);
            return options.length > 0 ? `正确选项：${options.join(" / ")}` : "";
        }
        case "fill_in_blank": {
            const candidates = collectFillInAnswers(answerKey);
            return candidates.length > 0 ? `可接受答案：${candidates.join("、")}` : "";
        }
        case "subjective": {
            const reference = collectSubjectiveReference(answerKey);
            return reference ? `参考答案：${reference}` : "";
        }
        default:
            return "";
    }
};
const StepAnswerReview = () => {
    const { state: { exams, selectedExamId, savingStep }, actions: { refreshExams, goToStep }, } = useWizardStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editorValue, setEditorValue] = useState("{}");
    const [saving, setSaving] = useState(false);
    const [confirmingAll, setConfirmingAll] = useState(false);
    const [modeUpdating, setModeUpdating] = useState(false);
    const [jsonEditorVisible, setJsonEditorVisible] = useState(false);
    const exam = useMemo(() => exams.find((item) => item.id === selectedExamId), [exams, selectedExamId]);
    const questions = exam?.questions ?? [];
    const total = questions.length;
    const currentQuestion = questions[currentIndex];
    const answerMode = useMemo(() => {
        const metadata = (exam?.extra_metadata ?? {});
        return metadata.answerMode === "smart" ? "smart" : "strict";
    }, [exam?.extra_metadata]);
    const subQuestions = useMemo(() => {
        const raw = currentQuestion?.answer_key?.subQuestions;
        if (!Array.isArray(raw)) {
            return [];
        }
        return raw
            .map((item, index) => {
            if (!item || typeof item !== "object") {
                return null;
            }
            const record = item;
            const labelCandidate = typeof record.label === "string"
                ? record.label
                : typeof record.number === "string"
                    ? record.number
                    : `子问 ${index + 1}`;
            const normalized = typeof record.normalizedLabel === "string"
                ? record.normalizedLabel
                : typeof record.normalized_number === "string"
                    ? record.normalized_number
                    : undefined;
            const acceptable = (Array.isArray(record.acceptableAnswers) ? record.acceptableAnswers : null) ??
                (Array.isArray(record.acceptable_answers) ? record.acceptable_answers : null) ??
                [];
            const answers = acceptable.filter((value) => typeof value === "string").map((value) => value);
            return {
                key: `${labelCandidate}-${index}`,
                label: labelCandidate,
                normalized,
                answers,
            };
        })
            .filter((item) => !!item);
    }, [currentQuestion]);
    const confirmedCount = useMemo(() => questions.filter((question) => question.answer_status === "confirmed").length, [questions]);
    const progressPercent = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;
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
        setJsonEditorVisible(false);
    }, [exam, currentQuestion, currentIndex, total]);
    const previewAnswerKey = useMemo(() => {
        if (!currentQuestion) {
            return {};
        }
        try {
            const parsed = editorValue ? JSON.parse(editorValue) : {};
            return ensureRecord(parsed);
        }
        catch (_error) {
            return ensureRecord(currentQuestion.answer_key);
        }
    }, [currentQuestion, editorValue]);
    const answerSummary = useMemo(() => formatAnswerSummary(currentQuestion, previewAnswerKey), [currentQuestion, previewAnswerKey]);
    const multipleChoiceAnswers = useMemo(() => {
        if (!currentQuestion || currentQuestion.type !== "multiple_choice")
            return [];
        return collectMultipleChoiceAnswers(previewAnswerKey);
    }, [currentQuestion, previewAnswerKey]);
    const fillInAnswers = useMemo(() => {
        if (!currentQuestion || currentQuestion.type !== "fill_in_blank")
            return [];
        return collectFillInAnswers(previewAnswerKey);
    }, [currentQuestion, previewAnswerKey]);
    const subjectiveReference = useMemo(() => {
        if (!currentQuestion || currentQuestion.type !== "subjective")
            return "";
        return collectSubjectiveReference(previewAnswerKey);
    }, [currentQuestion, previewAnswerKey]);
    useEffect(() => {
        if (!currentQuestion)
            return;
        const hasVisual = Boolean(answerSummary) ||
            (currentQuestion.type === "multiple_choice" && multipleChoiceAnswers.length > 0) ||
            (currentQuestion.type === "fill_in_blank" && fillInAnswers.length > 0) ||
            (currentQuestion.type === "subjective" && Boolean(subjectiveReference));
        if (!hasVisual && !jsonEditorVisible) {
            setJsonEditorVisible(true);
        }
    }, [answerSummary, currentQuestion, fillInAnswers, jsonEditorVisible, multipleChoiceAnswers, subjectiveReference]);
    const handleConfirmAll = async () => {
        if (!exam || confirmingAll || confirmedCount === total) {
            return;
        }
        try {
            setConfirmingAll(true);
            await confirmAllExamAnswers(exam.id);
            message.success("所有题目已批量确认");
            await refreshExams();
        }
        catch (error) {
            const detail = error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "批量确认失败");
            message.error(detail);
        }
        finally {
            setConfirmingAll(false);
        }
    };
    const handleAnswerModeChange = async (nextMode) => {
        if (!exam || nextMode === answerMode) {
            return;
        }
        try {
            setModeUpdating(true);
            await updateExamSettings(exam.id, { answer_mode: nextMode });
            message.success(nextMode === "strict" ? "已切换至严格匹配模式" : "已切换至智能参考模式");
            await refreshExams();
        }
        catch (error) {
            const detail = error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "更新答案模式失败");
            message.error(detail);
        }
        finally {
            setModeUpdating(false);
        }
    };
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
        const pendingAnswers = questions.filter((question) => question.answer_status !== "confirmed").length;
        if (pendingAnswers > 0) {
            message.warning(`仍有 ${pendingAnswers} 道题目未确认标准答案`);
            return;
        }
        try {
            const now = new Date().toISOString();
            await goToStep(3, {
                examId: exam.id,
                payload: {
                    wizardProgress: {
                        answers: {
                            total: questions.length,
                            confirmed: questions.length,
                            pending: 0,
                            updatedAt: now,
                        },
                    },
                },
            });
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
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "\u6838\u5BF9\u6807\u51C6\u7B54\u6848" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u6309\u987A\u5E8F\u6838\u5BF9\u7CFB\u7EDF\u8BC6\u522B\u7684\u7B54\u6848\u4FE1\u606F\uFF0C\u786E\u8BA4\u540E\u5C06\u81EA\u52A8\u8BB0\u5F55\u5728\u9898\u5E93\u4E2D\u3002\u5B8C\u6210\u6240\u6709\u9898\u76EE\u540E\u5373\u53EF\u8FDB\u5165\u5B66\u751F\u5377\u9762\u4E0A\u4F20\u9636\u6BB5\u3002" })] }), _jsx(Card, { bordered: false, style: { borderRadius: 18, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }, children: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsxs(Row, { gutter: 24, align: "middle", wrap: false, style: { rowGap: 12 }, children: [_jsx(Statistic, { title: "\u5F53\u524D\u9898\u76EE", value: `${currentIndex + 1} / ${total}` }), _jsx(Statistic, { title: "\u5DF2\u786E\u8BA4", value: confirmedCount, suffix: ` / ${total}`, valueStyle: { color: "#16a34a" } }), _jsx("div", { style: { flex: 1, minWidth: 220 }, children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsx(Text, { type: "secondary", children: "\u786E\u8BA4\u8FDB\u5EA6" }), _jsx(Progress, { percent: progressPercent, showInfo: false })] }) }), _jsx(Button, { type: "primary", ghost: true, onClick: handleConfirmAll, loading: confirmingAll, disabled: confirmingAll || confirmedCount === total, children: "\u4E00\u952E\u786E\u8BA4\u5168\u90E8" })] }), _jsx(Divider, {}), _jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [_jsxs(Space, { size: 12, align: "center", wrap: true, children: [_jsx(Text, { strong: true, children: "\u7B54\u6848\u6A21\u5F0F" }), _jsxs(Radio.Group, { value: answerMode, onChange: (event) => handleAnswerModeChange(event.target.value), disabled: modeUpdating, optionType: "button", buttonStyle: "solid", children: [_jsx(Radio.Button, { value: "strict", children: "\u4E25\u683C\u5339\u914D" }), _jsx(Radio.Button, { value: "smart", children: "\u667A\u80FD\u53C2\u8003" })] }), modeUpdating && _jsx(Text, { type: "secondary", children: "\u6B63\u5728\u66F4\u65B0..." })] }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: answerMode === "strict"
                                        ? "严格匹配：仅保留教师提供的标准答案，不自动扩写建议答案。"
                                        : "智能参考：允许大模型给出语义相近的参考答案，并对可疑结果进行提示。" })] }), _jsx(Divider, {}), _jsxs(Space, { direction: "vertical", size: 18, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 6, children: [_jsxs(Tag, { color: "geekblue", children: ["\u9898\u53F7 ", currentQuestion.number] }), _jsxs(Space, { size: 8, wrap: true, children: [_jsxs(Tag, { color: "blue", children: ["\u9898\u578B\uFF1A", currentQuestion.type] }), currentQuestion.knowledge_tags && (_jsxs(Tag, { color: "purple", children: ["\u77E5\u8BC6\u70B9\uFF1A", currentQuestion.knowledge_tags] })), _jsxs(Tag, { color: "gray", children: ["\u5206\u503C\uFF1A", currentQuestion.max_score] })] })] }), _jsx(Paragraph, { children: currentQuestion.prompt || "题干暂无描述" }), subQuestions.length > 0 && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: "100%", background: "#f8fafc", padding: 12, borderRadius: 12 }, children: [_jsx(Text, { strong: true, children: "\u5B50\u95EE\u7ED3\u6784" }), subQuestions.map((item) => (_jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsxs(Space, { size: 8, wrap: true, children: [_jsx(Tag, { color: "geekblue", children: item.label }), item.normalized && _jsxs(Tag, { color: "cyan", children: ["\u89C4\u8303\uFF1A", item.normalized] })] }), item.answers.length > 0 && (_jsxs(Text, { type: "secondary", children: ["\u53EF\u63A5\u53D7\u7B54\u6848\uFF1A", item.answers.join("、")] }))] }, item.key)))] })), (answerSummary || multipleChoiceAnswers.length > 0 || fillInAnswers.length > 0 || subjectiveReference) && (_jsx(Card, { size: "small", bordered: false, style: { background: "#f0f6ff" }, children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", style: { width: "100%", justifyContent: "space-between" }, children: [_jsx(Text, { strong: true, style: { color: "#1d4ed8" }, children: "\u6807\u51C6\u7B54\u6848" }), _jsx(Button, { type: "link", style: { padding: 0 }, onClick: () => setJsonEditorVisible((previous) => !previous), children: jsonEditorVisible ? "收起 JSON 编辑" : "展开 JSON 编辑" })] }), answerSummary && _jsx(Paragraph, { style: { marginBottom: 0 }, children: answerSummary }), currentQuestion.type === "multiple_choice" && multipleChoiceAnswers.length > 0 && (_jsx(Space, { size: 6, wrap: true, children: multipleChoiceAnswers.map((option) => (_jsxs(Tag, { color: "volcano", children: ["\u9009\u9879 ", option] }, option))) })), currentQuestion.type === "fill_in_blank" && fillInAnswers.length > 0 && (_jsx(Space, { size: 6, wrap: true, children: fillInAnswers.map((item) => (_jsx(Tag, { color: "cyan", children: item }, item))) })), currentQuestion.type === "subjective" && subjectiveReference && (_jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: subjectiveReference }))] }) })), jsonEditorVisible && (_jsxs("div", { children: [_jsx(Text, { strong: true, children: "\u6807\u51C6\u7B54\u6848\uFF08JSON\uFF09" }), _jsx(Input.TextArea, { style: { marginTop: 8 }, autoSize: { minRows: 8, maxRows: 16 }, value: editorValue, onChange: (event) => setEditorValue(event.target.value), spellCheck: false })] }))] }), _jsx(Divider, {}), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }, children: [_jsxs(Space, { size: 12, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => handleSwitch("prev"), disabled: currentIndex === 0 || saving, children: "\u4E0A\u4E00\u9898" }), _jsx(Button, { type: "primary", ghost: true, icon: _jsx(ArrowRightOutlined, {}), onClick: () => handleSwitch("next"), disabled: currentIndex >= total - 1 || saving, children: "\u4E0B\u4E00\u9898" })] }), _jsxs(Space, { size: 12, children: [_jsx(Button, { onClick: () => handleSave(false), loading: saving, children: "\u4FDD\u5B58\u5F53\u524D\u9898\u76EE" }), _jsx(Button, { type: "primary", icon: _jsx(CheckCircleOutlined, {}), onClick: () => handleSave(true), loading: saving, children: "\u4FDD\u5B58\u5E76\u4E0B\u4E00\u9898" })] })] })] }) }), allConfirmed && (_jsx(Alert, { type: "success", showIcon: true, message: "\u6240\u6709\u9898\u76EE\u5747\u5DF2\u786E\u8BA4", description: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsx(Text, { children: "\u6240\u6709\u9898\u76EE\u5DF2\u5B8C\u6210\u6807\u51C6\u7B54\u6848\u6821\u5BF9\uFF0C\u53EF\u7EE7\u7EED\u4E0A\u4F20\u5B66\u751F\u5377\u9762\u8FDB\u884C\u6279\u6539\u3002" }), _jsx(Button, { type: "primary", size: "large", shape: "round", loading: savingStep, onClick: handleProceedNextPhase, children: "\u524D\u5F80\u5B66\u751F\u8BD5\u5377\u4E0A\u4F20" })] }) }))] }));
};
export default StepAnswerReview;
