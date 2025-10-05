import { Drawer, List, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Mistake, SubmissionProcessingResult } from "../types";

const { Paragraph, Title } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  result?: SubmissionProcessingResult | null;
}

const SubmissionResultDrawer = ({ open, onClose, result }: Props) => {
  const columns: ColumnsType<SubmissionProcessingResult["responses"][number]> = [
    {
      title: "题号",
      dataIndex: "question_id",
      width: 80,
    },
    {
      title: "学生作答",
      dataIndex: "student_answer",
      render: (value: string) => value || "—",
    },
    {
      title: "得分",
      dataIndex: "score",
      width: 90,
      render: (value: number | undefined) => value ?? "待批改",
    },
    {
      title: "判定",
      dataIndex: "is_correct",
      width: 100,
      render: (value: boolean | undefined) => {
        if (value === true) return <Tag color="green">正确</Tag>;
        if (value === false) return <Tag color="red">错误</Tag>;
        return <Tag color="blue">待确认</Tag>;
      },
    },
    {
      title: "批注",
      dataIndex: "teacher_annotation",
      render: (annotation) => annotation?.raw || "—",
    },
  ];

  const mistakes: Mistake[] = result?.mistakes ?? [];

  return (
    <Drawer
      title="批改结果详情"
      placement="right"
      open={open}
      width={560}
      onClose={onClose}
      destroyOnClose
    >
      {!result ? (
        <Paragraph type="secondary">暂无数据</Paragraph>
      ) : (
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <div>
            <Title level={5} style={{ marginBottom: 8 }}>
              提交摘要
            </Title>
            <Paragraph style={{ marginBottom: 4 }}>
              提交编号：{result.submission.id} · 学生 ID：{result.submission.student_id}
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              总分：{result.submission.total_score ?? "待计算"} · 状态：{result.submission.status}
            </Paragraph>
          </div>

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
        </Space>
      )}
    </Drawer>
  );
};

export default SubmissionResultDrawer;

