import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadProps, RcFile } from "antd/es/upload/interface";
import { InboxOutlined, PlusOutlined, ReloadOutlined, SettingOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Exam, ExamDraftResponse, Question } from "../../types";
import { createExam, fetchAssistantStatus, fetchExamDraft } from "../../api/services";
import { useWizardStore } from "../useWizardStore";
import LlmConfigModal from "../../components/LlmConfigModal";

const { Title, Text, Paragraph } = Typography;

const QUESTION_TYPE_OPTIONS = [
  { label: "选择题", value: "multiple_choice" },
  { label: "填空题", value: "fill_in_blank" },
  { label: "主观题", value: "subjective" },
];

type QuestionTypeValue = Question["type"];

type DraftQuestion = {
  number: string;
  type: QuestionTypeValue;
  prompt: string;
  max_score: number;
  knowledge_tags?: string;
  answer_json: string;
};

type ExamDraftFormValues = {
  title: string;
  subject?: string;
  questions: DraftQuestion[];
};

const normalizeType = (value: unknown): QuestionTypeValue => {
  const normalized = String(value ?? "multiple_choice").toLowerCase();
  if (normalized.includes("fill")) return "fill_in_blank";
  if (normalized.includes("subject")) return "subjective";
  return "multiple_choice";
};

const safeString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

const outlineToFormValues = (outline: Record<string, unknown>): ExamDraftFormValues => {
  const questions = Array.isArray(outline.questions) ? (outline.questions as unknown[]) : [];
  return {
    title: safeString(outline.title, "未命名试卷"),
    subject: safeString(outline.subject, undefined),
    questions: questions.map((item, index) => {
      const node = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const number = safeString(node.number, String(index + 1));
      const prompt = safeString(node.prompt, "");
      const maxScore = Number(node.maxScore ?? node.max_score ?? 1) || 1;
      const answerKey = node.answerKey ?? node.answer_key ?? {};
      return {
        number,
        type: normalizeType(node.type),
        prompt,
        max_score: maxScore,
        knowledge_tags: safeString(node.knowledgeTags, undefined),
        answer_json: JSON.stringify(answerKey ?? {}, null, 2),
      } satisfies DraftQuestion;
    }),
  };
};

const parseAnswer = (value: string, index: number) => {
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch (error) {
    throw new SyntaxError(`题目 ${index + 1} 的答案 JSON 无法解析`);
  }
};

const StepExamConfig = () => {
  const {
    state: { teachers, teacherId, exams, examsLoading, selectedExamId, savingStep },
    actions: { refreshExams, selectExam, setTeacher, goToStep },
  } = useWizardStore();

  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftPreview, setDraftPreview] = useState<ExamDraftResponse | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<ExamDraftFormValues>();
  const [, setFileList] = useState<RcFile[]>([]);
  const [llmStatus, setLlmStatus] = useState<"unknown" | "available" | "unavailable">("unknown");
  const [configVisible, setConfigVisible] = useState(false);

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId),
    [exams, selectedExamId],
  );

  const teacherOptions = useMemo(
    () => teachers.map((teacher) => ({ label: teacher.name, value: teacher.id })),
    [teachers],
  );

  const refreshLlmStatus = useCallback(async () => {
    try {
      const { available } = await fetchAssistantStatus();
      setLlmStatus(available ? "available" : "unavailable");
    } catch (_error) {
      setLlmStatus("unavailable");
    }
  }, []);

  const canUpload = Boolean(teacherId);
  const llmReady = llmStatus === "available";
  const uploadDisabled = !canUpload || draftLoading || teacherOptions.length === 0 || !llmReady;

  const statusTag = useMemo(() => {
    if (llmStatus === "unknown") {
      return null;
    }
    return llmReady
      ? { color: "success", label: "AI ?????" } as const
      : { color: "warning", label: "??????" } as const;
  }, [llmReady, llmStatus]);

  useEffect(() => {
    void refreshLlmStatus();
  }, [refreshLlmStatus]);

  useEffect(() => {
    if (!teacherId && teachers.length > 0) {
      void setTeacher(teachers[0].id);
    }
  }, [teacherId, teachers, setTeacher]);

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    accept: "image/*",
    beforeUpload: (file) => {
      if (!canUpload) {
        message.warning("请先选择负责教师");
        return Upload.LIST_IGNORE;
      }
      void handleDraftUpload(file as RcFile);
      return false;
    },
    disabled: uploadDisabled,
  };

  const handleDraftUpload = async (file: RcFile) => {
    if (!teacherId) {
      message.warning("请先选择负责教师后再上传试卷");
      return;
    }
    setDraftLoading(true);
    setDraftError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("teacher_id", String(teacherId));
      const response = await fetchExamDraft(formData);
      setDraftPreview(response);
      form.setFieldsValue(outlineToFormValues(response.outline));
      message.success("试卷解析完成，请核对信息");
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "试卷解析失败")
      );
      setDraftError(detail);
      setDraftPreview(null);
      form.resetFields();
      message.error(detail);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!teacherId) {
      message.warning("请先选择负责教师后再上传试卷");
      return;
    }
    try {
      const values = await form.validateFields();
      const payload = values.questions.map((question, index) => ({
        number: question.number.trim() || String(index + 1),
        type: question.type,
        prompt: question.prompt.trim(),
        max_score: Number(question.max_score) || 1,
        knowledge_tags: question.knowledge_tags?.trim() || undefined,
        answer_key: parseAnswer(question.answer_json, index),
      }));

      setCreating(true);
      const created = await createExam({
        title: values.title.trim() || "未命名试卷",
        subject: values.subject?.trim() || undefined,
        teacher_id: teacherId,
        questions: payload,
        source_image_path: draftPreview?.source_image_path,
        parsed_outline: draftPreview?.outline,
      });
      message.success(`试卷「${created.title}」已创建`);
      await refreshExams();
      selectExam(created.id);
      setDraftModalOpen(false);
      setDraftPreview(null);
      setFileList([]);
      form.resetFields();
    } catch (error) {
      if (error instanceof SyntaxError) {
        message.error(error.message);
        return;
      }
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "保存试卷失败")
      );
      message.error(detail);
    } finally {
      setCreating(false);
    }
  };

  const handleProceed = async (examId: number) => {
    try {
      await goToStep(2, { examId });
      message.success("已进入标准答案校对阶段");
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "无法进入下一步")
      );
      message.error(detail);
    }
  };

  const resetModal = () => {
    setDraftModalOpen(false);
    setDraftPreview(null);
    setDraftError(null);
    setFileList([]);
    form.resetFields();
  };

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space direction="vertical" size={8}>
          <Title level={3} style={{ marginBottom: 0 }}>
            选择试卷，开启批改旅程
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            从已有试卷中快速进入批改，或上传扫描件让 AI 自动解析结构。
          </Paragraph>
        </Space>
        <Space size={12} align="center">
          {teachers.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="请先在班级搭建中创建教师信息"
              description="上传试卷需要绑定教师账号，可在班级搭建页面添加。"
            />
          ) : (
            <Select
              style={{ width: 220 }}
              placeholder="选择负责教师"
              value={teacherId ?? undefined}
              options={teacherOptions}
              onChange={(value) => {
                void setTeacher(value);
              }}
            />
          )}
          {statusTag && <Tag color={statusTag.color}>{statusTag.label}</Tag>}
          <Button
            icon={<SettingOutlined />}
            type={llmReady ? "default" : "primary"}
            ghost={llmReady}
            onClick={() => {
              setConfigVisible(true);
            }}
          >
            配置大模型
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => refreshExams()} loading={examsLoading}>
            刷新列表
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDraftModalOpen(true)}
            disabled={!teacherId || !llmReady}
          >
            新建试卷
          </Button>
        </Space>
      </div>
      {llmStatus === "unavailable" && (
        <Alert
          type="warning"
          showIcon
          message="尚未配置大模型 API Key"
          description="上传扫描件需要调用 AI 解析，请先完成配置。"
          action={
            <Button
              size="small"
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setConfigVisible(true)}
            >
              立即配置
            </Button>
          }
        />
      )}


      <Row gutter={24} wrap>
        <Col xs={24} xl={14}>
          <Card title="选择已有试卷" bodyStyle={{ padding: 0 }} style={{ borderRadius: 20 }}>
            <div style={{ padding: 20 }}>
              {examsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                  <Spin size="large" />
                </div>
              ) : exams.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={teacherId ? "暂无试卷" : "请先选择负责教师"}
                />
              ) : (
                <List
                  grid={{ gutter: 16, column: 2 }}
                  dataSource={exams}
                  renderItem={(exam) => {
                    const active = exam.id === selectedExamId;
                    return (
                      <List.Item key={exam.id}>
                        <Card
                          hoverable
                          onClick={() => selectExam(exam.id)}
                          style={{
                            borderRadius: 18,
                            border: active ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                            boxShadow: active
                              ? "0 18px 42px rgba(37,99,235,0.18)"
                              : "0 14px 36px rgba(15,23,42,0.08)",
                          }}
                        >
                          <Space direction="vertical" size={6}>
                            <Space align="center" size={8}>
                              <Text strong>{exam.title}</Text>
                              {exam.subject && <Tag color="blue">{exam.subject}</Tag>}
                            </Space>
                            <Text type="secondary">题目数量：{exam.questions.length}</Text>
                            <Text type="secondary">答案版本：V{exam.answer_key_version}</Text>
                            {active && <Tag color="geekblue">当前选择</Tag>}
                          </Space>
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="试卷摘要" style={{ borderRadius: 20 }} bodyStyle={{ padding: 24 }}>
            {selectedExam ? (
              <Space direction="vertical" size={20} style={{ width: "100%" }}>
                <Descriptions column={1} labelStyle={{ fontWeight: 600, width: 120 }}>
                  <Descriptions.Item label="试卷名称">{selectedExam.title}</Descriptions.Item>
                  <Descriptions.Item label="所属学科">{selectedExam.subject ?? "--"}</Descriptions.Item>
                  <Descriptions.Item label="题目数量">
                    <Badge color="#2563eb" text={`${selectedExam.questions.length} 道`} />
                  </Descriptions.Item>
                  <Descriptions.Item label="答案版本">V{selectedExam.answer_key_version}</Descriptions.Item>
                  <Descriptions.Item label="来源">
                    {selectedExam.source_image_path ? "由扫描件解析" : "手动创建"}
                  </Descriptions.Item>
                </Descriptions>
                <Button
                  type="primary"
                  size="large"
                  shape="round"
                  loading={savingStep}
                  onClick={() => handleProceed(selectedExam.id)}
                >
                  前往标准答案校对
                </Button>
                <Text type="secondary">确认试卷信息无误后，点击按钮进入下一阶段。</Text>
              </Space>
            ) : (
              <Empty description="请选择左侧试卷查看摘要" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="新建试卷"
        open={draftModalOpen}
        width={960}
        onCancel={resetModal}
        onOk={handleCreateExam}
        okText="保存并设为当前试卷"
        cancelText="取消"
        confirmLoading={creating}
        okButtonProps={{ disabled: draftLoading || !draftPreview }}
        destroyOnClose
      >
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          {teacherOptions.length > 0 ? (
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Text strong>负责教师</Text>
              <Select
                placeholder="选择负责教师"
                value={teacherId ?? undefined}
                options={teacherOptions}
                onChange={(value) => {
                  void setTeacher(value);
                }}
              />
              {!teacherId && (
                <Alert
                  type="warning"
                  showIcon
                  message="请先选择负责教师，再上传扫描件"
                />
              )}
            </Space>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="暂未检测到教师账号"
              description="请先在班级搭建中创建教师信息，返回此处后即可上传试卷。"
            />
          )}
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">拖拽或点击上传试卷扫描件</p>
            <p className="ant-upload-hint">系统将调用 AI 自动解析题目结构，建议清晰度 ≥ 300dpi</p>
          </Upload.Dragger>
          {draftLoading && <Alert type="info" showIcon message="正在解析试卷，请稍候…" />}
          {draftError && <Alert type="error" showIcon message={draftError} />}
          {draftPreview && (
            <Form form={form} layout="vertical">
              <Form.Item
                name="title"
                label="试卷名称"
                rules={[{ required: true, message: "请输入试卷名称" }]}
              >
                <Input placeholder="例如：高一数学月考卷" />
              </Form.Item>
              <Form.Item name="subject" label="学科">
                <Input placeholder="例如：数学" />
              </Form.Item>
              <Form.List name="questions">
                {(fields) => (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    {fields.map((field, index) => (
                      <Card key={field.key} type="inner" title={`题目 ${index + 1}`} style={{ borderRadius: 16 }}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name={[field.name, "number"]}
                              label="题号"
                              rules={[{ required: true, message: "请输入题号" }]}
                            >
                              <Input placeholder="例如：1" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name={[field.name, "type"]}
                              label="题型"
                              rules={[{ required: true, message: "请选择题型" }]}
                            >
                              <Select options={QUESTION_TYPE_OPTIONS} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item
                          name={[field.name, "prompt"]}
                          label="题干描述"
                          rules={[{ required: true, message: "请输入题干" }]}
                        >
                          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="请输入题干" />
                        </Form.Item>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name={[field.name, "max_score"]}
                              label="分值"
                              rules={[{ required: true, message: "请输入分值" }]}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name={[field.name, "knowledge_tags"]} label="知识点标签">
                              <Input placeholder="多个标签以逗号分隔" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item
                          name={[field.name, "answer_json"]}
                          label="标准答案（JSON 格式）"
                          rules={[{ required: true, message: "请填写标准答案" }]}
                        >
                          <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} placeholder='{ "correct": "A" }' />
                        </Form.Item>
                      </Card>
                    ))}
                  </Space>
                )}
              </Form.List>
            </Form>
          )}
        </Space>
      </Modal>
      <LlmConfigModal
        open={configVisible}
        onClose={() => setConfigVisible(false)}
        onUpdated={(status) => {
          setLlmStatus(status.available ? "available" : "unavailable");
          if (status.available) {
            message.success("模型配置已更新，可以继续上传扫描件");
          }
        }}
      />
    </Space>
  );
};

export default StepExamConfig;
