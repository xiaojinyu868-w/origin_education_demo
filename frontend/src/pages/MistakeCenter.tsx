import { useEffect, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  List,
  Result,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import type { Mistake, PracticeAssignment, Student } from "../types";
import {
  completePractice,
  createPractice,
  fetchPracticeAssignments,
  fetchStudents,
  fetchStudentMistakes,
} from "../api/services";
import PageLayout from "../components/PageLayout";

const { Paragraph, Title, Text } = Typography;

const MistakeCenter = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [latestAssignment, setLatestAssignment] = useState<PracticeAssignment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const list = await fetchStudents();
      setStudents(list);
      if (list.length > 0) {
        await loadStudentData(list[0].id);
      }
    })();
  }, []);

  const loadStudentData = async (studentId: number) => {
    setSelectedStudent(studentId);
    const [mistakeList, assignmentList] = await Promise.all([
      fetchStudentMistakes(studentId),
      fetchPracticeAssignments({ student_id: studentId }),
    ]);
    setMistakes(mistakeList);
    setAssignments(assignmentList);
    setLatestAssignment(assignmentList[0] ?? null);
  };

  const handleCreatePractice = async (values: { knowledge_filters?: string; max_items?: number }) => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      const filters = values.knowledge_filters
        ? values.knowledge_filters
            .split(/[，,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;
      const assignment = await createPractice({
        student_id: selectedStudent,
        knowledge_filters: filters,
        max_items: values.max_items || 10,
      });
      setLatestAssignment(assignment);
      const assignmentList = await fetchPracticeAssignments({ student_id: selectedStudent });
      setAssignments(assignmentList);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (assignmentId: number, completed: boolean) => {
    const updated = await completePractice({ assignment_id: assignmentId, completed });
    if (selectedStudent) {
      const assignmentList = await fetchPracticeAssignments({ student_id: selectedStudent });
      setAssignments(assignmentList);
      const latest = assignmentList.find((item) => item.id === updated.id) ?? assignmentList[0] ?? null;
      setLatestAssignment(latest);
    }
  };

  return (
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      <PageLayout
        title="错题诊断中心"
        description="系统自动整理的错题本会保留答题过程、知识点与练习记录。"
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Select
            placeholder="请选择学生"
            value={selectedStudent ?? undefined}
            onChange={(value) => void loadStudentData(value)}
            options={students.map((student) => ({ value: student.id, label: student.name }))}
            style={{ width: 280 }}
          />
          {mistakes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无错题记录，待上传试卷后自动生成。"
            />
          ) : (
            <List
              bordered
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
                        <Text type="secondary">最近出现：{item.last_seen_at}</Text>
                      </Space>
                    }
                  />
                  <Tag color="volcano">练习次数 {item.times_practiced}</Tag>
                </List.Item>
              )}
            />
          )}
        </Space>
      </PageLayout>

      <PageLayout
        title="生成错题练习"
        description="输入知识点关键词即可组合针对性练习，系统会同步生成 PDF 版本。"
      >
        <Form layout="inline" onFinish={handleCreatePractice}>
          <Form.Item name="knowledge_filters" label="关键词">
            <Input allowClear placeholder="例如：一次函数, 二次函数" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="max_items" label="题量">
            <Input type="number" placeholder="默认 10" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={!selectedStudent}>
              生成练习
            </Button>
          </Form.Item>
        </Form>

        {latestAssignment ? (
          <Result
            status="success"
            title={`练习编号 ${latestAssignment.id}`}
            subTitle={`状态：${latestAssignment.status} · 题量：${latestAssignment.items?.length ?? 0}`}
            extra={
              latestAssignment.generated_pdf_path ? (
                <Button type="primary" href={`/api/practice/${latestAssignment.id}/pdf`} target="_blank">
                  打开 PDF 练习卷
                </Button>
              ) : (
                <Button disabled>PDF 正在生成</Button>
              )
            }
          />
        ) : (
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            生成任意一次练习后，将在此展示最新练习的状态与下载入口。
          </Paragraph>
        )}
      </PageLayout>

      <PageLayout
        title="练习跟进清单"
        description="追踪练习派送与完成情况，可一键标记状态并下载 PDF。"
      >
        <List
          bordered
          dataSource={assignments}
          locale={{ emptyText: "暂无练习任务" }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="toggle"
                  type="link"
                  onClick={() => handleComplete(item.id, item.status !== "completed")}
                >
                  {item.status === "completed" ? "标记为未完成" : "标记为已完成"}
                </Button>,
                item.generated_pdf_path ? (
                  <Button key="pdf" type="link" href={`/api/practice/${item.id}/pdf`} target="_blank">
                    查看 PDF
                  </Button>
                ) : null,
              ]}
            >
              <List.Item.Meta
                title={`练习编号：${item.id}`}
                description={
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>安排日期：{item.scheduled_for}</Text>
                    <Text type="secondary">状态：{item.status} · 题量：{item.items?.length ?? 0}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </PageLayout>
    </Space>
  );
};

export default MistakeCenter;
