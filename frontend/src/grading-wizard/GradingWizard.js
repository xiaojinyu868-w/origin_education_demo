import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Breadcrumb, Button, Layout, Result, Space, Spin, Steps, Typography, message, } from "antd";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
];
const GradingWizard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobile, isTablet } = useResponsive();
    const isCompact = isMobile || isTablet;
    const { state: { initializing, step, error }, actions: { initialize, clearError, goToStep }, } = useWizardStore();
    const lastSyncedQueryStep = useRef(null);
    const requestedStep = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const raw = Number(params.get("step"));
        if (!Number.isFinite(raw) || !Number.isInteger(raw))
            return null;
        if (raw < 1 || raw > 5)
            return null;
        return raw;
    }, [location.search]);
    useEffect(() => {
        void initialize();
    }, [initialize]);
    useEffect(() => {
        if (initializing)
            return;
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
        void goToStep(requestedStep);
    }, [initializing, requestedStep, step, goToStep]);
    useEffect(() => {
        if (initializing)
            return;
        const params = new URLSearchParams(location.search);
        if (params.get("step") === String(step))
            return;
        params.set("step", String(step));
        const nextSearch = params.toString();
        navigate(`${location.pathname}?${nextSearch}`, { replace: true });
    }, [initializing, step, location.pathname, location.search, navigate]);
    const breadcrumbItems = useMemo(() => WIZARD_STEPS.map((item) => ({
        title: (_jsx("span", { style: {
                fontWeight: item.key === step ? 600 : 400,
                color: item.key === step ? "#2563eb" : undefined,
            }, children: item.breadcrumb })),
    })), [step]);
    const handleStepChange = useCallback((targetIndex) => {
        const targetStep = (targetIndex + 1);
        if (targetStep === step)
            return;
        if (targetStep > step) {
            message.warning("请按流程顺序完成各阶段");
            return;
        }
        void goToStep(targetStep).catch((error) => {
            const detail = error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "跳转步骤失败");
            message.error(detail);
        });
    }, [step, goToStep]);
    const stepItems = useMemo(() => WIZARD_STEPS.map((item) => ({
        key: String(item.key),
        title: item.title,
        description: item.description,
    })), []);
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return _jsx(StepExamConfig, {});
            case 2:
                return _jsx(StepAnswerReview, {});
            case 3:
                return _jsx(StepStudentUpload, {});
            case 4:
                return _jsx(StepReviewConfirm, {});
            case 5:
                return _jsx(StepCompletion, {});
            default:
                return (_jsx(Result, { status: "info", title: "\u8BE5\u6B65\u9AA4\u7684\u524D\u7AEF\u754C\u9762\u8FD8\u5728\u6784\u5EFA\u4E2D", subTitle: "\u5F53\u524D\u7248\u672C\u5DF2\u5B8C\u6210\u8BD5\u5377\u914D\u7F6E\u5411\u5BFC\uFF0C\u540E\u7EED\u6B65\u9AA4\u5C06\u9646\u7EED\u4E0A\u7EBF\u3002" }));
        }
    };
    return (_jsxs(Layout, { className: "grading-wizard-shell", style: { minHeight: "100vh" }, children: [_jsxs(Header, { style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: isCompact ? "0 16px" : "0 32px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                }, children: [_jsxs(Space, { size: 16, align: "center", children: [_jsx("img", { src: "/logo.svg", alt: "logo", style: { width: 40, height: 40 } }), _jsxs("div", { children: [_jsx(Title, { level: isCompact ? 5 : 4, style: { margin: 0 }, children: "\u6279\u6539\u6D41\u7A0B\u5411\u5BFC" }), _jsx(Text, { type: "secondary", children: "\u4ECE\u8BD5\u5377\u914D\u7F6E\u5230\u5BFC\u51FA\uFF0C\u4E00\u7AD9\u5F0F\u5B8C\u6210\u6279\u6539\u95ED\u73AF" })] })] }), _jsx(Button, { type: "text", onClick: () => navigate("/dashboard"), block: isCompact, children: "\u95AB\u20AC\u9351\u54C4\u609C\u7035?" })] }), _jsx(Content, { style: { padding: isCompact ? "24px 16px" : "32px 48px", background: "linear-gradient(180deg,#f8fafc 0%,#ffffff 100%)" }, children: _jsxs(Space, { direction: "vertical", size: isCompact ? 20 : 24, style: { width: "100%" }, children: [_jsx(Breadcrumb, { items: breadcrumbItems }), _jsx(Steps, { current: step - 1, items: stepItems, responsive: true, onChange: handleStepChange, direction: isCompact ? "vertical" : "horizontal", size: isCompact ? "small" : "default" }), error && (_jsx(Alert, { type: "error", message: error, closable: true, onClose: clearError, showIcon: true })), _jsx("div", { style: { minHeight: 420, background: "#fff", borderRadius: 20, padding: isCompact ? 20 : 32, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }, children: initializing ? (_jsx("div", { style: { display: "flex", height: 356, alignItems: "center", justifyContent: "center" }, children: _jsxs(Space, { direction: "vertical", align: "center", children: [_jsx(Spin, { size: "large" }), _jsx(Text, { type: "secondary", children: "\u6B63\u5728\u52A0\u8F7D\u6279\u6539\u5411\u5BFC\uFF0C\u8BF7\u7A0D\u5019\u2026" })] }) })) : (renderStepContent()) })] }) })] }));
};
export default GradingWizard;
