/**
 * 错题诊断中心 - 世界级错题管理体验
 * 
 * 设计灵感: Linear, Notion, Shape of AI
 * 特点:
 * - 智能错题分析
 * - 精致的卡片设计
 * - 流畅的交互动效
 * - 清晰的练习追踪
 */

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Result,
  Select,
  Space,
  Tag,
  Typography,
  Progress,
} from "antd";
import {
  BookOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { Mistake, PracticeAssignment, Student } from "../types";
import {
  completePractice,
  createPractice,
  fetchPracticeAssignments,
  fetchStudents,
  fetchStudentMistakes,
} from "../api/services";
import PageLayout from "../components/PageLayout";
import useResponsive from "../hooks/useResponsive";

const { Paragraph, Title, Text } = Typography;

const MistakeCenter = () => {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
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

  const completedCount = assignments.filter(a => a.status === 'completed').length;
  const totalCount = assignments.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Space direction="vertical" size={32} style={{ width: "100%" }}>
      {/* 页面头部 */}
      <div 
        className="fade-in-up"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(249, 115, 22, 0.04) 100%)',
          borderRadius: 24,
          padding: isCompact ? '28px 20px' : '36px 40px',
          border: '1px solid rgba(239, 68, 68, 0.1)',
        }}
      >
        <Space 
          direction={isCompact ? "vertical" : "horizontal"} 
          size={24} 
          style={{ width: '100%', justifyContent: 'space-between' }}
          align={isCompact ? "start" : "center"}
        >
          <div>
            <Space align="center" size={12} style={{ marginBottom: 8 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
              }}>
                <BulbOutlined style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <Title level={3} style={{ margin: 0, letterSpacing: '-0.5px' }}>
                错题诊断中心
              </Title>
            </Space>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 520 }}>
              系统自动整理的错题本会保留答题过程、知识点与练习记录，帮助学生精准突破薄弱环节。
            </Paragraph>
          </div>
          
          <Select
            placeholder="请选择学生"
            value={selectedStudent ?? undefined}
            onChange={(value) => void loadStudentData(value)}
            options={students.map((student) => ({ value: student.id, label: student.name }))}
            style={{ width: isCompact ? "100%" : 240 }}
            size="large"
          />
        </Space>
      </div>

      {/* 统计概览 */}
      {selectedStudent && (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, 1fr)',
            gap: 20,
          }}
        >
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Space direction="vertical" size={8}>
              <Space align="center" size={8}>
                <BookOutlined style={{ fontSize: 18, color: '#6366F1' }} />
                <Text type="secondary">累计错题</Text>
              </Space>
              <Text style={{ fontSize: 32, fontWeight: 700, color: '#1E293B' }}>
                {mistakes.length}
                <span style={{ fontSize: 16, fontWeight: 400, color: '#64748B', marginLeft: 4 }}>道</span>
              </Text>
            </Space>
          </Card>

          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.1)',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Space direction="vertical" size={8}>
              <Space align="center" size={8}>
                <CheckCircleOutlined style={{ fontSize: 18, color: '#22C55E' }} />
                <Text type="secondary">练习完成率</Text>
              </Space>
              <Space align="end" size={12}>
                <Text style={{ fontSize: 32, fontWeight: 700, color: '#1E293B' }}>
                  {completionRate}%
                </Text>
                <Progress 
                  percent={completionRate} 
                  showInfo={false}
                  strokeColor="#22C55E"
                  trailColor="rgba(34, 197, 94, 0.2)"
                  style={{ width: 80, marginBottom: 8 }}
                />
              </Space>
            </Space>
          </Card>

          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(234, 88, 12, 0.04) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.1)',
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Space direction="vertical" size={8}>
              <Space align="center" size={8}>
                <ThunderboltOutlined style={{ fontSize: 18, color: '#F59E0B' }} />
                <Text type="secondary">待完成练习</Text>
              </Space>
              <Text style={{ fontSize: 32, fontWeight: 700, color: '#1E293B' }}>
                {totalCount - completedCount}
                <span style={{ fontSize: 16, fontWeight: 400, color: '#64748B', marginLeft: 4 }}>份</span>
              </Text>
            </Space>
          </Card>
        </div>
      )}

      {/* 错题列表 */}
      <PageLayout
        title="错题记录"
        description="按知识点分类的错题列表，点击可查看详细答题过程。"
      >
        {mistakes.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={8}>
                <Text type="secondary">暂无错题记录</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>待上传试卷后自动生成</Text>
              </Space>
            }
          />
        ) : (
          <List
            grid={{ gutter: 16, column: isCompact ? 1 : 2 }}
            dataSource={mistakes}
            renderItem={(item, index) => (
              <List.Item>
                <Card
                  bordered={false}
                  className="mistake-card-hover"
                  style={{
                    borderRadius: 16,
                    background: '#fff',
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
                    animationDelay: `${index * 0.05}s`,
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space align="center" size={10}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 14,
                        }}>
                          {index + 1}
                        </div>
                        <Text strong style={{ fontSize: 15 }}>题目 ID：{item.question_id}</Text>
                      </Space>
                      <Tag 
                        color="volcano" 
                        style={{ 
                          borderRadius: 12, 
                          padding: '2px 10px',
                          border: 'none',
                          fontWeight: 500,
                        }}
                      >
                        练习 {item.times_practiced} 次
                      </Tag>
                    </Space>
                    
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(248, 250, 252, 0.8)',
                      borderRadius: 12,
                    }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space align="center" size={6}>
                          <BookOutlined style={{ color: '#6366F1', fontSize: 14 }} />
                          <Text style={{ fontSize: 13 }}>
                            知识点：{item.knowledge_tags || "未标注"}
                          </Text>
                        </Space>
                        <Space align="center" size={6}>
                          <ClockCircleOutlined style={{ color: '#64748B', fontSize: 14 }} />
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            最近出现：{item.last_seen_at}
                          </Text>
                        </Space>
                      </Space>
                    </div>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </PageLayout>

      {/* 生成练习 */}
      <PageLayout
        title="生成错题练习"
        description="输入知识点关键词即可组合针对性练习，系统会同步生成 PDF 版本。"
      >
        <Card
          bordered={false}
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.02) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.08)',
          }}
          bodyStyle={{ padding: isCompact ? 20 : 28 }}
        >
          <Form
            layout={isCompact ? "vertical" : "inline"}
            onFinish={handleCreatePractice}
            style={{ width: "100%" }}
          >
            <Form.Item
              name="knowledge_filters"
              label={<Text style={{ fontWeight: 500 }}>关键词筛选</Text>}
              style={{ width: isCompact ? "100%" : "auto", flex: isCompact ? undefined : 1 }}
            >
              <Input
                allowClear
                placeholder="例如：一次函数, 二次函数"
                style={{ 
                  width: isCompact ? "100%" : '100%',
                  height: 44,
                  borderRadius: 12,
                }}
                prefix={<BulbOutlined style={{ color: '#94A3B8' }} />}
              />
            </Form.Item>
            <Form.Item
              name="max_items"
              label={<Text style={{ fontWeight: 500 }}>题量</Text>}
              style={{ width: isCompact ? "100%" : 140 }}
            >
              <Input
                type="number"
                placeholder="默认 10"
                style={{ 
                  width: "100%",
                  height: 44,
                  borderRadius: 12,
                }}
              />
            </Form.Item>
            <Form.Item style={{ width: isCompact ? "100%" : "auto" }}>
              <Button
                block={isCompact}
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!selectedStudent}
                icon={<RocketOutlined />}
                style={{
                  height: 44,
                  borderRadius: 12,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                }}
              >
                生成练习
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {latestAssignment ? (
          <Card
            bordered={false}
            style={{
              marginTop: 24,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.15)',
            }}
            bodyStyle={{ padding: isCompact ? 24 : 32 }}
          >
            <Result
              status="success"
              icon={
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 12px 32px rgba(34, 197, 94, 0.3)',
                }}>
                  <CheckCircleOutlined style={{ fontSize: 36, color: '#fff' }} />
                </div>
              }
              title={
                <Text style={{ fontSize: 20, fontWeight: 600 }}>
                  练习编号 #{latestAssignment.id}
                </Text>
              }
              subTitle={
                <Space split={<span style={{ color: '#E2E8F0' }}>·</span>}>
                  <Text type="secondary">状态：{latestAssignment.status}</Text>
                  <Text type="secondary">题量：{latestAssignment.items?.length ?? 0} 道</Text>
                </Space>
              }
              extra={
                latestAssignment.generated_pdf_path ? (
                  <Button 
                    type="primary" 
                    href={`/api/practice/${latestAssignment.id}/pdf`} 
                    target="_blank"
                    icon={<FileTextOutlined />}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)',
                      border: 'none',
                    }}
                  >
                    打开 PDF 练习卷
                  </Button>
                ) : (
                  <Button disabled icon={<ClockCircleOutlined />}>
                    PDF 正在生成...
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <Paragraph type="secondary" style={{ marginTop: 20, textAlign: 'center' }}>
            生成任意一次练习后，将在此展示最新练习的状态与下载入口。
          </Paragraph>
        )}
      </PageLayout>

      {/* 练习跟进清单 */}
      <PageLayout
        title="练习跟进清单"
        description="追踪练习派送与完成情况，可一键标记状态并下载 PDF。"
      >
        <List
          grid={{ gutter: 16, column: isCompact ? 1 : 2 }}
          dataSource={assignments}
          locale={{ 
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无练习任务"
              />
            )
          }}
          renderItem={(item, index) => (
            <List.Item>
              <Card
                bordered={false}
                className="assignment-card-hover"
                style={{
                  borderRadius: 16,
                  background: item.status === 'completed' 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.06) 0%, rgba(16, 185, 129, 0.02) 100%)'
                    : '#fff',
                  border: item.status === 'completed'
                    ? '1px solid rgba(34, 197, 94, 0.15)'
                    : '1px solid rgba(0, 0, 0, 0.04)',
                  animationDelay: `${index * 0.05}s`,
                }}
                bodyStyle={{ padding: 20 }}
              >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space align="center" size={10}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: item.status === 'completed'
                          ? 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)'
                          : 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: item.status === 'completed'
                          ? '0 4px 12px rgba(34, 197, 94, 0.3)'
                          : '0 4px 12px rgba(245, 158, 11, 0.3)',
                      }}>
                        {item.status === 'completed' 
                          ? <CheckCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
                          : <ClockCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
                        }
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>
                          练习 #{item.id}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {item.scheduled_for}
                        </Text>
                      </div>
                    </Space>
                    <Tag 
                      color={item.status === 'completed' ? 'success' : 'warning'}
                      style={{ borderRadius: 12, padding: '2px 10px', border: 'none' }}
                    >
                      {item.status === 'completed' ? '已完成' : '进行中'}
                    </Tag>
                  </Space>

                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(248, 250, 252, 0.8)',
                    borderRadius: 10,
                  }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      题量：{item.items?.length ?? 0} 道
                    </Text>
                  </div>

                  <Space style={{ width: '100%' }} wrap>
                    <Button
                      type={item.status === 'completed' ? 'default' : 'primary'}
                      onClick={() => handleComplete(item.id, item.status !== "completed")}
                      icon={item.status === 'completed' ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                      style={{
                        borderRadius: 10,
                        fontWeight: 500,
                      }}
                    >
                      {item.status === "completed" ? "标记未完成" : "标记已完成"}
                    </Button>
                    {item.generated_pdf_path && (
                      <Button 
                        href={`/api/practice/${item.id}/pdf`} 
                        target="_blank"
                        icon={<FileTextOutlined />}
                        style={{ borderRadius: 10 }}
                      >
                        查看 PDF
                      </Button>
                    )}
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </PageLayout>

      {/* 样式 */}
      <style>{`
        .mistake-card-hover,
        .assignment-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mistake-card-hover:hover,
        .assignment-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>
    </Space>
  );
};

export default MistakeCenter;
