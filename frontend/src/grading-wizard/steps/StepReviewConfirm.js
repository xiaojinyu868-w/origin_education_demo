import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import dayjs from "dayjs";
import { Alert, Badge, Button, Card, Drawer, Empty, FloatButton, Input, InputNumber, List, Popconfirm, Segmented, Space, Spin, Tag, Tooltip, Typography, message, } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CommentOutlined, HistoryOutlined, ReloadOutlined, WarningOutlined, } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { bulkUpdateResponses, fetchSubmission, fetchSubmissionLogs, fetchSubmissions, fetchStudents, updateManualScore, } from "../../api/services";
import { useWizardStore } from "../useWizardStore";
const { Title, Text, Paragraph } = Typography;
const SUBMISSION_FILTERS = [
    { label: "全部", value: "all" },
    { label: "待复核", value: "needs_review" },
    { label: "待处理", value: "pending" },
    { label: "已完成", value: "graded" },
];
const RESPONSE_FILTERS = [
    { label: "待确认", value: "active" },
    { label: "待复核", value: "needs_review" },
    { label: "待处理", value: "pending" },
    { label: "已完成", value: "confirmed" },
    { label: "全部", value: "all" },
];
const REVIEW_STATUS_LABELS = {
    confirmed: "已通过",
    needs_review: "待复核",
    pending: "待处理",
};
const REVIEW_STATUS_COLORS = {
    confirmed: "green",
    needs_review: "orange",
    pending: "default",
};
const SUBMISSION_STATUS_LABELS = {
    graded: "已完成",
    needs_review: "待复核",
    pending: "待处理",
};
const formatConfidence = (value) => typeof value === "number" ? `${Math.round(value * 100)}%` : "--";
const StepReviewConfirm = () => {
    const { state: { selectedExamId, exams, session }, actions: { goToStep }, } = useWizardStore();
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
    const [responseFilter, setResponseFilter] = useState("active");
    const [scoreDraft, setScoreDraft] = useState(null);
    const [commentDraft, setCommentDraft] = useState("");
    const [savingResponse, setSavingResponse] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [undoAction, setUndoAction] = useState(null);
    const selectedExam = useMemo(() => exams.find((exam) => exam.id === selectedExamId), [exams, selectedExamId]);
    const questionMap = useMemo(() => {
        const map = new Map();
        if (!selectedExam)
            return map;
        selectedExam.questions.forEach((question) => map.set(question.id, question));
        return map;
    }, [selectedExam]);
    useEffect(() => {
        if (resumeSubmissionId) {
            setSubmissionFilter("all");
            setSelectedSubmissionId(resumeSubmissionId);
        }
    }, [resumeSubmissionId]);
    const responseList = useMemo(() => detail?.responses.filter((item) => item.applies_to_student) ?? [], [detail]);
    const statusCounts = useMemo(() => {
        const counts = { total: 0, confirmed: 0, needs_review: 0, pending: 0 };
        responseList.forEach((response) => {
            counts.total += 1;
            const key = (response.review_status ?? "pending");
            counts[key] += 1;
        });
        return counts;
    }, [responseList]);
    const activeCount = statusCounts.needs_review + statusCounts.pending;
    const filteredResponses = useMemo(() => {
        switch (responseFilter) {
            case "needs_review":
                return responseList.filter((response) => response.review_status === "needs_review");
            case "pending":
                return responseList.filter((response) => response.review_status === "pending");
            case "confirmed":
                return responseList.filter((response) => response.review_status === "confirmed");
            case "active":
                return responseList.filter((response) => response.review_status !== "confirmed");
            default:
                return responseList;
        }
    }, [responseList, responseFilter]);
    const reviewSummary = useMemo(() => {
        const summary = { total: 0, confirmed: 0, pending: 0 };
        submissions.forEach((submission) => {
            submission.responses
                .filter((response) => response.applies_to_student)
                .forEach((response) => {
                summary.total += 1;
                if ((response.review_status ?? "pending") === "confirmed") {
                    summary.confirmed += 1;
                }
                else {
                    summary.pending += 1;
                }
            });
        });
        summary.confirmed = Math.max(summary.confirmed, summary.total - summary.pending);
        return summary;
    }, [submissions]);
    const exportDisabled = reviewSummary.pending > 0 || reviewSummary.total === 0 || !selectedExamId;
    const exportDisabledReason = exportDisabled
        ? reviewSummary.total === 0
            ? "暂无批改记录可导出"
            : reviewSummary.pending > 0
                ? `仍有 ${reviewSummary.pending} 项批改待确认`
                : "请选择试卷后再导出批改结果"
        : undefined;
    useEffect(() => {
        if (!responseList.length) {
            setSelectedResponseId(null);
            return;
        }
        const exists = responseList.some((response) => response.id === selectedResponseId);
        if (!exists) {
            const fallback = filteredResponses[0] ?? responseList[0];
            setSelectedResponseId(fallback?.id ?? null);
        }
    }, [filteredResponses, responseList, selectedResponseId]);
    const currentResponse = useMemo(() => responseList.find((response) => response.id === selectedResponseId) ?? null, [responseList, selectedResponseId]);
    const currentQuestion = currentResponse
        ? questionMap.get(currentResponse.question_id) ?? null
        : null;
    useEffect(() => {
        if (!currentResponse) {
            setScoreDraft(null);
            setCommentDraft("");
            return;
        }
        setScoreDraft(typeof currentResponse.score === "number" ? currentResponse.score : null);
        setCommentDraft(currentResponse.teacher_comment ?? "");
    }, [currentResponse]);
    const eligibleForConfirm = useMemo(() => filteredResponses.filter((response) => response.review_status !== "confirmed"), [filteredResponses]);
    const eligibleForFlag = useMemo(() => filteredResponses.filter((response) => response.review_status !== "needs_review"), [filteredResponses]);
    const submissionUploadSummary = useMemo(() => {
        const total = submissions.length;
        if (total === 0) {
            return { total: 0, completed: 0, pending: 0 };
        }
        const completed = submissions.filter((submission) => {
            const statusValue = (submission.status ?? "").toLowerCase();
            if (statusValue.includes("graded") || statusValue.includes("completed")) {
                return true;
            }
            const unresolved = submission.responses.filter((response) => response.applies_to_student && response.review_status !== "confirmed");
            return unresolved.length === 0;
        }).length;
        const pending = Math.max(total - completed, 0);
        return { total, completed, pending };
    }, [submissions]);
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
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "加载学生列表失败");
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
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "加载提交记录失败");
            message.error(detailMessage);
        }
        finally {
            setSubmissionLoading(false);
        }
    }, [selectedExamId]);
    const refreshLogs = useCallback(async (submissionId) => {
        setLogsLoading(true);
        try {
            const list = await fetchSubmissionLogs(submissionId);
            setLogs(list.items ?? []);
        }
        catch (error) {
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "获取操作历史失败");
            message.error(detailMessage);
        }
        finally {
            setLogsLoading(false);
        }
    }, []);
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
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "获取批改详情失败");
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
        if (!session || !selectedExamId || submissionUploadSummary.total === 0) {
            return;
        }
        const { total, completed, pending } = submissionUploadSummary;
        const payloadRoot = (session.payload ?? {});
        const wizardProgress = payloadRoot.wizardProgress && typeof payloadRoot.wizardProgress === "object"
            ? payloadRoot.wizardProgress
            : {};
        const uploadsSegment = wizardProgress.uploads && typeof wizardProgress.uploads === "object"
            ? wizardProgress.uploads
            : {};
        const toNum = (value) => typeof value === "number" && Number.isFinite(value)
            ? value
            : Number.isFinite(Number(value))
                ? Number(value)
                : undefined;
        const matches = toNum(uploadsSegment.total) === total &&
            (toNum(uploadsSegment.completed) ?? toNum(uploadsSegment.confirmed)) === completed &&
            toNum(uploadsSegment.pending) === pending;
        if (matches) {
            return;
        }
        void goToStep(4, {
            examId: selectedExamId,
            payload: {
                wizardProgress: {
                    uploads: {
                        total,
                        completed,
                        pending,
                        updatedAt: new Date().toISOString(),
                    },
                },
            },
        }).catch((error) => {
            console.error("无法同步上传进度", error);
        });
    }, [session, selectedExamId, submissionUploadSummary, goToStep]);
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
        setResponseFilter("active");
    };
    const handleUndo = useCallback(async (messageKey) => {
        if (!undoAction || undoAction.messageKey !== messageKey) {
            return;
        }
        message.destroy(messageKey);
        if (!undoAction.snapshots.length) {
            setUndoAction(null);
            return;
        }
        setBulkUpdating(true);
        try {
            const grouped = undoAction.snapshots.reduce((accumulator, snapshot) => {
                const status = snapshot.previousStatus;
                accumulator[status] = accumulator[status] ?? [];
                accumulator[status].push(snapshot.id);
                return accumulator;
            }, { confirmed: [], needs_review: [], pending: [] });
            for (const [statusKey, ids] of Object.entries(grouped)) {
                if (!ids.length)
                    continue;
                const status = statusKey;
                await bulkUpdateResponses(undoAction.submissionId, {
                    response_ids: ids,
                    target_status: status,
                });
            }
            const refreshed = await fetchSubmission(undoAction.submissionId);
            setDetail(refreshed);
            setSubmissions((prev) => prev.map((item) => (item.id === refreshed.id ? refreshed : item)));
            await refreshLogs(undoAction.submissionId);
            const nextActive = refreshed.responses.find((response) => response.applies_to_student && response.review_status !== "confirmed") ?? refreshed.responses.find((response) => response.applies_to_student);
            setSelectedResponseId(nextActive?.id ?? null);
            message.success("已撤销批量操作");
        }
        catch (error) {
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "撤销操作失败");
            message.error(detailMessage);
        }
        finally {
            setUndoAction(null);
            setBulkUpdating(false);
        }
    }, [refreshLogs, setSubmissions, undoAction]);
    const handleBulkStatusUpdate = useCallback(async (targetStatus, candidates) => {
        if (!detail || !candidates.length) {
            return;
        }
        setBulkUpdating(true);
        const responseIds = candidates.map((item) => item.id);
        const snapshots = candidates
            .filter((item) => item.review_status !== targetStatus)
            .map((item) => ({
            id: item.id,
            previousStatus: (item.review_status ?? "pending"),
        }));
        try {
            if (undoAction) {
                message.destroy(undoAction.messageKey);
                setUndoAction(null);
            }
            const result = await bulkUpdateResponses(detail.id, {
                response_ids: responseIds,
                target_status: targetStatus,
            });
            const updatedSubmission = result.submission;
            setDetail(updatedSubmission);
            setSubmissions((prev) => prev.map((item) => (item.id === updatedSubmission.id ? updatedSubmission : item)));
            void refreshLogs(detail.id);
            const targetLabel = REVIEW_STATUS_LABELS[targetStatus];
            const fallbackMessage = snapshots.length
                ? `已将 ${snapshots.length} 条作答标记为${targetLabel}`
                : `符合条件的作答已是${targetLabel}状态`;
            const serverMessage = result.message ?? fallbackMessage;
            if (!snapshots.length) {
                message.success(serverMessage);
            }
            else {
                const key = `undo-${Date.now()}`;
                setUndoAction({ submissionId: detail.id, snapshots, messageKey: key });
                message.open({
                    key,
                    type: "success",
                    duration: 3,
                    content: (_jsxs(Space, { size: 12, align: "center", children: [_jsx("span", { children: serverMessage }), _jsx(Button, { type: "link", size: "small", onClick: () => handleUndo(key), children: "\u64A4\u9500" })] })),
                    onClose: () => {
                        setUndoAction((prev) => (prev && prev.messageKey === key ? null : prev));
                    },
                });
            }
            if (targetStatus === "confirmed" &&
                snapshots.some((snapshot) => snapshot.id === selectedResponseId)) {
                const nextActive = updatedSubmission.responses.find((response) => response.applies_to_student && response.review_status !== "confirmed") ?? updatedSubmission.responses.find((response) => response.applies_to_student);
                setSelectedResponseId(nextActive?.id ?? null);
            }
            if (targetStatus === "needs_review" && snapshots.length) {
                setSelectedResponseId(snapshots[0].id);
            }
        }
        catch (error) {
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "批量操作失败");
            message.error(detailMessage);
        }
        finally {
            setBulkUpdating(false);
        }
    }, [detail, handleUndo, refreshLogs, selectedResponseId, setSubmissions, undoAction]);
    const handleSaveResponse = async (nextScore, nextComment, advance) => {
        if (!currentResponse || !detail || !selectedSubmissionId)
            return;
        if (nextScore === null || Number.isNaN(nextScore)) {
            message.warning("请输入有效的分数");
            return;
        }
        try {
            setSavingResponse(true);
            const updated = await updateManualScore({
                response_id: currentResponse.id,
                new_score: nextScore,
                new_comment: nextComment.trim() || undefined,
            });
            const nextResponseState = { ...currentResponse, ...updated };
            const updatedResponses = responseList.map((response) => response.id === nextResponseState.id ? nextResponseState : response);
            const stillPending = updatedResponses.some((response) => response.review_status !== "confirmed");
            setDetail((prev) => {
                if (!prev)
                    return prev;
                return {
                    ...prev,
                    responses: prev.responses.map((response) => response.id === nextResponseState.id ? nextResponseState : response),
                    status: stillPending ? "needs_review" : "graded",
                };
            });
            setSubmissions((prev) => prev.map((submission) => submission.id === selectedSubmissionId
                ? {
                    ...submission,
                    responses: submission.responses.map((response) => response.id === nextResponseState.id ? nextResponseState : response),
                    status: stillPending ? "needs_review" : "graded",
                }
                : submission));
            setScoreDraft(nextResponseState.score ?? null);
            setCommentDraft(nextResponseState.teacher_comment ?? "");
            message.success("评分已保存");
            if (advance) {
                const currentIndex = updatedResponses.findIndex((response) => response.id === nextResponseState.id);
                const nextCandidate = updatedResponses
                    .slice(currentIndex + 1)
                    .find((response) => response.review_status !== "confirmed");
                if (nextCandidate) {
                    setSelectedResponseId(nextCandidate.id);
                }
            }
        }
        catch (error) {
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "保存评分失败");
            message.error(detailMessage);
        }
        finally {
            setSavingResponse(false);
        }
    };
    const handleProceedToCompletion = async () => {
        if (!selectedExamId) {
            message.warning("请选择试卷后再导出批改结果");
            return;
        }
        if (reviewSummary.total === 0) {
            message.warning("暂无批改记录可导出");
            return;
        }
        if (detail) {
            const pendingCurrent = detail.responses
                .filter((response) => response.applies_to_student)
                .some((response) => response.review_status !== "confirmed");
            if (pendingCurrent) {
                message.warning("当前学生仍有题目待确认");
                return;
            }
        }
        if (reviewSummary.pending > 0) {
            message.warning(`仍有 ${reviewSummary.pending} 项批改待确认`);
            return;
        }
        try {
            const now = new Date().toISOString();
            await goToStep(5, {
                examId: selectedExamId,
                payload: {
                    wizardProgress: {
                        review: {
                            total: reviewSummary.total,
                            confirmed: reviewSummary.confirmed,
                            pending: reviewSummary.pending,
                            updatedAt: now,
                        },
                    },
                },
            });
        }
        catch (error) {
            const detailMessage = error?.response?.data?.detail ??
                (error instanceof Error ? error.message : "无法进入下一阶段");
            message.error(detailMessage);
        }
    };
    if (!selectedExamId || !selectedExam) {
        return (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5C1A\u672A\u9009\u62E9\u8BD5\u5377", description: "\u8BF7\u8FD4\u56DE\u8BD5\u5377\u914D\u7F6E\u9636\u6BB5\u5B8C\u6210\u9009\u62E9\u540E\u518D\u6765\u786E\u8BA4 AI \u6279\u6539\u7ED3\u679C\u3002" }));
    }
    const suspiciousMatches = Array.isArray(currentResponse?.suspicious_matches)
        ? currentResponse?.suspicious_matches
        : [];
    const blockedSupplement = currentResponse?.blocked_supplement;
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "AI \u6279\u6539\u786E\u8BA4" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u5DE6\u4FA7\u9009\u62E9\u5B66\u751F\u5377\uFF0C\u4E2D\u95F4\u6D4F\u89C8\u9898\u76EE\u5217\u8868\uFF0C\u53F3\u4FA7\u8C03\u6574 AI \u8BC4\u5206\u3002\u786E\u8BA4\u5168\u90E8\u9898\u76EE\u540E\u5373\u53EF\u8FDB\u5165\u5BFC\u51FA\u9636\u6BB5\u3002" })] }), _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "320px 1fr 360px",
                    gap: 18,
                    alignItems: "stretch",
                }, children: [_jsx(Card, { title: "\u5B66\u751F\u63D0\u4EA4\u961F\u5217", extra: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), size: "small", loading: submissionLoading, onClick: () => loadSubmissions(), children: "\u5237\u65B0" }), style: { minHeight: 480 }, children: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsx(Segmented, { options: SUBMISSION_FILTERS.map((option) => ({ ...option })), value: submissionFilter, onChange: (value) => setSubmissionFilter(value), block: true }), _jsx(Spin, { spinning: submissionLoading || studentsLoading, children: filteredSubmissions.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u63D0\u4EA4", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { dataSource: filteredSubmissions, renderItem: (item) => {
                                            const isActive = item.id === selectedSubmissionId;
                                            const student = studentsMap[item.student_id];
                                            const statusLabel = SUBMISSION_STATUS_LABELS[item.status ?? ""] ?? "待处理";
                                            return (_jsx(List.Item, { style: {
                                                    padding: 12,
                                                    borderRadius: 14,
                                                    border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                                                    background: isActive ? "rgba(37,99,235,0.08)" : "#fff",
                                                    cursor: "pointer",
                                                }, onClick: () => handleSelectSubmission(item.id), children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, wrap: true, children: [_jsx(Text, { strong: true, children: student?.name ?? `学生 #${item.student_id}` }), _jsx(Tag, { color: statusLabel === "已完成" ? "green" : "orange", children: statusLabel })] }), _jsxs(Space, { size: 8, wrap: true, children: [_jsx(Tag, { icon: _jsx(ClockCircleOutlined, {}), color: "blue", children: dayjs(item.submitted_at).format("MM-DD HH:mm") }), typeof item.overall_confidence === "number" && (_jsxs(Tag, { color: "geekblue", children: ["\u7F6E\u4FE1\u5EA6 ", formatConfidence(item.overall_confidence)] })), item.status_detail && _jsx(Tag, { color: "purple", children: "AI \u603B\u7ED3" })] })] }) }, item.id));
                                        } })) })] }) }), _jsx(Card, { title: "\u9898\u76EE\u5BFC\u822A", style: { minHeight: 480 }, extra: _jsxs(Space, { size: 12, children: [_jsx(Popconfirm, { title: "\u786E\u8BA4\u6279\u91CF\u901A\u8FC7\u5F53\u524D\u7B5B\u9009?", description: `将 ${eligibleForConfirm.length} 条作答标记为已通过。`, onConfirm: () => handleBulkStatusUpdate("confirmed", eligibleForConfirm), okText: "\u786E\u8BA4", cancelText: "\u53D6\u6D88", disabled: eligibleForConfirm.length === 0 || bulkUpdating, children: _jsx(Button, { type: "primary", disabled: eligibleForConfirm.length === 0, loading: bulkUpdating, children: "\u4E00\u952E\u901A\u8FC7\u5F53\u524D\u7B5B\u9009" }) }), _jsx(Popconfirm, { title: "\u786E\u8BA4\u6279\u91CF\u6807\u8BB0\u4E3A\u5F85\u67E5?", description: `将 ${eligibleForFlag.length} 条作答标记为待复核。`, onConfirm: () => handleBulkStatusUpdate("needs_review", eligibleForFlag), okText: "\u786E\u8BA4", cancelText: "\u53D6\u6D88", disabled: eligibleForFlag.length === 0 || bulkUpdating, children: _jsx(Button, { danger: true, ghost: true, disabled: eligibleForFlag.length === 0, loading: bulkUpdating, children: "\u6807\u8BB0\u4E3A\u5F85\u67E5" }) })] }), children: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsx(Segmented, { options: RESPONSE_FILTERS.map((option) => ({ ...option })), value: responseFilter, onChange: (value) => setResponseFilter(value), block: true }), _jsxs(Space, { size: 8, wrap: true, children: [_jsxs(Tag, { color: "orange", children: ["\u5F85\u786E\u8BA4 ", activeCount] }), _jsxs(Tag, { color: "orange", children: ["\u5F85\u590D\u6838 ", statusCounts.needs_review] }), _jsxs(Tag, { color: "default", children: ["\u5F85\u5904\u7406 ", statusCounts.pending] }), _jsxs(Tag, { color: "green", children: ["\u5DF2\u5B8C\u6210 ", statusCounts.confirmed] })] }), _jsx(Spin, { spinning: detailLoading, children: filteredResponses.length === 0 ? (_jsx(Empty, { description: "\u5F53\u524D\u7B5B\u9009\u4E0B\u6682\u65E0\u9898\u76EE", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { dataSource: filteredResponses, renderItem: (response) => {
                                            const question = questionMap.get(response.question_id);
                                            const isActive = response.id === selectedResponseId;
                                            const suspicious = Array.isArray(response.suspicious_matches)
                                                ? response.suspicious_matches.length
                                                : 0;
                                            return (_jsx(List.Item, { style: {
                                                    borderRadius: 12,
                                                    border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                                                    background: isActive ? "rgba(37,99,235,0.08)" : "#fff",
                                                    padding: 12,
                                                    cursor: "pointer",
                                                }, onClick: () => setSelectedResponseId(response.id), children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, wrap: true, children: [_jsxs(Tag, { color: "geekblue", children: ["\u9898\u53F7 ", question?.number ?? response.question_id] }), _jsx(Tag, { color: REVIEW_STATUS_COLORS[(response.review_status ?? "pending")], children: REVIEW_STATUS_LABELS[(response.review_status ?? "pending")] }), response.match_strategy && (_jsx(Tag, { color: "default", children: response.match_strategy })), suspicious > 0 && (_jsx(Tooltip, { title: "\u6A21\u578B\u8BA4\u4E3A\u5B58\u5728\u53EF\u7591\u5339\u914D\uFF0C\u8BF7\u4EBA\u5DE5\u786E\u8BA4", placement: "top", children: _jsxs(Tag, { color: "orange", children: ["\u53EF\u7591\u5339\u914D ", suspicious] }) })), response.blocked_supplement && (_jsx(Tooltip, { title: response.blocked_supplement, placement: "top", children: _jsx(Tag, { color: "magenta", children: "\u8865\u5145\u8BF4\u660E" }) }))] }), _jsxs(Space, { size: 12, wrap: true, children: [_jsxs(Text, { type: "secondary", children: ["\u5F97\u5206 ", response.score ?? "--", "/", question?.max_score ?? "--"] }), typeof response.ai_confidence === "number" && (_jsxs(Tag, { color: "geekblue", children: ["AI \u7F6E\u4FE1 ", formatConfidence(response.ai_confidence)] }))] })] }) }, response.id));
                                        } })) })] }) }), _jsx(Card, { title: "\u4F5C\u7B54\u8BE6\u60C5", style: { minHeight: 480 }, extra: detail ? (_jsx(Button, { type: "link", icon: _jsx(HistoryOutlined, {}), onClick: () => {
                                setHistoryOpen(true);
                                void refreshLogs(detail.id);
                            }, children: "\u64CD\u4F5C\u5386\u53F2" })) : undefined, children: detailLoading ? (_jsx("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", height: 360 }, children: _jsx(Spin, {}) })) : !currentResponse ? (_jsx(Empty, { description: "\u8BF7\u9009\u62E9\u9898\u76EE", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, wrap: true, children: [_jsxs(Tag, { color: "geekblue", children: ["\u9898\u53F7 ", currentQuestion?.number ?? currentResponse.question_id] }), _jsx(Tag, { color: REVIEW_STATUS_COLORS[(currentResponse.review_status ?? "pending")], children: REVIEW_STATUS_LABELS[(currentResponse.review_status ?? "pending")] }), currentResponse.match_strategy && (_jsx(Tag, { color: "default", children: currentResponse.match_strategy })), typeof currentResponse.ai_confidence === "number" && (_jsxs(Tag, { color: "geekblue", children: ["AI \u7F6E\u4FE1 ", formatConfidence(currentResponse.ai_confidence)] }))] }), blockedSupplement && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u6A21\u578B\u63D0\u793A", description: blockedSupplement })), _jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Text, { type: "secondary", children: "\u5B66\u751F\u7B54\u6848" }), _jsx(Card, { size: "small", bordered: true, style: { background: "#f8fafc" }, children: _jsx(Paragraph, { style: { marginBottom: 0 }, children: currentResponse.student_answer ?? "未识别到学生答案" }) })] }), _jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Text, { type: "secondary", children: "\u6807\u51C6\u7B54\u6848\uFF08JSON\uFF09" }), _jsx(Card, { size: "small", bordered: true, style: { background: "#f1f5f9" }, children: _jsx("pre", { style: { margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }, children: JSON.stringify(currentQuestion?.answer_key ?? {}, null, 2) }) })] }), suspiciousMatches.length > 0 && (_jsx(Card, { size: "small", title: "\u53EF\u7591\u5339\u914D", bordered: true, children: _jsx(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: suspiciousMatches.map((record, index) => {
                                            const answer = typeof record.answer === "string"
                                                ? record.answer
                                                : record.answer != null
                                                    ? String(record.answer)
                                                    : "--";
                                            const reason = typeof record.reason === "string"
                                                ? record.reason
                                                : record.reason != null
                                                    ? String(record.reason)
                                                    : "模型未给出理由";
                                            const confidence = typeof record.confidence === "number"
                                                ? formatConfidence(record.confidence)
                                                : "--";
                                            return (_jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsx(Text, { children: reason }), _jsxs(Text, { type: "secondary", children: ["\u5B66\u751F\u7B54\u6848\uFF1A", answer] }), _jsxs(Text, { type: "secondary", children: ["\u7F6E\u4FE1\u5EA6\uFF1A", confidence] })] }, `${answer}-${index}`));
                                        }) }) })), _jsxs(Space, { direction: "vertical", size: 12, children: [_jsx(Text, { type: "secondary", children: "\u5F97\u5206" }), _jsx(InputNumber, { min: 0, max: currentQuestion?.max_score ?? 10, step: 0.5, style: { width: "100%" }, value: scoreDraft ?? undefined, onChange: (value) => setScoreDraft(value === null ? null : Number(value)), disabled: bulkUpdating }), _jsxs(Space, { size: 12, wrap: true, children: [_jsx(Button, { onClick: () => handleSaveResponse(currentQuestion?.max_score ?? 0, commentDraft, true), icon: _jsx(CheckCircleOutlined, {}), loading: savingResponse, children: "\u6807\u8BB0\u6EE1\u5206" }), _jsx(Button, { danger: true, onClick: () => handleSaveResponse(0, commentDraft, true), loading: savingResponse, children: "\u6807\u8BB0\u96F6\u5206" }), _jsx(Button, { type: "primary", icon: _jsx(CheckCircleOutlined, {}), onClick: () => handleBulkStatusUpdate("confirmed", [currentResponse]), loading: bulkUpdating, children: "\u786E\u8BA4\u901A\u8FC7" }), _jsx(Button, { icon: _jsx(WarningOutlined, {}), danger: true, ghost: true, onClick: () => handleBulkStatusUpdate("needs_review", [currentResponse]), loading: bulkUpdating, children: "\u6807\u8BB0\u5F85\u67E5" })] })] }), _jsxs(Space, { direction: "vertical", size: 8, children: [_jsx(Text, { type: "secondary", children: "\u6559\u5E08\u5907\u6CE8" }), _jsx(Input.TextArea, { autoSize: { minRows: 3, maxRows: 6 }, value: commentDraft, onChange: (event) => setCommentDraft(event.target.value), placeholder: "\u586B\u5199\u6559\u5E08\u5907\u6CE8\u6216\u6279\u6CE8" })] }), _jsxs(Space, { size: 12, wrap: true, children: [_jsx(Button, { type: "primary", icon: _jsx(CommentOutlined, {}), onClick: () => handleSaveResponse(scoreDraft ?? currentResponse.score ?? 0, commentDraft, true), loading: savingResponse, children: "\u4FDD\u5B58\u5E76\u67E5\u770B\u4E0B\u4E00\u9898" }), _jsx(Button, { onClick: () => handleSaveResponse(scoreDraft ?? currentResponse.score ?? 0, commentDraft, false), loading: savingResponse, children: "\u4EC5\u4FDD\u5B58" }), _jsxs(Text, { type: "secondary", children: ["\u5DF2\u786E\u8BA4 ", reviewSummary.confirmed, " / ", reviewSummary.total] }), exportDisabledReason ? (_jsx(Tooltip, { title: exportDisabledReason, children: _jsx("span", { children: _jsx(Button, { type: "primary", icon: _jsx(CheckCircleOutlined, {}), onClick: handleProceedToCompletion, disabled: exportDisabled, children: "\u5B8C\u6210\u5E76\u5BFC\u51FA" }) }) })) : (_jsx(Button, { type: "primary", icon: _jsx(CheckCircleOutlined, {}), onClick: handleProceedToCompletion, disabled: exportDisabled, children: "\u5B8C\u6210\u5E76\u5BFC\u51FA" }))] })] })) })] }), _jsx(Drawer, { title: "\u64CD\u4F5C\u5386\u53F2", open: historyOpen, onClose: () => setHistoryOpen(false), width: 420, children: logsLoading ? (_jsx(Spin, {})) : logs.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u65E5\u5FD7\u8BB0\u5F55", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { dataSource: logs, renderItem: (log) => (_jsx(List.Item, { children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 8, wrap: true, children: [_jsx(Badge, { color: "blue", text: log.step }), _jsx(Text, { type: "secondary", children: dayjs(log.created_at).format("YYYY-MM-DD HH:mm") })] }), log.detail && _jsx(Text, { children: log.detail })] }) }, log.id)) })) }), _jsx(FloatButton, { icon: _jsx(HistoryOutlined, {}), tooltip: "\u64CD\u4F5C\u5386\u53F2", onClick: () => {
                    if (detail) {
                        setHistoryOpen(true);
                        void refreshLogs(detail.id);
                    }
                    else {
                        message.warning("请先选择一份学生卷查看操作历史");
                    }
                } })] }));
};
export default StepReviewConfirm;
