import {
  ApartmentOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  HeartOutlined,
  ReadOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Badge, Button, Card, Col, Empty, Row, Space, Spin, Statistic, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AnalyticsSummary, SubmissionDetail } from "../types";
import {
  bootstrapDemo,
  fetchAnalytics,
  fetchClassrooms,
  fetchExams,
  fetchStudents,
  fetchSubmissions,
  fetchTeachers,
} from "../api/services";
import QuickActionCard from "../components/QuickActionCard";
import PageLayout from "../components/PageLayout";
import { emitNavigation } from "../utils/navigation";

const { Title, Paragraph, Text } = Typography;

type QuickAction = {
  key: "upload" | "roster" | "mistake" | "analytics" | "assistant";
  icon: ReactNode;
  title: string;
  description: string;
};

interface OverviewCounts {
  teachers: number;
  classrooms: number;
  students: number;
  exams: number;
  submissions: number;
}

const quickActions: QuickAction[] = [
  {
    key: "upload",
    icon: <CloudUploadOutlined style={{ fontSize: 22 }} />,
    title: "上传试卷",
    description: "拖拽或拍照即可完成批改，错题自动归档。",
  },
  {
    key: "roster",
    icon: <ApartmentOutlined style={{ fontSize: 22 }} />,
    title: "搭建班级",
    description: "三步录入教师、班级、学生与试卷结构。",
  },
  {
    key: "mistake",
    icon: <ReadOutlined style={{ fontSize: 22 }} />,
    title: "查看错题",
    description: "电子错题本随时复盘，附带知识点标签。",
  },
  {
    key: "analytics",
    icon: <BarChartOutlined style={{ fontSize: 22 }} />,
    title: "洞察学情",
    description: "热力图掌握薄弱项，辅助下一堂课。",
  },
  {
    key: "assistant",
    icon: <ThunderboltOutlined style={{ fontSize: 22 }} />,
    title: "AI 教研助手",
    description: "一句话生成讲评提纲、作业建议与家校沟通话术。",
  },
];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewCounts>({
    teachers: 0,
    classrooms: 0,
    students: 0,
    exams: 0,
    submissions: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [teachers, classrooms, students, exams, submissionsList] = await Promise.all([
        fetchTeachers(),
        fetchClassrooms(),
        fetchStudents(),
        fetchExams(),
        fetchSubmissions(),
      ]);
      setOverview({
        teachers: teachers.length,
        classrooms: classrooms.length,
        students: students.length,
        exams: exams.length,
        submissions: submissionsList.length,
      });
      setSubmissions(submissionsList.slice(0, 6));
      const analyticsData = await fetchAnalytics({});
      setAnalytics(analyticsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleBootstrap = async () => {
    setLoading(true);
    try {
      await bootstrapDemo();
    } finally {
      await loadData();
    }
  };

  const timeline = useMemo(() => {
    if (!submissions.length) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无批改记录，立即上传第一份试卷吧！"
        />
      );
    }

    return submissions.map((submission) => (
      <Card key={submission.id} bordered={false}>
        <Space direction="vertical" style={{ width: "100%" }} size={4}>
          <Text strong>学生 ID：{submission.student_id}</Text>
          <Text type="secondary">试卷 ID：{submission.exam_id}</Text>
          <Text type="secondary">提交时间：{dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm")}</Text>
          <Text type="secondary">状态：{submission.status === "graded" ? "已完成" : "待人工确认"}</Text>
        </Space>
      </Card>
    ));
  }, [submissions]);

  return (
    <Spin spinning={loading} tip="正在加载最新学情数据…">
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 28 }}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
              <div>
                <Title level={3} style={{ marginBottom: 8 }}>
                  欢迎回来，让教学工作始终领先一步
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  自动批改、错题诊断、练习派送与学情洞察，都在这一张工作台里完成。
                </Paragraph>
              </div>
              <Space>
                <Button onClick={() => loadData()}>刷新数据</Button>
                <Button type="primary" onClick={handleBootstrap}>
                  一键生成演示数据
                </Button>
              </Space>
            </Space>

            <Row gutter={[24, 24]}>
              <Col xs={12} md={6}>
                <Card className="shadow-panel" bordered={false}>
                  <Statistic title="在岗教师" value={overview.teachers} suffix="人" />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="shadow-panel" bordered={false}>
                  <Statistic title="教学班级" value={overview.classrooms} suffix="个" />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="shadow-panel" bordered={false}>
                  <Statistic title="参与学生" value={overview.students} suffix="人" />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="shadow-panel" bordered={false}>
                  <Statistic title="已批改试卷" value={overview.submissions} suffix="份" />
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        <Row gutter={[24, 24]}>
          {quickActions.map((action) => (
            <Col xs={24} md={12} xl={6} key={action.key}>
              <QuickActionCard
                icon={action.icon}
                title={action.title}
                description={action.description}
                onClick={() => emitNavigation(action.key)}
              />
            </Col>
          ))}
        </Row>

        <Row gutter={[24, 24]} align="stretch">
          <Col xs={24} xl={14}>
            <PageLayout
              title="最新批改动态"
              description="每一次上传都会形成时间线，方便回看批改结果。"
              extra={<Button type="text" onClick={() => emitNavigation("upload")}>去上传</Button>}
            >
              <Space direction="vertical" style={{ width: "100%" }} size={16}>
                {timeline}
              </Space>
            </PageLayout>
          </Col>
          <Col xs={24} xl={10}>
            <PageLayout
              title="班级健康指数"
              description="了解班级整体掌握情况，迅速定位需要强化的知识点。"
              extra={
                analytics && (
                  <Space size={18}>
                    <Statistic title="覆盖学生" value={analytics.total_students} suffix="人" />
                    <Statistic title="平均得分" value={analytics.average_score} precision={1} suffix="分" />
                  </Space>
                )
              }
            >
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                {analytics?.knowledge_breakdown.map((item) => (
                  <Card key={item.knowledge_tag} bordered={false} size="small">
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Text strong>{item.knowledge_tag}</Text>
                      <Text type="secondary">正确率：{Math.round(item.accuracy * 100)}%</Text>
                      <Text type="secondary">平均得分：{item.average_score}</Text>
                    </Space>
                  </Card>
                )) ?? <Paragraph type="secondary">暂无知识点数据，等待第一份批改。</Paragraph>}
              </Space>
            </PageLayout>
          </Col>
        </Row>
      </Space>
    </Spin>
  );
};

export default Dashboard;
