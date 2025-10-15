import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Result, Space, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useWizardStore } from "../useWizardStore";
const StepCompletion = () => {
    const navigate = useNavigate();
    const { state: { selectedExamId }, actions: { goToStep }, } = useWizardStore();
    const handleRestart = async () => {
        try {
            await goToStep(1, { examId: selectedExamId });
            navigate("/grading/wizard?step=1");
        }
        catch (error) {
            const detail = error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "无法重新开始向导");
            message.error(detail);
        }
    };
    return (_jsx(Result, { status: "success", title: "\u6279\u6539\u6D41\u7A0B\u5B8C\u6210", subTitle: "\u7ED3\u679C\u5DF2\u4FDD\u5B58\u5230\u5386\u53F2\uFF0C\u53EF\u968F\u65F6\u5BFC\u51FA\u62A5\u544A\u6216\u5B89\u6392\u540E\u7EED\u7EC3\u4E60\u3002", extra: _jsxs(Space, { children: [_jsx(Button, { type: "primary", onClick: () => navigate("/upload"), children: "\u67E5\u770B\u6279\u6539\u5386\u53F2" }), _jsx(Button, { onClick: () => navigate("/practice"), children: "\u524D\u5F80\u5E03\u7F6E\u7EC3\u4E60" }), _jsx(Button, { onClick: () => navigate("/dashboard"), children: "\u8FD4\u56DE\u603B\u89C8" }), _jsx(Button, { type: "link", onClick: handleRestart, children: "\u91CD\u65B0\u5F00\u59CB\u6D41\u7A0B" })] }) }));
};
export default StepCompletion;
