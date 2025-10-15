import {
  Alert,
  Breadcrumb,
  Button,
  Layout,
  Result,
  Space,
  Spin,
  Steps,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useRef, useCallback } from "react";
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
  { key: 1, title: "试卷配置", description: "选择或新建试卷", breadcrumb: "试卷选择" },
  { key: 2, title: "标准答案校对", description: "逐题核对标准答案", breadcrumb: "答案校验" },
  { key: 3, title: "学生试卷上传", description: "批量上传学生卷面", breadcrumb: "上传试卷" },
  { key: 4, title: "AI 批改确认", description: "复核 AI 批改结果", breadcrumb: "批改确认" },
  { key: 5, title: "完成与导出", description: "导出报告或派送练习", breadcrumb: "完成导出" },
] as const;

const GradingWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const {
    state: { initializing, step, error },
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
    void goToStep(requestedStep as WizardStep);
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
              color: item.key === step ? "#2563eb" : undefined,
            }}
          >
            {item.breadcrumb}
          </span>
        ),
      })),
    [step],
  );

  const handleStepChange = useCallback(
    (targetIndex: number) => {
      const targetStep = (targetIndex + 1) as WizardStep;
      if (targetStep === step) return;
      if (targetStep > step) {
        message.warning("请按流程顺序完成各阶段");
        return;
      }
      void goToStep(targetStep).catch((error) => {
        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (error instanceof Error ? error.message : "跳转步骤失败");
        message.error(detail);
      });
    },
    [step, goToStep],
  );

  const stepItems = useMemo(
    () =>
      WIZARD_STEPS.map((item) => ({
        key: String(item.key),
        title: item.title,
        description: item.description,
      })),
    [],
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
          <Result
            status="info"
            title="该步骤的前端界面还在构建中"
            subTitle="当前版本已完成试卷配置向导，后续步骤将陆续上线。"
          />
        );
    }
  };

  return (
    <Layout className="grading-wizard-shell" style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isCompact ? "0 16px" : "0 32px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Space size={16} align="center">
          <img src="/logo.svg" alt="logo" style={{ width: 40, height: 40 }} />
          <div>
            <Title level={isCompact ? 5 : 4} style={{ margin: 0 }}>
              批改流程向导
            </Title>
            <Text type="secondary">从试卷配置到导出，一站式完成批改闭环</Text>
          </div>
        </Space>
        <Button type="text" onClick={() => navigate("/dashboard")} block={isCompact}>
          閫€鍑哄悜瀵?
        </Button>
      </Header>
      <Content style={{ padding: isCompact ? "24px 16px" : "32px 48px", background: "linear-gradient(180deg,#f8fafc 0%,#ffffff 100%)" }}>
        <Space direction="vertical" size={isCompact ? 20 : 24} style={{ width: "100%" }}>
          <Breadcrumb items={breadcrumbItems} />
          <Steps current={step - 1} items={stepItems} responsive onChange={handleStepChange} direction={isCompact ? "vertical" : "horizontal"} size={isCompact ? "small" : "default"} />
          {error && (
            <Alert
              type="error"
              message={error}
              closable
              onClose={clearError}
              showIcon
            />
          )}
          <div style={{ minHeight: 420, background: "#fff", borderRadius: 20, padding: isCompact ? 20 : 32, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }}>
            {initializing ? (
              <div style={{ display: "flex", height: 356, alignItems: "center", justifyContent: "center" }}>
                <Space direction="vertical" align="center">
                  <Spin size="large" />
                  <Text type="secondary">正在加载批改向导，请稍候…</Text>
                </Space>
              </div>
            ) : (
              renderStepContent()
            )}
          </div>
        </Space>
      </Content>
    </Layout>
  );
};

export default GradingWizard;
