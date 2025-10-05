import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Space, Typography } from "antd";
const PageLayout = ({ title, subtitle, description, extra, footer, children }) => {
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsx(Card, { bordered: false, className: "shadow-panel", title: _jsxs("div", { children: [_jsx(Typography.Title, { level: 3, style: { marginBottom: 8 }, children: title }), subtitle && (_jsx(Typography.Text, { type: "secondary", style: { display: "block", marginBottom: 6 }, children: subtitle })), description && (_jsx(Typography.Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: description }))] }), extra: extra, headStyle: { borderBottom: "none" }, bodyStyle: { paddingTop: 0 }, children: children }), footer] }));
};
export default PageLayout;
