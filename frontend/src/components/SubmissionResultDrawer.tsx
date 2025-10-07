import { Alert, Drawer, List, Space, Steps, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Mistake, ProcessingStep, SubmissionProcessingResult } from "../types";

const { Paragraph, Title, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  result?: SubmissionProcessingResult | null;
}

const stepStatusMap: Record<ProcessingStep["status"], "wait" | "process" | "finish" | "error"> = {
  success: "finish",
  warning: "process",
  error: "error",
};

const SubmissionResultDrawer = ({ open, onClose, result }: Props) => {
  const columns: ColumnsType<SubmissionProcessingResult["responses"][number]> = [
    {
      title: "题号",
      dataIndex: "question_id",
      width: 80,
      align: "center",
    },
    {
      title: "学生作答",
      dataIndex: "student_answer",
      render: (value: string | undefined, record) =>
        record.applies_to_student ? value || "—" : <Tag color="default">定向题 · 未参与</Tag>,
    },
    {
      title: "得分",
      dataIndex: "score",
      width: 110,
      align: "center",
      render: (value: number | undefined, record) => {
        if (!record.applies_to_student) {
          return <Tag color="default">—</Tag>;
        }
        return value ?? "待批改";
      },
    },
    {
      title: "判定",
      dataIndex: "is_correct",
      width: 110,
      align: "center",
      render: (value: boolean | undefined, record) => {
        if (!record.applies_to_student) {
          return <Tag>跳过</Tag>;
        }
        if (value === true) return <Tag color="green">正确</Tag>;
        if (value === false) return <Tag color="red">错误</Tag>;
        return <Tag color="blue">待确认</Tag>;
      },
    },
    {
      title: "置信度",
      dataIndex: "ocr_confidence",
      width: 110,
      align: "center",
      render: (value: number | undefined, record) =>
        record.applies_to_student && value !== undefined && value !== null ? `${Math.round(value * 100)}%` : "—",
    },
    {
      title: "AI 反馈",
      dataIndex: "comments",
      render: (value: string | undefined, record) => {
        if (!record.applies_to_student) {
          return record.comments || "本题为定向错题巩固题，系统自动跳过评分";
        }
        return value || "—";
      },
    },
    {
      title: "教师批注",
      dataIndex: "teacher_annotation",
      render: (annotation) => annotation?.raw || "—",
    },
  ];

  const mistakes: Mistake[] = result?.mistakes ?? [];
  const processingSteps = result?.processing_steps ?? [];
  const aiSummary = result?.ai_summary;

  return (
    <Drawer
      title="批改结果详情"
      placement="right"
      open={open}
      width={620}
      onClose={onClose}
      destroyOnClose
    >
      {!result ? (
        <Paragraph type="secondary">暂无数据</Paragraph>
      ) : (
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <div>
            <Title level={5} style={{ marginBottom: 4 }}>
              提交摘要
            </Title>
            <Paragraph style={{ marginBottom: 4 }}>
              提交编号：{result.submission.id} · 学生 ID：{result.submission.student_id}
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              总分：{result.submission.total_score ?? "待计算"} · 状态：{result.submission.status}
            </Paragraph>
          </div>

          {aiSummary && (
            <Alert
              type="success"
              showIcon
              message="AI 批改总结"
              description={aiSummary}
            />
          )}

          {processingSteps.length > 0 && (
            <div>
              <Title level={5} style={{ marginBottom: 12 }}>
                处理流程
              </Title>
              <Steps
                size="small"
                direction="vertical"
                items={processingSteps.map((step) => ({
                  title: step.name,
                  description: step.detail,
                  status: stepStatusMap[step.status] ?? "process",
                }))}
              />
            </div>
          )}

          <Table
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={result.responses}
            pagination={false}
          />

          <div>
            <Title level={5}>错题明细</Title>
            {mistakes.length === 0 ? (
              <Paragraph type="secondary">本次提交暂未识别错题。</Paragraph>
            ) : (
              <List
                dataSource={mistakes}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`题目 ID：${item.question_id}`}
                      description={
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Paragraph style={{ marginBottom: 0 }}>
                            知识点：{item.knowledge_tags || "未标注"}
                          </Paragraph>
                          <Paragraph style={{ marginBottom: 0 }} type="secondary">
                            创建时间：{item.created_at}
                          </Paragraph>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>

          <Text type="secondary">温馨提示：定向错题题目仅对指定学生纳入统计，其余学生自动跳过。</Text>
        </Space>
      )}
    </Drawer>
  );
};

export default SubmissionResultDrawer;
