import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Progress,
  Radio,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { confirmAllExamAnswers, updateExamAnswerKey, updateExamSettings } from "../../api/services";
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

const ensureRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const ensureStringSet = (value: unknown, transform?: (item: string) => string) => {
  const set = new Set<string>();
  const apply = (candidate: string) => {
    const trimmed = candidate.trim();
    if (!trimmed) return;
    const next = transform ? transform(trimmed) : trimmed;
    if (next) {
      set.add(next);
    }
  };

  const collect = (input: unknown) => {
    if (!input) return;
    if (typeof input === "string") {
      apply(input);
      return;
    }
    if (Array.isArray(input)) {
      input.forEach((item) => collect(item));
      return;
    }
    if (typeof input === "object") {
      const record = input as Record<string, unknown>;
      const nested =
        record.value ?? record.label ?? record.option ?? record.answer ?? record.text ?? record.title ?? record.key;
      if (typeof nested === "string") {
        apply(nested);
      }
    }
  };

  collect(value);
  return set;
};

const collectMultipleChoiceAnswers = (answerKey: Record<string, unknown>) => {
  const upper = (value: string) => value.toUpperCase();
  const set = ensureStringSet(
    [
      answerKey.correct,
      answerKey.correctOption,
      answerKey.correct_option,
      answerKey.correctAnswer,
      answerKey.correct_answer,
      answerKey.answer,
      answerKey.correctOptions,
      answerKey.acceptableOptions,
      answerKey.answers,
    ],
    upper,
  );

  const optionsField = answerKey.options;
  if (Array.isArray(optionsField)) {
    optionsField.forEach((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const flagged = Boolean(
          record.isCorrect || record.is_correct || record.correct || record.answer === true,
        );
        if (flagged) {
          ensureStringSet(record, upper).forEach((value) => set.add(value));
        }
      }
    });
  }

  return Array.from(set).sort();
};

const collectFillInAnswers = (answerKey: Record<string, unknown>) => {
  return Array.from(
    ensureStringSet([
      answerKey.acceptableAnswers,
      answerKey.acceptable_answers,
      answerKey.correctAnswers,
      answerKey.correct_answers,
      answerKey.answers,
      answerKey.expectedAnswers,
      answerKey.expected_answers,
      answerKey.solutions,
    ]),
  );
};

const collectSubjectiveReference = (answerKey: Record<string, unknown>) => {
  const fields = [
    "referenceAnswer",
    "modelAnswer",
    "sampleAnswer",
    "answer",
    "analysis",
    "reference",
    "solution",
  ];
  for (const key of fields) {
    const value = answerKey[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const formatAnswerSummary = (question: Question | undefined, rawAnswer: Record<string, unknown>) => {
  if (!question) return "";
  const answerKey = ensureRecord(rawAnswer);
  switch (question.type) {
    case "multiple_choice": {
      const options = collectMultipleChoiceAnswers(answerKey);
      return options.length > 0 ? `正确选项：${options.join(" / ")}` : "";
    }
    case "fill_in_blank": {
      const candidates = collectFillInAnswers(answerKey);
      return candidates.length > 0 ? `可接受答案：${candidates.join("、")}` : "";
    }
    case "subjective": {
      const reference = collectSubjectiveReference(answerKey);
      return reference ? `参考答案：${reference}` : "";
    }
    default:
      return "";
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
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [modeUpdating, setModeUpdating] = useState(false);
  const [jsonEditorVisible, setJsonEditorVisible] = useState(false);

  const exam: Exam | undefined = useMemo(
    () => exams.find((item) => item.id === selectedExamId),
    [exams, selectedExamId],
  );

  const questions: Question[] = exam?.questions ?? [];
  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const answerMode = useMemo<"strict" | "smart">(() => {
    const metadata = (exam?.extra_metadata ?? {}) as { answerMode?: string };
    return metadata.answerMode === "smart" ? "smart" : "strict";
  }, [exam?.extra_metadata]);
  const subQuestions = useMemo(() => {
    const raw = (currentQuestion?.answer_key as Record<string, unknown> | undefined)?.subQuestions;
    if (!Array.isArray(raw)) {
      return [] as Array<{
        key: string;
        label: string;
        normalized?: string;
        answers: string[];
      }>;
    }
    return raw
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const labelCandidate =
          typeof record.label === "string"
            ? record.label
            : typeof record.number === "string"
            ? record.number
            : `子问 ${index + 1}`;
        const normalized =
          typeof record.normalizedLabel === "string"
            ? record.normalizedLabel
            : typeof record.normalized_number === "string"
            ? record.normalized_number
            : undefined;
        const acceptable =
          (Array.isArray(record.acceptableAnswers) ? record.acceptableAnswers : null) ??
          (Array.isArray(record.acceptable_answers) ? record.acceptable_answers : null) ??
          [];
        const answers = acceptable.filter((value) => typeof value === "string").map((value) => value as string);
        return {
          key: `${labelCandidate}-${index}`,
          label: labelCandidate,
          normalized,
          answers,
        };
      })
      .filter((item): item is { key: string; label: string; normalized: string | undefined; answers: string[] } => !!item);
  }, [currentQuestion]);
  const confirmedCount = useMemo(
    () => questions.filter((question) => question.answer_status === "confirmed").length,
    [questions],
  );

  const progressPercent = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;

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
    setJsonEditorVisible(false);
  }, [exam, currentQuestion, currentIndex, total]);

  const previewAnswerKey = useMemo(() => {
    if (!currentQuestion) {
      return {};
    }
    try {
      const parsed = editorValue ? JSON.parse(editorValue) : {};
      return ensureRecord(parsed);
    } catch (_error) {
      return ensureRecord(currentQuestion.answer_key);
    }
  }, [currentQuestion, editorValue]);

  const answerSummary = useMemo(
    () => formatAnswerSummary(currentQuestion, previewAnswerKey),
    [currentQuestion, previewAnswerKey],
  );

  const multipleChoiceAnswers = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== "multiple_choice") return [];
    return collectMultipleChoiceAnswers(previewAnswerKey);
  }, [currentQuestion, previewAnswerKey]);

  const fillInAnswers = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== "fill_in_blank") return [];
    return collectFillInAnswers(previewAnswerKey);
  }, [currentQuestion, previewAnswerKey]);

  const subjectiveReference = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== "subjective") return "";
    return collectSubjectiveReference(previewAnswerKey);
  }, [currentQuestion, previewAnswerKey]);

  useEffect(() => {
    if (!currentQuestion) return;
    const hasVisual =
      Boolean(answerSummary) ||
      (currentQuestion.type === "multiple_choice" && multipleChoiceAnswers.length > 0) ||
      (currentQuestion.type === "fill_in_blank" && fillInAnswers.length > 0) ||
      (currentQuestion.type === "subjective" && Boolean(subjectiveReference));
    if (!hasVisual && !jsonEditorVisible) {
      setJsonEditorVisible(true);
    }
  }, [answerSummary, currentQuestion, fillInAnswers, jsonEditorVisible, multipleChoiceAnswers, subjectiveReference]);

  const handleConfirmAll = async () => {
    if (!exam || confirmingAll || confirmedCount === total) {
      return;
    }
    try {
      setConfirmingAll(true);
      await confirmAllExamAnswers(exam.id);
      message.success("所有题目已批量确认");
      await refreshExams();
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "批量确认失败");
      message.error(detail);
    } finally {
      setConfirmingAll(false);
    }
  };

  const handleAnswerModeChange = async (nextMode: "strict" | "smart") => {
    if (!exam || nextMode === answerMode) {
      return;
    }
    try {
      setModeUpdating(true);
      await updateExamSettings(exam.id, { answer_mode: nextMode });
      message.success(nextMode === "strict" ? "已切换至严格匹配模式" : "已切换至智能参考模式");
      await refreshExams();
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "更新答案模式失败");
      message.error(detail);
    } finally {
      setModeUpdating(false);
    }
  };

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
    const pendingAnswers = questions.filter((question) => question.answer_status !== "confirmed").length;
    if (pendingAnswers > 0) {
      message.warning(`仍有 ${pendingAnswers} 道题目未确认标准答案`);
      return;
    }
    try {
      const now = new Date().toISOString();
      await goToStep(3, {
        examId: exam.id,
        payload: {
          wizardProgress: {
            answers: {
              total: questions.length,
              confirmed: questions.length,
              pending: 0,
              updatedAt: now,
            },
          },
        },
      });
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
          <Row gutter={24} align="middle" wrap={false} style={{ rowGap: 12 }}>
            <Statistic title="当前题目" value={`${currentIndex + 1} / ${total}`} />
            <Statistic
              title="已确认"
              value={confirmedCount}
              suffix={` / ${total}`}
              valueStyle={{ color: "#16a34a" }}
            />
            <div style={{ flex: 1, minWidth: 220 }}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text type="secondary">确认进度</Text>
                <Progress percent={progressPercent} showInfo={false} />
              </Space>
            </div>
            <Button
              type="primary"
              ghost
              onClick={handleConfirmAll}
              loading={confirmingAll}
              disabled={confirmingAll || confirmedCount === total}
            >
              一键确认全部
            </Button>
          </Row>

          <Divider />

          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space size={12} align="center" wrap>
              <Text strong>答案模式</Text>
              <Radio.Group
                value={answerMode}
                onChange={(event) => handleAnswerModeChange(event.target.value)}
                disabled={modeUpdating}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="strict">严格匹配</Radio.Button>
                <Radio.Button value="smart">智能参考</Radio.Button>
              </Radio.Group>
              {modeUpdating && <Text type="secondary">正在更新...</Text>}
            </Space>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {answerMode === "strict"
                ? "严格匹配：仅保留教师提供的标准答案，不自动扩写建议答案。"
                : "智能参考：允许大模型给出语义相近的参考答案，并对可疑结果进行提示。"}
            </Paragraph>
          </Space>

          <Divider />

          <Space direction="vertical" size={18} style={{ width: "100%" }}>
            <Space direction="vertical" size={6}>
              <Tag color="geekblue">题号 {currentQuestion.number}</Tag>
              <Space size={8} wrap>
                <Tag color="blue">题型：{currentQuestion.type}</Tag>
                {currentQuestion.knowledge_tags && (<Tag color="purple">知识点：{currentQuestion.knowledge_tags}</Tag>)}
                <Tag color="gray">分值：{currentQuestion.max_score}</Tag>
              </Space>
            </Space>
            <Paragraph>{currentQuestion.prompt || "题干暂无描述"}</Paragraph>
            {subQuestions.length > 0 && (
              <Space
                direction="vertical"
                size={8}
                style={{ width: "100%", background: "#f8fafc", padding: 12, borderRadius: 12 }}
              >
                <Text strong>子问结构</Text>
                {subQuestions.map((item) => (
                  <Space key={item.key} direction="vertical" size={4} style={{ width: "100%" }}>
                    <Space size={8} wrap>
                      <Tag color="geekblue">{item.label}</Tag>
                      {item.normalized && <Tag color="cyan">规范：{item.normalized}</Tag>}
                    </Space>
                    {item.answers.length > 0 && (<Text type="secondary">可接受答案：{item.answers.join("、")}</Text>)}
                  </Space>
                ))}
              </Space>
            )}
            {(answerSummary || multipleChoiceAnswers.length > 0 || fillInAnswers.length > 0 || subjectiveReference) && (
              <Card size="small" bordered={false} style={{ background: "#f0f6ff" }}>
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                    <Text strong style={{ color: "#1d4ed8" }}>
                      标准答案
                    </Text>
                    <Button
                      type="link"
                      style={{ padding: 0 }}
                      onClick={() => setJsonEditorVisible((previous) => !previous)}
                    >
                      {jsonEditorVisible ? "收起 JSON 编辑" : "展开 JSON 编辑"}
                    </Button>
                  </Space>
                  {answerSummary && <Paragraph style={{ marginBottom: 0 }}>{answerSummary}</Paragraph>}
                  {currentQuestion.type === "multiple_choice" && multipleChoiceAnswers.length > 0 && (
                    <Space size={6} wrap>
                      {multipleChoiceAnswers.map((option) => (
                        <Tag key={option} color="volcano">
                          选项 {option}
                        </Tag>
                      ))}
                    </Space>
                  )}
                  {currentQuestion.type === "fill_in_blank" && fillInAnswers.length > 0 && (
                    <Space size={6} wrap>
                      {fillInAnswers.map((item) => (
                        <Tag key={item} color="cyan">
                          {item}
                        </Tag>
                      ))}
                    </Space>
                  )}
                  {currentQuestion.type === "subjective" && subjectiveReference && (
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {subjectiveReference}
                    </Paragraph>
                  )}
                </Space>
              </Card>
            )}
            {jsonEditorVisible && (
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
            )}
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
              <Button onClick={() => handleSave(false)} loading={saving}>
                保存当前题目
              </Button>
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




