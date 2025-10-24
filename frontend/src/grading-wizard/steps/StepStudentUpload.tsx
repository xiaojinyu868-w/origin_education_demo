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
import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchStudents, fetchSubmissions, uploadSubmission } from "../../api/services";
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
  const [uploadSummary, setUploadSummary] = useState({ total: 0, completed: 0, pending: 0 });

  const refreshUploadSummary = useCallback(async () => {
    if (!selectedExamId) {
      setUploadSummary({ total: 0, completed: 0, pending: 0 });
      return null;
    }
    try {
      const submissions = await fetchSubmissions({ exam_id: selectedExamId });
      const total = submissions.length;
      const completed = submissions.filter((item) => item.status === "graded").length;
      const pending = Math.max(total - completed, 0);
      const summary = { total, completed, pending };
      setUploadSummary(summary);
      return summary;
    } catch (error) {
      console.error("无法刷新上传进度", error);
      return null;
    }
  }, [selectedExamId]);

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

  useEffect(() => {
    void refreshUploadSummary();
  }, [refreshUploadSummary]);

  useEffect(() => {
    if (!session || !selectedExamId) {
      return;
    }
    const { total, completed, pending } = uploadSummary;
    if (total === 0 && completed === 0 && pending === 0) {
      return;
    }
    const payloadRoot = (session.payload ?? {}) as Record<string, unknown>;
    const wizardProgress =
      payloadRoot.wizardProgress && typeof payloadRoot.wizardProgress === "object"
        ? (payloadRoot.wizardProgress as Record<string, unknown>)
        : {};
    const uploadsSegment =
      wizardProgress.uploads && typeof wizardProgress.uploads === "object"
        ? (wizardProgress.uploads as Record<string, unknown>)
        : {};
    const toNum = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value)
        ? value
        : Number.isFinite(Number(value))
        ? Number(value)
        : undefined;
    const same =
      toNum(uploadsSegment.total) === total &&
      (toNum(uploadsSegment.completed) ??
        toNum((uploadsSegment as Record<string, unknown>).confirmed)) === completed &&
      toNum(uploadsSegment.pending) === pending;
    if (same) {
      return;
    }
    void goToStep(3, {
      examId: selectedExamId,
      payload: {
        wizardProgress: {
          uploads: {
            total,
            completed,
            pending,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    }).catch((error) => {
      console.error("无法同步上传进度", error);
    });
  }, [session, selectedExamId, uploadSummary, goToStep]);

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
      void refreshUploadSummary();
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

  const queueProcessingCount = queue.filter((item) => item.status === "processing").length;

  const handleProceed = async () => {
    if (!selectedExamId) {
      return;
    }
    if (queueProcessingCount > 0) {
      message.info(`仍有 ${queueProcessingCount} 份处理中，请稍候`);
      return;
    }
    if (uploadSummary.total === 0) {
      message.warning("请至少上传一份学生卷面后再继续");
      return;
    }
    if (uploadSummary.pending > 0) {
      message.warning(`仍有 ${uploadSummary.pending} 份卷面待批改完成`);
      return;
    }

    try {
      const now = new Date().toISOString();
      await goToStep(4, {
        examId: selectedExamId,
        payload: {
          wizardProgress: {
            uploads: {
              total: uploadSummary.total,
              completed: uploadSummary.completed,
              pending: uploadSummary.pending,
              updatedAt: now,
            },
          },
        },
      });
      message.success("上传工作已完成，进入 AI 批改确认阶段");
    } catch (error) {
      const detail = (
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : "无法进入下一阶段")
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
          <br />
          当前已上传 {uploadSummary.total} 份卷面，其中 {uploadSummary.completed} 份已完成批改。
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
                <Text strong style={{ marginBottom: 8, display: "block" }}>
                  选择学生
                </Text>
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
            extra={
              <Tag color={uploadSummary.total > 0 ? "green" : "orange"}>
                已上传 {uploadSummary.total} 份 · 完成 {uploadSummary.completed} 份
              </Tag>
            }
          >
            {queue.length === 0 ? (
              <Empty description="队列为空，等待上传" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                        <Text type="secondary">
                          匹配度：{Math.round((item.result.matching_score ?? 0) * 100)}%
                        </Text>
                      )}
                      {item.error && <Text type="danger">{item.error}</Text>}
                    </Space>
                  </List.Item>
                )}
              />
            )}
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" disabled={uploadSummary.total === 0} onClick={handleProceed}>
                所有卷面已处理，前往 AI 批改确认
              </Button>
              {queueProcessingCount > 0 && (
                <Text type="secondary">仍有 {queueProcessingCount} 份处理中，请稍候</Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default StepStudentUpload;
