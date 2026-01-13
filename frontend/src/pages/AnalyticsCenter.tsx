/**
 * 学情分析中心 - 世界级数据可视化体验
 * 
 * 设计灵感: Linear, Stripe Dashboard, Shape of AI
 * 特点:
 * - 现代化数据卡片
 * - 精致的图表样式
 * - 流畅的交互动效
 * - 智能的数据洞察
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DatePicker, Empty, Select, Space, Spin, Statistic, Table, Typography } from "antd";
import { 
  BarChartOutlined, 
  RiseOutlined, 
  TeamOutlined, 
  FileTextOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as echarts from "echarts";
import type { AnalyticsSummary, Exam } from "../types";
import { fetchAnalytics, fetchExams } from "../api/services";
import PageLayout from "../components/PageLayout";
import useResponsive from "../hooks/useResponsive";
import { formatKnowledgeTag } from "../utils/knowledge";

const { Paragraph, Title, Text } = Typography;

const AnalyticsCenter = () => {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | undefined>();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const loadAnalytics = async (examId?: number) => {
    setLoading(true);
    try {
      if (!exams.length) {
        const examList = await fetchExams();
        setExams(examList);
      }
      const payload: Record<string, unknown> = {};
      if (examId) payload.exam_id = examId;
      if (dateRange[0] && dateRange[1]) {
        payload.start_date = dateRange[0].format("YYYY-MM-DD");
        payload.end_date = dateRange[1].format("YYYY-MM-DD");
      }
      const data = await fetchAnalytics(payload);
      setSummary(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
    return () => {
      chartInstance.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!summary) return;
    if (!chartInstance.current && chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    if (!chartInstance.current) return;

    const tags = summary.knowledge_breakdown.map((item) => formatKnowledgeTag(item.knowledge_tag));
    const accuracy = summary.knowledge_breakdown.map((item) => Math.round(item.accuracy * 100));

    chartInstance.current.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#1E293B',
          fontSize: 13,
        },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(91, 95, 199, 0.08)',
          },
        },
        formatter: (params: { name: string; value: number }[]) => {
          const item = params[0];
          const status = item.value >= 80 ? '优秀' : item.value >= 60 ? '良好' : '需加强';
          const color = item.value >= 80 ? '#22C55E' : item.value >= 60 ? '#F59E0B' : '#EF4444';
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${item.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
              <span>正确率: ${item.value}%</span>
              <span style="color: ${color}; font-weight: 500;">${status}</span>
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: tags,
        axisLabel: { 
          rotate: 30,
          color: '#64748B',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#E2E8F0',
          },
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { 
          formatter: "{value}%",
          color: '#64748B',
          fontSize: 12,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: '#F1F5F9',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: "bar",
          data: accuracy,
          barWidth: '60%',
          barMaxWidth: 40,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: (params: { value: number }) => {
              if (params.value >= 80) {
                return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#22C55E' },
                  { offset: 1, color: '#16A34A' },
                ]);
              }
              if (params.value >= 60) {
                return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#F59E0B' },
                  { offset: 1, color: '#D97706' },
                ]);
              }
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#EF4444' },
                { offset: 1, color: '#DC2626' },
              ]);
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(91, 95, 199, 0.3)',
            },
          },
        },
      ],
      grid: { 
        left: 50, 
        right: 24, 
        bottom: 80, 
        top: 40,
        containLabel: true,
      },
    });
    chartInstance.current.resize();
  }, [summary]);

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    chartInstance.current?.resize();
  }, [isCompact]);

  const tableData = useMemo(
    () =>
      summary?.knowledge_breakdown.map((item) => ({
        ...item,
        displayTag: formatKnowledgeTag(item.knowledge_tag),
      })) ?? [],
    [summary],
  );

  const statCards = useMemo(() => {
    if (!summary) return [];
    return [
      { 
        title: "覆盖学生", 
        value: summary.total_students, 
        suffix: "人",
        icon: <TeamOutlined />,
        color: '#6366F1',
        bgColor: 'rgba(99, 102, 241, 0.08)',
      },
      { 
        title: "已批改试卷", 
        value: summary.total_submissions, 
        suffix: "份",
        icon: <FileTextOutlined />,
        color: '#8B5CF6',
        bgColor: 'rgba(139, 92, 246, 0.08)',
      },
      { 
        title: "平均分", 
        value: summary.average_score, 
        suffix: "分", 
        precision: 1,
        icon: <RiseOutlined />,
        color: '#22C55E',
        bgColor: 'rgba(34, 197, 94, 0.08)',
      },
      { 
        title: "中位数", 
        value: summary.median_score, 
        suffix: "分", 
        precision: 1,
        icon: <TrophyOutlined />,
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.08)',
      },
    ];
  }, [summary]);

  return (
    <Space direction="vertical" size={32} style={{ width: "100%" }}>
      {/* 页面头部 */}
      <div 
        className="fade-in-up"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
          borderRadius: 24,
          padding: isCompact ? '28px 20px' : '36px 40px',
          border: '1px solid rgba(99, 102, 241, 0.1)',
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
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              }}>
                <BarChartOutlined style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <Title level={3} style={{ margin: 0, letterSpacing: '-0.5px' }}>
                班级学情雷达
              </Title>
            </Space>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 480 }}>
              选择考试与时间范围即可生成知识点热力图与关键指标，辅助精准教学决策。
            </Paragraph>
          </div>
          
          <Space 
            direction={isCompact ? "vertical" : "horizontal"} 
            size={12}
            style={{ width: isCompact ? '100%' : 'auto' }}
          >
            <Select
              allowClear
              placeholder="按考试筛选"
              value={selectedExam}
              onChange={(value) => {
                setSelectedExam(value);
                void loadAnalytics(value);
              }}
              style={{ width: isCompact ? "100%" : 220 }}
              options={exams.map((exam) => ({ 
                value: exam.id, 
                label: `${exam.title} · ${exam.subject || "未分类"}` 
              }))}
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range as typeof dateRange);
                void loadAnalytics(selectedExam);
              }}
              style={{ width: isCompact ? "100%" : 260 }}
            />
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => void loadAnalytics(selectedExam)}
              style={{ width: isCompact ? '100%' : 'auto' }}
            >
              刷新数据
            </Button>
          </Space>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Spin spinning={loading} tip="加载学情数据...">
        {summary ? (
          <Space direction="vertical" size={28} style={{ width: "100%" }}>
            <div 
              className="stagger-fade-in"
              style={{
                display: 'grid',
                gridTemplateColumns: isCompact ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: isCompact ? 12 : 20,
              }}
            >
              {statCards.map((item, index) => (
                <Card 
                  key={item.title} 
                  bordered={false}
                  className="stat-card-hover"
                  style={{
                    borderRadius: 20,
                    background: '#fff',
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                    animationDelay: `${index * 0.1}s`,
                  }}
                  bodyStyle={{ padding: isCompact ? 16 : 24 }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: item.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.color,
                      fontSize: 20,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 13 }}>{item.title}</Text>
                      <Statistic 
                        value={item.value} 
                        suffix={item.suffix} 
                        precision={item.precision}
                        valueStyle={{ 
                          fontSize: isCompact ? 24 : 32, 
                          fontWeight: 700,
                          color: '#1E293B',
                          letterSpacing: '-1px',
                        }}
                      />
                    </div>
                  </Space>
                </Card>
              ))}
            </div>

            {/* 图表区域 */}
            <Card
              bordered={false}
              style={{
                borderRadius: 24,
                background: '#fff',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
              }}
              bodyStyle={{ padding: isCompact ? 16 : 32 }}
            >
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <div>
                  <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                    知识点掌握热力图
                  </Title>
                  <Text type="secondary">
                    柱状图展示各知识点的正确率分布，绿色表示掌握良好，红色需重点关注
                  </Text>
                </div>
                <div 
                  ref={chartRef} 
                  style={{ 
                    width: '100%', 
                    height: isCompact ? 300 : 400,
                    borderRadius: 16,
                    background: 'linear-gradient(180deg, #FAFBFC 0%, #FFFFFF 100%)',
                  }} 
                />
              </Space>
            </Card>
          </Space>
        ) : (
          <Card
            bordered={false}
            style={{
              borderRadius: 24,
              background: '#fff',
              minHeight: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={8}>
                  <Text type="secondary">请选择考试或上传试卷后查看学情数据</Text>
                  <Button type="primary" onClick={() => void loadAnalytics()}>
                    加载数据
                  </Button>
                </Space>
              }
            />
          </Card>
        )}
      </Spin>

      {/* 知识点详细列表 */}
      <PageLayout
        title="知识点详细分析"
        description="掌握出题次数、错误次数与平均得分，更合理地安排课堂时间。"
      >
        {isCompact ? (
          tableData.length ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {tableData.map((item, index) => (
                <Card
                  key={item.knowledge_tag || `knowledge-${index}`}
                  bordered={false}
                  className="list-card-hover"
                  style={{
                    borderRadius: 16,
                    background: '#fff',
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: 15 }}>{item.displayTag}</Text>
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: item.accuracy >= 0.8 
                          ? 'rgba(34, 197, 94, 0.1)' 
                          : item.accuracy >= 0.6 
                            ? 'rgba(245, 158, 11, 0.1)' 
                            : 'rgba(239, 68, 68, 0.1)',
                        color: item.accuracy >= 0.8 
                          ? '#22C55E' 
                          : item.accuracy >= 0.6 
                            ? '#F59E0B' 
                            : '#EF4444',
                        fontWeight: 600,
                        fontSize: 13,
                      }}>
                        {Math.round(item.accuracy * 100)}%
                      </div>
                    </Space>
                    <Space split={<span style={{ color: '#E2E8F0' }}>·</span>}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        出题 {item.total_attempts} 次
                      </Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        错误 {item.incorrect_count} 次
                      </Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        均分 {item.average_score}
                      </Text>
                    </Space>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="暂时没有可分析的数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )
        ) : (
          <Table
            rowKey={(record, index) => record.knowledge_tag ?? `knowledge-${index}`}
            dataSource={tableData}
            pagination={false}
            locale={{ emptyText: "暂时没有可分析的数据" }}
            style={{ borderRadius: 16, overflow: 'hidden' }}
            columns={[
              { 
                title: "知识点", 
                dataIndex: "displayTag",
                render: (text: string) => (
                  <Text strong style={{ fontSize: 14 }}>{text}</Text>
                ),
              },
              { 
                title: "出题数", 
                dataIndex: "total_attempts",
                align: 'center',
              },
              { 
                title: "错误次数", 
                dataIndex: "incorrect_count",
                align: 'center',
              },
              {
                title: "正确率",
                dataIndex: "accuracy",
                align: 'center',
                render: (value: number) => {
                  const percent = Math.round(value * 100);
                  const color = percent >= 80 ? '#22C55E' : percent >= 60 ? '#F59E0B' : '#EF4444';
                  const bgColor = percent >= 80 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : percent >= 60 
                      ? 'rgba(245, 158, 11, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)';
                  return (
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      background: bgColor,
                      color: color,
                      fontWeight: 600,
                      fontSize: 13,
                    }}>
                      {percent}%
                    </span>
                  );
                },
              },
              { 
                title: "平均得分", 
                dataIndex: "average_score",
                align: 'center',
              },
            ]}
          />
        )}
      </PageLayout>

      {/* 样式 */}
      <style>{`
        .stat-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stat-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08) !important;
        }
        .list-card-hover {
          transition: all 0.3s ease;
        }
        .list-card-hover:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }
        .ant-table-thead > tr > th {
          background: #F8FAFC !important;
          font-weight: 600 !important;
          color: #64748B !important;
          border-bottom: 1px solid #E2E8F0 !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: rgba(99, 102, 241, 0.04) !important;
        }
      `}</style>
    </Space>
  );
};

export default AnalyticsCenter;
