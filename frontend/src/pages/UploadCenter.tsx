import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CloudUploadOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchActiveGradingSession,
  fetchExams,
  fetchStudents,
  fetchSubmission,
  fetchSubmissionHistory,
  fetchSubmissionLogs,
} from "../api/services";
import PageLayout from "../components/PageLayout";
import type {
  Exam,
  GradingSession,
  ProcessingLog,
  SubmissionDetail,
  SubmissionHistoryEntry,
  Student,
} from "../types";
import useResponsive from "../hooks/useResponsive";

const { Title, Paragraph, Text } = Typography;

const HISTORY_LIMIT = 20;

const STATUS_OPTIONS = [
  { label: "全部状态", value: undefined },
  { label: "待处理", value: "pending" },
  { label: "待人工确认", value: "needs_review" },
  { label: "已完成", value: "graded" },
];

const statusDisplay = (raw?: string | null) => {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("needs")) return "待人工确认";
  if (value.includes("pending")) return "待处理";
  if (value.includes("graded")) return "已完成";
  return value || "--";
};

const pickWizardStep = (submission: SubmissionDetail): number => {
  const status = (submission.status ?? "").toLowerCase();
  if (status.includes("needs") || submission.responses.some((item) => item.review_status === "needs_review")) {
    return 4;
  }
  if (status.includes("pending")) {
    return 3;
  }
  return 5;
};

const resolveStatusColor = (status?: string | null) => {
  const value = (status ?? "").toLowerCase();
  if (value === "error") return "red";
  if (value === "warning") return "orange";
  if (value === "success") return "green";
  return "blue";
};

const resolveStepColor = (status?: string | null) => resolveStatusColor(status);

const resolveLogColor = (log: ProcessingLog) => {
  const metadataStatus = typeof log.metadata?.status === "string" ? log.metadata?.status : undefined;
  const base = resolveStatusColor(metadataStatus);
  if (base === "blue") {
    if (log.actor_type === "assistant") return "geekblue";
    if (log.actor_type === "teacher") return "purple";
  }
  return base;
};

const translateActorType = (actorType: string) => {
  if (actorType === "teacher") return "教师";
  if (actorType === "assistant") return "AI";
  return "系统";
};

const UploadCenter = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<{ examId?: number; studentId?: number; status?: string }>({});

  const [history, setHistory] = useState<SubmissionHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [activeSession, setActiveSession] = useState<GradingSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSubmission, setDetailSubmission] = useState<SubmissionDetail | null>(null);
  const [detailLogs, setDetailLogs] = useState<ProcessingLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadMetadata = useCallback(async () => {
    try {
      const [examList, studentList] = await Promise.all([fetchExams(), fetchStudents()]);
      setExams(examList);
      setStudents(studentList);
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "基础数据加载失败")
      );
      message.error(detail);
    }
  }, []);

  const ensureActiveSession = useCallback(async () => {
    const teacherId = exams.find((exam) => exam.teacher_id)?.teacher_id;
    if (!teacherId) {
      setActiveSession(null);
      return;
    }
    try {
      setSessionLoading(true);
      const session = await fetchActiveGradingSession(teacherId).catch(() => null);
      setActiveSession(session);
    } finally {
      setSessionLoading(false);
    }
  }, [exams]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchSubmissionHistory({
        exam_id: filters.examId,
        student_id: filters.studentId,
        status: filters.status,
        limit: HISTORY_LIMIT,
      });
      setHistory(data);
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "历史记录获取失败")
      );
      message.error(detail);
    } finally {
      setHistoryLoading(false);
    }
  }, [filters.examId, filters.studentId, filters.status]);

  const openSubmissionDetail = useCallback(async (submissionId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [submission, logList] = await Promise.all([
        fetchSubmission(submissionId),
        fetchSubmissionLogs(submissionId).catch(() => ({ items: [] })),
      ]);
      setDetailSubmission(submission);
      setDetailLogs(logList.items ?? []);
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "提交详情加载失败")
      );
      message.error(detail);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailSubmission(null);
    setDetailLogs([]);
  };

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void ensureActiveSession();
  }, [ensureActiveSession]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const examOptions = useMemo(() => {
    const base: { value: number | undefined; label: string }[] = [{ value: undefined, label: "全部试卷" }];
    return base.concat(exams.map((exam) => ({ value: exam.id, label: exam.title })));
  }, [exams]);

  const studentOptions = useMemo(() => {
    const base: { value: number | undefined; label: string }[] = [{ value: undefined, label: "全部学生" }];
    return base.concat(students.map((student) => ({ value: student.id, label: student.name })));
  }, [students]);

  const navigateToWizard = (step: number, submissionId?: number) => {
    const safeStep = Math.min(5, Math.max(1, step));
    const query = submissionId ? `?step=${safeStep}&resume=${submissionId}` : `?step=${safeStep}`;
    navigate(`/grading/wizard${query}`);
  };

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card bordered={false} style={{ borderRadius: 22, padding: 0, overflow: "hidden" }} bodyStyle={{ padding: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: isCompact ? "column" : "row",
            gap: isCompact ? 24 : 32,
            justifyContent: "space-between",
            alignItems: isCompact ? "flex-start" : "center",
            padding: isCompact ? "28px 24px" : "36px 40px",
            background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
          }}
        >
          <Space direction="vertical" size={12} style={{ maxWidth: isCompact ? "100%" : 640 }}>
            <Title level={isCompact ? 4 : 3} style={{ margin: 0 }}>
              上传批改中心
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              将上传、复核、导出拆解为五个步骤，保证每一次批改都有迹可循。点击下方按钮即可回到沉浸式批改向导。
            </Paragraph>
            <Space size={12} wrap style={{ width: isCompact ? "100%" : "auto" }}>
              <Button
                block={isCompact}
                type="primary"
                size={isCompact ? "middle" : "large"}
                shape="round"
                icon={<CloudUploadOutlined />}
                onClick={() => navigate(`/grading/wizard?step=1`)}
              >
                开始新一轮批改
              </Button>
              <Button
                block={isCompact}
                size={isCompact ? "middle" : "large"}
                shape="round"
                icon={<FileSearchOutlined />}
                onClick={() => loadHistory()}
                loading={historyLoading}
              >
                刷新历史记录
              </Button>
            </Space>
            {sessionLoading ? (
              <Spin size="small" aria-live="polite" />
            ) : (
              activeSession && activeSession.status === "active" && (
                <Alert
                  showIcon
                  type="info"
                  message="检测到未完成的批改流程"
                  description={`当前停留在第 ${activeSession.current_step} 步，可随时继续。`}
                  action={
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => navigateToWizard(activeSession.current_step ?? 1)}
                    >
                      继续批改
                    </Button>
                  }
                />
              )
            )}
          </Space>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              width: isCompact ? "100%" : 280,
              background: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(37, 99, 235, 0.16)",
              boxShadow: "0 18px 42px rgba(37, 99, 235, 0.15)",
            }}
            bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <Space align="center" size={10}>
              <HistoryOutlined style={{ fontSize: 20, color: "#1d4ed8" }} />
              <Text strong style={{ fontSize: 18 }}>
                向导全局进度
              </Text>
            </Space>
            <Text type="secondary">
              支持随时退出并恢复上下文，未完成任务会在首页提醒继续完成。
            </Text>
            <Tag color="blue" style={{ alignSelf: "flex-start" }}>
              支持断点续办
            </Tag>
          </Card>
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: 20 }}>
        <Form
          layout={isCompact ? "vertical" : "inline"}
          style={{ rowGap: 12, width: "100%" }}
        >
          <Form.Item label="试卷" style={{ width: isCompact ? "100%" : "auto" }}>
            <Select
              style={{ width: isCompact ? "100%" : 200 }}
              value={filters.examId}
              options={examOptions as { value: number | undefined; label: string }[]}
              onChange={(value) => setFilters((prev) => ({ ...prev, examId: value }))}
            />
          </Form.Item>
          <Form.Item label="学生" style={{ width: isCompact ? "100%" : "auto" }}>
            <Select
              style={{ width: isCompact ? "100%" : 200 }}
              value={filters.studentId}
              showSearch
              options={studentOptions as { value: number | undefined; label: string }[]}
              onChange={(value) => setFilters((prev) => ({ ...prev, studentId: value }))}
            />
          </Form.Item>
          <Form.Item label="状态" style={{ width: isCompact ? "100%" : "auto" }}>
            <Select
              style={{ width: isCompact ? "100%" : 160 }}
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            />
          </Form.Item>
          <Form.Item style={{ width: isCompact ? "100%" : "auto" }}>
            <Space style={{ width: isCompact ? "100%" : "auto" }} wrap={isCompact}>
              <Button
                block={isCompact}
                type="primary"
                icon={<FileSearchOutlined />}
                onClick={() => loadHistory()}
                loading={historyLoading}
              >
                查询
              </Button>
              <Button
                block={isCompact}
                icon={<ReloadOutlined />}
                onClick={() => {
                  setFilters({});
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <PageLayout title="批改历史回放" description="最近的批改记录会沉淀在此处，可快速查看详情或继续补批。">
        <Spin spinning={historyLoading} tip="加载历史记录..." aria-live="polite">
          {history.length === 0 ? (
            <Empty description="暂无历史记录，立即发起第一轮批改吧！" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              className="history-list"
              itemLayout="vertical"
              dataSource={history}
              renderItem={(entry) => {
                const { submission, student, exam, processing_steps: steps, matching_score } = entry;
                return (
                  <List.Item
                    key={submission.id}
                    actions={[
                      <Button key="detail" type="link" onClick={() => openSubmissionDetail(submission.id)}>
                        查看详情
                      </Button>,
                      <Button
                        key="resume"
                        type="link"
                        onClick={() => navigateToWizard(pickWizardStep(submission), submission.id)}
                      >
                        继续处理
                      </Button>,
                    ]}
                  >
                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        <Space align="center" size={12} wrap>
                          <Text strong style={{ fontSize: 16 }}>
                            {student.name} 的 {exam?.title ?? `试卷 #${submission.exam_id}`}
                          </Text>
                        <Tag color={submission.status === "graded" ? "green" : "orange"}>
                          {statusDisplay(submission.status)}
                        </Tag>
                        {typeof matching_score === "number" && (
                          <Tag color="blue">匹配度 {Math.round(matching_score * 100)}%</Tag>
                        )}
                        {submission.overall_confidence !== null && submission.overall_confidence !== undefined && (
                          <Tag color="geekblue">置信度 {Math.round((submission.overall_confidence ?? 0) * 100)}%</Tag>
                        )}
                      </Space>
                      <Text type="secondary">
                        上传时间：{dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm")}
                      </Text>
                      <Space size={8} wrap>
                        {steps.slice(0, 4).map((step, index) => (
                          <Tag
                            key={`${submission.id}-${index}`}
                            color={resolveStepColor(step.status)}
                            style={{ marginBottom: 4 }}
                          >
                            {step.name}
                          </Tag>
                        ))}
                      </Space>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </Spin>
      </PageLayout>

      <Drawer title="提交详情" width={isCompact ? "100%" : 520} open={detailOpen} onClose={closeDetail} destroyOnClose>
        {detailLoading || !detailSubmission ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240 }}>
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="学生">{detailSubmission.student_id}</Descriptions.Item>
              <Descriptions.Item label="试卷">{detailSubmission.exam_id}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusDisplay(detailSubmission.status)}</Descriptions.Item>
              <Descriptions.Item label="总分">{detailSubmission.total_score ?? "--"}</Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {dayjs(detailSubmission.submitted_at).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
            </Descriptions>
            <Alert
              type="info"
              showIcon
              message="快速操作"
              description={
                <Space>
                  <Button
                    type="primary"
                    onClick={() => navigateToWizard(pickWizardStep(detailSubmission), detailSubmission.id)}
                  >
                    前往向导
                  </Button>
                  <Button onClick={() => navigate(`/grading/wizard?step=4`)}>打开复核界面</Button>
                </Space>
              }
            />
            <Card title="处理日志" size="small">
              {detailLogs.length === 0 ? (
                <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  size="small"
                  dataSource={detailLogs}
                  renderItem={(log) => (
                    <List.Item key={log.id}>
                      <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Space align="center" size={8}>
                          <Badge color={resolveLogColor(log)} text={log.step} />
                          <Tag bordered={false}>{translateActorType(log.actor_type)}</Tag>
                          <Text type="secondary">{dayjs(log.created_at).format("MM-DD HH:mm")}</Text>
                        </Space>
                        {log.detail && <Text>{log.detail}</Text>}
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Space>
        )}
      </Drawer>
    </Space>
  );
};

export default UploadCenter;
