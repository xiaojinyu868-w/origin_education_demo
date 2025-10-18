import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import zhCN from "antd/locale/zh_CN";
import { ApiOutlined, LogoutOutlined, MenuOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, Form, Input, Layout, Modal, Space, Spin, Switch, Tag, Typography, Upload, message, } from "antd";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LlmConfigModal from "./components/LlmConfigModal";
import { fetchAssistantStatus, submitTeacherFeedback } from "./api/services";
import { NAVIGATE_EVENT } from "./utils/navigation";
import { WizardProvider } from "./grading-wizard/WizardProvider";
import DesktopNav from "./components/DesktopNav";
import MobileNav from "./components/MobileNav";
import useResponsive from "./hooks/useResponsive";
import { AuthProvider } from "./context/AuthContext";
import useAuth from "./hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import { safeStorage } from "./utils/storage";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RosterSetup = lazy(() => import("./pages/RosterSetup"));
const UploadCenter = lazy(() => import("./pages/UploadCenter"));
const MistakeCenter = lazy(() => import("./pages/MistakeCenter"));
const PracticeCenter = lazy(() => import("./pages/PracticeCenter"));
const TeacherAssistant = lazy(() => import("./pages/TeacherAssistant"));
const AnalyticsCenter = lazy(() => import("./pages/AnalyticsCenter"));
const GradingWizard = lazy(() => import("./grading-wizard/GradingWizard"));
const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;
const NAV_ITEMS = [
    {
        key: "dashboard",
        label: "总览",
        subtitle: "班级动态与重点提醒",
        headerTitle: "教学总览",
        headerDescription: "快速了解班级进度、作业状态与核心提醒，掌握教学节奏。",
        path: "/dashboard",
    },
    {
        key: "roster",
        label: "班级管理",
        subtitle: "维护教师与学生档案",
        headerTitle: "班级与学生管理",
        headerDescription: "维护班级结构、学生信息与教师配置，保障教学顺畅运行。",
        path: "/roster",
    },
    {
        key: "upload",
        label: "试卷上传",
        subtitle: "拍照或导入试卷",
        headerTitle: "试卷上传与整理",
        headerDescription: "上传纸质试卷或扫描件，系统自动完成识别、切割与预处理。",
        path: "/upload",
    },
    {
        key: "mistake",
        label: "错题诊断",
        subtitle: "复盘薄弱知识点",
        headerTitle: "错题诊断中心",
        headerDescription: "查看错题归档、知识点标签与复盘建议，帮助学生及时巩固。",
        path: "/mistake",
    },
    {
        key: "practice",
        label: "练习中心",
        subtitle: "生成针对性练习",
        headerTitle: "练习任务中心",
        headerDescription: "基于错题与薄弱知识点自动生成练习，并追踪完成情况。",
        path: "/practice",
    },
    {
        key: "assistant",
        label: "智能助手",
        subtitle: "问答与批改建议",
        headerTitle: "智能教师助手",
        headerDescription: "即时沟通教学问题，获取批改建议与高质量沟通模版。",
        path: "/assistant",
    },
    {
        key: "analytics",
        label: "学习分析",
        subtitle: "班级画像与趋势",
        headerTitle: "学习数据分析",
        headerDescription: "掌握班级知识掌握度、成绩趋势与能力分布，为教学决策提供依据。",
        path: "/analytics",
    },
];
const ROUTE_COMPONENTS = {
    dashboard: Dashboard,
    roster: RosterSetup,
    upload: UploadCenter,
    mistake: MistakeCenter,
    practice: PracticeCenter,
    assistant: TeacherAssistant,
    analytics: AnalyticsCenter,
};
const ROUTE_BY_KEY = NAV_ITEMS.reduce((acc, item) => {
    acc[item.key] = item.path;
    return acc;
}, {});
const deriveActiveKey = (pathname) => {
    const matched = NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
    return matched?.key ?? "dashboard";
};
const ALLOWED_FEEDBACK_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FEEDBACK_FILE_SIZE = 3 * 1024 * 1024;
const AppLayout = () => {
    const { user, logout } = useAuth();
    const responsive = useResponsive();
    const isMobile = responsive.isMobile;
    const isTablet = responsive.isTablet;
    const isCompactLayout = isMobile || isTablet;
    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackFiles, setFeedbackFiles] = useState([]);
    const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);
    const [feedbackForm] = Form.useForm();
    const [llmConfigVisible, setLlmConfigVisible] = useState(false);
    const [llmStatus, setLlmStatus] = useState("unknown");
    const location = useLocation();
    const navigate = useNavigate();
    const activeKey = useMemo(() => deriveActiveKey(location.pathname), [location.pathname]);
    const activeNavItem = useMemo(() => NAV_ITEMS.find((item) => item.key === activeKey) ?? NAV_ITEMS[0], [activeKey]);
    const isWizardRoute = location.pathname.startsWith("/grading/wizard");
    const lastCompactRef = useRef(isCompactLayout);
    const suspenseFallback = useMemo(() => (_jsx("div", { className: "app-suspense", role: "status", "aria-live": "polite", children: _jsx(Spin, { size: "large", tip: "Loading..." }) })), []);
    useEffect(() => {
        const wasCompact = lastCompactRef.current;
        if (isCompactLayout && !wasCompact) {
            setCollapsed(true);
        }
        if (!isCompactLayout && wasCompact) {
            setCollapsed(false);
        }
        lastCompactRef.current = isCompactLayout;
    }, [isCompactLayout]);
    const handleNavigate = useCallback((key) => {
        const target = ROUTE_BY_KEY[key];
        if (!target) {
            return;
        }
        if (location.pathname !== target) {
            navigate(target);
        }
    }, [navigate, location.pathname]);
    useEffect(() => {
        const handler = (event) => {
            const custom = event;
            if (custom.detail) {
                handleNavigate(custom.detail);
            }
        };
        window.addEventListener(NAVIGATE_EVENT, handler);
        return () => window.removeEventListener(NAVIGATE_EVENT, handler);
    }, [handleNavigate]);
    useEffect(() => {
        if (mobileNavOpen && !isCompactLayout) {
            setMobileNavOpen(false);
        }
    }, [mobileNavOpen, isCompactLayout]);
    useEffect(() => {
        if (mobileNavOpen) {
            setMobileNavOpen(false);
        }
    }, [location.pathname]);
    const applyStoredFeedbackProfile = useCallback(() => {
        try {
            const stored = safeStorage.get("teacherFeedbackProfile");
            const baseValues = {
                content: "",
                is_anonymous: false,
            };
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.teacher_name) {
                    baseValues.teacher_name = parsed.teacher_name;
                }
                if (parsed?.teacher_email) {
                    baseValues.teacher_email = parsed.teacher_email;
                }
            }
            feedbackForm.setFieldsValue(baseValues);
            setFeedbackAnonymous(false);
        }
        catch {
            feedbackForm.setFieldsValue({ content: "", is_anonymous: false });
            setFeedbackAnonymous(false);
        }
    }, [feedbackForm]);
    useEffect(() => {
        applyStoredFeedbackProfile();
    }, [applyStoredFeedbackProfile]);
    useEffect(() => {
        const loadAssistantStatus = async () => {
            try {
                const { available } = await fetchAssistantStatus();
                setLlmStatus(available ? "available" : "unavailable");
            }
            catch (error) {
                console.error(error);
                setLlmStatus("unavailable");
            }
        };
        void loadAssistantStatus();
    }, []);
    const feedbackUploadProps = useMemo(() => ({
        multiple: true,
        maxCount: 3,
        accept: ".png,.jpg,.jpeg,.webp",
        fileList: feedbackFiles,
        beforeUpload: (file) => {
            if (!ALLOWED_FEEDBACK_TYPES.includes(file.type)) {
                message.error("Only JPG/PNG/WebP images are supported");
                return Upload.LIST_IGNORE;
            }
            if (file.size > MAX_FEEDBACK_FILE_SIZE) {
                message.error("Each image must be smaller than 3MB");
                return Upload.LIST_IGNORE;
            }
            return false;
        },
        onChange: ({ fileList: newFileList }) => {
            setFeedbackFiles(newFileList);
        },
        onRemove: (file) => {
            setFeedbackFiles((prev) => prev.filter((item) => item.uid !== file.uid));
            return true;
        },
    }), [feedbackFiles]);
    const handleFeedbackOpen = () => {
        applyStoredFeedbackProfile();
        setFeedbackFiles([]);
        setFeedbackVisible(true);
    };
    const handleFeedbackCancel = () => {
        setFeedbackVisible(false);
    };
    const handleFeedbackValuesChange = (_, allValues) => {
        setFeedbackAnonymous(Boolean(allValues.is_anonymous));
    };
    const handleFeedbackFinish = async (values) => {
        const trimmedContent = values.content?.trim() ?? "";
        if (!trimmedContent) {
            message.warning("请填写反馈内容");
            return;
        }
        const isAnonymous = Boolean(values.is_anonymous);
        const formData = new FormData();
        formData.append("content", trimmedContent);
        formData.append("is_anonymous", String(isAnonymous));
        const trimmedName = values.teacher_name?.trim();
        const trimmedEmail = values.teacher_email?.trim();
        if (!isAnonymous) {
            if (trimmedName) {
                formData.append("teacher_name", trimmedName);
            }
            if (trimmedEmail) {
                formData.append("teacher_email", trimmedEmail);
            }
        }
        feedbackFiles.forEach((file) => {
            if (file.originFileObj) {
                formData.append("attachments", file.originFileObj);
            }
        });
        setFeedbackSubmitting(true);
        try {
            const response = await submitTeacherFeedback(formData);
            if (!isAnonymous) {
                safeStorage.set("teacherFeedbackProfile", JSON.stringify({ teacher_name: trimmedName ?? "", teacher_email: trimmedEmail ?? "" }));
            }
            message.success(`感谢反馈，我们已收到编号 #${response.id}`);
            setFeedbackVisible(false);
            setFeedbackFiles([]);
            applyStoredFeedbackProfile();
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "提交失败，请稍后重试"));
            message.error(detail);
        }
        finally {
            setFeedbackSubmitting(false);
        }
    };
    if (isWizardRoute) {
        return (_jsx(ConfigProvider, { locale: zhCN, theme: {
                token: {
                    colorPrimary: "#2563eb",
                    borderRadiusLG: 18,
                    fontFamily: '"SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif',
                },
                components: {
                    Layout: {
                        headerBg: "transparent",
                        siderBg: "transparent",
                        bodyBg: "transparent",
                    },
                    Menu: {
                        colorItemBg: "transparent",
                        itemSelectedColor: "#1d4ed8",
                        itemSelectedBg: "rgba(37,99,235,0.12)",
                        itemHoverBg: "rgba(37,99,235,0.08)",
                        radiusItem: 12,
                    },
                    Button: {
                        borderRadius: 12,
                    },
                },
            }, children: _jsx(Suspense, { fallback: suspenseFallback, children: _jsx(WizardProvider, { children: _jsx(GradingWizard, {}) }) }) }));
    }
    const layoutClassName = isMobile
        ? "app-shell app-shell--mobile"
        : isTablet
            ? "app-shell app-shell--tablet"
            : "app-shell app-shell--desktop";
    const mainClassName = isCompactLayout ? "app-main app-main--compact" : "app-main";
    const headerClassName = isCompactLayout ? "app-header app-header--compact" : "app-header";
    const contentClassName = isCompactLayout ? "app-content app-content--compact" : "app-content";
    const footerClassName = isCompactLayout ? "app-footer app-footer--compact" : "app-footer";
    return (_jsxs(ConfigProvider, { locale: zhCN, theme: {
            token: {
                colorPrimary: "#2563eb",
                borderRadiusLG: 18,
                fontFamily: '"SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif',
            },
            components: {
                Layout: {
                    headerBg: "transparent",
                    siderBg: "transparent",
                    bodyBg: "transparent",
                },
                Button: {
                    borderRadius: 12,
                },
            },
        }, children: [_jsxs(Layout, { className: layoutClassName, children: [!isCompactLayout && (_jsx(DesktopNav, { collapsed: collapsed, onCollapse: setCollapsed, activeKey: activeKey, navItems: NAV_ITEMS, onNavigate: handleNavigate, onFeedbackClick: handleFeedbackOpen })), _jsxs(Layout, { className: mainClassName, children: [_jsxs(Header, { className: headerClassName, children: [_jsxs("div", { className: "app-header-leading", children: [isCompactLayout && (_jsx(Button, { className: "app-header-trigger", type: "text", icon: _jsx(MenuOutlined, {}), onClick: () => setMobileNavOpen(true), "aria-label": "Open navigation menu" })), _jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Text, { type: "secondary", style: { letterSpacing: isCompactLayout ? 0 : 1 }, children: isCompactLayout ? "Welcome back" : "WELCOME" }), _jsx(Title, { level: isCompactLayout ? 4 : 3, style: { margin: 0 }, children: activeNavItem.headerTitle }), _jsx(Paragraph, { type: "secondary", style: { margin: 0 }, children: activeNavItem.headerDescription })] })] }), _jsxs(Space, { size: isCompactLayout ? 8 : 12, align: "center", children: [!isCompactLayout && user && (_jsx(Text, { type: "secondary", style: { marginRight: 4 }, children: user.name })), llmStatus !== "unknown" && (_jsx(Tag, { color: llmStatus === "available" ? "success" : "warning", children: llmStatus === "available" ? "接口可用" : "待配置接口" })), _jsx(Button, { icon: _jsx(ApiOutlined, {}), onClick: () => setLlmConfigVisible(true), type: isCompactLayout ? "text" : "default", shape: isCompactLayout ? "circle" : undefined, size: isCompactLayout ? "large" : "middle", "aria-label": "Configure API", children: !isCompactLayout && "Configure API" }), !isCompactLayout && (_jsx(Button, { type: "text", onClick: () => handleNavigate("dashboard"), children: "\u8FD4\u56DE\u603B\u89C8" })), _jsx(Button, { type: "primary", shape: "round", size: isCompactLayout ? "middle" : "large", onClick: () => handleNavigate("upload"), children: isCompactLayout ? "上传试卷" : "开始上传" }), _jsx(Button, { icon: _jsx(LogoutOutlined, {}), onClick: logout, type: isCompactLayout ? "text" : "default", shape: isCompactLayout ? "circle" : undefined, size: isCompactLayout ? "large" : "middle", "aria-label": "\u9000\u51FA\u767B\u5F55", children: !isCompactLayout && "退出登录" })] })] }), _jsx(Content, { className: contentClassName, children: _jsx("div", { className: "app-content-wrapper fade-in", children: _jsx(Suspense, { fallback: suspenseFallback, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), NAV_ITEMS.map((item) => {
                                                    const Component = ROUTE_COMPONENTS[item.key];
                                                    return _jsx(Route, { path: item.path, element: _jsx(Component, {}) }, item.key);
                                                }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }) }) }), _jsx(Footer, { className: footerClassName, children: _jsxs(Text, { type: "secondary", children: ["(c) ", new Date().getFullYear(), " \u667A\u6167\u6559\u7814\u5E73\u53F0 \u00B7 \u4E13\u4E3A\u6109\u60A6\u6559\u5B66\u6253\u9020"] }) })] }), isCompactLayout && (_jsx(MobileNav, { open: mobileNavOpen, onClose: () => setMobileNavOpen(false), activeKey: activeKey, navItems: NAV_ITEMS, onNavigate: handleNavigate, onFeedbackClick: handleFeedbackOpen }))] }), _jsx(LlmConfigModal, { open: llmConfigVisible, onClose: () => setLlmConfigVisible(false), onUpdated: (status) => {
                    setLlmStatus(status.available ? "available" : "unavailable");
                } }), _jsx(Modal, { title: "\u6559\u5E08\u4F7F\u7528\u53CD\u9988", open: feedbackVisible, onCancel: handleFeedbackCancel, onOk: () => feedbackForm.submit(), okText: "\u63D0\u4EA4\u53CD\u9988", cancelText: "\u53D6\u6D88", confirmLoading: feedbackSubmitting, destroyOnClose: true, children: _jsxs(Form, { form: feedbackForm, layout: "vertical", initialValues: { is_anonymous: false }, onValuesChange: handleFeedbackValuesChange, onFinish: handleFeedbackFinish, children: [_jsx(Form.Item, { name: "content", label: "\u53CD\u9988\u5185\u5BB9", rules: [{ required: true, message: "请填写反馈内容" }], children: _jsx(Input.TextArea, { autoSize: { minRows: 4, maxRows: 6 }, placeholder: "\u8BF7\u63CF\u8FF0\u8BFE\u5802\u4F7F\u7528\u4F53\u9A8C\u3001\u9700\u6C42\u6216\u9047\u5230\u7684\u95EE\u9898", maxLength: 2000, showCount: true }) }), _jsxs(Form.Item, { label: "\u4E0A\u4F20\u622A\u56FE", children: [_jsx(Upload, { ...feedbackUploadProps, children: _jsx(Button, { icon: _jsx(UploadOutlined, {}), children: "\u6DFB\u52A0\u56FE\u7247" }) }), _jsx(Text, { type: "secondary", style: { display: "block", marginTop: 8 }, children: "\u652F\u6301 jpg/png/webp \u683C\u5F0F\uFF0C\u6700\u591A 3 \u5F20\u56FE\u7247\uFF0C\u6BCF\u5F20\u4E0D\u8D85\u8FC7 3MB\u3002" })] }), _jsx(Form.Item, { name: "is_anonymous", label: "\u533F\u540D\u63D0\u4EA4", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "\u533F\u540D", unCheckedChildren: "\u5B9E\u540D" }) }), _jsx(Form.Item, { name: "teacher_name", label: "\u59D3\u540D", rules: [{ required: !feedbackAnonymous, message: "请输入姓名" }], children: _jsx(Input, { placeholder: "\u8BF7\u8F93\u5165\u59D3\u540D", disabled: feedbackAnonymous }) }), _jsx(Form.Item, { name: "teacher_email", label: "\u90AE\u7BB1", rules: feedbackAnonymous ? [] : [{ type: "email", message: "请输入有效的邮箱地址" }], children: _jsx(Input, { placeholder: "teacher@example.com", disabled: feedbackAnonymous }) })] }) })] }));
};
const AppGate = () => {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) {
        return (_jsx("div", { className: "app-suspense", children: _jsx(Spin, { size: "large" }) }));
    }
    if (!user) {
        const redirectTarget = `${location.pathname}${location.search}`;
        return _jsx(AuthPage, { redirectPath: redirectTarget });
    }
    return _jsx(AppLayout, {});
};
const App = () => (_jsx(AuthProvider, { children: _jsx(AppGate, {}) }));
export default App;
