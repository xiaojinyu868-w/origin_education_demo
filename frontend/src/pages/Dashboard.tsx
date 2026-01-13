/**
 * Dashboard - 工作台仪表盘
 * 
 * 智慧教研平台首页
 * 展示数据概览、快捷入口、最近动态
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileTextOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  BulbOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { GlassCard, GlassStatCard, SkeletonStatCard, SkeletonList } from '../design-system/components';
import { Button } from '../design-system/components/Button';

// ============================================
// 类型定义
// ============================================

interface StatData {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color: 'primary' | 'accent' | 'success' | 'warning';
}

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  gradient: string;
}

interface RecentActivity {
  id: string;
  type: 'grading' | 'practice' | 'analysis' | 'chat';
  title: string;
  description: string;
  time: string;
  status?: 'completed' | 'pending' | 'in_progress';
}

// ============================================
// 模拟数据
// ============================================

const statsData: StatData[] = [
  {
    title: '今日批改',
    value: 128,
    icon: <FileTextOutlined />,
    trend: { value: 12, label: '较昨日' },
    color: 'primary',
  },
  {
    title: '待处理错题',
    value: 45,
    icon: <ExclamationCircleOutlined />,
    trend: { value: -8, label: '较昨日' },
    color: 'warning',
  },
  {
    title: '学生总数',
    value: 156,
    icon: <TeamOutlined />,
    trend: { value: 3, label: '本周新增' },
    color: 'success',
  },
  {
    title: 'AI 对话次数',
    value: 89,
    icon: <RobotOutlined />,
    trend: { value: 24, label: '较昨日' },
    color: 'accent',
  },
];

const quickActions: QuickAction[] = [
  {
    key: 'upload',
    title: '上传试卷',
    description: '快速上传并开始 AI 批改',
    icon: <CloudUploadOutlined />,
    path: '/library/upload',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
  },
  {
    key: 'mistakes',
    title: '错题管理',
    description: '查看和整理学生错题',
    icon: <ExclamationCircleOutlined />,
    path: '/library/mistake',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  },
  {
    key: 'analytics',
    title: '学情分析',
    description: '查看班级学习数据',
    icon: <BarChartOutlined />,
    path: '/class/analytics',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  },
  {
    key: 'practice',
    title: '生成练习',
    description: '基于错题生成练习',
    icon: <FileTextOutlined />,
    path: '/toolkit/practice',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  },
  {
    key: 'assistant',
    title: '智能助教',
    description: 'AI 辅助教学决策',
    icon: <BulbOutlined />,
    path: '/toolkit/assistant',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  },
  {
    key: 'tutor',
    title: 'AI 家教',
    description: '学生智能答疑',
    icon: <RobotOutlined />,
    path: '/toolkit/tutor',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  },
];

const recentActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'grading',
    title: '完成数学试卷批改',
    description: '三年级一班 · 32份试卷',
    time: '10 分钟前',
    status: 'completed',
  },
  {
    id: '2',
    type: 'practice',
    title: '生成错题练习',
    description: '基于本周错题 · 15道题目',
    time: '30 分钟前',
    status: 'completed',
  },
  {
    id: '3',
    type: 'analysis',
    title: '班级学情报告',
    description: '三年级二班 · 月度分析',
    time: '1 小时前',
    status: 'completed',
  },
  {
    id: '4',
    type: 'chat',
    title: 'AI 助教对话',
    description: '讨论分数加减法教学策略',
    time: '2 小时前',
    status: 'completed',
  },
  {
    id: '5',
    type: 'grading',
    title: '语文作文批改',
    description: '三年级一班 · 28份作文',
    time: '3 小时前',
    status: 'in_progress',
  },
];

// ============================================
// 动画配置
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0, 0, 0.2, 1],
    },
  },
};

// ============================================
// 组件实现
// ============================================

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // 获取当前时间问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  // 活动类型图标
  const getActivityIcon = (type: RecentActivity['type']) => {
    const icons = {
      grading: <FileTextOutlined />,
      practice: <FileTextOutlined />,
      analysis: <BarChartOutlined />,
      chat: <RobotOutlined />,
    };
    return icons[type];
  };

  // 状态颜色
  const getStatusColor = (status?: RecentActivity['status']) => {
    const colors = {
      completed: '#10B981',
      pending: '#F59E0B',
      in_progress: '#3B82F6',
    };
    return colors[status || 'completed'];
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 页面标题 */}
      <motion.div variants={itemVariants} style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#0F172A',
          marginBottom: '8px',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>
          {getGreeting()}，老师 👋
        </h1>
        <p style={{ fontSize: '15px', color: '#64748B' }}>
          欢迎回到智慧教研平台，今天有 <span style={{ color: '#4F46E5', fontWeight: 600 }}>5</span> 项待处理任务
        </p>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))
        ) : (
          statsData.map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              custom={index}
            >
              <GlassStatCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                trend={stat.trend}
                color={stat.color}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* 快捷入口 */}
      <motion.div variants={itemVariants} style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#0F172A',
          }}>
            快捷入口
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}>
          {quickActions.map((action, index) => (
            <motion.div
              key={action.key}
              variants={itemVariants}
              custom={index}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassCard
                hoverable
                clickable
                padding="lg"
                onClick={() => navigate(action.path)}
                style={{ height: '100%' }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: action.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '22px',
                  marginBottom: '16px',
                  boxShadow: `0 8px 20px ${action.gradient.includes('#4F46E5') ? 'rgba(79, 70, 229, 0.3)' : 'rgba(0, 0, 0, 0.15)'}`,
                }}>
                  {action.icon}
                </div>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#0F172A',
                  marginBottom: '6px',
                }}>
                  {action.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#64748B',
                  lineHeight: 1.5,
                }}>
                  {action.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 底部两栏布局 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
      }}>
        {/* 最近动态 */}
        <motion.div variants={itemVariants}>
          <GlassCard padding="lg">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <ClockCircleOutlined style={{ color: '#4F46E5' }} />
                最近动态
              </h2>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRightOutlined />}>
                查看全部
              </Button>
            </div>

            {loading ? (
              <SkeletonList count={5} avatar={false} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.02)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    whileHover={{ background: 'rgba(0, 0, 0, 0.04)' }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: `${getStatusColor(activity.status)}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getStatusColor(activity.status),
                      fontSize: '16px',
                    }}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#0F172A',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {activity.title}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748B',
                      }}>
                        {activity.description}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#94A3B8',
                      whiteSpace: 'nowrap',
                    }}>
                      {activity.time}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* 学习排行榜 */}
        <motion.div variants={itemVariants}>
          <GlassCard padding="lg">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <TrophyOutlined style={{ color: '#F59E0B' }} />
                本周进步榜
              </h2>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRightOutlined />}>
                查看全部
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { rank: 1, name: '张小明', class: '三年级一班', progress: 15, avatar: '张' },
                { rank: 2, name: '李小红', class: '三年级二班', progress: 12, avatar: '李' },
                { rank: 3, name: '王小华', class: '三年级一班', progress: 10, avatar: '王' },
                { rank: 4, name: '赵小刚', class: '三年级三班', progress: 8, avatar: '赵' },
                { rank: 5, name: '刘小美', class: '三年级二班', progress: 7, avatar: '刘' },
              ].map((student) => (
                <motion.div
                  key={student.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: student.rank <= 3 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  }}
                  whileHover={{ background: 'rgba(0, 0, 0, 0.04)' }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: student.rank === 1 ? 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' :
                               student.rank === 2 ? 'linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)' :
                               student.rank === 3 ? 'linear-gradient(135deg, #CD7F32 0%, #D4A574 100%)' :
                               '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: student.rank <= 3 ? '#FFFFFF' : '#64748B',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {student.rank}
                  </div>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>
                    {student.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#0F172A',
                      marginBottom: '2px',
                    }}>
                      {student.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#64748B',
                    }}>
                      {student.class}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#10B981',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}>
                    <FireOutlined />
                    +{student.progress}%
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
