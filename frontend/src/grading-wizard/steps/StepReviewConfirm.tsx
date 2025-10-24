import dayjs from "dayjs";
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  FloatButton,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  HistoryOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import type {
  ProcessingLog,
  Question,
  ResponseReviewStatus,
  SubmissionDetail,
  SubmissionResponse,
  Student,
} from "../../types";
import {
  bulkUpdateResponses,
  fetchSubmission,
  fetchSubmissionLogs,
  fetchSubmissions,
  fetchStudents,
  updateManualScore,
} from "../../api/services";
import { useWizardStore } from "../useWizardStore";

const { Title, Text, Paragraph } = Typography;

const SUBMISSION_FILTERS = [
  { label: "全部", value: "all" },
  { label: "待复核", value: "needs_review" },
  { label: "待处理", value: "pending" },
  { label: "已完成", value: "graded" },
] as const;

const RESPONSE_FILTERS = [
  { label: "待确认", value: "active" },
  { label: "待复核", value: "needs_review" },
  { label: "待处理", value: "pending" },
  { label: "已完成", value: "confirmed" },
  { label: "全部", value: "all" },
] as const;

type SubmissionFilterValue = (typeof SUBMISSION_FILTERS)[number]["value"];
type ResponseFilterValue = (typeof RESPONSE_FILTERS)[number]["value"];

type UndoSnapshot = {
  id: number;
  previousStatus: ResponseReviewStatus;
};

type UndoAction = {
  submissionId: number;
  snapshots: UndoSnapshot[];
  messageKey: string;
};

const REVIEW_STATUS_LABELS: Record<ResponseReviewStatus, string> = {
  confirmed: "已通过",
  needs_review: "待复核",
  pending: "待处理",
};

const REVIEW_STATUS_COLORS: Record<ResponseReviewStatus, string> = {
  confirmed: "green",
  needs_review: "orange",
  pending: "default",
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  graded: "已完成",
  needs_review: "待复核",
  pending: "待处理",
};

const formatConfidence = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "--";

const StepReviewConfirm = () => {
  const {
    state: { selectedExamId, exams, session },
    actions: { goToStep },
  } = useWizardStore();

  const location = useLocation();
  const resumeSubmissionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("resume");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }, [location.search]);

  const [studentsMap, setStudentsMap] = useState<Record<number, Student>>({});
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionFilter, setSubmissionFilter] =
    useState<SubmissionFilterValue>("needs_review");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);

  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [responseFilter, setResponseFilter] = useState<ResponseFilterValue>("active");
  const [scoreDraft, setScoreDraft] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [savingResponse, setSavingResponse] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId),
    [exams, selectedExamId],
  );

  const questionMap = useMemo(() => {
    const map = new Map<number, Question>();
    if (!selectedExam) return map;
    selectedExam.questions.forEach((question) => map.set(question.id, question));
    return map;
  }, [selectedExam]);

  useEffect(() => {
    if (resumeSubmissionId) {
      setSubmissionFilter("all");
      setSelectedSubmissionId(resumeSubmissionId);
    }
  }, [resumeSubmissionId]);

  const responseList = useMemo(
    () => detail?.responses.filter((item) => item.applies_to_student) ?? [],
    [detail],
  );

  const statusCounts = useMemo(() => {
    const counts = { total: 0, confirmed: 0, needs_review: 0, pending: 0 };
    responseList.forEach((response) => {
      counts.total += 1;
      const key = (response.review_status ?? "pending") as ResponseReviewStatus;
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
          } else {
            summary.pending += 1;
          }
    });
  });
  summary.confirmed = Math.max(summary.confirmed, summary.total - summary.pending);
  return summary;
}, [submissions]);

  const exportDisabled =
    reviewSummary.pending > 0 || reviewSummary.total === 0 || !selectedExamId;
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

  const currentResponse = useMemo(
    () => responseList.find((response) => response.id === selectedResponseId) ?? null,
    [responseList, selectedResponseId],
  );

  const currentQuestion = currentResponse
    ? questionMap.get(currentResponse.question_id) ?? null
    : null;

  useEffect(() => {
    if (!currentResponse) {
      setScoreDraft(null);
      setCommentDraft("");
      return;
    }
    setScoreDraft(
      typeof currentResponse.score === "number" ? currentResponse.score : null,
    );
    setCommentDraft(currentResponse.teacher_comment ?? "");
  }, [currentResponse]);

  const eligibleForConfirm = useMemo(
    () => filteredResponses.filter((response) => response.review_status !== "confirmed"),
    [filteredResponses],
  );

  const eligibleForFlag = useMemo(
    () => filteredResponses.filter((response) => response.review_status !== "needs_review"),
    [filteredResponses],
  );

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
      const unresolved = submission.responses.filter(
        (response) => response.applies_to_student && response.review_status !== "confirmed",
      );
      return unresolved.length === 0;
    }).length;
    const pending = Math.max(total - completed, 0);
    return { total, completed, pending };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    if (submissionFilter === "all") return submissions;
    return submissions.filter((item) => {
      const statusText = (item.status ?? "").toLowerCase();
      if (submissionFilter === "graded") return statusText.includes("graded");
      if (submissionFilter === "pending") return statusText.includes("pending");
      return (
        statusText.includes("needs") ||
        statusText.includes("review") ||
        item.responses.some((response) => response.review_status === "needs_review")
      );
    });
  }, [submissionFilter, submissions]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const data = await fetchStudents();
      const map: Record<number, Student> = {};
      data.forEach((student) => {
        map[student.id] = student;
      });
      setStudentsMap(map);
    } catch (error) {
      const detailMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (error instanceof Error ? error.message : "加载学生列表失败");
      message.error(detailMessage);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!selectedExamId) return;
    setSubmissionLoading(true);
    try {
      const data = await fetchSubmissions({ exam_id: selectedExamId });
      data.sort((a, b) => {
        const priority = (status: string | undefined | null) => {
          const value = (status ?? "").toLowerCase();
          if (value.includes("needs")) return 0;
          if (value.includes("pending")) return 1;
          return 2;
        };
        const diff = priority(a.status) - priority(b.status);
        if (diff !== 0) return diff;
        return (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "");
      });
      setSubmissions(data);
      if (data.length > 0) {
        setSelectedSubmissionId((prev) => prev ?? data[0].id);
      } else {
        setSelectedSubmissionId(null);
      }
    } catch (error) {
      const detailMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (error instanceof Error ? error.message : "加载提交记录失败");
      message.error(detailMessage);
    } finally {
      setSubmissionLoading(false);
    }
  }, [selectedExamId]);

  const refreshLogs = useCallback(async (submissionId: number) => {
    setLogsLoading(true);
    try {
      const list = await fetchSubmissionLogs(submissionId);
      setLogs(list.items ?? []);
    } catch (error) {
      const detailMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (error instanceof Error ? error.message : "获取操作历史失败");
      message.error(detailMessage);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadSubmissionDetail = useCallback(
    async (submissionId: number) => {
      setDetailLoading(true);
      setLogsLoading(true);
      try {
        const [submissionDetail, logList] = await Promise.all([
          fetchSubmission(submissionId),
          fetchSubmissionLogs(submissionId).catch(() => ({ items: [] })),
        ]);
        setDetail(submissionDetail);
        setLogs(logList.items ?? []);
        setSubmissions((prev) =>
          prev.map((item) => (item.id === submissionDetail.id ? submissionDetail : item)),
        );
        const prioritized = submissionDetail.responses.find(
          (response) => response.applies_to_student && response.review_status === "needs_review",
        );
        const fallback = submissionDetail.responses.find((response) => response.applies_to_student);
        setSelectedResponseId(prioritized?.id ?? fallback?.id ?? null);
      } catch (error) {
        const detailMessage =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (error instanceof Error ? error.message : "获取批改详情失败");
        message.error(detailMessage);
      } finally {
        setDetailLoading(false);
        setLogsLoading(false);
      }
    },
    [],
  );

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

    const payloadRoot = (session.payload ?? {}) as Record<string, unknown>;
    const wizardProgress =
      payloadRoot.wizardProgress && typeof payloadRoot.wizardProgress === "object"
        ? (payloadRoot.wizardProgress as Record<string, unknown>)
        : {};
    const uploadsSegment =
      wizardProgress.uploads && typeof wizardProgress.uploads === "object"
        ? (wizardProgress.uploads as Record<string, unknown>)
        : {};

    const toNum = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value)
        ? value
        : Number.isFinite(Number(value))
        ? Number(value)
        : undefined;

    const matches =
      toNum(uploadsSegment.total) === total &&
      (toNum(uploadsSegment.completed) ?? toNum((uploadsSegment as Record<string, unknown>).confirmed)) === completed &&
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

  const handleSelectSubmission = (submissionId: number) => {
    setSelectedSubmissionId(submissionId);
    setResponseFilter("active");
  };

  const handleUndo = useCallback(
    async (messageKey: string) => {
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
        const grouped = undoAction.snapshots.reduce<Record<ResponseReviewStatus, number[]>>(
          (accumulator, snapshot) => {
            const status = snapshot.previousStatus;
            accumulator[status] = accumulator[status] ?? [];
            accumulator[status].push(snapshot.id);
            return accumulator;
          },
          { confirmed: [], needs_review: [], pending: [] },
        );
        for (const [statusKey, ids] of Object.entries(grouped)) {
          if (!ids.length) continue;
          const status = statusKey as ResponseReviewStatus;
          await bulkUpdateResponses(undoAction.submissionId, {
            response_ids: ids,
            target_status: status,
          });
        }
        const refreshed = await fetchSubmission(undoAction.submissionId);
        setDetail(refreshed);
        setSubmissions((prev) =>
          prev.map((item) => (item.id === refreshed.id ? refreshed : item)),
        );
        await refreshLogs(undoAction.submissionId);
        const nextActive =
          refreshed.responses.find(
            (response) => response.applies_to_student && response.review_status !== "confirmed",
          ) ?? refreshed.responses.find((response) => response.applies_to_student);
        setSelectedResponseId(nextActive?.id ?? null);
        message.success("已撤销批量操作");
      } catch (error) {
        const detailMessage =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (error instanceof Error ? error.message : "撤销操作失败");
        message.error(detailMessage);
      } finally {
        setUndoAction(null);
        setBulkUpdating(false);
      }
    },
    [refreshLogs, setSubmissions, undoAction],
  );

  const handleBulkStatusUpdate = useCallback(
    async (targetStatus: ResponseReviewStatus, candidates: SubmissionResponse[]) => {
      if (!detail || !candidates.length) {
        return;
      }
      setBulkUpdating(true);
      const responseIds = candidates.map((item) => item.id);
      const snapshots: UndoSnapshot[] = candidates
        .filter((item) => item.review_status !== targetStatus)
        .map((item) => ({
          id: item.id,
          previousStatus: (item.review_status ?? "pending") as ResponseReviewStatus,
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
        setSubmissions((prev) =>
          prev.map((item) => (item.id === updatedSubmission.id ? updatedSubmission : item)),
        );
        void refreshLogs(detail.id);

        const targetLabel = REVIEW_STATUS_LABELS[targetStatus];
        const fallbackMessage = snapshots.length
          ? `已将 ${snapshots.length} 条作答标记为${targetLabel}`
          : `符合条件的作答已是${targetLabel}状态`;
        const serverMessage = result.message ?? fallbackMessage;

        if (!snapshots.length) {
          message.success(serverMessage);
        } else {
          const key = `undo-${Date.now()}`;
          setUndoAction({ submissionId: detail.id, snapshots, messageKey: key });
          message.open({
            key,
            type: "success",
            duration: 3,
            content: (
              <Space size={12} align="center">
                <span>{serverMessage}</span>
                <Button type="link" size="small" onClick={() => handleUndo(key)}>
                  撤销
                </Button>
              </Space>
            ),
            onClose: () => {
              setUndoAction((prev) => (prev && prev.messageKey === key ? null : prev));
            },
          });
        }

        if (
          targetStatus === "confirmed" &&
          snapshots.some((snapshot) => snapshot.id === selectedResponseId)
        ) {
          const nextActive =
            updatedSubmission.responses.find(
              (response) =>
                response.applies_to_student && response.review_status !== "confirmed",
            ) ?? updatedSubmission.responses.find((response) => response.applies_to_student);
          setSelectedResponseId(nextActive?.id ?? null);
        }
        if (targetStatus === "needs_review" && snapshots.length) {
          setSelectedResponseId(snapshots[0].id);
        }
      } catch (error) {
        const detailMessage =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (error instanceof Error ? error.message : "批量操作失败");
        message.error(detailMessage);
      } finally {
        setBulkUpdating(false);
      }
    },
    [detail, handleUndo, refreshLogs, selectedResponseId, setSubmissions, undoAction],
  );

  const handleSaveResponse = async (nextScore: number | null, nextComment: string, advance: boolean) => {
    if (!currentResponse || !detail || !selectedSubmissionId) return;
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
      const nextResponseState: SubmissionResponse = { ...currentResponse, ...updated };
      const updatedResponses = responseList.map((response) =>
        response.id === nextResponseState.id ? nextResponseState : response,
      );
      const stillPending = updatedResponses.some(
        (response) => response.review_status !== "confirmed",
      );
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          responses: prev.responses.map((response) =>
            response.id === nextResponseState.id ? nextResponseState : response,
          ),
          status: stillPending ? "needs_review" : "graded",
        };
      });
      setSubmissions((prev) =>
        prev.map((submission) =>
          submission.id === selectedSubmissionId
            ? {
                ...submission,
                responses: submission.responses.map((response) =>
                  response.id === nextResponseState.id ? nextResponseState : response,
                ),
                status: stillPending ? "needs_review" : "graded",
              }
            : submission,
        ),
      );
      setScoreDraft(nextResponseState.score ?? null);
      setCommentDraft(nextResponseState.teacher_comment ?? "");
      message.success("评分已保存");
      if (advance) {
        const currentIndex = updatedResponses.findIndex(
          (response) => response.id === nextResponseState.id,
        );
        const nextCandidate = updatedResponses
          .slice(currentIndex + 1)
          .find((response) => response.review_status !== "confirmed");
        if (nextCandidate) {
          setSelectedResponseId(nextCandidate.id);
        }
      }
    } catch (error) {
      const detailMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (error instanceof Error ? error.message : "保存评分失败");
      message.error(detailMessage);
    } finally {
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
    } catch (error) {
      const detailMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (error instanceof Error ? error.message : "无法进入下一阶段");
      message.error(detailMessage);
    }
  };

  if (!selectedExamId || !selectedExam) {
    return (
      <Alert
        type="warning"
        showIcon
        message="尚未选择试卷"
        description="请返回试卷配置阶段完成选择后再来确认 AI 批改结果。"
      />
    );
  }

  const suspiciousMatches = Array.isArray(currentResponse?.suspicious_matches)
    ? (currentResponse?.suspicious_matches as Array<Record<string, unknown>>)
    : [];
  const blockedSupplement = currentResponse?.blocked_supplement;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Space direction="vertical" size={6}>
        <Title level={3} style={{ margin: 0 }}>
          AI 批改确认
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          左侧选择学生卷，中间浏览题目列表，右侧调整 AI 评分。确认全部题目后即可进入导出阶段。
        </Paragraph>
      </Space>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 360px",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <Card
          title="学生提交队列"
          extra={
            <Button
              icon={<ReloadOutlined />}
              size="small"
              loading={submissionLoading}
              onClick={() => loadSubmissions()}
            >
              刷新
            </Button>
          }
          style={{ minHeight: 480 }}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Segmented
              options={SUBMISSION_FILTERS.map((option) => ({ ...option }))}
              value={submissionFilter}
              onChange={(value) => setSubmissionFilter(value as SubmissionFilterValue)}
              block
            />
            <Spin spinning={submissionLoading || studentsLoading}>
              {filteredSubmissions.length === 0 ? (
                <Empty description="暂无提交" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={filteredSubmissions}
                  renderItem={(item) => {
                    const isActive = item.id === selectedSubmissionId;
                    const student = studentsMap[item.student_id];
                    const statusLabel =
                      SUBMISSION_STATUS_LABELS[item.status ?? ""] ?? "待处理";
                    return (
                      <List.Item
                        key={item.id}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                          background: isActive ? "rgba(37,99,235,0.08)" : "#fff",
                          cursor: "pointer",
                        }}
                        onClick={() => handleSelectSubmission(item.id)}
                      >
                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                          <Space align="center" size={8} wrap>
                            <Text strong>{student?.name ?? `学生 #${item.student_id}`}</Text>
                            <Tag color={statusLabel === "已完成" ? "green" : "orange"}>
                              {statusLabel}
                            </Tag>
                          </Space>
                          <Space size={8} wrap>
                            <Tag icon={<ClockCircleOutlined />} color="blue">
                              {dayjs(item.submitted_at).format("MM-DD HH:mm")}
                            </Tag>
                            {typeof item.overall_confidence === "number" && (
                              <Tag color="geekblue">
                                置信度 {formatConfidence(item.overall_confidence)}
                              </Tag>
                            )}
                            {item.status_detail && <Tag color="purple">AI 总结</Tag>}
                          </Space>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Spin>
          </Space>
        </Card>
        <Card
          title="题目导航"
          style={{ minHeight: 480 }}
          extra={
            <Space size={12}>
              <Popconfirm
                title="确认批量通过当前筛选?"
                description={`将 ${eligibleForConfirm.length} 条作答标记为已通过。`}
                onConfirm={() => handleBulkStatusUpdate("confirmed", eligibleForConfirm)}
                okText="确认"
                cancelText="取消"
                disabled={eligibleForConfirm.length === 0 || bulkUpdating}
              >
                <Button
                  type="primary"
                  disabled={eligibleForConfirm.length === 0}
                  loading={bulkUpdating}
                >
                  一键通过当前筛选
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确认批量标记为待查?"
                description={`将 ${eligibleForFlag.length} 条作答标记为待复核。`}
                onConfirm={() => handleBulkStatusUpdate("needs_review", eligibleForFlag)}
                okText="确认"
                cancelText="取消"
                disabled={eligibleForFlag.length === 0 || bulkUpdating}
              >
                <Button
                  danger
                  ghost
                  disabled={eligibleForFlag.length === 0}
                  loading={bulkUpdating}
                >
                  标记为待查
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Segmented
              options={RESPONSE_FILTERS.map((option) => ({ ...option }))}
              value={responseFilter}
              onChange={(value) => setResponseFilter(value as ResponseFilterValue)}
              block
            />
            <Space size={8} wrap>
              <Tag color="orange">待确认 {activeCount}</Tag>
              <Tag color="orange">待复核 {statusCounts.needs_review}</Tag>
              <Tag color="default">待处理 {statusCounts.pending}</Tag>
              <Tag color="green">已完成 {statusCounts.confirmed}</Tag>
            </Space>
            <Spin spinning={detailLoading}>
              {filteredResponses.length === 0 ? (
                <Empty description="当前筛选下暂无题目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={filteredResponses}
                  renderItem={(response) => {
                    const question = questionMap.get(response.question_id);
                    const isActive = response.id === selectedResponseId;
                    const suspicious = Array.isArray(response.suspicious_matches)
                      ? response.suspicious_matches.length
                      : 0;
                    return (
                      <List.Item
                        key={response.id}
                        style={{
                          borderRadius: 12,
                          border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                          background: isActive ? "rgba(37,99,235,0.08)" : "#fff",
                          padding: 12,
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedResponseId(response.id)}
                      >
                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                          <Space align="center" size={8} wrap>
                            <Tag color="geekblue">
                              题号 {question?.number ?? response.question_id}
                            </Tag>
                            <Tag
                              color={
                                REVIEW_STATUS_COLORS[
                                  (response.review_status ?? "pending") as ResponseReviewStatus
                                ]
                              }
                            >
                              {
                                REVIEW_STATUS_LABELS[
                                  (response.review_status ?? "pending") as ResponseReviewStatus
                                ]
                              }
                            </Tag>
                            {response.match_strategy && (
                              <Tag color="default">{response.match_strategy}</Tag>
                            )}
                            {suspicious > 0 && (
                              <Tooltip
                                title="模型认为存在可疑匹配，请人工确认"
                                placement="top"
                              >
                                <Tag color="orange">可疑匹配 {suspicious}</Tag>
                              </Tooltip>
                            )}
                            {response.blocked_supplement && (
                              <Tooltip title={response.blocked_supplement} placement="top">
                                <Tag color="magenta">补充说明</Tag>
                              </Tooltip>
                            )}
                          </Space>
                          <Space size={12} wrap>
                            <Text type="secondary">
                              得分 {response.score ?? "--"}/{question?.max_score ?? "--"}
                            </Text>
                            {typeof response.ai_confidence === "number" && (
                              <Tag color="geekblue">
                                AI 置信 {formatConfidence(response.ai_confidence)}
                              </Tag>
                            )}
                          </Space>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Spin>
          </Space>
        </Card>
        <Card
          title="作答详情"
          style={{ minHeight: 480 }}
          extra={
            detail ? (
              <Button
                type="link"
                icon={<HistoryOutlined />}
                onClick={() => {
                  setHistoryOpen(true);
                  void refreshLogs(detail.id);
                }}
              >
                操作历史
              </Button>
            ) : undefined
          }
        >
          {detailLoading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 360 }}>
              <Spin />
            </div>
          ) : !currentResponse ? (
            <Empty description="请选择题目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Space align="center" size={8} wrap>
                <Tag color="geekblue">
                  题号 {currentQuestion?.number ?? currentResponse.question_id}
                </Tag>
                <Tag
                  color={
                    REVIEW_STATUS_COLORS[
                      (currentResponse.review_status ?? "pending") as ResponseReviewStatus
                    ]
                  }
                >
                  {
                    REVIEW_STATUS_LABELS[
                      (currentResponse.review_status ?? "pending") as ResponseReviewStatus
                    ]
                  }
                </Tag>
                {currentResponse.match_strategy && (
                  <Tag color="default">{currentResponse.match_strategy}</Tag>
                )}
                {typeof currentResponse.ai_confidence === "number" && (
                  <Tag color="geekblue">
                    AI 置信 {formatConfidence(currentResponse.ai_confidence)}
                  </Tag>
                )}
              </Space>

              {blockedSupplement && (
                <Alert
                  type="warning"
                  showIcon
                  message="模型提示"
                  description={blockedSupplement}
                />
              )}

              <Space direction="vertical" size={6}>
                <Text type="secondary">学生答案</Text>
                <Card size="small" bordered style={{ background: "#f8fafc" }}>
                  <Paragraph style={{ marginBottom: 0 }}>
                    {currentResponse.student_answer ?? "未识别到学生答案"}
                  </Paragraph>
                </Card>
              </Space>

              <Space direction="vertical" size={6}>
                <Text type="secondary">标准答案（JSON）</Text>
                <Card size="small" bordered style={{ background: "#f1f5f9" }}>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {JSON.stringify(currentQuestion?.answer_key ?? {}, null, 2)}
                  </pre>
                </Card>
              </Space>

              {suspiciousMatches.length > 0 && (
                <Card size="small" title="可疑匹配" bordered>
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    {suspiciousMatches.map((record, index) => {
                      const answer =
                        typeof record.answer === "string"
                          ? record.answer
                          : record.answer != null
                          ? String(record.answer)
                          : "--";
                      const reason =
                        typeof record.reason === "string"
                          ? record.reason
                          : record.reason != null
                          ? String(record.reason)
                          : "模型未给出理由";
                      const confidence =
                        typeof record.confidence === "number"
                          ? formatConfidence(record.confidence)
                          : "--";
                      return (
                        <Space
                          key={`${answer}-${index}`}
                          direction="vertical"
                          size={4}
                          style={{ width: "100%" }}
                        >
                          <Text>{reason}</Text>
                          <Text type="secondary">学生答案：{answer}</Text>
                          <Text type="secondary">置信度：{confidence}</Text>
                        </Space>
                      );
                    })}
                  </Space>
                </Card>
              )}

              <Space direction="vertical" size={12}>
                <Text type="secondary">得分</Text>
                <InputNumber
                  min={0}
                  max={currentQuestion?.max_score ?? 10}
                  step={0.5}
                  style={{ width: "100%" }}
                  value={scoreDraft ?? undefined}
                  onChange={(value) => setScoreDraft(value === null ? null : Number(value))}
                  disabled={bulkUpdating}
                />
                <Space size={12} wrap>
                  <Button
                    onClick={() =>
                      handleSaveResponse(currentQuestion?.max_score ?? 0, commentDraft, true)
                    }
                    icon={<CheckCircleOutlined />}
                    loading={savingResponse}
                  >
                    标记满分
                  </Button>
                  <Button
                    danger
                    onClick={() => handleSaveResponse(0, commentDraft, true)}
                    loading={savingResponse}
                  >
                    标记零分
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleBulkStatusUpdate("confirmed", [currentResponse])}
                    loading={bulkUpdating}
                  >
                    确认通过
                  </Button>
                  <Button
                    icon={<WarningOutlined />}
                    danger
                    ghost
                    onClick={() => handleBulkStatusUpdate("needs_review", [currentResponse])}
                    loading={bulkUpdating}
                  >
                    标记待查
                  </Button>
                </Space>
              </Space>

              <Space direction="vertical" size={8}>
                <Text type="secondary">教师备注</Text>
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="填写教师备注或批注"
                />
              </Space>

              <Space size={12} wrap>
                <Button
                  type="primary"
                  icon={<CommentOutlined />}
                  onClick={() =>
                    handleSaveResponse(
                      scoreDraft ?? currentResponse.score ?? 0,
                      commentDraft,
                      true,
                    )
                  }
                  loading={savingResponse}
                >
                  保存并查看下一题
                </Button>
                <Button
                  onClick={() =>
                    handleSaveResponse(
                      scoreDraft ?? currentResponse.score ?? 0,
                      commentDraft,
                      false,
                    )
                  }
                  loading={savingResponse}
                >
                  仅保存
                </Button>
                <Text type="secondary">
                  已确认 {reviewSummary.confirmed} / {reviewSummary.total}
                </Text>
                {exportDisabledReason ? (
                  <Tooltip title={exportDisabledReason}>
                    <span>
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleProceedToCompletion}
                        disabled={exportDisabled}
                      >
                        完成并导出
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleProceedToCompletion}
                    disabled={exportDisabled}
                  >
                    完成并导出
                  </Button>
                )}
              </Space>
            </Space>
          )}
        </Card>
      </div>

      <Drawer
        title="操作历史"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        width={420}
      >
        {logsLoading ? (
          <Spin />
        ) : logs.length === 0 ? (
          <Empty description="暂无日志记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={logs}
            renderItem={(log) => (
              <List.Item key={log.id}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space align="center" size={8} wrap>
                    <Badge color="blue" text={log.step} />
                    <Text type="secondary">
                      {dayjs(log.created_at).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  </Space>
                  {log.detail && <Text>{log.detail}</Text>}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Drawer>
      <FloatButton
        icon={<HistoryOutlined />}
        tooltip="操作历史"
        onClick={() => {
          if (detail) {
            setHistoryOpen(true);
            void refreshLogs(detail.id);
          } else {
            message.warning("请先选择一份学生卷查看操作历史");
          }
        }}
      />
    </Space>
  );
};

export default StepReviewConfirm;


