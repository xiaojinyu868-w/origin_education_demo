import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import dayjs from "dayjs";
import { Alert, Badge, Button, Card, Collapse, Empty, Input, InputNumber, List, Segmented, Space, Spin, Tag, Typography, message, } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CommentOutlined, ReloadOutlined, } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchStudents, fetchSubmission, fetchSubmissionLogs, fetchSubmissions, updateManualScore, } from "../../api/services";
import { useWizardStore } from "../useWizardStore";
const { Title, Text, Paragraph } = Typography;
const SUBMISSION_FILTERS = [
    { label: "全部", value: "all" },
    { label: "待复核", value: "needs_review" },
    { label: "待处理", value: "pending" },
    { label: "已完成", value: "graded" },
];
const formatConfidence = (value) => typeof value === "number" ? `${Math.round(value * 100)}%` : "--";
const QUESTION_TYPE_LABELS = {
    multiple_choice: "选择题",
    fill_in_blank: "填空题",
    subjective: "主观题",
};
const StepReviewConfirm = () => {
    const { state: { selectedExamId, exams }, actions: { goToStep }, } = useWizardStore();
    const location = useLocation();
    const resumeSubmissionId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const raw = params.get("resume");
        if (!raw)
            return null;
        const parsed = Number(raw);
        return Number.isNaN(parsed) ? null : parsed;
    }, [location.search]);
    const [studentsMap, setStudentsMap] = useState({});
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [submissionFilter, setSubmissionFilter] = useState("needs_review");
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedResponseId, setSelectedResponseId] = useState(null);
    const [scoreDraft, set得分Draft] = useState(null);
    const [commentDraft, setCommentDraft] = useState("");
    const [savingResponse, setSavingResponse] = useState(false);
    const selectedExam = useMemo(() => exams.find((exam) => exam.id === selectedExamId), [exams, selectedExamId]);
    const questionMap = useMemo(() => {
        const map = new Map();
        if (!selectedExam)
            return map;
        selectedExam.questions.forEach((question) => map.set(question.id, question));
        return map;
    }, [selectedExam]);
    const responseList = useMemo(() => detail?.responses.filter((item) => item.applies_to_student) ?? [], [detail]);
    const currentResponse = useMemo(() => responseList.find((item) => item.id === selectedResponseId) ?? null, [responseList, selectedResponseId]);
    const currentQuestion = currentResponse
        ? questionMap.get(currentResponse.question_id) ?? null
        : null;
    useEffect(() => {
        if (resumeSubmissionId) {
            setSubmissionFilter("all");
            setSelectedSubmissionId(resumeSubmissionId);
        }
    }, [resumeSubmissionId]);
    useEffect(() => {
        if (!currentResponse) {
            set得分Draft(null);
            setCommentDraft("");
            return;
        }
        set得分Draft(currentResponse.score ?? null);
        setCommentDraft(currentResponse.teacher_comment ?? "");
    }, [currentResponse]);
    const filteredSubmissions = useMemo(() => {
        if (submissionFilter === "all")
            return submissions;
        return submissions.filter((item) => {
            const statusText = (item.status ?? "").toLowerCase();
            if (submissionFilter === "graded")
                return statusText.includes("graded");
            if (submissionFilter === "pending")
                return statusText.includes("pending");
            return (statusText.includes("needs") ||
                statusText.includes("review") ||
                item.responses.some((response) => response.review_status === "needs_review"));
        });
    }, [submissionFilter, submissions]);
    const loadStudents = useCallback(async () => {
        setStudentsLoading(true);
        try {
            const data = await fetchStudents();
            const map = {};
            data.forEach((student) => {
                map[student.id] = student;
            });
            setStudentsMap(map);
        }
        catch (error) {
            const detailMessage = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "加载学生列表失败"));
            message.error(detailMessage);
        }
        finally {
            setStudentsLoading(false);
        }
    }, []);
    const loadSubmissions = useCallback(async () => {
        if (!selectedExamId)
            return;
        setSubmissionLoading(true);
        try {
            const data = await fetchSubmissions({ exam_id: selectedExamId });
            data.sort((a, b) => {
                const priority = (status) => {
                    const value = (status ?? "").toLowerCase();
                    if (value.includes("needs"))
                        return 0;
                    if (value.includes("pending"))
                        return 1;
                    return 2;
                };
                const diff = priority(a.status) - priority(b.status);
                if (diff !== 0)
                    return diff;
                return (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "");
            });
            setSubmissions(data);
            if (data.length > 0) {
                setSelectedSubmissionId((prev) => prev ?? data[0].id);
            }
            else {
                setSelectedSubmissionId(null);
            }
        }
        catch (error) {
            const detailMessage = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "加载提交记录失败"));
            message.error(detailMessage);
        }
        finally {
            setSubmissionLoading(false);
        }
    }, [selectedExamId]);
    const loadSubmissionDetail = useCallback(async (submissionId) => {
        setDetailLoading(true);
        setLogsLoading(true);
        try {
            const [submissionDetail, logList] = await Promise.all([
                fetchSubmission(submissionId),
                fetchSubmissionLogs(submissionId).catch(() => ({ items: [] })),
            ]);
            setDetail(submissionDetail);
            setLogs(logList.items ?? []);
            setSubmissions((prev) => prev.map((item) => (item.id === submissionDetail.id ? submissionDetail : item)));
            const prioritized = submissionDetail.responses.find((response) => response.applies_to_student && response.review_status === "needs_review");
            const fallback = submissionDetail.responses.find((response) => response.applies_to_student);
            setSelectedResponseId(prioritized?.id ?? fallback?.id ?? null);
        }
        catch (error) {
            const detailMessage = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "获取批改详情失败"));
            message.error(detailMessage);
        }
        finally {
            setDetailLoading(false);
            setLogsLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadStudents();
    }, [loadStudents]);
    useEffect(() => {
        if (!selectedExamId) {
            setSubmissions([]);
            setDetail(null);
            setSelectedSubmissionId(null);
            return;
        }
        void loadSubmissions();
    }, [selectedExamId, loadSubmissions]);
    useEffect(() => {
        if (!selectedSubmissionId) {
            setDetail(null);
            setLogs([]);
            return;
        }
        void loadSubmissionDetail(selectedSubmissionId);
    }, [selectedSubmissionId, loadSubmissionDetail]);
    const handleSelectSubmission = (submissionId) => {
        setSelectedSubmissionId(submissionId);
    };
    const handleSelectResponse = (response) => {
        setSelectedResponseId(response.id);
    };
    const handleSaveResponse = async (next得分, nextComment, advance) => {
        if (!currentResponse || !detail || !selectedSubmissionId)
            return;
        if (next得分 === null || Number.isNaN(next得分)) {
            message.warning("请输入有效的分数");
            return;
        }
        try {
            setSavingResponse(true);
            const updated = await updateManualScore({
                response_id: currentResponse.id,
                new_score: next得分,
                new_comment: nextComment.trim() || undefined,
            });
            const nextResponseState = { ...currentResponse, ...updated };
            const updatedStudentResponses = responseList.map((resp) => resp.id === nextResponseState.id ? nextResponseState : resp);
            const stillPending = updatedStudentResponses.some((resp) => resp.review_status !== "confirmed");
            setDetail((prev) => {
                if (!prev)
                    return prev;
                return {
                    ...prev,
                    responses: prev.responses.map((resp) => resp.id === nextResponseState.id ? nextResponseState : resp),
                    status: stillPending ? "needs_review" : "graded",
                };
            });
            setSubmissions((prev) => prev.map((item) => item.id === selectedSubmissionId
                ? {
                    ...item,
                    responses: item.responses.map((resp) => resp.id === nextResponseState.id ? nextResponseState : resp),
                    status: stillPending ? "needs_review" : "graded",
                }
                : item));
            set得分Draft(nextResponseState.score ?? null);
            setCommentDraft(nextResponseState.teacher_comment ?? "");
            message.success("评分已保存");
            if (advance) {
                const currentIndex = updatedStudentResponses.findIndex((resp) => resp.id === nextResponseState.id);
                const nextCandidate = updatedStudentResponses
                    .slice(currentIndex + 1)
                    .find((resp) => resp.review_status !== "confirmed");
                if (nextCandidate) {
                    handleSelectResponse(nextCandidate);
                }
            }
        }
        catch (error) {
            const detailMessage = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "保存评分失败"));
            message.error(detailMessage);
        }
        finally {
            setSavingResponse(false);
        }
    };
    const handleProceedToCompletion = async () => {
        if (!detail || !selectedExamId) {
            message.warning("请先选择一份学生卷");
            return;
        }
        const pending = detail.responses
            .filter((response) => response.applies_to_student)
            .some((response) => response.review_status !== "confirmed");
        if (pending) {
            message.warning("请先确认全部题目再完成");
            return;
        }
        try {
            await goToStep(5, { examId: selectedExamId });
        }
        catch (error) {
            const detailMessage = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "无法进入下一阶段"));
            message.error(detailMessage);
        }
    };
    if (!selectedExamId || !selectedExam) {
        return (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5C1A\u672A\u9009\u62E9\u8BD5\u5377", description: "\u8BF7\u8FD4\u56DE\u8BD5\u5377\u914D\u7F6E\u9636\u6BB5\u5B8C\u6210\u9009\u62E9\u540E\u518D\u6765\u786E\u8BA4AI\u6279\u6539\u7ED3\u679C\u3002" }));
    }
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "AI \u6279\u6539\u786E\u8BA4" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u5DE6\u4FA7\u9009\u62E9\u5B66\u751F\u5377\uFF0C\u4E2D\u95F4\u6D4F\u89C8Question\uFF0C\u53F3\u4FA7\u8C03\u6574\u5F97\u5206\u4E0E\u5907\u6CE8\u3002\u786E\u8BA4\u5168\u90E8Question\u540E\u5373\u53EF\u8FDB\u5165\u5BFC\u51FA\u4E0E\u540E\u7EED\u6D41\u7A0B\u3002" })] }), _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "320px 1fr 360px",
                    gap: 18,
                    alignItems: "stretch",
                }, children: [_jsx(Card, { title: "\u5B66\u751F\u63D0\u4EA4\u961F\u5217", extra: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), size: "small", loading: submissionLoading, onClick: () => loadSubmissions(), children: "\u5237\u65B0" }), style: { minHeight: 480 }, children: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsx(Segmented, { options: SUBMISSION_FILTERS.map((option) => ({ ...option })), value: submissionFilter, onChange: (value) => setSubmissionFilter(value), block: true }), _jsx(Spin, { spinning: submissionLoading || studentsLoading, children: filteredSubmissions.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u63D0\u4EA4", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { dataSource: filteredSubmissions, renderItem: (item) => {
                                            const isActive = item.id === selectedSubmissionId;
                                            const student = studentsMap[item.student_id];
                                            const needsReview = item.responses.some((response) => response.review_status === "needs_review");
                                            return (_jsx(List.Item, { style: {
                                                    padding: 12,
                                                    borderRadius: 14,
                                                    border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                                                    background: isActive ? "rgba(37,99,235,0.08)" : "#fff",
                                                    cursor: "pointer",
                                                }, onClick: () => handleSelectSubmission(item.id), children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, wrap: true, children: [_jsx(Text, { strong: true, children: student?.name ?? `学生 #${item.student_id}` }), _jsx(Tag, { color: needsReview ? "orange" : "green", children: needsReview ? "待复核" : "已完成" })] }), _jsxs(Space, { size: 8, wrap: true, children: [_jsx(Tag, { icon: _jsx(ClockCircleOutlined, {}), color: "blue", children: dayjs(item.submitted_at).format("MM-DD HH:mm") }), typeof item.overall_confidence === "number" && (_jsxs(Tag, { color: "geekblue", children: ["\u7F6E\u4FE1\u5EA6 ", formatConfidence(item.overall_confidence)] })), item.status_detail && _jsx(Tag, { color: "purple", children: "AI \u603B\u7ED3" })] })] }) }, item.id));
                                        } })) })] }) }), _jsx(Card, { title: "\u9898\u76EE\u5BFC\u822A", style: { minHeight: 480 }, children: detailLoading ? (_jsx("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", height: 360 }, children: _jsx(Spin, {}) })) : responseList.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u4F5C\u7B54\u8BB0\u5F55", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { dataSource: responseList, renderItem: (response) => {
                                const isActive = response.id === selectedResponseId;
                                const question = questionMap.get(response.question_id);
                                return (_jsx(List.Item, { onClick: () => handleSelectResponse(response), style: {
                                        borderRadius: 14,
                                        border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                                        padding: 12,
                                        cursor: "pointer",
                                        background: isActive ? "rgba(37,99,235,0.06)" : "transparent",
                                    }, children: _jsxs(Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, wrap: true, children: [_jsx(Text, { strong: true, children: question?.number ?? response.question_id }), _jsx(Tag, { children: QUESTION_TYPE_LABELS[question?.type ?? ""] ?? "未知题型" }), response.review_status === "confirmed" ? (_jsx(Tag, { color: "green", children: "\u5DF2\u786E\u8BA4" })) : response.review_status === "needs_review" ? (_jsx(Tag, { color: "orange", children: "\u5F85\u590D\u6838" })) : (_jsx(Tag, { color: "blue", children: "\u5F85\u5904\u7406" }))] }), _jsxs(Space, { size: 8, wrap: true, children: [_jsxs(Tag, { color: "geekblue", children: ["AI \u5224\u5B9A\uFF1A", response.is_correct ? "正确" : "错误"] }), _jsxs(Tag, { color: "purple", children: ["\u5F97\u5206 ", response.score ?? "--"] }), typeof response.ai_confidence === "number" && (_jsxs(Tag, { color: "blue", children: ["\u7F6E\u4FE1\u5EA6 ", formatConfidence(response.ai_confidence)] }))] }), _jsx(Text, { type: "secondary", ellipsis: true, children: response.student_answer || "未识别到学生答案" })] }) }, response.id));
                            } })) }), _jsx(Card, { title: "\u4EBA\u5DE5\u590D\u6838", extra: detail && (_jsx(Button, { type: "primary", onClick: handleProceedToCompletion, icon: _jsx(CheckCircleOutlined, {}), children: "\u5B8C\u6210\u5E76\u5BFC\u51FA" })), style: { minHeight: 480 }, children: detailLoading || !detail ? (_jsx("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", height: 360 }, children: _jsx(Spin, {}) })) : !currentResponse ? (_jsx(Empty, { description: "\u8BF7\u9009\u62E9\u9898\u76EE", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsxs(Space, { direction: "vertical", size: 18, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Text, { type: "secondary", children: "\u9898\u76EE" }), _jsx(Text, { strong: true, children: currentQuestion?.number ?? currentResponse.question_id })] }), _jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Text, { type: "secondary", children: "\u5B66\u751F\u7B54\u6848" }), _jsx(Card, { size: "small", bordered: true, style: { background: "#f8fafc" }, children: _jsx(Paragraph, { style: { marginBottom: 0 }, children: currentResponse.student_answer ?? "未识别到学生答案" }) })] }), _jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Text, { type: "secondary", children: "\u6807\u51C6\u7B54\u6848\uFF08JSON\uFF09" }), _jsx(Card, { size: "small", bordered: true, style: { background: "#f1f5f9" }, children: _jsx("pre", { style: { margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: JSON.stringify(currentQuestion?.answer_key ?? {}, null, 2) }) })] }), _jsxs(Space, { direction: "vertical", size: 12, children: [_jsx(Text, { type: "secondary", children: "\u5F97\u5206" }), _jsx(InputNumber, { min: 0, max: currentQuestion?.max_score ?? 10, step: 0.5, style: { width: "100%" }, value: scoreDraft ?? undefined, onChange: (value) => set得分Draft(value === null ? null : Number(value)) }), _jsxs(Space, { size: 12, wrap: true, children: [_jsx(Button, { onClick: () => handleSaveResponse(currentQuestion?.max_score ?? 0, commentDraft, true), icon: _jsx(CheckCircleOutlined, {}), loading: savingResponse, children: "\u6807\u8BB0\u6EE1\u5206" }), _jsx(Button, { danger: true, onClick: () => handleSaveResponse(0, commentDraft, true), loading: savingResponse, children: "\u6807\u8BB0\u96F6\u5206" })] })] }), _jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Text, { type: "secondary", children: "\u6559\u5E08\u5907\u6CE8" }), _jsx(Input.TextArea, { autoSize: { minRows: 3, maxRows: 6 }, value: commentDraft, onChange: (event) => setCommentDraft(event.target.value), placeholder: "\u586B\u5199\u6559\u5E08\u5907\u6CE8\u6216\u6279\u6CE8" })] }), _jsxs(Space, { size: 12, children: [_jsx(Button, { type: "primary", icon: _jsx(CommentOutlined, {}), onClick: () => handleSaveResponse(scoreDraft ?? currentResponse.score ?? 0, commentDraft, true), loading: savingResponse, children: "\u4FDD\u5B58\u5E76\u67E5\u770B\u4E0B\u4E00\u9898" }), _jsx(Button, { onClick: () => handleSaveResponse(scoreDraft ?? currentResponse.score ?? 0, commentDraft, false), loading: savingResponse, children: "\u4EC5\u4FDD\u5B58" })] }), detail.status_detail && (_jsx(Alert, { type: "info", showIcon: true, message: "AI \u603B\u7ED3", description: detail.status_detail })), _jsx(Collapse, { bordered: false, items: [
                                        {
                                            key: "logs",
                                            label: "处理日志",
                                            children: logsLoading ? (_jsx(Spin, {})) : logs.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u65E5\u5FD7\u8BB0\u5F55", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { dataSource: logs, renderItem: (log) => (_jsx(List.Item, { children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, children: [_jsx(Badge, { color: "blue", text: log.step }), _jsx(Text, { type: "secondary", children: dayjs(log.created_at).format("YYYY-MM-DD HH:mm") })] }), log.detail && _jsx(Text, { children: log.detail })] }) }, log.id)) })),
                                        },
                                    ] })] })) })] })] }));
};
export default StepReviewConfirm;
