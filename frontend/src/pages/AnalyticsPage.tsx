/**
 * 学情分析中心 - 世界级数据可视化体验
 * 
 * 设计风格: Glassmorphism + Modern Dashboard
 * 特点:
 * - 现代化数据卡片
 * - 精致的图表样式
 * - 流畅的交互动效
 * - 智能的数据洞察
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DatePicker, Empty, Select, Spin, Table, Tooltip } from 'antd';
import {
  BarChartOutlined,
  RiseOutlined,
  TeamOutlined,
  FileTextOutlined,
  ReloadOutlined,
  TrophyOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  StarFilled,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { GlassCard } from '../design-system/components/GlassCard';
import { Button } from '../design-system/components/Button';
import { Badge } from '../design-system/components/Badge';
import { Skeleton, CardSkeleton } from '../design-system/components/Skeleton';
import { AppShell } from '../components/layout/AppShell';
import type { AnalyticsSummary, Exam } from '../types';
import { fetchAnalytics, fetchExams } from '../api/services';
import useResponsive from '../hooks/useResponsive';
import { formatKnowledgeTag } from '../utils/knowledge';

// ============================================
// 动画配置
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ============================================
// 颜色配置
// ============================================

const CHART_COLORS = {
  primary: '#4F46E5',
  secondary: '#818CF8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gradient: ['#4F46E5', '#818CF8', '#A5B4FC'],
};

// ============================================
// 子组件
// ============================================

// 核心指标卡片
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  trend?: { value: number; isUp: boolean };
  subtitle?: string;
}> = ({ icon, label, value, unit, color, trend, subtitle }) => (
  <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
    <GlassCard intensity="medium" hover className="h-full">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
            style={{
              background: trend.isUp ? '#10B98115' : '#EF444415',
              color: trend.isUp ? '#10B981' : '#EF4444',
            }}
          >
            {trend.isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-800">
        {value}
        {unit && <span className="text-lg font-normal text-slate-400 ml-1">{unit}</span>}
      </div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
    </GlassCard>
  </motion.div>
);

// 排行榜卡片
const RankingCard: React.FC<{
  title: string;
  data: Array<{ name: string; value: number; trend?: number }>;
  unit?: string;
  color: string;
}> = ({ title, data, unit = '分', color }) => (
  <GlassCard intensity="light" className="h-full">
    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
      <TrophyOutlined style={{ color }} />
      {title}
    </h3>
    <div className="space-y-3">
      {data.slice(0, 5).map((item, index) => (
        <div key={item.name} className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: index < 3 ? `${color}15` : 'rgba(0,0,0,0.04)',
              color: index < 3 ? color : '#94A3B8',
            }}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-700 truncate">{item.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color }}>
              {item.value}{unit}
            </span>
            {item.trend !== undefined && (
              <span
                className="text-xs"
                style={{ color: item.trend >= 0 ? '#10B981' : '#EF4444' }}
              >
                {item.trend >= 0 ? '+' : ''}{item.trend}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </GlassCard>
);

// 知识点雷达图组件
const KnowledgeRadar: React.FC<{
  data: Array<{ knowledge_tag: string; accuracy: number }>;
}> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const indicators = data.map((item) => ({
      name: formatKnowledgeTag(item.knowledge_tag),
      max: 100,
    }));

    const values = data.map((item) => Math.round(item.accuracy * 100));

    chartInstance.current.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#1E293B', fontSize: 13 },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#64748B',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: 'rgba(0, 0, 0, 0.06)' },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(79, 70, 229, 0.02)', 'rgba(79, 70, 229, 0.04)'],
          },
        },
        axisLine: {
          lineStyle: { color: 'rgba(0, 0, 0, 0.08)' },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '知识点掌握度',
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(79, 70, 229, 0.4)' },
                  { offset: 1, color: 'rgba(79, 70, 229, 0.1)' },
                ]),
              },
              lineStyle: { color: '#4F46E5', width: 2 },
              itemStyle: { color: '#4F46E5' },
            },
          ],
        },
      ],
    });

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  return <div ref={chartRef} className="w-full h-[300px]" />;
};

// 趋势图组件
const TrendChart: React.FC<{
  data: Array<{ date: string; score: number }>;
}> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const dates = data.map((item) => dayjs(item.date).format('MM-DD'));
    const scores = data.map((item) => item.score);

    chartInstance.current.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#1E293B', fontSize: 13 },
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: 'rgba(79, 70, 229, 0.08)' },
        },
      },
      grid: {
        left: 50,
        right: 20,
        top: 20,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.08)' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.04)' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      series: [
        {
          type: 'line',
          data: scores,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#4F46E5' },
              { offset: 1, color: '#818CF8' },
            ]),
            width: 3,
          },
          itemStyle: { color: '#4F46E5', borderWidth: 2, borderColor: '#fff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79, 70, 229, 0.3)' },
              { offset: 1, color: 'rgba(79, 70, 229, 0.02)' },
            ]),
          },
        },
      ],
    });

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  return <div ref={chartRef} className="w-full h-[280px]" />;
};

// 知识点柱状图组件
const KnowledgeBarChart: React.FC<{
  data: Array<{ knowledge_tag: string; accuracy: number }>;
}> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const tags = data.map((item) => formatKnowledgeTag(item.knowledge_tag));
    const accuracy = data.map((item) => Math.round(item.accuracy * 100));

    chartInstance.current.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#1E293B', fontSize: 13 },
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(79, 70, 229, 0.08)' } },
        formatter: (params: { name: string; value: number }[]) => {
          const item = params[0];
          const status = item.value >= 80 ? '优秀' : item.value >= 60 ? '良好' : '需加强';
          const color = item.value >= 80 ? '#10B981' : item.value >= 60 ? '#F59E0B' : '#EF4444';
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${item.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: ${color}; font-size: 18px; font-weight: 700;">${item.value}%</span>
              <span style="color: ${color}; font-size: 12px;">${status}</span>
            </div>
          `;
        },
      },
      grid: { left: 100, right: 40, top: 20, bottom: 40 },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.04)' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11, formatter: '{value}%' },
      },
      yAxis: {
        type: 'category',
        data: tags,
        axisLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.08)' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: accuracy.map((value) => ({
            value,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444' },
                { offset: 1, color: value >= 80 ? '#34D399' : value >= 60 ? '#FBBF24' : '#F87171' },
              ]),
              borderRadius: [0, 6, 6, 0],
            },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            color: '#64748B',
            fontSize: 11,
            formatter: '{c}%',
          },
        },
      ],
    });

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  return <div ref={chartRef} className="w-full h-[300px]" />;
};

// ============================================
// 主组件
// ============================================

export const AnalyticsPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  // 状态
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | undefined>();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [timeView, setTimeView] = useState<'day' | 'week' | 'month' | 'semester'>('week');

  // 加载数据
  const loadAnalytics = useCallback(async (examId?: number) => {
    setLoading(true);
    if (!exams.length) {
      const examList = await fetchExams();
      setExams(examList);
    }
    const payload: Record<string, unknown> = {};
    if (examId) payload.exam_id = examId;
    if (dateRange[0] && dateRange[1]) {
      payload.start_date = dateRange[0].format('YYYY-MM-DD');
      payload.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    const data = await fetchAnalytics(payload);
    setSummary(data);
    setLoading(false);
  }, [exams.length, dateRange]);

  useEffect(() => {
    void loadAnalytics();
  }, []);

  // 模拟趋势数据
  const trendData = useMemo(() => {
    if (!summary) return [];
    return Array.from({ length: 7 }, (_, i) => ({
      date: dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD'),
      score: Math.round(70 + Math.random() * 20),
    }));
  }, [summary]);

  // 模拟排行数据
  const rankingData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: '张小明', value: 95, trend: 3 },
      { name: '李华', value: 92, trend: -1 },
      { name: '王芳', value: 89, trend: 5 },
      { name: '刘强', value: 87, trend: 2 },
      { name: '陈静', value: 85, trend: 0 },
    ];
  }, [summary]);

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 lg:p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* 页面标题 */}
          <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">学情分析中心</h1>
              <p className="text-slate-500">多维度数据洞察，精准把握学习动态</p>
            </div>
            <div className="flex items-center gap-3">
              {/* 时间维度切换 */}
              <div className="flex bg-white/70 backdrop-blur rounded-xl p-1 border border-slate-200/50">
                {(['day', 'week', 'month', 'semester'] as const).map((view) => (
                  <button
                    key={view}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeView === view
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    onClick={() => setTimeView(view)}
                  >
                    {{ day: '日', week: '周', month: '月', semester: '学期' }[view]}
                  </button>
                ))}
              </div>
              <Select
                placeholder="选择试卷"
                allowClear
                value={selectedExam}
                onChange={(v) => {
                  setSelectedExam(v);
                  loadAnalytics(v);
                }}
                options={exams.map((e) => ({ value: e.id, label: e.name }))}
                style={{ width: 160 }}
              />
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(values) => setDateRange(values as typeof dateRange)}
              />
              <Button
                variant="ghost"
                leftIcon={<ReloadOutlined />}
                onClick={() => loadAnalytics(selectedExam)}
                loading={loading}
              >
                刷新
              </Button>
            </div>
          </motion.div>

          {/* 核心指标卡片 */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={<BarChartOutlined />}
                label="平均分"
                value={Math.round(summary.average_score ?? 0)}
                unit="分"
                color="#4F46E5"
                trend={{ value: 5.2, isUp: true }}
              />
              <MetricCard
                icon={<RiseOutlined />}
                label="进步指数"
                value={summary.progress_index ?? 0}
                color="#10B981"
                trend={{ value: 8.1, isUp: true }}
                subtitle="相比上周"
              />
              <MetricCard
                icon={<TeamOutlined />}
                label="参与人数"
                value={summary.student_count ?? 0}
                unit="人"
                color="#F59E0B"
              />
              <MetricCard
                icon={<FileTextOutlined />}
                label="批改试卷"
                value={summary.submission_count ?? 0}
                unit="份"
                color="#EF4444"
              />
            </div>
          ) : null}

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 成绩趋势 */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <GlassCard intensity="light">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <RiseOutlined className="text-indigo-500" />
                    成绩趋势
                  </h3>
                  <Badge variant="success">稳步上升</Badge>
                </div>
                {loading ? (
                  <Skeleton className="h-[280px]" />
                ) : (
                  <TrendChart data={trendData} />
                )}
              </GlassCard>
            </motion.div>

            {/* 排行榜 */}
            <motion.div variants={itemVariants}>
              <RankingCard
                title="班级排行榜"
                data={rankingData}
                color="#4F46E5"
              />
            </motion.div>
          </div>

          {/* 知识点分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 知识点雷达图 */}
            <motion.div variants={itemVariants}>
              <GlassCard intensity="light">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <BulbOutlined className="text-amber-500" />
                  知识点掌握雷达
                </h3>
                {loading ? (
                  <Skeleton className="h-[300px]" />
                ) : summary?.knowledge_breakdown ? (
                  <KnowledgeRadar data={summary.knowledge_breakdown} />
                ) : (
                  <Empty description="暂无数据" />
                )}
              </GlassCard>
            </motion.div>

            {/* 知识点柱状图 */}
            <motion.div variants={itemVariants}>
              <GlassCard intensity="light">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ThunderboltOutlined className="text-indigo-500" />
                  知识点正确率
                </h3>
                {loading ? (
                  <Skeleton className="h-[300px]" />
                ) : summary?.knowledge_breakdown ? (
                  <KnowledgeBarChart data={summary.knowledge_breakdown} />
                ) : (
                  <Empty description="暂无数据" />
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* 薄弱知识点提示 */}
          {summary?.knowledge_breakdown && (
            <motion.div variants={itemVariants}>
              <GlassCard
                intensity="medium"
                className="border-l-4"
                style={{ borderLeftColor: '#F59E0B' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500 text-xl shrink-0">
                    <BulbOutlined />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">AI 学情洞察</h4>
                    <p className="text-slate-600 leading-relaxed">
                      根据近期数据分析，
                      <span className="text-amber-600 font-medium">
                        {summary.knowledge_breakdown
                          .filter((k) => k.accuracy < 0.6)
                          .map((k) => formatKnowledgeTag(k.knowledge_tag))
                          .slice(0, 3)
                          .join('、') || '暂无薄弱知识点'}
                      </span>
                      {summary.knowledge_breakdown.filter((k) => k.accuracy < 0.6).length > 0
                        ? ' 等知识点掌握度较低，建议针对性加强练习。'
                        : '，整体学习情况良好，继续保持！'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
};

export default AnalyticsPage;
