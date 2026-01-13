/**
 * 批改流程向导 - 世界级沉浸式批改体验
 * 
 * 设计灵感: Linear, Stripe Checkout, Shape of AI
 * 特点:
 * - 清晰的步骤引导
 * - 精致的进度展示
 * - 流畅的过渡动效
 * - 智能的状态反馈
 */

import {
  Alert,
  Breadcrumb,
  Button,
  Layout,
  Space,
  Spin,
  Steps,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  RocketOutlined,
  SettingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { WizardStep } from "./WizardProvider";
import { useWizardStore } from "./useWizardStore";
import StepExamConfig from "./steps/StepExamConfig";
import StepAnswerReview from "./steps/StepAnswerReview";
import StepStudentUpload from "./steps/StepStudentUpload";
import StepReviewConfirm from "./steps/StepReviewConfirm";
import StepCompletion from "./steps/StepCompletion";
import useResponsive from "../hooks/useResponsive";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const WIZARD_STEPS = [
  { 
    key: 1, 
    title: "试卷配置", 
    description: "选择或新建试卷", 
    breadcrumb: "试卷选择",
    icon: <SettingOutlined />,
  },
  { 
    key: 2, 
    title: "答案校对", 
    description: "逐题确认标准答案", 
    breadcrumb: "答案校对",
    icon: <FileTextOutlined />,
  },
  { 
    key: 3, 
    title: "卷面上传", 
    description: "批量上传并识别卷面", 
    breadcrumb: "卷面上传",
    icon: <UploadOutlined />,
  },
  { 
    key: 4, 
    title: "批改确认", 
    description: "复核 AI 批改结果", 
    breadcrumb: "批改确认",
    icon: <CheckCircleOutlined />,
  },
  { 
    key: 5, 
    title: "完成导出", 
    description: "导出成果并安排练习", 
    breadcrumb: "完成导出",
    icon: <RocketOutlined />,
  },
] as const;

const GradingWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const {
    state: { initializing, step, error, progress, blocking, savingStep },
    actions: { initialize, clearError, goToStep },
  } = useWizardStore();
  const lastSyncedQueryStep = useRef<number | null>(null);

  const requestedStep = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = Number(params.get("step"));
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) return null;
    if (raw < 1 || raw > 5) return null;
    return raw;
  }, [location.search]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (initializing) return;
    if (requestedStep == null) {
      lastSyncedQueryStep.current = null;
      return;
    }
    if (requestedStep === step) {
      lastSyncedQueryStep.current = requestedStep;
      return;
    }
    if (lastSyncedQueryStep.current === requestedStep) {
      return;
    }
    lastSyncedQueryStep.current = requestedStep;
    void goToStep(requestedStep as WizardStep).catch((err) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "无法跳转至指定步骤");
      message.error(detail);
    });
  }, [initializing, requestedStep, step, goToStep]);

  useEffect(() => {
    if (initializing) return;
    const params = new URLSearchParams(location.search);
    if (params.get("step") === String(step)) return;
    params.set("step", String(step));
    const nextSearch = params.toString();
    navigate(`${location.pathname}?${nextSearch}`, { replace: true });
  }, [initializing, step, location.pathname, location.search, navigate]);

  const breadcrumbItems = useMemo(
    () =>
      WIZARD_STEPS.map((item) => ({
        title: (
          <span
            style={{
              fontWeight: item.key === step ? 600 : 400,
              color: item.key === step ? "#6366F1" : "#64748B",
              transition: 'all 0.3s ease',
            }}
          >
            {item.breadcrumb}
          </span>
        ),
      })),
    [step],
  );

  const blockingReasons = useMemo(() => blocking[step] ?? [], [blocking, step]);
  const primaryBlockingAction = useMemo(
    () => blockingReasons.find((reason) => reason.action)?.action,
    [blockingReasons],
  );

  const progressBadges = useMemo(
    () =>
      [
        { key: "answers", label: "答案校对", segment: progress.answers, icon: <FileTextOutlined /> },
        { key: "uploads", label: "卷面上传", segment: progress.uploads, icon: <UploadOutlined /> },
        { key: "review", label: "批改确认", segment: progress.review, icon: <CheckCircleOutlined /> },
      ].map(({ key, label, segment, icon }) => {
        const total = segment.total ?? 0;
        const confirmed = segment.confirmed ?? 0;
        const pending = segment.pending ?? 0;
        const color = segment.ready
          ? "success"
          : total === 0 && confirmed === 0
          ? "default"
          : "warning";

        let text: string;
        if (key === "uploads") {
          text = confirmed > 0 ? `${confirmed} 份` : "待上传";
        } else if (key === "review") {
          text = segment.ready
            ? "全部确认"
            : pending > 0
            ? `${pending} 待确认`
            : confirmed > 0
            ? `${confirmed} 已确认`
            : "待开始";
        } else {
          text = segment.ready
            ? "已完成"
            : total > 0
            ? `${confirmed}/${total}`
            : confirmed > 0
            ? `${confirmed} 已确认`
            : "待开始";
        }

        const updatedHint = segment.updatedAt ? `，最近更新 ${segment.updatedAt}` : "";
        const tooltip =
          key === "uploads"
            ? `已处理 ${confirmed} 份卷面${updatedHint}`
            : key === "review"
            ? `待确认 ${pending}，已确认 ${confirmed}${updatedHint}`
            : `已确认 ${confirmed}${total > 0 ? ` / ${total}` : ""}${updatedHint}`;

        return { key, label, color, text, tooltip, icon };
      }),
    [progress],
  );

  const resolveTransitionError = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
    (err instanceof Error ? err.message : fallback);

  const handleStepChange = useCallback(
    (targetIndex: number) => {
      const targetStep = (targetIndex + 1) as WizardStep;
      if (savingStep || targetStep === step) return;
      if (targetStep > step) {
        message.warning("请按流程顺序完成前置步骤");
        return;
      }
      void goToStep(targetStep).catch((error) => {
        message.error(resolveTransitionError(error, "跳转步骤失败"));
      });
    },
    [step, goToStep, savingStep],
  );

  const stepItems = useMemo(
    () =>
      WIZARD_STEPS.map((item) => ({
        key: String(item.key),
        title: (
          <Text style={{ 
            fontWeight: item.key === step ? 600 : 400,
            color: item.key <= step ? '#1E293B' : '#94A3B8',
          }}>
            {item.title}
          </Text>
        ),
        description: (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.description}
          </Text>
        ),
        icon: (
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: item.key < step 
              ? 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)'
              : item.key === step
                ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                : '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: item.key <= step ? '#fff' : '#94A3B8',
            fontSize: 16,
            boxShadow: item.key === step 
              ? '0 4px 16px rgba(99, 102, 241, 0.3)'
              : item.key < step
                ? '0 4px 12px rgba(34, 197, 94, 0.2)'
                : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {item.key < step ? <CheckCircleOutlined /> : item.icon}
          </div>
        ),
      })),
    [step],
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return <StepExamConfig />;
      case 2:
        return <StepAnswerReview />;
      case 3:
        return <StepStudentUpload />;
      case 4:
        return <StepReviewConfirm />;
      case 5:
        return <StepCompletion />;
      default:
        return (
          <Space direction="vertical" size={12} align="center" style={{ width: "100%" }}>
            <Text type="secondary">该步骤尚未实现，后续版本将持续完善。</Text>
          </Space>
        );
    }
  };

  return (
    <Layout className="grading-wizard-shell" style={{ minHeight: "100vh" }}>
      {/* 顶部导航 */}
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isCompact ? "0 16px" : "0 40px",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 72,
        }}
      >
        <Space size={16} align="center">
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
          }}>
            <RocketOutlined style={{ fontSize: 22, color: '#fff' }} />
          </div>
          <div>
            <Title level={isCompact ? 5 : 4} style={{ margin: 0, letterSpacing: '-0.5px' }}>
              批改流程向导
            </Title>
            {!isCompact && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                从试卷准备到成果导出，逐步完成教学批改工作
              </Text>
            )}
          </div>
        </Space>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/dashboard")}
          style={{
            height: 40,
            borderRadius: 10,
            fontWeight: 500,
          }}
        >
          {!isCompact && "返回总览"}
        </Button>
      </Header>

      {/* 主内容区 */}
      <Content
        style={{
          padding: isCompact ? "24px 16px" : "32px 48px",
          background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
          minHeight: 'calc(100vh - 72px)',
        }}
      >
        <Space direction="vertical" size={isCompact ? 20 : 28} style={{ width: "100%" }}>
          {/* 面包屑 */}
          <Breadcrumb 
            items={breadcrumbItems}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.6)',
              borderRadius: 12,
              display: 'inline-block',
            }}
          />

          {/* 步骤条 */}
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: isCompact ? 20 : 28,
            border: '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03)',
          }}>
            <Steps
              current={step - 1}
              items={stepItems}
              responsive
              onChange={handleStepChange}
              direction={isCompact ? "vertical" : "horizontal"}
              size={isCompact ? "small" : "default"}
            />
          </div>

          {/* 进度徽章 */}
          {progressBadges.length > 0 && (
            <Space size={12} wrap>
              {progressBadges.map((item) => (
                <Tooltip key={item.key} title={item.tooltip}>
                  <Tag 
                    color={item.color}
                    icon={item.icon}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {item.label}：{item.text}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          )}

          {/* 阻塞提示 */}
          {blockingReasons.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message={
                <Text strong style={{ fontSize: 14 }}>流程提示</Text>
              }
              description={
                <Space direction="vertical" size={4} style={{ marginTop: 4 }}>
                  {blockingReasons.map((reason) => (
                    <Text key={reason.code} type="secondary">{reason.message}</Text>
                  ))}
                </Space>
              }
              action={
                primaryBlockingAction ? (
                  <Button
                    size="small"
                    type="primary"
                    loading={savingStep}
                    onClick={() => {
                      void goToStep(primaryBlockingAction.step).catch((err) => {
                        message.error(resolveTransitionError(err, "无法跳转至推荐步骤"));
                      });
                    }}
                    style={{ borderRadius: 8 }}
                  >
                    {primaryBlockingAction.label}
                  </Button>
                ) : undefined
              }
              style={{
                borderRadius: 16,
                border: '1px solid rgba(245, 158, 11, 0.2)',
                background: 'rgba(245, 158, 11, 0.06)',
              }}
            />
          )}

          {/* 错误提示 */}
          {error && (
            <Alert 
              type="error" 
              message={error} 
              closable 
              onClose={clearError} 
              showIcon
              style={{
                borderRadius: 16,
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            />
          )}

          {/* 步骤内容 */}
          <div
            className="wizard-content-panel"
            style={{
              minHeight: 480,
              background: "#fff",
              borderRadius: 24,
              padding: isCompact ? 20 : 36,
              border: '1px solid rgba(0, 0, 0, 0.04)',
              boxShadow: "0 8px 40px rgba(0, 0, 0, 0.04)",
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 装饰性渐变 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 200,
              background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.02) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {initializing ? (
              <div
                style={{
                  display: "flex",
                  height: 400,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Space direction="vertical" align="center" size={16}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                  }}>
                    <ClockCircleOutlined style={{ fontSize: 28, color: '#fff' }} spin />
                  </div>
                  <Text type="secondary" style={{ fontSize: 15 }}>
                    正在加载批改向导，请稍候...
                  </Text>
                </Space>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                {renderStepContent()}
              </div>
            )}
          </div>
        </Space>
      </Content>

      {/* 样式 */}
      <style>{`
        .grading-wizard-shell .ant-steps-item-title {
          line-height: 1.4 !important;
        }
        .grading-wizard-shell .ant-steps-item-description {
          margin-top: 4px !important;
        }
        .wizard-content-panel {
          transition: all 0.3s ease;
        }
        .ant-breadcrumb-separator {
          color: #CBD5E1 !important;
        }
      `}</style>
    </Layout>
  );
};

export default GradingWizard;
