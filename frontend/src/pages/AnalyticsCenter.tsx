import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DatePicker, Empty, Select, Space, Spin, Statistic, Table, Typography } from "antd";
import dayjs from "dayjs";
import * as echarts from "echarts";
import type { AnalyticsSummary, Exam } from "../types";
import { fetchAnalytics, fetchExams } from "../api/services";
import PageLayout from "../components/PageLayout";
import useResponsive from "../hooks/useResponsive";

const { Paragraph, Title } = Typography;

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

    const tags = summary.knowledge_breakdown.map((item) => item.knowledge_tag || "未标注");
    const accuracy = summary.knowledge_breakdown.map((item) => Math.round(item.accuracy * 100));

    chartInstance.current.setOption({
      tooltip: {},
      xAxis: {
        type: "category",
        data: tags,
        axisLabel: { rotate: 30 },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%" },
      },
      series: [
        {
          type: "bar",
          data: accuracy,
          itemStyle: {
            color: (params: { value: number }) => (params.value > 70 ? "#22c55e" : "#f97316"),
          },
        },
      ],
      grid: { left: 40, right: 20, bottom: 60, top: 40 },
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

  const tableData = useMemo(() => summary?.knowledge_breakdown ?? [], [summary]);

  return (
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      <PageLayout
        title="班级学情雷达"
        description="选择考试与时间范围即可生成知识点热力图与关键指标，辅助精准教学。"
        extra={
          <div className="filters-stack">
            <Select
              allowClear
              placeholder="按考试筛选"
              value={selectedExam}
              onChange={(value) => {
                setSelectedExam(value);
                void loadAnalytics(value);
              }}
              style={{ width: isCompact ? "100%" : 240 }}
              options={exams.map((exam) => ({ value: exam.id, label: `${exam.title} · ${exam.subject || "未分类"}` }))}
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range as typeof dateRange);
                void loadAnalytics(selectedExam);
              }}
              style={{ width: isCompact ? "100%" : undefined }}
            />
            <Button block={isCompact} onClick={() => void loadAnalytics(selectedExam)}>
              刷新
            </Button>
          </div>
        }
      >
        <Spin spinning={loading} tip="加载学情数据..." aria-live="polite">
          {summary ? (
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <div className="stats-grid">
                {[
                  { title: "覆盖学生", value: summary.total_students, suffix: "人" },
                  { title: "已批改试卷", value: summary.total_submissions, suffix: "份" },
                  { title: "平均分", value: summary.average_score, suffix: "分", precision: 1 },
                  { title: "中位数", value: summary.median_score, suffix: "分", precision: 1 },
                ].map((item) => (
                  <Card key={item.title} className="shadow-panel" bordered={false}>
                    <Statistic title={item.title} value={item.value} suffix={item.suffix} precision={item.precision} />
                  </Card>
                ))}
              </div>
              <div className="chart-container" ref={chartRef} />
            </Space>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请选择考试或上传试卷后查看学情数据。"
            />
          )}
        </Spin>
      </PageLayout>

      <PageLayout
        title="知识点详细列表"
        description="掌握出题次数、错误次数与平均得分，更合理地安排课堂时间。"
      >
        {isCompact ? (
          tableData.length ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {tableData.map((item, index) => (
                <Card
                  key={item.knowledge_tag || `knowledge-${index}`}
                  className="list-card"
                  size="small"
                  bordered={false}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Typography.Text strong>{item.knowledge_tag || "未标注"}</Typography.Text>
                    <Typography.Text type="secondary">
                      出题数：{item.total_attempts} · 错误次数：{item.incorrect_count}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      正确率：{Math.round(item.accuracy * 100)}% · 平均得分：{item.average_score}
                    </Typography.Text>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="暂时没有可分析的数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )
        ) : (
          <Table
            rowKey="knowledge_tag"
            dataSource={tableData}
            pagination={false}
            locale={{ emptyText: "暂时没有可分析的数据" }}
            columns={[
              { title: "知识点", dataIndex: "knowledge_tag" },
              { title: "出题数", dataIndex: "total_attempts" },
              { title: "错误次数", dataIndex: "incorrect_count" },
              {
                title: "正确率",
                dataIndex: "accuracy",
                render: (value: number) => `${Math.round(value * 100)}%`,
              },
              { title: "平均得分", dataIndex: "average_score" },
            ]}
          />
        )}
      </PageLayout>
    </Space>
  );
};

export default AnalyticsCenter;
