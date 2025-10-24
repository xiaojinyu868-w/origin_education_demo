import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Space,
  Tooltip,
  Typography,
  message,
} from "antd";
import { FileTextOutlined, HistoryOutlined, RedoOutlined, RocketOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWizardStore } from "../useWizardStore";

const { Title, Text, Paragraph } = Typography;

const StepCompletion = () => {
  const navigate = useNavigate();
  const {
    state: { selectedExamId, exams, progress, blocking, savingStep },
    actions: { goToStep },
  } = useWizardStore();

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId),
    [exams, selectedExamId],
  );

  const blockingReasons = blocking[5] ?? [];
  const exportDisabled = blockingReasons.length > 0 || savingStep;

  const handleRestart = async () => {
    try {
      await goToStep(1, { examId: selectedExamId });
      navigate("/grading/wizard?step=1");
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (error instanceof Error ? error.message : "无法重新开始向导");
      message.error(detail);
    }
  };

  const handleReview = async () => {
    if (!selectedExamId) {
      message.warning("尚未选择试卷，无法返回批改确认");
      return;
    }
    try {
      await goToStep(4, { examId: selectedExamId });
      navigate("/grading/wizard?step=4");
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (error instanceof Error ? error.message : "无法跳转至批改确认");
      message.error(detail);
    }
  };

  const handleExport = () => {
    if (!selectedExamId) {
      message.warning("请选择试卷后再导出批改结果");
      return;
    }
    navigate(`/upload?exam_id=${selectedExamId}`);
  };

  const cards = [
    {
      key: "export",
      title: "导出批改成果",
      icon: <FileTextOutlined />,
      description: (
        <Space direction="vertical" size={8}>
          <Paragraph style={{ margin: 0 }}>
            {selectedExam ? (
              <>
                当前试卷：<Text strong>{selectedExam.title}</Text>
                {selectedExam.subject ? ` · ${selectedExam.subject}` : ""}
              </>
            ) : (
              "尚未选择试卷，导出前请返回向导确认。"
            )}
          </Paragraph>
          <Text type="secondary">
            批改结果已写入历史记录，可导出成绩单或分享给授课团队。
          </Text>
        </Space>
      ),
      actions: (
        <Space>
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={handleExport}
            disabled={exportDisabled}
          >
            导出批改报告
          </Button>
          <Tooltip title="查看全部批改记录与操作日志">
            <Button icon={<HistoryOutlined />} onClick={() => navigate("/upload")} />
          </Tooltip>
        </Space>
      ),
    },
    {
      key: "practice",
      title: "布置后续练习",
      icon: <RocketOutlined />,
      description: (
        <Space direction="vertical" size={8}>
          <Paragraph style={{ margin: 0 }}>
            {progress.review.ready
              ? "所有批改已确认，可直达练习中心生成个性化错题巩固任务。"
              : `仍有 ${progress.review.pending} 项待确认，确认后可生成针对性练习。`}
          </Paragraph>
          <Text type="secondary">
            支持按知识点筛选、按错题次数排序，自动生成错题练习与跟进计划。
          </Text>
        </Space>
      ),
      actions: (
        <Button
          type="default"
          onClick={() => navigate("/practice")}
          disabled={!progress.review.ready}
        >
          前往布置练习
        </Button>
      ),
    },
    {
      key: "actions",
      title: "向导操作",
      icon: <RedoOutlined />,
      description: (
        <Space direction="vertical" size={8}>
          <Paragraph style={{ margin: 0 }}>
            可以重新回顾第四步确认过程，或重新选择试卷并再次体验全部流程。
          </Paragraph>
          <Text type="secondary">
            建议在导出前再次核对重点题目，确认没有遗漏的待查项目。
          </Text>
        </Space>
      ),
      actions: (
        <Space>
          <Button onClick={handleReview} disabled={savingStep}>
            返回批改详情
          </Button>
          <Button type="dashed" danger onClick={handleRestart} disabled={savingStep}>
            重新开始向导
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Space direction="vertical" size={8}>
        <Title level={3} style={{ margin: 0 }}>
          批改流程完成
        </Title>
        <Text type="secondary">
          所有批改结果已保存，可根据需要导出报告、查看历史或布置后续练习。
        </Text>
      </Space>

      {blockingReasons.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="导出前须完成以下事项"
          description={
            <Space direction="vertical" size={4}>
              {blockingReasons.map((reason) => (
                <span key={reason.code}>{reason.message}</span>
              ))}
            </Space>
          }
        />
      )}

      <Row gutter={[24, 24]}>
        {cards.map((card) => (
          <Col xs={24} xl={8} key={card.key}>
            <Card
              bordered={false}
              style={{ borderRadius: 18, height: "100%" }}
              bodyStyle={{ display: "flex", flexDirection: "column", gap: 16 }}
              title={
                <Space size={8} align="center">
                  {card.icon}
                  <Text strong>{card.title}</Text>
                </Space>
              }
            >
              {card.description}
              <div style={{ marginTop: "auto" }}>{card.actions}</div>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
};

export default StepCompletion;
