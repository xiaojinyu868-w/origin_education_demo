/**
 * AI 批改中心 - 世界级批改体验
 * 
 * 设计风格: Glassmorphism + Soft UI
 * 特点:
 * - 清晰的流程引导
 * - 精致的历史记录卡片
 * - 流畅的交互动效
 * - 智能的状态展示
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  message, 
  Drawer, 
  Empty, 
  Spin, 
  Select, 
  Tag,
  Badge,
  Descriptions,
  List,
} from 'antd';
import {
  CloudUploadOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  RocketOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { GlassCard } from '../design-system/components/GlassCard';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { Skeleton, CardSkeleton } from '../design-system/components/Skeleton';
import { AppShell } from '../components/layout/AppShell';
import {
  fetchActiveGradingSession,
  fetchExams,
  fetchStudents,
  fetchSubmission,
  fetchSubmissionHistory,
  fetchSubmissionLogs,
} from '../api/services';
import type {
  Exam,
  GradingSession,
  ProcessingLog,
  SubmissionDetail,
  SubmissionHistoryEntry,
  Student,
} from '../types';
import useResponsive from '../hooks/useResponsive';

// ============================================
// 常量定义
// ============================================

const HISTORY_LIMIT = 20;

const STATUS_OPTIONS = [
  { label: '全部状态', value: undefined },
  { label: '待处理', value: 'pending' },
  { label: '待人工确认', value: 'needs_review' },
  { label: '已完成', value: 'graded' },
];

// ============================================
// 工具函数
// ============================================

const statusDisplay = (raw?: string | null) => {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('needs')) return '待人工确认';
  if (value.includes('pending')) return '待处理';
  if (value.includes('graded')) return '已完成';
  return value || '--';
};

const getStatusColor = (status?: string | null): string => {
  const value = (status ?? '').toLowerCase();
  if (value.includes('needs')) return '#F59E0B';
  if (value.includes('pending')) return '#3B82F6';
  if (value.includes('graded')) return '#10B981';
  return '#94A3B8';
};

const getStatusIcon = (status?: string | null) => {
  const value = (status ?? '').toLowerCase();
  if (value.includes('needs')) return <ClockCircleOutlined />;
  if (value.includes('pending')) return <ThunderboltOutlined />;
  if (value.includes('graded')) return <CheckCircleOutlined />;
  return <FileSearchOutlined />;
};

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
// 子组件
// ============================================

// 统计卡片
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  trend?: { value: number; isUp: boolean };
}> = ({ icon, label, value, color, trend }) => (
  <GlassCard intensity="light" hover className="flex-1 min-w-[200px]">
    <div className="flex items-start justify-between">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      {trend && (
        <div
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{
            background: trend.isUp ? '#10B98115' : '#EF444415',
            color: trend.isUp ? '#10B981' : '#EF4444',
          }}
        >
          {trend.isUp ? '↑' : '↓'} {trend.value}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  </GlassCard>
);

// 历史记录卡片
const HistoryCard: React.FC<{
  item: SubmissionHistoryEntry;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const statusColor = getStatusColor(item.status);
  
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <GlassCard
        intensity="light"
        hover
        onClick={onClick}
        className="cursor-pointer transition-all duration-200"
      >
        <div className="flex items-start gap-4">
          {/* 状态指示器 */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: `${statusColor}15`, color: statusColor }}
          >
            {getStatusIcon(item.status)}
          </div>

          {/* 主要信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-800 truncate">
                {item.student_name || `学生 #${item.student_id}`}
              </span>
              <Tag
                color={statusColor}
                style={{
                  background: `${statusColor}15`,
                  border: 'none',
                  color: statusColor,
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
              >
                {statusDisplay(item.status)}
              </Tag>
            </div>
            <div className="text-sm text-slate-500">
              {item.exam_name || `试卷 #${item.exam_id}`}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {dayjs(item.created_at).format('MM-DD HH:mm')}
            </div>
          </div>

          {/* 分数 */}
          {item.total_score !== null && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold" style={{ color: statusColor }}>
                {item.total_score}
              </div>
              <div className="text-xs text-slate-400">分</div>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

// 快捷操作卡片
const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}> = ({ icon, title, description, color, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.03, y: -4 }}
    whileTap={{ scale: 0.98 }}
  >
    <GlassCard
      intensity="medium"
      hover
      onClick={onClick}
      className="cursor-pointer h-full"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          color,
        }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-medium" style={{ color }}>
        开始使用 <ArrowRightOutlined />
      </div>
    </GlassCard>
  </motion.div>
);

// ============================================
// 主组件
// ============================================

export const AIGradingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  // 状态
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<SubmissionHistoryEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSession, setActiveSession] = useState<GradingSession | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetail | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [examFilter, setExamFilter] = useState<number | undefined>();
  const [searchText, setSearchText] = useState('');

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    const [examList, studentList, historyList, session] = await Promise.all([
      fetchExams(),
      fetchStudents(),
      fetchSubmissionHistory({ limit: HISTORY_LIMIT }),
      fetchActiveGradingSession().catch(() => null),
    ]);
    setExams(examList);
    setStudents(studentList);
    setHistory(historyList);
    setActiveSession(session);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const params: Record<string, unknown> = { limit: HISTORY_LIMIT };
    if (statusFilter) params.status = statusFilter;
    if (examFilter) params.exam_id = examFilter;
    const list = await fetchSubmissionHistory(params);
    setHistory(list);
    setHistoryLoading(false);
  }, [statusFilter, examFilter]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // 过滤后的历史记录
  const filteredHistory = useMemo(() => {
    if (!searchText) return history;
    const lower = searchText.toLowerCase();
    return history.filter(
      (item) =>
        item.student_name?.toLowerCase().includes(lower) ||
        item.exam_name?.toLowerCase().includes(lower)
    );
  }, [history, searchText]);

  // 打开详情抽屉
  const openDetail = async (submissionId: number) => {
    const [detail, logList] = await Promise.all([
      fetchSubmission(submissionId),
      fetchSubmissionLogs(submissionId),
    ]);
    setSelectedSubmission(detail);
    setLogs(logList);
    setDrawerVisible(true);
  };

  // 统计数据
  const stats = useMemo(() => {
    const total = history.length;
    const completed = history.filter((h) => h.status?.toLowerCase().includes('graded')).length;
    const pending = history.filter((h) => h.status?.toLowerCase().includes('pending')).length;
    const needsReview = history.filter((h) => h.status?.toLowerCase().includes('needs')).length;
    return { total, completed, pending, needsReview };
  }, [history]);

  // 开始批改向导
  const startGrading = () => {
    navigate('/grading-wizard');
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 lg:p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* 页面标题 */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">AI 智能批改</h1>
              <p className="text-slate-500">上传作业，AI 秒级完成批改与反馈</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<RocketOutlined />}
              onClick={startGrading}
            >
              开始批改
            </Button>
          </motion.div>

          {/* 统计卡片 */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <StatCard
              icon={<FileSearchOutlined />}
              label="今日批改"
              value={stats.total}
              color="#4F46E5"
              trend={{ value: 12, isUp: true }}
            />
            <StatCard
              icon={<CheckCircleOutlined />}
              label="已完成"
              value={stats.completed}
              color="#10B981"
            />
            <StatCard
              icon={<ClockCircleOutlined />}
              label="待处理"
              value={stats.pending}
              color="#3B82F6"
            />
            <StatCard
              icon={<ThunderboltOutlined />}
              label="待确认"
              value={stats.needsReview}
              color="#F59E0B"
            />
          </motion.div>

          {/* 快捷操作 */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">快捷操作</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickActionCard
                icon={<CloudUploadOutlined />}
                title="上传作业"
                description="批量上传学生作业图片，AI 自动识别并批改"
                color="#4F46E5"
                onClick={startGrading}
              />
              <QuickActionCard
                icon={<PlayCircleOutlined />}
                title="继续批改"
                description="继续上次未完成的批改任务"
                color="#10B981"
                onClick={() => activeSession && navigate('/grading-wizard')}
              />
              <QuickActionCard
                icon={<HistoryOutlined />}
                title="批改历史"
                description="查看所有历史批改记录和详细结果"
                color="#F97316"
                onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}
              />
            </div>
          </motion.div>

          {/* 历史记录 */}
          <motion.div variants={itemVariants} id="history-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">批改历史</h2>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="搜索学生或试卷..."
                  leftIcon={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 200 }}
                />
                <Select
                  placeholder="状态筛选"
                  allowClear
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={STATUS_OPTIONS}
                  style={{ width: 140 }}
                />
                <Select
                  placeholder="试卷筛选"
                  allowClear
                  value={examFilter}
                  onChange={setExamFilter}
                  options={exams.map((e) => ({ value: e.id, label: e.name }))}
                  style={{ width: 160 }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ReloadOutlined />}
                  onClick={loadHistory}
                  loading={historyLoading}
                >
                  刷新
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <GlassCard intensity="light" className="py-16">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-slate-500">暂无批改记录，开始上传作业吧</span>
                  }
                >
                  <Button variant="primary" onClick={startGrading}>
                    开始批改
                  </Button>
                </Empty>
              </GlassCard>
            ) : (
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredHistory.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    onClick={() => openDetail(item.id)}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* 详情抽屉 */}
        <Drawer
          title="批改详情"
          placement="right"
          width={isCompact ? '100%' : 520}
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          styles={{
            header: {
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              color: '#fff',
              borderRadius: '0',
            },
            body: {
              background: '#F8FAFC',
            },
          }}
        >
          {selectedSubmission && (
            <div className="space-y-4">
              <GlassCard intensity="light">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="学生">
                    {selectedSubmission.student_name || `#${selectedSubmission.student_id}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="试卷">
                    {selectedSubmission.exam_name || `#${selectedSubmission.exam_id}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={getStatusColor(selectedSubmission.status)}>
                      {statusDisplay(selectedSubmission.status)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="总分">
                    <span className="text-xl font-bold text-indigo-600">
                      {selectedSubmission.total_score ?? '--'}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="提交时间">
                    {dayjs(selectedSubmission.created_at).format('YYYY-MM-DD HH:mm')}
                  </Descriptions.Item>
                </Descriptions>
              </GlassCard>

              {/* 处理日志 */}
              {logs.length > 0 && (
                <GlassCard intensity="light">
                  <h4 className="font-semibold text-slate-800 mb-3">处理日志</h4>
                  <List
                    size="small"
                    dataSource={logs}
                    renderItem={(log) => (
                      <List.Item>
                        <div className="flex items-center gap-2">
                          <Badge
                            status={
                              log.status === 'success'
                                ? 'success'
                                : log.status === 'error'
                                ? 'error'
                                : 'processing'
                            }
                          />
                          <span className="text-sm text-slate-600">{log.message}</span>
                        </div>
                      </List.Item>
                    )}
                  />
                </GlassCard>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setDrawerVisible(false);
                    navigate(`/grading-wizard?submission=${selectedSubmission.id}`);
                  }}
                >
                  查看详细批改
                </Button>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
};

export default AIGradingPage;
