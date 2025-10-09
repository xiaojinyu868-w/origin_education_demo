import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { updateExamAnswerKey } from "../../api/services";
import type { AnswerPatch, Exam, Question } from "../../types";
import { useWizardStore } from "../useWizardStore";

const { Title, Text, Paragraph } = Typography;

const stringifyAnswer = (answer: unknown) => {
  try {
    return JSON.stringify(answer ?? {}, null, 2);
  } catch (_error) {
    return "{}";
  }
};

const StepAnswerReview = () => {
  const {
    state: { exams, selectedExamId, savingStep },
    actions: { refreshExams, goToStep },
  } = useWizardStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [editorValue, setEditorValue] = useState("{}");
  const [saving, setSaving] = useState(false);

  const exam: Exam | undefined = useMemo(
    () => exams.find((item) => item.id === selectedExamId),
    [exams, selectedExamId],
  );

  const questions: Question[] = exam?.questions ?? [];
  const total = questions.length;
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!exam || total === 0) {
      return;
    }
    const safeIndex = Math.min(currentIndex, Math.max(total - 1, 0));
    if (safeIndex !== currentIndex) {
      setCurrentIndex(safeIndex);
      return;
    }
    const answer = stringifyAnswer(currentQuestion?.answer_key ?? {});
    setEditorValue(answer);
  }, [exam, currentQuestion, currentIndex, total]);

  const confirmedCount = useMemo(
    () => questions.filter((question) => question.answer_status === "confirmed").length,
    [questions],
  );

  const handleSwitch = (direction: "prev" | "next") => {
    if (!exam) return;
    setCurrentIndex((prev) => {
      if (direction === "prev") {
        return prev === 0 ? prev : prev - 1;
      }
      return prev >= total - 1 ? prev : prev + 1;
    });
  };

  const handleSave = async (navigateNext: boolean) => {
    if (!exam || !currentQuestion) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editorValue || "{}");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "答案 JSON 无法解析，请检查格式",
      );
      return;
    }

    const payload: { questions: AnswerPatch[] } = {
      questions: [
        {
          question_id: currentQuestion.id,
          answer_key: parsed,
          answer_status: "confirmed",
          answer_confidence: 1,
        },
      ],
    };

    try {
      setSaving(true);
      await updateExamAnswerKey(exam.id, payload);
      message.success(`题目 ${currentQuestion.number} 已保存`);
      await refreshExams();
      if (navigateNext) {
        if (currentIndex >= total - 1) {
          return;
        }
        setCurrentIndex((prev) => Math.min(prev + 1, total - 1));
      }
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "保存失败")
      );
      message.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleProceedNextPhase = async () => {
    if (!exam) return;
    try {
      await goToStep(3, { examId: exam.id });
      message.success("标准答案校对完成，进入学生上传阶段");
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "无法进入下一步")
      );
      message.error(detail);
    }
  };

  if (!exam) {
    return (
      <Alert
        type="warning"
        showIcon
        message="尚未选择试卷"
        description="请返回上一步选择或新建试卷后再进行答案校对。"
      />
    );
  }

  if (total === 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="当前试卷尚未解析题目"
        description="请返回上一阶段检查试卷结构或重新上传扫描件。"
      />
    );
  }

  const allConfirmed = confirmedCount === total;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Space direction="vertical" size={8}>
        <Title level={3} style={{ margin: 0 }}>
          核对标准答案
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          按顺序核对系统识别的答案信息，确认后将自动记录在题库中。完成所有题目后即可进入学生卷面上传阶段。
        </Paragraph>
      </Space>

      <Card bordered={false} style={{ borderRadius: 18, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={24} align="middle">
            <Statistic title="当前题目" value={`${currentIndex + 1} / ${total}`} />
            <Statistic title="已确认" value={confirmedCount} suffix={` / ${total}`} valueStyle={{ color: "#16a34a" }} />
            <div style={{ flex: 1 }}>
              <Progress percent={Math.round(((currentIndex + 1) / total) * 100)} showInfo={false} />
            </div>
          </Row>

          <Divider />

          <Space direction="vertical" size={18} style={{ width: "100%" }}>
            <Space direction="vertical" size={6}>
              <Tag color="geekblue">题号 {currentQuestion.number}</Tag>
              <Space size={8} wrap>
                <Tag color="blue">题型：{currentQuestion.type}</Tag>
                {currentQuestion.knowledge_tags && (
                  <Tag color="purple">知识点：{currentQuestion.knowledge_tags}</Tag>
                )}
                <Tag color="gray">分值：{currentQuestion.max_score}</Tag>
              </Space>
            </Space>
            <Paragraph>{currentQuestion.prompt || "题干暂无描述"}</Paragraph>
            <div>
              <Text strong>标准答案（JSON）</Text>
              <Input.TextArea
                style={{ marginTop: 8 }}
                autoSize={{ minRows: 8, maxRows: 16 }}
                value={editorValue}
                onChange={(event) => setEditorValue(event.target.value)}
                spellCheck={false}
              />
            </div>
          </Space>

          <Divider />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <Space size={12}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => handleSwitch("prev")}
                disabled={currentIndex === 0 || saving}
              >
                上一题
              </Button>
              <Button
                type="primary"
                ghost
                icon={<ArrowRightOutlined />}
                onClick={() => handleSwitch("next")}
                disabled={currentIndex >= total - 1 || saving}
              >
                下一题
              </Button>
            </Space>
            <Space size={12}>
              <Button onClick={() => handleSave(false)} loading={saving}>保存当前题目</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSave(true)}
                loading={saving}
              >
                保存并下一题
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      {allConfirmed && (
        <Alert
          type="success"
          showIcon
          message="所有题目均已确认"
          description={
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Text>所有题目已完成标准答案校对，可继续上传学生卷面进行批改。</Text>
              <Button
                type="primary"
                size="large"
                shape="round"
                loading={savingStep}
                onClick={handleProceedNextPhase}
              >
                前往学生试卷上传
              </Button>
            </Space>
          }
        />
      )}
    </Space>
  );
};

export default StepAnswerReview;




