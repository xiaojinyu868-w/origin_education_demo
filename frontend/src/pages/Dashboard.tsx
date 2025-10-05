import {
  ApartmentOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  HeartOutlined,
  ReadOutlined,
  RocketOutlined,
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
  key: "upload" | "roster" | "mistake" | "analytics";
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

    return (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {submissions.map((submission) => (
          <Card key={submission.id} bordered={false} className="shadow-panel" bodyStyle={{ padding: 16 }}>
            <Space align="center" size={16} style={{ width: "100%", justifyContent: "space-between" }}>
              <Space align="center" size={14}>
                <Badge color="#2563eb" />
                <div>
                  <Text strong>{`学生 ${submission.student_id}`}</Text>
                  <Paragraph style={{ marginBottom: 0 }} type="secondary">
                    {dayjs(submission.submitted_at).format("YYYY-MM-DD HH:mm")}
                  </Paragraph>
                </div>
              </Space>
              <Text type="secondary">试卷 ID · {submission.exam_id}</Text>
            </Space>
          </Card>
        ))}
      </Space>
    );
  }, [submissions]);

  const knowledgeSummary = useMemo(() => {
    if (!analytics || analytics.knowledge_breakdown.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无学情数据，待学生上传试卷后即可查看。"
        />
      );
    }

    return (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {analytics.knowledge_breakdown.slice(0, 5).map((item) => (
          <Card key={item.knowledge_tag} bordered={false} className="shadow-panel" bodyStyle={{ padding: 18 }}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text strong>{item.knowledge_tag || "未标注知识点"}</Text>
              <Text type="secondary">正确率 {Math.round(item.accuracy * 100)}%，平均得分 {item.average_score}</Text>
            </Space>
          </Card>
        ))}
      </Space>
    );
  }, [analytics]);

  return (
    <Spin spinning={loading} size="large">
      <Space direction="vertical" size={28} style={{ width: "100%" }}>
        <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 28 }}>
          <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
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
              <Button type="primary" icon={<RocketOutlined />} onClick={handleBootstrap}>
                一键生成演示数据
              </Button>
            </Space>
          </Space>
        </Card>

        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 24 }}>
              <Statistic
                title="在岗教师"
                value={overview.teachers}
                suffix="人"
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 24 }}>
              <Statistic title="教学班级" value={overview.classrooms} suffix="个" valueStyle={{ color: "#1f2937" }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 24 }}>
              <Statistic title="参与学生" value={overview.students} suffix="人" valueStyle={{ color: "#16a34a" }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 24 }}>
              <Statistic title="已批改试卷" value={overview.submissions} suffix="份" valueStyle={{ color: "#f97316" }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]}>
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

        <Row gutter={[20, 20]} align="stretch">
          <Col xs={24} xl={14}>
            <PageLayout
              title="最新批改动态"
              description="每一次上传都会形成时间线，方便回看批改结果。"
              extra={<Button type="text" onClick={() => emitNavigation("upload")}>去上传</Button>}
            >
              {timeline}
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
              {knowledgeSummary}
            </PageLayout>
          </Col>
        </Row>

        <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 24 }}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Title level={4} style={{ marginBottom: 0 }}>
              上手攻略：三步完成初始部署
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card bordered={false} bodyStyle={{ minHeight: 130 }}>
                  <Space direction="vertical">
                    <HeartOutlined style={{ fontSize: 24, color: "#2563eb" }} />
                    <Text strong>1. 导入基础数据</Text>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      录入教师、班级与学生信息，仅需一次即可长期复用。
                    </Paragraph>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card bordered={false} bodyStyle={{ minHeight: 130 }}>
                  <Space direction="vertical">
                    <ReadOutlined style={{ fontSize: 24, color: "#16a34a" }} />
                    <Text strong>2. 配置试卷结构</Text>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      录入题目类型与答案，系统自动匹配批改规则与错题归档。
                    </Paragraph>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card bordered={false} bodyStyle={{ minHeight: 130 }}>
                  <Space direction="vertical">
                    <RocketOutlined style={{ fontSize: 24, color: "#f97316" }} />
                    <Text strong>3. 上传试卷体验 AI 批改</Text>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      拍照或扫描后一键上传，开启自动批改与错题同步体验。
                    </Paragraph>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>
      </Space>
    </Spin>
  );
};

export default Dashboard;
