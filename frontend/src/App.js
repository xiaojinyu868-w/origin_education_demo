import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import zhCN from "antd/locale/zh_CN";
import { ApartmentOutlined, BarChartOutlined, BookOutlined, CheckCircleOutlined, CloudUploadOutlined, CustomerServiceOutlined, HomeOutlined, } from "@ant-design/icons";
import { Avatar, Button, ConfigProvider, Layout, Menu, Space, Tooltip, Typography, } from "antd";
import { useEffect, useMemo, useState } from "react";
import AnalyticsCenter from "./pages/AnalyticsCenter";
import Dashboard from "./pages/Dashboard";
import MistakeCenter from "./pages/MistakeCenter";
import PracticeCenter from "./pages/PracticeCenter";
import RosterSetup from "./pages/RosterSetup";
import UploadCenter from "./pages/UploadCenter";
import { NAVIGATE_EVENT } from "./utils/navigation";
const { Header, Sider, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;
const NAV_ITEMS = [
    { key: "dashboard", label: "工作台", icon: _jsx(HomeOutlined, {}) },
    { key: "roster", label: "班级搭建", icon: _jsx(ApartmentOutlined, {}) },
    { key: "upload", label: "上传批改", icon: _jsx(CloudUploadOutlined, {}) },
    { key: "mistake", label: "错题智库", icon: _jsx(BookOutlined, {}) },
    { key: "practice", label: "练习派送", icon: _jsx(CheckCircleOutlined, {}) },
    { key: "analytics", label: "学情洞察", icon: _jsx(BarChartOutlined, {}) },
];
const menuTitleMap = {
    dashboard: "全局工作台",
    roster: "搭建教学班级",
    upload: "上传试卷 · 极速批改",
    mistake: "错题诊断与修复",
    practice: "智能练习分发",
    analytics: "班级学情雷达",
};
const menuDescriptionMap = {
    dashboard: "一屏掌握批改节奏、错题热点与练习派送，教学决策更从容。",
    roster: "按步骤录入教师、班级、学生与试卷结构，数据一次输入即可长期复用。",
    upload: "拖拽或拍照即可上传纸质试卷，AI 自动识别题号与批注，几分钟完成批改。",
    mistake: "错题自动归档并生成知识点标签，帮助学生随时复盘与巩固。",
    practice: "根据错题记录生成个性化练习卷，实时掌握派送与完成状态。",
    analytics: "知识点热力、分数走势、错误分布全面呈现，为下一堂课提供依据。",
};
const App = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeKey, setActiveKey] = useState("dashboard");
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
            case "analytics":
                return _jsx(AnalyticsCenter, {});
            default:
                return _jsx(Dashboard, {});
        }
    }, [activeKey]);
    return (_jsx(ConfigProvider, { locale: zhCN, theme: {
            token: {
                colorPrimary: "#2563eb",
                borderRadiusLG: 18,
                fontFamily: '"SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif',
            },
            components: {
                Layout: {
                    siderBg: "#0f172a",
                },
            },
        }, children: _jsxs(Layout, { children: [_jsxs(Sider, { collapsible: true, collapsed: collapsed, onCollapse: setCollapsed, width: 232, style: {
                        background: "linear-gradient(180deg, #0f172a 0%, #111c3c 100%)",
                        borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                    }, children: [_jsxs(Space, { align: "center", style: {
                                height: 96,
                                width: "100%",
                                justifyContent: collapsed ? "center" : "flex-start",
                                padding: collapsed ? 0 : "28px 20px 12px",
                            }, children: [_jsx(Avatar, { size: collapsed ? 42 : 50, src: "/logo.svg" }), !collapsed && (_jsxs("div", { children: [_jsx(Title, { level: 5, style: { color: "#ffffff", marginBottom: 6 }, children: "\u667A\u6167\u6279\u6539\u5E73\u53F0" }), _jsx(Text, { style: { color: "#cbd5f5" }, children: "AI \u8D4B\u80FD \u00B7 \u65E0\u75DB\u4E0A\u624B" })] }))] }), _jsx(Menu, { theme: "dark", mode: "inline", selectedKeys: [activeKey], onClick: ({ key }) => setActiveKey(key), style: { background: "transparent", padding: collapsed ? "0 8px" : "0 16px" }, items: NAV_ITEMS.map((item) => ({
                                key: item.key,
                                icon: item.icon,
                                label: item.label,
                            })) }), _jsx("div", { style: { padding: collapsed ? 12 : 20 }, children: _jsx(Tooltip, { title: "7\u00D724 \u5C0F\u65F6\u652F\u6301\uFF0C\u5B9E\u65F6\u54CD\u5E94\u9700\u6C42", children: _jsx(Button, { block: true, type: "text", icon: _jsx(CustomerServiceOutlined, {}), style: {
                                        color: "#cbd5f5",
                                        background: "rgba(255,255,255,0.08)",
                                        borderRadius: 14,
                                    }, children: !collapsed && "联系顾问" }) }) })] }), _jsxs(Layout, { children: [_jsxs(Header, { style: {
                                background: "transparent",
                                padding: "28px 32px 0",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-end",
                            }, children: [_jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: menuTitleMap[activeKey] }), _jsx(Paragraph, { type: "secondary", style: { margin: 0 }, children: menuDescriptionMap[activeKey] })] }), _jsxs(Space, { size: 12, children: [_jsx(Button, { onClick: () => setActiveKey("dashboard"), children: "\u56DE\u5230\u5DE5\u4F5C\u53F0" }), _jsx(Button, { type: "primary", onClick: () => setActiveKey("upload"), children: "\u7ACB\u5373\u6279\u6539" })] })] }), _jsx(Content, { style: { margin: "20px 32px 32px" }, children: content }), _jsxs(Footer, { style: { textAlign: "center", color: "#64748b" }, children: ["\u00A9 ", new Date().getFullYear(), " \u667A\u6167\u6279\u6539\u4E0E\u5B66\u60C5\u5E73\u53F0 \u00B7 Designed for effortless teaching"] })] })] }) }));
};
export default App;
