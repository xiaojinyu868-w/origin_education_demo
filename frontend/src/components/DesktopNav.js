import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ApartmentOutlined, BarChartOutlined, BookOutlined, CheckCircleOutlined, CloudUploadOutlined, CustomerServiceOutlined, HomeOutlined, } from "@ant-design/icons";
import { Button, Layout, Menu, Space, Tooltip, Typography } from "antd";
const { Sider } = Layout;
const { Title, Text } = Typography;
const iconMap = {
    dashboard: _jsx(HomeOutlined, {}),
    roster: _jsx(ApartmentOutlined, {}),
    upload: _jsx(CloudUploadOutlined, {}),
    mistake: _jsx(BookOutlined, {}),
    practice: _jsx(CheckCircleOutlined, {}),
    analytics: _jsx(BarChartOutlined, {}),
    assistant: _jsx(CustomerServiceOutlined, {}),
};
const DesktopNav = ({ collapsed, onCollapse, activeKey, navItems, onNavigate, onFeedbackClick }) => {
    const menuItems = navItems.map((item) => ({
        key: item.key,
        icon: iconMap[item.key],
        label: item.label,
    }));
    return (_jsxs(Sider, { className: "app-sider", collapsible: true, collapsed: collapsed, onCollapse: onCollapse, width: 232, collapsedWidth: 72, theme: "light", children: [_jsxs(Space, { align: "center", style: {
                    height: 108,
                    width: "100%",
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "12px" : "28px 20px 16px",
                }, children: [_jsx("img", { src: "/logo.svg", alt: "\u667A\u6167\u6559\u7814\u5E73\u53F0 Logo", style: { width: collapsed ? 44 : 52, height: collapsed ? 44 : 52 } }), !collapsed && (_jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Title, { level: 5, style: { color: "#0f172a", margin: 0 }, children: "\u667A\u6167\u6559\u7814\u5E73\u53F0" }), _jsx(Text, { type: "secondary", children: "\u667A\u80FD\u6279\u6539 \u00B7 \u8BCA\u65AD\u63D0\u5347" })] }))] }), _jsx(Menu, { theme: "light", mode: "inline", selectedKeys: [activeKey], onClick: ({ key }) => onNavigate(key), style: {
                    background: "transparent",
                    padding: collapsed ? "0 12px" : "0 18px",
                    border: "none",
                }, items: menuItems }), _jsx("div", { className: "app-sider-footer", children: _jsx(Tooltip, { title: "\u968F\u65F6\u53CD\u9988\u6559\u5B66\u573A\u666F\uFF0C\u5E2E\u52A9\u6211\u4EEC\u6301\u7EED\u4F18\u5316\u4EA7\u54C1\u4F53\u9A8C", children: _jsx(Button, { block: true, type: "text", icon: _jsx(CustomerServiceOutlined, {}), style: {
                            color: "#334155",
                            background: "rgba(15, 23, 42, 0.06)",
                            borderRadius: 14,
                        }, onClick: onFeedbackClick, children: !collapsed && "提交反馈" }) }) })] }));
};
export default DesktopNav;
