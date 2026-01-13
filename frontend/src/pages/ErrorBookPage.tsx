/**
 * 错题诊断中心 - 世界级错题管理体验
 * 
 * 设计风格: Glassmorphism + Claymorphism
 * 特点:
 * - 智能错题分析
 * - 精致的卡片设计
 * - 流畅的交互动效
 * - 清晰的练习追踪
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  message, 
  Drawer, 
  Empty, 
  Tag, 
  Progress,
  Form,
  Modal,
  Tooltip,
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
  ExportOutlined,
  ReloadOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { GlassCard } from '../design-system/components/GlassCard';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { Badge } from '../design-system/components/Badge';
import { Skeleton, CardSkeleton } from '../design-system/components/Skeleton';
import { AppShell } from '../components/layout/AppShell';
import type { Mistake, PracticeAssignment, Student } from '../types';
import {
  completePractice,
  createPractice,
  fetchPracticeAssignments,
  fetchStudents,
  fetchStudentMistakes,
} from '../api/services';
import useResponsive from '../hooks/useResponsive';

// ============================================
// 动画配置
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ============================================
// 工具函数
// ============================================

const getDifficultyColor = (level: string): string => {
  switch (level?.toLowerCase()) {
    case 'easy':
    case '简单':
      return '#10B981';
    case 'medium':
    case '中等':
      return '#F59E0B';
    case 'hard':
    case '困难':
      return '#EF4444';
    default:
      return '#94A3B8';
  }
};

const getDifficultyLabel = (level: string): string => {
  switch (level?.toLowerCase()) {
    case 'easy':
      return '简单';
    case 'medium':
      return '中等';
    case 'hard':
      return '困难';
    default:
      return level || '未知';
  }
};

const getMasteryColor = (rate: number): string => {
  if (rate >= 0.8) return '#10B981';
  if (rate >= 0.6) return '#F59E0B';
  return '#EF4444';
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
  <GlassCard intensity="light" hover className="flex-1 min-w-[180px]">
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  </GlassCard>
);

// 错题卡片
const MistakeCard: React.FC<{
  mistake: Mistake;
  isStarred: boolean;
  onToggleStar: () => void;
  onClick: () => void;
}> = ({ mistake, isStarred, onToggleStar, onClick }) => {
  const difficultyColor = getDifficultyColor(mistake.difficulty || '');
  const masteryRate = mistake.mastery_rate ?? 0;
  const masteryColor = getMasteryColor(masteryRate);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <GlassCard
        intensity="light"
        hover
        className="cursor-pointer h-full relative overflow-hidden"
        onClick={onClick}
      >
        {/* 难度指示条 */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: difficultyColor }}
        />

        {/* 收藏按钮 */}
        <button
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: isStarred ? '#FEF3C7' : 'rgba(0,0,0,0.04)',
            color: isStarred ? '#F59E0B' : '#94A3B8',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
        >
          {isStarred ? <StarFilled /> : <StarOutlined />}
        </button>

        <div className="pt-4">
          {/* 题目预览 */}
          <div className="text-sm text-slate-700 line-clamp-3 mb-4 pr-8">
            {mistake.question_text || '题目内容加载中...'}
          </div>

          {/* 标签区 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Tag
              style={{
                background: `${difficultyColor}15`,
                border: 'none',
                color: difficultyColor,
                borderRadius: '6px',
              }}
            >
              {getDifficultyLabel(mistake.difficulty || '')}
            </Tag>
            {mistake.knowledge_tag && (
              <Tag
                style={{
                  background: '#4F46E515',
                  border: 'none',
                  color: '#4F46E5',
                  borderRadius: '6px',
                }}
              >
                {mistake.knowledge_tag}
              </Tag>
            )}
            {mistake.error_count && mistake.error_count > 1 && (
              <Tag
                style={{
                  background: '#EF444415',
                  border: 'none',
                  color: '#EF4444',
                  borderRadius: '6px',
                }}
              >
                错{mistake.error_count}次
              </Tag>
            )}
          </div>

          {/* 掌握进度 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">掌握程度</span>
              <span style={{ color: masteryColor }}>{Math.round(masteryRate * 100)}%</span>
            </div>
            <Progress
              percent={masteryRate * 100}
              showInfo={false}
              strokeColor={masteryColor}
              trailColor="rgba(0,0,0,0.04)"
              size="small"
            />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// 练习任务卡片
const AssignmentCard: React.FC<{
  assignment: PracticeAssignment;
  onComplete: (completed: boolean) => void;
}> = ({ assignment, onComplete }) => {
  const isCompleted = assignment.status === 'completed';
  const itemCount = assignment.items?.length ?? 0;

  return (
    <motion.div variants={itemVariants}>
      <GlassCard
        intensity={isCompleted ? 'light' : 'medium'}
        className={`transition-all ${isCompleted ? 'opacity-70' : ''}`}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{
              background: isCompleted ? '#10B98115' : '#4F46E515',
              color: isCompleted ? '#10B981' : '#4F46E5',
            }}
          >
            {isCompleted ? <CheckCircleOutlined /> : <FileTextOutlined />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-800">
              练习 #{assignment.id}
            </div>
            <div className="text-sm text-slate-500">
              {itemCount} 道题 · 安排于 {new Date(assignment.scheduled_for).toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {assignment.generated_pdf_path && (
              <Tooltip title="下载 PDF">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ExportOutlined />}
                  onClick={() => window.open(`/api/practice/${assignment.id}/pdf`, '_blank')}
                />
              </Tooltip>
            )}
            <Button
              variant={isCompleted ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => onComplete(!isCompleted)}
            >
              {isCompleted ? '标记未完成' : '标记完成'}
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// 创建练习弹窗
const CreatePracticeModal: React.FC<{
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: { knowledge_filters?: string; max_items?: number }) => void;
}> = ({ visible, loading, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <RocketOutlined className="text-indigo-500" />
          <span>生成个性化练习</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
      styles={{
        header: { borderBottom: '1px solid #f0f0f0', paddingBottom: 16 },
        body: { paddingTop: 24 },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ max_items: 10 }}
      >
        <Form.Item
          name="knowledge_filters"
          label="知识点筛选"
          extra="多个知识点用逗号分隔，留空则从所有错题中选取"
        >
          <Input placeholder="例如：二次函数，三角函数" />
        </Form.Item>

        <Form.Item
          name="max_items"
          label="题目数量"
        >
          <Input type="number" placeholder="10" min={1} max={50} />
        </Form.Item>

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" fullWidth onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" fullWidth loading={loading} onClick={() => form.submit()}>
            生成练习
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

// ============================================
// 主组件
// ============================================

export const ErrorBookPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  // 状态
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string | undefined>();
  const [knowledgeFilter, setKnowledgeFilter] = useState<string | undefined>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedMistake, setSelectedMistake] = useState<Mistake | null>(null);

  // 加载学生列表
  useEffect(() => {
    void (async () => {
      const list = await fetchStudents();
      setStudents(list);
      if (list.length > 0) {
        await loadStudentData(list[0].id);
      }
      setLoading(false);
    })();
  }, []);

  // 加载学生数据
  const loadStudentData = async (studentId: number) => {
    setSelectedStudent(studentId);
    setLoading(true);
    const [mistakeList, assignmentList] = await Promise.all([
      fetchStudentMistakes(studentId),
      fetchPracticeAssignments({ student_id: studentId }),
    ]);
    setMistakes(mistakeList);
    setAssignments(assignmentList);
    setLoading(false);
  };

  // 创建练习
  const handleCreatePractice = async (values: { knowledge_filters?: string; max_items?: number }) => {
    if (!selectedStudent) return;
    setCreateLoading(true);
    const filters = values.knowledge_filters
      ? values.knowledge_filters.split(/[，,]/).map((s) => s.trim()).filter(Boolean)
      : undefined;
    await createPractice({
      student_id: selectedStudent,
      knowledge_filters: filters,
      max_items: values.max_items || 10,
    });
    const assignmentList = await fetchPracticeAssignments({ student_id: selectedStudent });
    setAssignments(assignmentList);
    setCreateLoading(false);
    setCreateModalVisible(false);
    message.success('练习生成成功！');
  };

  // 完成练习
  const handleCompletePractice = async (assignmentId: number, completed: boolean) => {
    await completePractice({ assignment_id: assignmentId, completed });
    const assignmentList = await fetchPracticeAssignments({ student_id: selectedStudent! });
    setAssignments(assignmentList);
  };

  // 切换收藏
  const toggleStar = (id: number) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 知识点列表
  const knowledgeTags = useMemo(() => {
    const tags = new Set<string>();
    mistakes.forEach((m) => m.knowledge_tag && tags.add(m.knowledge_tag));
    return Array.from(tags);
  }, [mistakes]);

  // 过滤后的错题
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      if (searchText && !m.question_text?.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      if (difficultyFilter && m.difficulty !== difficultyFilter) {
        return false;
      }
      if (knowledgeFilter && m.knowledge_tag !== knowledgeFilter) {
        return false;
      }
      return true;
    });
  }, [mistakes, searchText, difficultyFilter, knowledgeFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const total = mistakes.length;
    const mastered = mistakes.filter((m) => (m.mastery_rate ?? 0) >= 0.8).length;
    const needsPractice = mistakes.filter((m) => (m.mastery_rate ?? 0) < 0.6).length;
    const starred = starredIds.size;
    return { total, mastered, needsPractice, starred };
  }, [mistakes, starredIds]);

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 lg:p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-8"
        >
          {/* 页面标题 */}
          <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">错题诊断中心</h1>
              <p className="text-slate-500">智能分析错题，生成个性化练习</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white/70 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={selectedStudent ?? ''}
                onChange={(e) => loadStudentData(Number(e.target.value))}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Button
                variant="primary"
                leftIcon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                生成练习
              </Button>
            </div>
          </motion.div>

          {/* 统计卡片 */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <StatCard
              icon={<BookOutlined />}
              label="错题总数"
              value={stats.total}
              color="#4F46E5"
            />
            <StatCard
              icon={<TrophyOutlined />}
              label="已掌握"
              value={stats.mastered}
              color="#10B981"
              subtitle="掌握度 ≥ 80%"
            />
            <StatCard
              icon={<WarningOutlined />}
              label="需强化"
              value={stats.needsPractice}
              color="#EF4444"
              subtitle="掌握度 < 60%"
            />
            <StatCard
              icon={<StarFilled />}
              label="已收藏"
              value={stats.starred}
              color="#F59E0B"
            />
          </motion.div>

          {/* 主内容区 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 错题列表 */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">错题列表</h2>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="搜索题目..."
                    leftIcon={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 180 }}
                  />
                  <select
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white/70 backdrop-blur text-sm"
                    value={difficultyFilter ?? ''}
                    onChange={(e) => setDifficultyFilter(e.target.value || undefined)}
                  >
                    <option value="">全部难度</option>
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                  <select
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white/70 backdrop-blur text-sm"
                    value={knowledgeFilter ?? ''}
                    onChange={(e) => setKnowledgeFilter(e.target.value || undefined)}
                  >
                    <option value="">全部知识点</option>
                    {knowledgeTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredMistakes.length === 0 ? (
                <GlassCard intensity="light" className="py-16">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-slate-500">暂无错题记录</span>}
                  />
                </GlassCard>
              ) : (
                <motion.div
                  variants={containerVariants}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <AnimatePresence>
                    {filteredMistakes.map((mistake) => (
                      <MistakeCard
                        key={mistake.id}
                        mistake={mistake}
                        isStarred={starredIds.has(mistake.id)}
                        onToggleStar={() => toggleStar(mistake.id)}
                        onClick={() => {
                          setSelectedMistake(mistake);
                          setDetailDrawerVisible(true);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>

            {/* 练习任务 */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">练习任务</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ReloadOutlined />}
                  onClick={() => selectedStudent && loadStudentData(selectedStudent)}
                />
              </div>

              <div className="space-y-3">
                {assignments.length === 0 ? (
                  <GlassCard intensity="light" className="py-8">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={<span className="text-slate-500">暂无练习任务</span>}
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setCreateModalVisible(true)}
                      >
                        生成练习
                      </Button>
                    </Empty>
                  </GlassCard>
                ) : (
                  <AnimatePresence>
                    {assignments.slice(0, 5).map((assignment) => (
                      <AssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        onComplete={(completed) => handleCompletePractice(assignment.id, completed)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 创建练习弹窗 */}
        <CreatePracticeModal
          visible={createModalVisible}
          loading={createLoading}
          onCancel={() => setCreateModalVisible(false)}
          onSubmit={handleCreatePractice}
        />

        {/* 错题详情抽屉 */}
        <Drawer
          title="错题详情"
          placement="right"
          width={isCompact ? '100%' : 480}
          open={detailDrawerVisible}
          onClose={() => setDetailDrawerVisible(false)}
          styles={{
            header: {
              background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
              color: '#fff',
            },
            body: { background: '#FFFBEB', padding: 24 },
          }}
        >
          {selectedMistake && (
            <div className="space-y-4">
              <GlassCard intensity="light">
                <h4 className="font-semibold text-slate-800 mb-3">题目内容</h4>
                <p className="text-slate-600 leading-relaxed">
                  {selectedMistake.question_text}
                </p>
              </GlassCard>

              <GlassCard intensity="light">
                <h4 className="font-semibold text-slate-800 mb-3">学生答案</h4>
                <p className="text-red-500">
                  {selectedMistake.student_answer || '未作答'}
                </p>
              </GlassCard>

              <GlassCard intensity="light">
                <h4 className="font-semibold text-slate-800 mb-3">正确答案</h4>
                <p className="text-green-600">
                  {selectedMistake.correct_answer || '暂无'}
                </p>
              </GlassCard>

              {selectedMistake.ai_analysis && (
                <GlassCard intensity="light">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <BulbOutlined className="text-amber-500" />
                    AI 解析
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedMistake.ai_analysis}
                  </p>
                </GlassCard>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="secondary" fullWidth>
                  加入练习
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  leftIcon={starredIds.has(selectedMistake.id) ? <StarFilled /> : <StarOutlined />}
                  onClick={() => toggleStar(selectedMistake.id)}
                >
                  {starredIds.has(selectedMistake.id) ? '取消收藏' : '收藏'}
                </Button>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
};

export default ErrorBookPage;
