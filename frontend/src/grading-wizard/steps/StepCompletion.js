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
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "Unable to restart the wizard"));
            message.error(detail);
        }
    };
    return (_jsx(Result, { status: "success", title: "Grading session completed", subTitle: "The results have been saved to history. Export reports or assign follow-up practice whenever you are ready.", extra: _jsxs(Space, { children: [_jsx(Button, { type: "primary", onClick: () => navigate("/upload"), children: "Open grading history" }), _jsx(Button, { onClick: () => navigate("/practice"), children: "Assign practice" }), _jsx(Button, { onClick: () => navigate("/dashboard"), children: "Back to dashboard" }), _jsx(Button, { type: "link", onClick: handleRestart, children: "Start another run" })] }) }));
};
export default StepCompletion;
