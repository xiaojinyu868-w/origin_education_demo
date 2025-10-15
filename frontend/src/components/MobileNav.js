import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ApartmentOutlined, BarChartOutlined, BookOutlined, CheckCircleOutlined, CloudUploadOutlined, CustomerServiceOutlined, HomeOutlined, } from "@ant-design/icons";
import { Badge, Button, Drawer, FloatButton, Space, Typography } from "antd";
const ICON_STYLE = { fontSize: 20 };
const iconMap = {
    dashboard: _jsx(HomeOutlined, { style: ICON_STYLE }),
    roster: _jsx(ApartmentOutlined, { style: ICON_STYLE }),
    upload: _jsx(CloudUploadOutlined, { style: ICON_STYLE }),
    mistake: _jsx(BookOutlined, { style: ICON_STYLE }),
    practice: _jsx(CheckCircleOutlined, { style: ICON_STYLE }),
    analytics: _jsx(BarChartOutlined, { style: ICON_STYLE }),
    assistant: _jsx(CustomerServiceOutlined, { style: ICON_STYLE }),
};
const MobileNav = ({ open, onClose, activeKey, navItems, onNavigate, onFeedbackClick }) => {
    const primaryItems = navItems.slice(0, 4);
    const handleNavigate = (key) => {
        onNavigate(key);
        onClose();
    };
    return (_jsxs(_Fragment, { children: [_jsxs(FloatButton.Group, { shape: "circle", style: { right: 20, bottom: 20 }, icon: _jsx(HomeOutlined, {}), "aria-label": "\u5FEB\u6377\u5BFC\u822A", children: [primaryItems.map((item) => (_jsx(FloatButton, { tooltip: item.label, icon: iconMap[item.key], type: activeKey === item.key ? "primary" : "default", onClick: () => handleNavigate(item.key), "aria-label": item.label }, item.key))), _jsx(FloatButton, { tooltip: "\u63D0\u4EA4\u53CD\u9988", icon: _jsx(CustomerServiceOutlined, { style: ICON_STYLE }), onClick: onFeedbackClick, "aria-label": "\u63D0\u4EA4\u53CD\u9988" })] }), _jsxs(Drawer, { open: open, placement: "left", onClose: onClose, width: "80%", bodyStyle: { padding: "24px 16px 32px" }, headerStyle: { borderBottom: "none" }, title: _jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Typography.Title, { level: 4, style: { margin: 0 }, children: "\u667A\u6167\u6559\u7814\u5E73\u53F0" }), _jsx(Typography.Text, { type: "secondary", children: "\u89E6\u624B\u53EF\u53CA\u7684\u8BFE\u5802\u52A9\u624B" })] }), children: [_jsx(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: navItems.map((item) => {
                            const selected = activeKey === item.key;
                            const isPrimary = primaryItems.some((primary) => primary.key === item.key);
                            return (_jsx(Button, { type: selected ? "primary" : "text", onClick: () => handleNavigate(item.key), block: true, style: {
                                    display: "flex",
                                    justifyContent: "flex-start",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 14px",
                                }, icon: isPrimary ? (iconMap[item.key]) : (_jsx(Badge, { dot: item.key === "assistant", children: iconMap[item.key] })), children: _jsxs(Space, { direction: "vertical", size: 2, style: { alignItems: "flex-start" }, children: [_jsx(Typography.Text, { strong: true, children: item.label }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: item.subtitle })] }) }, item.key));
                        }) }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(Button, { block: true, type: "default", size: "large", onClick: onFeedbackClick, children: "\u63D0\u4EA4\u53CD\u9988" }) })] })] }));
};
export default MobileNav;
