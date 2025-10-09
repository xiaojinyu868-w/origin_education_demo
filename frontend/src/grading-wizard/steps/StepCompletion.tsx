import { Button, Result, Space, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useWizardStore } from "../useWizardStore";

const StepCompletion = () => {
  const navigate = useNavigate();
  const {
    state: { selectedExamId },
    actions: { goToStep },
  } = useWizardStore();

  const handleRestart = async () => {
    try {
      await goToStep(1, { examId: selectedExamId });
      navigate("/grading/wizard?step=1");
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "Unable to restart the wizard")
      );
      message.error(detail);
    }
  };

  return (
    <Result
      status="success"
      title="Grading session completed"
      subTitle="The results have been saved to history. Export reports or assign follow-up practice whenever you are ready."
      extra={
        <Space>
          <Button type="primary" onClick={() => navigate("/upload")}>Open grading history</Button>
          <Button onClick={() => navigate("/practice")}>Assign practice</Button>
          <Button onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
          <Button type="link" onClick={handleRestart}>Start another run</Button>
        </Space>
      }
    />
  );
};

export default StepCompletion;
