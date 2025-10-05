import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRightOutlined } from "@ant-design/icons";
import { Card, Space, Typography } from "antd";
const QuickActionCard = ({ icon, title, description, actionLabel = "立即前往", onClick }) => {
    return (_jsx(Card, { className: "quick-action-card", hoverable: true, bordered: false, onClick: onClick, bodyStyle: { padding: 20 }, children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [_jsx("div", { className: "quick-action-icon", children: icon }), _jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: title }), _jsx(Typography.Paragraph, { type: "secondary", style: { minHeight: 44 }, children: description }), _jsxs(Typography.Link, { onClick: onClick, children: [actionLabel, " ", _jsx(ArrowRightOutlined, {})] })] }) }));
};
export default QuickActionCard;
