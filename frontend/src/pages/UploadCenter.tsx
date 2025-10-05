import {
  CloudUploadOutlined,
  FileSearchOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Empty, Form, Input, Select, Space, Typography, Upload, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import SubmissionResultDrawer from "../components/SubmissionResultDrawer";
import type {
  Exam,
  Student,
  SubmissionDetail,
  SubmissionProcessingResult,
} from "../types";
import {
  fetchExams,
  fetchStudents,
  fetchSubmissions,
  uploadSubmission,
} from "../api/services";

const { Paragraph, Title, Text } = Typography;

const UploadCenter = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionProcessingResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    const [studentList, examList, submissionList] = await Promise.all([
      fetchStudents(),
      fetchExams(),
      fetchSubmissions(),
    ]);
    setStudents(studentList);
    setExams(examList);
    setSubmissions(submissionList.slice(0, 10));
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleUpload = async (values: { student_id: number; exam_id: number }) => {
    if (!selectedFile) {
      message.warning("请先选择试卷图片");
      return;
    }

    const formData = new FormData();
    formData.append("student_id", String(values.student_id));
    formData.append("exam_id", String(values.exam_id));
    formData.append("image", selectedFile);

    setLoading(true);
    try {
      const uploadResult = await uploadSubmission(formData);
      setResult(uploadResult);
      setDrawerOpen(true);
      message.success("上传成功，自动批改已完成");
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 28 }}>
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            拍照、拖拽、上传 —— 批改不再等待
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            支持 JPG、PNG、PDF 等格式，系统会自动识别题号、答案以及红笔批注，实现无纸化批改。
          </Paragraph>
        </Space>
      </Card>

      <PageLayout
        title="上传试卷"
        description="选择学生与对应试卷后，拖入照片或扫描件即可开始批改。"
        extra={
          <Button icon={<FileSearchOutlined />} onClick={() => setDrawerOpen(true)}>
            查看上一份结果
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          message="拍摄建议"
          description="请确保题号清晰、每题独占一行；主观题批注建议使用红色笔迹，以提升识别率。"
          style={{ marginBottom: 20 }}
        />
        <Form layout="vertical" onFinish={handleUpload} disabled={loading}>
          <Form.Item
            name="student_id"
            label="选择学生"
            rules={[{ required: true, message: "请选择学生" }]}
          >
            <Select
              placeholder="请选择学生"
              options={students.map((student) => ({ value: student.id, label: student.name }))}
            />
          </Form.Item>
          <Form.Item
            name="exam_id"
            label="选择试卷"
            rules={[{ required: true, message: "请选择试卷" }]}
          >
            <Select
              placeholder="请选择试卷"
              options={exams.map((exam) => ({ value: exam.id, label: `${exam.title} · ${exam.subject || "未分类"}` }))}
            />
          </Form.Item>
          <Form.Item label="上传文件" required>
            <Upload.Dragger
              multiple={false}
              maxCount={1}
              accept=".jpg,.jpeg,.png,.pdf"
              beforeUpload={(file) => {
                setSelectedFile(file);
                return false;
              }}
              onRemove={() => setSelectedFile(null)}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">拖拽或点击上传</p>
              <p className="ant-upload-hint">单个文件建议小于 10MB，越清晰识别越准确</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="default" icon={<FileSearchOutlined />} onClick={() => setDrawerOpen(true)}>
                打开最新批改
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                开始上传并批改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </PageLayout>

      <PageLayout
        title="最近上传记录"
        description="系统保留最近 10 份批改记录，方便快速回看。"
      >
        {submissions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有批改记录，马上上传第一份试卷吧！"
          />
        ) : (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {submissions.map((submission) => (
              <Card key={submission.id} bordered={false} className="shadow-panel" bodyStyle={{ padding: 16 }}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Text strong>{`学生 ${submission.student_id}`}</Text>
                    <Text type="secondary">试卷 ID · {submission.exam_id}</Text>
                  </Space>
                  <Text type="secondary">
                    提交时间：{dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm")}
                  </Text>
                  <Text type="secondary">
                    批改状态：{submission.status === "graded" ? "已完成" : "待人工确认"}
                  </Text>
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </PageLayout>

      <SubmissionResultDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        result={result}
      />
    </Space>
  );
};

export default UploadCenter;
