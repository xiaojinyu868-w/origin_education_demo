import { jsx as _jsx } from "react/jsx-runtime";
import { Button, Result } from "antd";
const EmptyState = ({ title, description, actionLabel = "立即创建", onAction, extra }) => {
    return (_jsx(Result, { icon: extra ?? undefined, title: title, subTitle: description, extra: onAction && (_jsx(Button, { type: "primary", onClick: onAction, children: actionLabel })) }));
};
export default EmptyState;
