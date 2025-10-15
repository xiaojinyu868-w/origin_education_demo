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
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "无法重新开始向导");
      message.error(detail);
    }
  };

  return (
    <Result
      status="success"
      title="批改流程完成"
      subTitle="结果已保存到历史，可随时导出报告或安排后续练习。"
      extra={
        <Space>
          <Button type="primary" onClick={() => navigate("/upload")}>查看批改历史</Button>
          <Button onClick={() => navigate("/practice")}>前往布置练习</Button>
          <Button onClick={() => navigate("/dashboard")}>返回总览</Button>
          <Button type="link" onClick={handleRestart}>重新开始流程</Button>
        </Space>
      }
    />
  );
};

export default StepCompletion;
