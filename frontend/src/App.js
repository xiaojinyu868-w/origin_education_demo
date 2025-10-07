import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import zhCN from "antd/locale/zh_CN";
import { ApartmentOutlined, BarChartOutlined, BookOutlined, CheckCircleOutlined, CloudUploadOutlined, CustomerServiceOutlined, HomeOutlined, UploadOutlined, } from "@ant-design/icons";
import { Avatar, Button, ConfigProvider, Form, Input, Layout, Menu, Modal, Space, Switch, Tooltip, Typography, Upload, message, } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsCenter from "./pages/AnalyticsCenter";
import Dashboard from "./pages/Dashboard";
import MistakeCenter from "./pages/MistakeCenter";
import PracticeCenter from "./pages/PracticeCenter";
import RosterSetup from "./pages/RosterSetup";
import TeacherAssistant from "./pages/TeacherAssistant";
import UploadCenter from "./pages/UploadCenter";
import { submitTeacherFeedback } from "./api/services";
import { NAVIGATE_EVENT } from "./utils/navigation";
const { Header, Sider, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;
const NAV_ITEMS = [
    { key: "dashboard", label: "工作台", icon: _jsx(HomeOutlined, {}) },
    { key: "roster", label: "班级搭建", icon: _jsx(ApartmentOutlined, {}) },
    { key: "upload", label: "上传批改", icon: _jsx(CloudUploadOutlined, {}) },
    { key: "mistake", label: "错题智库", icon: _jsx(BookOutlined, {}) },
    { key: "practice", label: "练习派送", icon: _jsx(CheckCircleOutlined, {}) },
    { key: "assistant", label: "AI教研助手", icon: _jsx(CustomerServiceOutlined, {}) },
    { key: "analytics", label: "学情洞察", icon: _jsx(BarChartOutlined, {}) },
];
const menuTitleMap = {
    dashboard: "全局工作台",
    roster: "搭建教学班级",
    upload: "上传试卷 · 极速批改",
    mistake: "错题诊断与修复",
    practice: "智能练习分发",
    assistant: "AI 教研助手",
    analytics: "班级学情雷达",
};
const menuDescriptionMap = {
    dashboard: "一屏掌握批改节奏、错题热点与练习派送，教学决策更从容。",
    roster: "按步骤录入教师、班级、学生与试卷结构，数据一次输入即可长期复用。",
    upload: "拖拽或拍照即可上传纸质试卷，AI 自动识别题号与批注，几分钟完成批改。",
    mistake: "错题自动归档并生成知识点标签，帮助学生随时复盘与巩固。",
    practice: "根据错题记录生成个性化练习卷，实时掌握派送与完成状态。",
    assistant: "即时获得讲评提纲、作业建议、家校沟通话术等AI助教能力。",
    analytics: "知识点热力、分数走势、错误分布全面呈现，为下一堂课提供依据。",
};
const ALLOWED_FEEDBACK_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FEEDBACK_FILE_SIZE = 3 * 1024 * 1024;
const App = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeKey, setActiveKey] = useState("dashboard");
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackFiles, setFeedbackFiles] = useState([]);
    const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);
    const [feedbackForm] = Form.useForm();
    const applyStoredFeedbackProfile = useCallback(() => {
        try {
            const stored = localStorage.getItem("teacherFeedbackProfile");
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
        catch (_error) {
            feedbackForm.setFieldsValue({ content: "", is_anonymous: false });
            setFeedbackAnonymous(false);
        }
    }, [feedbackForm]);
    useEffect(() => {
        applyStoredFeedbackProfile();
    }, [applyStoredFeedbackProfile]);
    useEffect(() => {
        const handler = (event) => {
            const custom = event;
            if (custom.detail && NAV_ITEMS.some((item) => item.key === custom.detail)) {
                setActiveKey(custom.detail);
            }
        };
        window.addEventListener(NAVIGATE_EVENT, handler);
        return () => window.removeEventListener(NAVIGATE_EVENT, handler);
    }, []);
    const feedbackUploadProps = useMemo(() => ({
        multiple: true,
        maxCount: 3,
        accept: ".png,.jpg,.jpeg,.webp",
        fileList: feedbackFiles,
        beforeUpload: (file) => {
            if (!ALLOWED_FEEDBACK_TYPES.includes(file.type)) {
                message.error("仅支持上传 JPG/PNG/WebP 图片");
                return Upload.LIST_IGNORE;
            }
            if (file.size > MAX_FEEDBACK_FILE_SIZE) {
                message.error("单张图片需小于 3MB");
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
            message.warning("请填写问题描述");
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
                localStorage.setItem("teacherFeedbackProfile", JSON.stringify({ teacher_name: trimmedName ?? "", teacher_email: trimmedEmail ?? "" }));
            }
            message.success(`反馈已提交，编号 #${response.id}`);
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
    const content = useMemo(() => {
        switch (activeKey) {
            case "dashboard":
                return _jsx(Dashboard, {});
            case "roster":
                return _jsx(RosterSetup, {});
            case "upload":
                return _jsx(UploadCenter, {});
            case "mistake":
                return _jsx(MistakeCenter, {});
            case "practice":
                return _jsx(PracticeCenter, {});
            case "assistant":
                return _jsx(TeacherAssistant, {});
            case "analytics":
                return _jsx(AnalyticsCenter, {});
            default:
                return _jsx(Dashboard, {});
        }
    }, [activeKey]);
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
        }, children: [_jsxs(Layout, { className: "app-shell", children: [_jsxs(Sider, { className: "app-sider", collapsible: true, collapsed: collapsed, onCollapse: setCollapsed, width: 232, theme: "light", children: [_jsxs(Space, { align: "center", style: {
                                    height: 108,
                                    width: "100%",
                                    justifyContent: collapsed ? "center" : "flex-start",
                                    padding: collapsed ? "12px" : "28px 20px 16px",
                                }, children: [_jsx(Avatar, { size: collapsed ? 44 : 52, src: "/logo.svg" }), !collapsed && (_jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Title, { level: 5, style: { color: "#0f172a", margin: 0 }, children: "\u667A\u6167\u6279\u6539\u5E73\u53F0" }), _jsx(Text, { type: "secondary", children: "AI \u8D4B\u80FD \u00B7 \u65E0\u75DB\u4E0A\u624B" })] }))] }), _jsx(Menu, { theme: "light", mode: "inline", selectedKeys: [activeKey], onClick: ({ key }) => setActiveKey(key), style: {
                                    background: "transparent",
                                    padding: collapsed ? "0 12px" : "0 18px",
                                    border: "none",
                                }, items: NAV_ITEMS.map((item) => ({
                                    key: item.key,
                                    icon: item.icon,
                                    label: item.label,
                                })) }), _jsx("div", { className: "app-sider-footer", children: _jsx(Tooltip, { title: "\u968F\u65F6\u53CD\u9988\u6559\u5B66\u75DB\u70B9\uFF0C\u52A9\u529B\u4EA7\u54C1\u4F18\u5316", children: _jsx(Button, { block: true, type: "text", icon: _jsx(CustomerServiceOutlined, {}), style: {
                                            color: "#334155",
                                            background: "rgba(15, 23, 42, 0.06)",
                                            borderRadius: 14,
                                        }, onClick: handleFeedbackOpen, children: !collapsed && "反馈痛点" }) }) })] }), _jsxs(Layout, { className: "app-main", children: [_jsxs(Header, { className: "app-header", children: [_jsxs(Space, { direction: "vertical", size: 6, children: [_jsx(Text, { type: "secondary", style: { letterSpacing: 1 }, children: "WELCOME" }), _jsx(Title, { level: 3, style: { margin: 0 }, children: menuTitleMap[activeKey] }), _jsx(Paragraph, { type: "secondary", style: { margin: 0 }, children: menuDescriptionMap[activeKey] })] }), _jsxs(Space, { size: 12, children: [_jsx(Button, { type: "text", onClick: () => setActiveKey("dashboard"), children: "\u56DE\u5230\u5DE5\u4F5C\u53F0" }), _jsx(Button, { type: "primary", shape: "round", onClick: () => setActiveKey("upload"), children: "\u7ACB\u5373\u6279\u6539" })] })] }), _jsx(Content, { className: "app-content", children: _jsx("div", { className: "app-content-wrapper fade-in", children: content }) }), _jsx(Footer, { className: "app-footer", children: _jsxs(Text, { type: "secondary", children: ["\u00A9 ", new Date().getFullYear(), " \u667A\u6167\u6279\u6539\u4E0E\u5B66\u60C5\u5E73\u53F0 \u00B7 Crafted for delightful teaching"] }) })] })] }), _jsx(Modal, { title: "\u53CD\u9988\u6559\u5B66\u75DB\u70B9", open: feedbackVisible, onCancel: handleFeedbackCancel, onOk: () => feedbackForm.submit(), okText: "\u63D0\u4EA4\u53CD\u9988", cancelText: "\u53D6\u6D88", confirmLoading: feedbackSubmitting, destroyOnClose: true, children: _jsxs(Form, { form: feedbackForm, layout: "vertical", initialValues: { is_anonymous: false }, onValuesChange: handleFeedbackValuesChange, onFinish: handleFeedbackFinish, children: [_jsx(Form.Item, { name: "content", label: "\u95EE\u9898\u63CF\u8FF0", rules: [{ required: true, message: "请填写问题描述" }], children: _jsx(Input.TextArea, { autoSize: { minRows: 4, maxRows: 6 }, placeholder: "\u63CF\u8FF0\u6559\u5B66\u8FC7\u7A0B\u4E2D\u9047\u5230\u7684\u75DB\u70B9\u3001\u5F71\u54CD\u4EE5\u53CA\u671F\u5F85\u7684\u652F\u6301", maxLength: 2000, showCount: true }) }), _jsxs(Form.Item, { label: "\u4E0A\u4F20\u622A\u56FE", children: [_jsx(Upload, { ...feedbackUploadProps, children: _jsx(Button, { icon: _jsx(UploadOutlined, {}), children: "\u6DFB\u52A0\u56FE\u7247" }) }), _jsx(Text, { type: "secondary", style: { display: "block", marginTop: 8 }, children: "\u652F\u6301 jpg/png/webp\uFF0C\u6700\u591A 3 \u5F20\uFF0C\u6BCF\u5F20\u4E0D\u8D85\u8FC7 3MB\u3002" })] }), _jsx(Form.Item, { name: "is_anonymous", label: "\u533F\u540D\u63D0\u4EA4", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "\u533F\u540D", unCheckedChildren: "\u5B9E\u540D" }) }), _jsx(Form.Item, { name: "teacher_name", label: "\u59D3\u540D", rules: [{ required: !feedbackAnonymous, message: "请输入姓名" }], children: _jsx(Input, { placeholder: "\u8BF7\u8F93\u5165\u59D3\u540D", disabled: feedbackAnonymous }) }), _jsx(Form.Item, { name: "teacher_email", label: "\u90AE\u7BB1", rules: feedbackAnonymous ? [] : [{ type: "email", message: "请输入有效的邮箱地址" }], children: _jsx(Input, { placeholder: "teacher@example.com", disabled: feedbackAnonymous }) })] }) })] }));
};
export default App;
