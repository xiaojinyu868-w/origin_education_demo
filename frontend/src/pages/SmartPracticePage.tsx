/**
 * 智能练习中心 - 世界级个性化学习体验
 * 
 * 设计风格: Glassmorphism + Gamification
 * 特点:
 * - AI 智能推荐
 * - 游戏化练习体验
 * - 即时反馈动效
 * - 进度追踪可视化
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker, Empty, Select, Tag, Table, Tooltip, Progress } from 'antd';
import {
  RocketOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  FireOutlined,
  StarFilled,
  BulbOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { GlassCard } from '../design-system/components/GlassCard';
import { Button } from '../design-system/components/Button';
import { Badge } from '../design-system/components/Badge';
import { Skeleton, CardSkeleton } from '../design-system/components/Skeleton';
import { AppShell } from '../components/layout/AppShell';
import type { PracticeAssignment, Student } from '../types';
import {
  completePractice,
  fetchPracticeAssignments,
  fetchStudents,
} from '../api/services';
import useResponsive from '../hooks/useResponsive';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
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
  subtitle?: string;
}> = ({ icon, label, value, color, subtitle }) => (
  <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
    <GlassCard intensity="light" hover className="h-full">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{
            background: `linear-gradient(135deg, ${color}20, ${color}10)`,
            color,
          }}
        >
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold text-slate-800">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </GlassCard>
  </motion.div>
);

// 推荐练习卡片
const RecommendedCard: React.FC<{
  title: string;
  description: string;
  itemCount: number;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  color: string;
  onStart: () => void;
}> = ({ title, description, itemCount, duration, difficulty, tags, color, onStart }) => {
  const difficultyConfig = {
    easy: { label: '入门', color: '#10B981' },
    medium: { label: '进阶', color: '#F59E0B' },
    hard: { label: '挑战', color: '#EF4444' },
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="min-w-[280px] max-w-[320px] shrink-0"
    >
      <GlassCard
        intensity="medium"
        hover
        className="h-full cursor-pointer relative overflow-hidden"
        onClick={onStart}
      >
        {/* 顶部装饰 */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
        />

        {/* 难度标签 */}
        <div className="absolute top-4 right-4">
          <Tag
            style={{
              background: `${difficultyConfig[difficulty].color}15`,
              border: 'none',
              color: difficultyConfig[difficulty].color,
              borderRadius: '6px',
              fontWeight: 500,
            }}
          >
            {difficultyConfig[difficulty].label}
          </Tag>
        </div>

        <div className="pt-4">
          {/* 图标 */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4"
            style={{ background: `${color}15`, color }}
          >
            <RocketOutlined />
          </div>

          {/* 标题和描述 */}
          <h3 className="text-lg font-semibold text-slate-800 mb-2 pr-16">{title}</h3>
          <p className="text-sm text-slate-500 line-clamp-2 mb-4">{description}</p>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <Tag
                key={tag}
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: 'none',
                  color: '#64748B',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                {tag}
              </Tag>
            ))}
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ThunderboltOutlined /> {itemCount} 题
              </span>
              <span className="flex items-center gap-1">
                <ClockCircleOutlined /> {duration}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium" style={{ color }}>
              开始 <ArrowRightOutlined />
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// 练习任务行
const AssignmentRow: React.FC<{
  assignment: PracticeAssignment;
  studentName?: string;
  onComplete: (completed: boolean) => void;
  onDownload: () => void;
}> = ({ assignment, studentName, onComplete, onDownload }) => {
  const isCompleted = assignment.status === 'completed';
  const itemCount = assignment.items?.length ?? 0;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ x: 4 }}
      className="group"
    >
      <GlassCard
        intensity={isCompleted ? 'light' : 'medium'}
        className={`transition-all ${isCompleted ? 'opacity-80' : ''}`}
      >
        <div className="flex items-center gap-4">
          {/* 状态图标 */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110"
            style={{
              background: isCompleted
                ? 'linear-gradient(135deg, #10B98120, #10B98110)'
                : 'linear-gradient(135deg, #4F46E520, #4F46E510)',
              color: isCompleted ? '#10B981' : '#4F46E5',
            }}
          >
            {isCompleted ? <CheckCircleOutlined /> : <PlayCircleOutlined />}
          </div>

          {/* 主要信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-800">
                练习 #{assignment.id}
              </span>
              {studentName && (
                <Tag
                  style={{
                    background: '#4F46E515',
                    border: 'none',
                    color: '#4F46E5',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                >
                  {studentName}
                </Tag>
              )}
              <Badge variant={isCompleted ? 'success' : 'primary'}>
                {isCompleted ? '已完成' : '待完成'}
              </Badge>
            </div>
            <div className="text-sm text-slate-500">
              {itemCount} 道题 · 安排于 {dayjs(assignment.scheduled_for).format('MM-DD')}
            </div>
          </div>

          {/* 进度 */}
          {!isCompleted && (
            <div className="w-24">
              <div className="text-xs text-slate-400 mb-1 text-right">进度</div>
              <Progress
                percent={0}
                size="small"
                strokeColor="#4F46E5"
                trailColor="rgba(0,0,0,0.04)"
                showInfo={false}
              />
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 shrink-0">
            {assignment.generated_pdf_path && (
              <Tooltip title="下载 PDF">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<DownloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                />
              </Tooltip>
            )}
            <Button
              variant={isCompleted ? 'ghost' : 'primary'}
              size="sm"
              onClick={() => onComplete(!isCompleted)}
            >
              {isCompleted ? '取消完成' : '标记完成'}
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// 连续练习提示
const StreakBanner: React.FC<{ days: number }> = ({ days }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden"
  >
    <GlassCard
      intensity="strong"
      className="border-l-4"
      style={{
        borderLeftColor: '#F59E0B',
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-white text-2xl shadow-lg">
          <FireOutlined />
        </div>
        <div>
          <div className="text-lg font-bold text-amber-800">
            连续练习 {days} 天！🔥
          </div>
          <div className="text-sm text-amber-700">
            太棒了！保持每日练习，你的进步会更快
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <StarFilled
              key={i}
              className={`text-xl ${i <= days ? 'text-amber-400' : 'text-amber-200'}`}
            />
          ))}
        </div>
      </div>
    </GlassCard>
  </motion.div>
);

// ============================================
// 主组件
// ============================================

export const SmartPracticePage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  // 状态
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // 加载数据
  const loadData = useCallback(async (studentId?: number) => {
    setLoading(true);
    const [studentList, assignmentList] = await Promise.all([
      students.length ? Promise.resolve(students) : fetchStudents(),
      fetchPracticeAssignments(studentId ? { student_id: studentId } : {}),
    ]);
    if (!students.length) {
      setStudents(studentList);
    }
    setAssignments(assignmentList);
    setLoading(false);
  }, [students.length]);

  useEffect(() => {
    void loadData();
  }, []);

  // 处理学生切换
  const handleStudentChange = async (studentId?: number) => {
    setSelectedStudent(studentId);
    await loadData(studentId);
  };

  // 过滤后的练习
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (!dateRange[0] || !dateRange[1]) return true;
      const scheduled = dayjs(assignment.scheduled_for);
      return scheduled.isSameOrAfter(dateRange[0], 'day') && scheduled.isSameOrBefore(dateRange[1], 'day');
    });
  }, [assignments, dateRange]);

  // 完成练习
  const handleComplete = async (assignmentId: number, completed: boolean) => {
    await completePractice({ assignment_id: assignmentId, completed });
    await loadData(selectedStudent);
  };

  // 统计数据
  const stats = useMemo(() => {
    const total = filteredAssignments.length;
    const completed = filteredAssignments.filter((a) => a.status === 'completed').length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, completionRate };
  }, [filteredAssignments]);

  // 推荐练习数据
  const recommendedPractices = [
    {
      title: '二次函数专项训练',
      description: '针对近期错题中的二次函数知识点，AI 智能生成的个性化练习',
      itemCount: 15,
      duration: '约 25 分钟',
      difficulty: 'medium' as const,
      tags: ['二次函数', '图像变换', '应用题'],
      color: '#4F46E5',
    },
    {
      title: '几何证明强化',
      description: '巩固三角形、四边形相关的几何证明技巧',
      itemCount: 10,
      duration: '约 20 分钟',
      difficulty: 'hard' as const,
      tags: ['三角形', '四边形', '证明'],
      color: '#10B981',
    },
    {
      title: '计算能力提升',
      description: '分式、根式运算的基础练习，提高计算准确率',
      itemCount: 20,
      duration: '约 15 分钟',
      difficulty: 'easy' as const,
      tags: ['分式', '根式', '计算'],
      color: '#F59E0B',
    },
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6 lg:p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* 页面标题 */}
          <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">智能练习中心</h1>
              <p className="text-slate-500">AI 个性化推荐，高效提升学习效果</p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                allowClear
                placeholder="按学生筛选"
                value={selectedStudent}
                onChange={handleStudentChange}
                options={students.map((s) => ({ value: s.id, label: s.name }))}
                style={{ width: 180 }}
              />
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(values) => setDateRange(values as typeof dateRange)}
              />
              <Button
                variant="ghost"
                leftIcon={<ReloadOutlined />}
                onClick={() => loadData(selectedStudent)}
                loading={loading}
              >
                刷新
              </Button>
            </div>
          </motion.div>

          {/* 连续练习提示 */}
          <StreakBanner days={3} />

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<ThunderboltOutlined />}
              label="总练习数"
              value={stats.total}
              color="#4F46E5"
            />
            <StatCard
              icon={<CheckCircleOutlined />}
              label="已完成"
              value={stats.completed}
              color="#10B981"
            />
            <StatCard
              icon={<ClockCircleOutlined />}
              label="待完成"
              value={stats.pending}
              color="#F59E0B"
            />
            <StatCard
              icon={<TrophyOutlined />}
              label="完成率"
              value={`${stats.completionRate}%`}
              color="#EF4444"
            />
          </div>

          {/* AI 推荐练习 */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <BulbOutlined className="text-amber-500" />
                AI 智能推荐
              </h2>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRightOutlined />}>
                查看更多
              </Button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
              {recommendedPractices.map((practice, index) => (
                <RecommendedCard
                  key={index}
                  {...practice}
                  onStart={() => console.log('Start practice:', practice.title)}
                />
              ))}
            </div>
          </motion.div>

          {/* 练习任务列表 */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">练习任务</h2>
              <Badge variant="secondary">{filteredAssignments.length} 个任务</Badge>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : filteredAssignments.length === 0 ? (
              <GlassCard intensity="light" className="py-16">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span className="text-slate-500">暂无练习任务</span>}
                />
              </GlassCard>
            ) : (
              <motion.div variants={containerVariants} className="space-y-3">
                <AnimatePresence>
                  {filteredAssignments.map((assignment) => {
                    const student = students.find((s) => s.id === assignment.student_id);
                    return (
                      <AssignmentRow
                        key={assignment.id}
                        assignment={assignment}
                        studentName={student?.name}
                        onComplete={(completed) => handleComplete(assignment.id, completed)}
                        onDownload={() => window.open(`/api/practice/${assignment.id}/pdf`, '_blank')}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default SmartPracticePage;
