import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
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
import { InboxOutlined, LoadingOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchStudents, uploadSubmission } from "../../api/services";
import type { Student, SubmissionProcessingResult } from "../../types";
import { useWizardStore } from "../useWizardStore";

const { Title, Paragraph, Text } = Typography;

interface QueueItem {
  id: string;
  fileName: string;
  studentName: string;
  startedAt: string;
  status: "processing" | "completed" | "error";
  result?: SubmissionProcessingResult;
  error?: string;
}

const StepStudentUpload = () => {
  const {
    state: { session, selectedExamId },
    actions: { goToStep },
  } = useWizardStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const data = await fetchStudents();
      setStudents(data);
      if (!selectedStudentId && data.length > 0) {
        setSelectedStudentId(data[0].id);
      }
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "学生列表获取失败")
      );
      message.error(detail);
    } finally {
      setStudentsLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === selectedStudentId),
    [students, selectedStudentId],
  );

  const handleUpload = async (file: RcFile) => {
    if (!selectedExamId) {
      message.error("请选择试卷后再上传学生卷面");
      return Upload.LIST_IGNORE;
    }
    if (!selectedStudentId) {
      message.error("请选择学生后再上传");
      return Upload.LIST_IGNORE;
    }

    const queueId = `${Date.now()}-${file.uid}`;
    const newItem: QueueItem = {
      id: queueId,
      fileName: file.name,
      studentName: selectedStudent?.name ?? `学生 #${selectedStudentId}`,
      startedAt: new Date().toISOString(),
      status: "processing",
    };
    setQueue((prev) => [newItem, ...prev]);

    try {
      const formData = new FormData();
      formData.append("student_id", String(selectedStudentId));
      formData.append("exam_id", String(selectedExamId));
      formData.append("image", file);
      if (session?.id) {
        formData.append("session_id", String(session.id));
      }
      const result = await uploadSubmission(formData);
      setQueue((prev) =>
        prev.map((item) => (item.id === queueId ? { ...item, status: "completed", result } : item)),
      );
      message.success(`${file.name} 已加入批改队列`);
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "上传失败")
      );
      setQueue((prev) =>
        prev.map((item) => (item.id === queueId ? { ...item, status: "error", error: detail } : item)),
      );
      message.error(detail);
    }

    return Upload.LIST_IGNORE;
  };

  const uploadProps: UploadProps = {
    multiple: true,
    accept: "image/*",
    beforeUpload: handleUpload,
    showUploadList: false,
  };

  const completedCount = queue.filter((item) => item.status === "completed").length;

  const handleProceed = async () => {
    if (!selectedExamId) return;
    try {
      await goToStep(4, { examId: selectedExamId });
      message.success("学生卷面已上传，进入批改确认阶段");
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "无法进入下一步")
      );
      message.error(detail);
    }
  };

  if (!selectedExamId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="尚未选择试卷"
        description="请返回试卷配置阶段选择已确认答案的试卷。"
      />
    );
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Space direction="vertical" size={8}>
        <Title level={3} style={{ margin: 0 }}>
          上传学生卷面
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          支持拖拽或批量上传，系统会自动识别题号并给出置信度；若识别度低，可在下一阶段人工确认。
        </Paragraph>
      </Space>

      <Row gutter={24} wrap>
        <Col xs={24} xl={12}>
          <Card
            title="批量上传"
            bordered={false}
            style={{ borderRadius: 18, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }}
            bodyStyle={{ padding: 24 }}
          >
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <div>
                <Text strong style={{ marginBottom: 8, display: "block" }}>选择学生</Text>
                <Spin spinning={studentsLoading} indicator={<LoadingOutlined spin />}>
                  <Select
                    showSearch
                    placeholder="选择学生"
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    value={selectedStudentId}
                    options={students.map((student) => ({
                      label: `${student.name} · ${student.grade_level ?? "未分班"}`,
                      value: student.id,
                    }))}
                    onChange={(value) => setSelectedStudentId(value)}
                  />
                </Spin>
              </div>
              <Upload.Dragger {...uploadProps} disabled={studentsLoading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">拖拽或点击上传学生卷面图片</p>
                <p className="ant-upload-hint">支持 JPG/PNG，建议保持清晰度 &gt; 300dpi</p>
              </Upload.Dragger>
              <Alert
                type="info"
                showIcon
                message="提示"
                description="上传后系统会立即调用 AI 批改，并将结果进入队列。您可以在右侧实时查看处理状态。"
              />
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            title="处理队列"
            bordered={false}
            style={{ borderRadius: 18, boxShadow: "0 24px 60px rgba(15,23,42,0.06)" }}
            bodyStyle={{ padding: 24 }}
            extra={<Tag color={completedCount > 0 ? "green" : "orange"}>已完成 {completedCount}</Tag>}
          >
            {queue.length === 0 ? (
              <Empty
                description="队列为空，等待上传"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={queue}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Space align="center" size={10} wrap>
                        <Text strong>{item.fileName}</Text>
                        <Tag color="geekblue">{item.studentName}</Tag>
                        <Tag color="gray">{dayjs(item.startedAt).format("HH:mm:ss")}</Tag>
                        {item.status === "processing" && <Tag color="blue">处理中</Tag>}
                        {item.status === "completed" && <Tag color="green">已完成</Tag>}
                        {item.status === "error" && <Tag color="red">失败</Tag>}
                      </Space>
                      {item.result?.matching_score !== undefined && (
                        <Text type="secondary">匹配度：{Math.round((item.result.matching_score ?? 0) * 100)}%</Text>
                      )}
                      {item.error && <Text type="danger">{item.error}</Text>}
                    </Space>
                  </List.Item>
                )}
              />
            )}
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                disabled={completedCount === 0}
                onClick={handleProceed}
              >
                所有队列完成，前往AI批改确认
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default StepStudentUpload;
