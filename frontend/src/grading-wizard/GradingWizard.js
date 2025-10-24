import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Breadcrumb, Button, Layout, Space, Spin, Steps, Tag, Tooltip, Typography, message, } from "antd";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
    { key: 2, title: "标准答案校对", description: "逐题确认标准答案", breadcrumb: "答案校对" },
    { key: 3, title: "学生卷面上传", description: "批量上传并识别卷面", breadcrumb: "卷面上传" },
    { key: 4, title: "AI 批改确认", description: "复核 AI 批改结果", breadcrumb: "批改确认" },
    { key: 5, title: "完成与导出", description: "导出成果并安排练习", breadcrumb: "完成导出" },
];
const GradingWizard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobile, isTablet } = useResponsive();
    const isCompact = isMobile || isTablet;
    const { state: { initializing, step, error, progress, blocking, savingStep }, actions: { initialize, clearError, goToStep }, } = useWizardStore();
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
        void goToStep(requestedStep).catch((err) => {
            const detail = err?.response?.data?.detail ??
                (err instanceof Error ? err.message : "无法跳转至指定步骤");
            message.error(detail);
        });
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
    const blockingReasons = useMemo(() => blocking[step] ?? [], [blocking, step]);
    const primaryBlockingAction = useMemo(() => blockingReasons.find((reason) => reason.action)?.action, [blockingReasons]);
    const progressBadges = useMemo(() => [
        { key: "answers", label: "答案校对", segment: progress.answers },
        { key: "uploads", label: "卷面上传", segment: progress.uploads },
        { key: "review", label: "批改确认", segment: progress.review },
    ].map(({ key, label, segment }) => {
        const total = segment.total ?? 0;
        const confirmed = segment.confirmed ?? 0;
        const pending = segment.pending ?? 0;
        const color = segment.ready
            ? "green"
            : total === 0 && confirmed === 0
                ? "default"
                : "orange";
        let text;
        if (key === "uploads") {
            text = confirmed > 0 ? `${confirmed} 份` : "待上传";
        }
        else if (key === "review") {
            text = segment.ready
                ? "全部确认"
                : pending > 0
                    ? `${pending} 待确认`
                    : confirmed > 0
                        ? `${confirmed} 已确认`
                        : "待开始";
        }
        else {
            text = segment.ready
                ? "已完成"
                : total > 0
                    ? `${confirmed}/${total}`
                    : confirmed > 0
                        ? `${confirmed} 已确认`
                        : "待开始";
        }
        const updatedHint = segment.updatedAt ? `，最近更新 ${segment.updatedAt}` : "";
        const tooltip = key === "uploads"
            ? `已处理 ${confirmed} 份卷面${updatedHint}`
            : key === "review"
                ? `待确认 ${pending}，已确认 ${confirmed}${updatedHint}`
                : `已确认 ${confirmed}${total > 0 ? ` / ${total}` : ""}${updatedHint}`;
        return { key, label, color, text, tooltip };
    }), [progress]);
    const resolveTransitionError = (err, fallback) => err?.response?.data?.detail ??
        (err instanceof Error ? err.message : fallback);
    const handleStepChange = useCallback((targetIndex) => {
        const targetStep = (targetIndex + 1);
        if (savingStep || targetStep === step)
            return;
        if (targetStep > step) {
            message.warning("请按流程顺序完成前置步骤");
            return;
        }
        void goToStep(targetStep).catch((error) => {
            message.error(resolveTransitionError(error, "跳转步骤失败"));
        });
    }, [step, goToStep, savingStep]);
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
                return (_jsx(Space, { direction: "vertical", size: 12, align: "center", style: { width: "100%" }, children: _jsx(Text, { type: "secondary", children: "\u8BE5\u6B65\u9AA4\u5C1A\u672A\u5B9E\u73B0\uFF0C\u540E\u7EED\u7248\u672C\u5C06\u6301\u7EED\u5B8C\u5584\u3002" }) }));
        }
    };
    return (_jsxs(Layout, { className: "grading-wizard-shell", style: { minHeight: "100vh" }, children: [_jsxs(Header, { style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: isCompact ? "0 16px" : "0 32px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                }, children: [_jsxs(Space, { size: 16, align: "center", children: [_jsx("img", { src: "/logo.svg", alt: "logo", style: { width: 40, height: 40 } }), _jsxs("div", { children: [_jsx(Title, { level: isCompact ? 5 : 4, style: { margin: 0 }, children: "\u6279\u6539\u6D41\u7A0B\u5411\u5BFC" }), _jsx(Text, { type: "secondary", children: "\u4ECE\u8BD5\u5377\u51C6\u5907\u5230\u6210\u679C\u5BFC\u51FA\uFF0C\u9010\u6B65\u5B8C\u6210\u6559\u5B66\u6279\u6539\u5DE5\u4F5C" })] })] }), _jsx(Button, { type: "text", onClick: () => navigate("/dashboard"), block: isCompact, children: "\u8FD4\u56DE\u603B\u89C8" })] }), _jsx(Content, { style: {
                    padding: isCompact ? "24px 16px" : "32px 48px",
                    background: "linear-gradient(180deg,#f8fafc 0%,#ffffff 100%)",
                }, children: _jsxs(Space, { direction: "vertical", size: isCompact ? 20 : 24, style: { width: "100%" }, children: [_jsx(Breadcrumb, { items: breadcrumbItems }), _jsx(Steps, { current: step - 1, items: stepItems, responsive: true, onChange: handleStepChange, direction: isCompact ? "vertical" : "horizontal", size: isCompact ? "small" : "default" }), progressBadges.length > 0 && (_jsx(Space, { size: 8, wrap: true, children: progressBadges.map((item) => (_jsx(Tooltip, { title: item.tooltip, children: _jsx(Tag, { color: item.color, children: `${item.label}：${item.text}` }) }, item.key))) })), blockingReasons.length > 0 && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u6D41\u7A0B\u63D0\u793A", description: _jsx(Space, { direction: "vertical", size: 4, children: blockingReasons.map((reason) => (_jsx("span", { children: reason.message }, reason.code))) }), action: primaryBlockingAction ? (_jsx(Button, { size: "small", type: "primary", loading: savingStep, onClick: () => {
                                    void goToStep(primaryBlockingAction.step).catch((err) => {
                                        message.error(resolveTransitionError(err, "无法跳转至推荐步骤"));
                                    });
                                }, children: primaryBlockingAction.label })) : undefined })), error && (_jsx(Alert, { type: "error", message: error, closable: true, onClose: clearError, showIcon: true })), _jsx("div", { style: {
                                minHeight: 420,
                                background: "#fff",
                                borderRadius: 20,
                                padding: isCompact ? 20 : 32,
                                boxShadow: "0 24px 60px rgba(15,23,42,0.06)",
                            }, children: initializing ? (_jsx("div", { style: {
                                    display: "flex",
                                    height: 356,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }, children: _jsxs(Space, { direction: "vertical", align: "center", children: [_jsx(Spin, { size: "large" }), _jsx(Text, { type: "secondary", children: "\u6B63\u5728\u52A0\u8F7D\u6279\u6539\u5411\u5BFC\uFF0C\u8BF7\u7A0D\u5019" })] }) })) : (renderStepContent()) })] }) })] }));
};
export default GradingWizard;
