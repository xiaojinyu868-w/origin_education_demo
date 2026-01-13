/**
 * 上传批改中心 - 世界级文件管理体验
 * 
 * 设计灵感: Linear, Dropbox, Shape of AI
 * 特点:
 * - 清晰的流程引导
 * - 精致的历史记录
 * - 流畅的交互动效
 * - 智能的状态展示
 */

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
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  ThunderboltOutlined,
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
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      {/* Hero 区域 */}
      <Card 
        bordered={false} 
        className="hero-card"
        style={{ 
          borderRadius: 24, 
          overflow: "hidden",
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.1)',
        }} 
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isCompact ? "column" : "row",
            gap: isCompact ? 28 : 40,
            justifyContent: "space-between",
            alignItems: isCompact ? "stretch" : "center",
            padding: isCompact ? "32px 24px" : "44px 48px",
            position: 'relative',
          }}
        >
          {/* 装饰性元素 */}
          <div style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }} />

          <Space direction="vertical" size={16} style={{ maxWidth: isCompact ? "100%" : 580, position: 'relative', zIndex: 1 }}>
            <Space align="center" size={12}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              }}>
                <CloudUploadOutlined style={{ fontSize: 26, color: '#fff' }} />
              </div>
              <Title level={isCompact ? 4 : 3} style={{ margin: 0, letterSpacing: '-0.5px' }}>
                上传批改中心
              </Title>
            </Space>
            <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 15, lineHeight: 1.7 }}>
              将上传、复核、导出拆解为五个步骤，保证每一次批改都有迹可循。
              点击下方按钮即可进入沉浸式批改向导。
            </Paragraph>
            <Space size={12} wrap style={{ width: isCompact ? "100%" : "auto", marginTop: 8 }}>
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => navigate(`/grading/wizard?step=1`)}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 600,
                  paddingLeft: 24,
                  paddingRight: 24,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                }}
              >
                开始新一轮批改
              </Button>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={() => loadHistory()}
                loading={historyLoading}
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 500,
                }}
              >
                刷新历史记录
              </Button>
            </Space>
            
            {sessionLoading ? (
              <Spin size="small" style={{ marginTop: 12 }} />
            ) : (
              activeSession && activeSession.status === "active" && (
                <Alert
                  showIcon
                  type="info"
                  icon={<PlayCircleOutlined />}
                  message={
                    <Text strong>检测到未完成的批改流程</Text>
                  }
                  description={`当前停留在第 ${activeSession.current_step} 步，可随时继续完成。`}
                  action={
                    <Button
                      type="primary"
                      size="small"
                      icon={<ArrowRightOutlined />}
                      onClick={() => navigateToWizard(activeSession.current_step ?? 1)}
                      style={{ borderRadius: 8 }}
                    >
                      继续批改
                    </Button>
                  }
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    background: 'rgba(59, 130, 246, 0.06)',
                  }}
                />
              )
            )}
          </Space>

          {/* 功能卡片 */}
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              width: isCompact ? "100%" : 300,
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: 'blur(10px)',
              border: "1px solid rgba(99, 102, 241, 0.12)",
              boxShadow: "0 12px 40px rgba(99, 102, 241, 0.12)",
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space align="center" size={12}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <HistoryOutlined style={{ fontSize: 20, color: "#6366F1" }} />
                </div>
                <Text strong style={{ fontSize: 16 }}>
                  向导全局进度
                </Text>
              </Space>
              <Text type="secondary" style={{ lineHeight: 1.6 }}>
                支持随时退出并恢复上下文，未完成任务会在首页提醒继续完成。
              </Text>
              <Tag 
                color="blue" 
                icon={<CheckCircleOutlined />}
                style={{ 
                  borderRadius: 20, 
                  padding: '4px 12px',
                  border: 'none',
                }}
              >
                支持断点续办
              </Tag>
            </Space>
          </Card>
        </div>
      </Card>

      {/* 筛选器 */}
      <Card 
        bordered={false} 
        style={{ 
          borderRadius: 20,
          border: '1px solid rgba(0, 0, 0, 0.04)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
        }}
        bodyStyle={{ padding: isCompact ? 20 : 24 }}
      >
        <Form
          layout={isCompact ? "vertical" : "inline"}
          style={{ rowGap: 12, width: "100%" }}
        >
          <Form.Item label="试卷" style={{ width: isCompact ? "100%" : "auto", marginBottom: isCompact ? 12 : 0 }}>
            <Select
              style={{ width: isCompact ? "100%" : 200 }}
              value={filters.examId}
              options={examOptions as { value: number | undefined; label: string }[]}
              onChange={(value) => setFilters((prev) => ({ ...prev, examId: value }))}
            />
          </Form.Item>
          <Form.Item label="学生" style={{ width: isCompact ? "100%" : "auto", marginBottom: isCompact ? 12 : 0 }}>
            <Select
              style={{ width: isCompact ? "100%" : 200 }}
              value={filters.studentId}
              showSearch
              options={studentOptions as { value: number | undefined; label: string }[]}
              onChange={(value) => setFilters((prev) => ({ ...prev, studentId: value }))}
            />
          </Form.Item>
          <Form.Item label="状态" style={{ width: isCompact ? "100%" : "auto", marginBottom: isCompact ? 12 : 0 }}>
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
                style={{ borderRadius: 10 }}
              >
                查询
              </Button>
              <Button
                block={isCompact}
                icon={<ReloadOutlined />}
                onClick={() => setFilters({})}
                style={{ borderRadius: 10 }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 历史记录 */}
      <PageLayout 
        title="批改历史回放" 
        description="最近的批改记录会沉淀在此处，可快速查看详情或继续补批。"
      >
        <Spin spinning={historyLoading} tip="加载历史记录...">
          {history.length === 0 ? (
            <Empty 
              description={
                <Space direction="vertical" size={8}>
                  <Text type="secondary">暂无历史记录</Text>
                  <Button 
                    type="primary" 
                    icon={<RocketOutlined />}
                    onClick={() => navigate(`/grading/wizard?step=1`)}
                    style={{ borderRadius: 10 }}
                  >
                    立即发起第一轮批改
                  </Button>
                </Space>
              } 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
            />
          ) : (
            <List
              grid={{ gutter: 16, column: isCompact ? 1 : 2 }}
              dataSource={history}
              renderItem={(entry, index) => {
                const { submission, student, exam, processing_steps: steps, matching_score } = entry;
                const isCompleted = submission.status === "graded";
                return (
                  <List.Item>
                    <Card
                      bordered={false}
                      className="history-card-hover"
                      style={{
                        borderRadius: 16,
                        background: isCompleted 
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(16, 185, 129, 0.02) 100%)'
                          : '#fff',
                        border: isCompleted
                          ? '1px solid rgba(34, 197, 94, 0.12)'
                          : '1px solid rgba(0, 0, 0, 0.04)',
                        animationDelay: `${index * 0.05}s`,
                      }}
                      bodyStyle={{ padding: 20 }}
                    >
                      <Space direction="vertical" size={14} style={{ width: "100%" }}>
                        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space align="center" size={10}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              background: isCompleted
                                ? 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)'
                                : 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isCompleted
                                ? '0 4px 12px rgba(34, 197, 94, 0.3)'
                                : '0 4px 12px rgba(245, 158, 11, 0.3)',
                            }}>
                              {isCompleted 
                                ? <CheckCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
                                : <ClockCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
                              }
                            </div>
                            <div>
                              <Text strong style={{ fontSize: 15, display: 'block' }}>
                                {student.name}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {exam?.title ?? `试卷 #${submission.exam_id}`}
                              </Text>
                            </div>
                          </Space>
                          <Tag 
                            color={isCompleted ? "success" : "warning"}
                            style={{ borderRadius: 12, padding: '2px 10px', border: 'none' }}
                          >
                            {statusDisplay(submission.status)}
                          </Tag>
                        </Space>

                        <div style={{
                          padding: '10px 14px',
                          background: 'rgba(248, 250, 252, 0.8)',
                          borderRadius: 10,
                        }}>
                          <Space split={<span style={{ color: '#E2E8F0' }}>·</span>}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {dayjs(submission.submitted_at).format("MM-DD HH:mm")}
                            </Text>
                            {typeof matching_score === "number" && (
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                匹配度 {Math.round(matching_score * 100)}%
                              </Text>
                            )}
                            {submission.overall_confidence !== null && submission.overall_confidence !== undefined && (
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                置信度 {Math.round((submission.overall_confidence ?? 0) * 100)}%
                              </Text>
                            )}
                          </Space>
                        </div>

                        <Space size={8} wrap>
                          {steps.slice(0, 4).map((step, idx) => (
                            <Tag
                              key={`${submission.id}-${idx}`}
                              color={resolveStepColor(step.status)}
                              style={{ borderRadius: 8, border: 'none', fontSize: 12 }}
                            >
                              {step.name}
                            </Tag>
                          ))}
                        </Space>

                        <Space style={{ width: '100%' }} wrap>
                          <Button
                            type="link"
                            size="small"
                            icon={<FileSearchOutlined />}
                            onClick={() => openSubmissionDetail(submission.id)}
                          >
                            查看详情
                          </Button>
                          <Button
                            type="link"
                            size="small"
                            icon={<ArrowRightOutlined />}
                            onClick={() => navigateToWizard(pickWizardStep(submission), submission.id)}
                          >
                            继续处理
                          </Button>
                        </Space>
                      </Space>
                    </Card>
                  </List.Item>
                );
              }}
            />
          )}
        </Spin>
      </PageLayout>

      {/* 详情抽屉 */}
      <Drawer 
        title={
          <Space align="center" size={10}>
            <FileSearchOutlined style={{ color: '#6366F1' }} />
            <span>提交详情</span>
          </Space>
        }
        width={isCompact ? "100%" : 560} 
        open={detailOpen} 
        onClose={closeDetail} 
        destroyOnClose
        styles={{
          header: { borderBottom: '1px solid rgba(0, 0, 0, 0.06)' },
          body: { padding: 24 },
        }}
      >
        {detailLoading || !detailSubmission ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 280 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Descriptions 
              column={1} 
              bordered 
              size="small"
              style={{ borderRadius: 12, overflow: 'hidden' }}
            >
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
              icon={<ThunderboltOutlined />}
              message={<Text strong>快速操作</Text>}
              description={
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => navigateToWizard(pickWizardStep(detailSubmission), detailSubmission.id)}
                    style={{ borderRadius: 8 }}
                  >
                    前往向导
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => navigate(`/grading/wizard?step=4`)}
                    style={{ borderRadius: 8 }}
                  >
                    打开复核界面
                  </Button>
                </Space>
              }
              style={{ borderRadius: 12 }}
            />
            
            <Card 
              title={
                <Space align="center" size={8}>
                  <HistoryOutlined style={{ color: '#6366F1' }} />
                  <span>处理日志</span>
                </Space>
              }
              size="small"
              style={{ borderRadius: 14 }}
              styles={{ header: { borderBottom: '1px solid rgba(0, 0, 0, 0.04)' } }}
            >
              {detailLogs.length === 0 ? (
                <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  size="small"
                  dataSource={detailLogs}
                  renderItem={(log) => (
                    <List.Item style={{ padding: '12px 0' }}>
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space align="center" size={10}>
                          <Badge color={resolveLogColor(log)} />
                          <Text strong style={{ fontSize: 13 }}>{log.step}</Text>
                          <Tag 
                            bordered={false} 
                            style={{ borderRadius: 8, fontSize: 11 }}
                          >
                            {translateActorType(log.actor_type)}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(log.created_at).format("MM-DD HH:mm")}
                          </Text>
                        </Space>
                        {log.detail && (
                          <Text type="secondary" style={{ fontSize: 13, paddingLeft: 18 }}>
                            {log.detail}
                          </Text>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Space>
        )}
      </Drawer>

      {/* 样式 */}
      <style>{`
        .hero-card {
          transition: all 0.3s ease;
        }
        .history-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .history-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>
    </Space>
  );
};

export default UploadCenter;
