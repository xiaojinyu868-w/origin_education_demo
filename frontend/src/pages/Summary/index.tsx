/**
 * 课堂摘要页面 - 世界顶级设计 v3.0
 * 
 * 设计灵感:
 * - Notion: 优雅的内容展示
 * - Linear: 精致的时间线视图
 * - Stripe: 渐变卡片设计
 * - Shape of AI: 结构化信息架构
 */

import React, { useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Spin,
  Tag,
  Timeline,
  Empty,
  message,
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BookOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  EditOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { type SummaryResponse } from '../../api/meetmind';
import { colors, radii, typography, shadows, transitions } from '../../styles/theme';

const { Title, Text, Paragraph } = Typography;

interface SummaryItem {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  keyPoints: string[];
  type: 'concept' | 'example' | 'exercise' | 'summary';
}

// 类型配置
const TYPE_CONFIG = {
  concept: { 
    color: colors.primary, 
    gradient: colors.gradients.primary,
    text: '概念', 
    icon: <BookOutlined />,
  },
  example: { 
    color: colors.success, 
    gradient: colors.gradients.success,
    text: '例题', 
    icon: <ExperimentOutlined />,
  },
  exercise: { 
    color: colors.warning, 
    gradient: colors.gradients.warm,
    text: '练习', 
    icon: <EditOutlined />,
  },
  summary: { 
    color: colors.info, 
    gradient: colors.gradients.accent,
    text: '总结', 
    icon: <RocketOutlined />,
  },
};

const Summary: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);

  // 模拟数据
  const mockSummaryItems: SummaryItem[] = [
    {
      id: '1',
      title: '二次函数基本概念',
      content: '二次函数的一般形式为 y = ax² + bx + c，其中 a ≠ 0。a 决定开口方向和大小，b 影响对称轴位置，c 是与 y 轴的交点。',
      timestamp: '00:05:30',
      keyPoints: ['一般形式', '参数含义', '图像特征'],
      type: 'concept',
    },
    {
      id: '2',
      title: '顶点式推导',
      content: '通过配方法将一般式转化为顶点式 y = a(x-h)² + k，其中 (h, k) 为顶点坐标。',
      timestamp: '00:15:20',
      keyPoints: ['配方法', '顶点坐标', '对称轴'],
      type: 'concept',
    },
    {
      id: '3',
      title: '例题讲解：求顶点坐标',
      content: '已知 y = 2x² - 4x + 5，求顶点坐标。解：配方得 y = 2(x-1)² + 3，顶点为 (1, 3)。',
      timestamp: '00:25:00',
      keyPoints: ['配方步骤', '顶点公式'],
      type: 'example',
    },
    {
      id: '4',
      title: '课堂练习',
      content: '完成练习册第 45 页 1-5 题，重点练习配方法和顶点坐标求解。',
      timestamp: '00:35:00',
      keyPoints: ['配方练习', '顶点求解'],
      type: 'exercise',
    },
  ];

  // 生成摘要
  const handleGenerateSummary = async () => {
    setLoading(true);
    setTimeout(() => {
      setSummaryData({
        summary: '本节课主要讲解了二次函数的基本概念、顶点式的推导方法以及相关例题。重点掌握配方法将一般式转化为顶点式，理解参数 a、b、c 对图像的影响。',
        keyPoints: [
          '二次函数一般形式 y = ax² + bx + c',
          '顶点式 y = a(x-h)² + k',
          '配方法的应用',
          '顶点坐标的求解',
        ],
        topics: ['二次函数', '配方法', '顶点式'],
      });
      setLoading(false);
      message.success('摘要生成成功');
    }, 1500);
  };

  // 时间线项组件
  const TimelineCard = ({ item, index }: { item: SummaryItem; index: number }) => {
    const config = TYPE_CONFIG[item.type];
    
    return (
      <div
        className="animate-fade-in-up card-interactive"
        style={{
          animationDelay: `${index * 100}ms`,
          padding: 20,
          background: colors.background.elevated,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radii.xl,
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
          transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
        }}
      >
        {/* 左侧装饰线 */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: config.gradient,
          borderRadius: `${radii.xl}px 0 0 ${radii.xl}px`,
        }} />
        
        <div style={{ paddingLeft: 12 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', 
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: radii.lg,
                background: `${config.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: config.color,
                fontSize: 16,
              }}>
                {config.icon}
              </div>
              <div>
                <Text style={{ 
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  display: 'block',
                }}>
                  {item.title}
                </Text>
                <Text style={{ 
                  fontSize: typography.fontSize.xs,
                  color: colors.text.tertiary,
                }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {item.timestamp}
                </Text>
              </div>
            </div>
            <Tag style={{
              background: `${config.color}15`,
              color: config.color,
              border: 'none',
              borderRadius: radii.sm,
              fontWeight: typography.fontWeight.medium,
            }}>
              {config.text}
            </Tag>
          </div>
          
          <Paragraph style={{ 
            color: colors.text.secondary,
            fontSize: typography.fontSize.base,
            lineHeight: typography.lineHeight.relaxed,
            marginBottom: 16,
          }}>
            {item.content}
          </Paragraph>
          
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {item.keyPoints.map((point, idx) => (
              <Tag
                key={idx}
                style={{
                  background: colors.background.muted,
                  border: 'none',
                  borderRadius: radii.sm,
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.xs,
                }}
              >
                {point}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 操作栏 */}
      <div 
        className="animate-fade-in"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        <Button
          icon={<ReloadOutlined />}
          onClick={handleGenerateSummary}
          loading={loading}
          style={{ borderRadius: radii.md }}
        >
          重新生成
        </Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          disabled={!summaryData}
          style={{ 
            borderRadius: radii.md,
            background: colors.gradients.primary,
            border: 'none',
          }}
        >
          导出摘要
        </Button>
      </div>

      {/* 核心摘要卡片 */}
      <Card
        className="animate-fade-in-up"
        style={{
          borderRadius: radii["2xl"],
          background: colors.gradients.primary,
          border: 'none',
          boxShadow: `0 8px 32px ${colors.primaryGlow}`,
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 32 } }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="loading-spinner-lg" style={{
              width: 48,
              height: 48,
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
              正在生成摘要...
            </Text>
          </div>
        ) : summaryData ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: radii.xl,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BulbOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <Title level={4} style={{ color: '#fff', margin: 0 }}>
                核心摘要
              </Title>
            </div>
            
            <Paragraph style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: typography.fontSize.md,
              lineHeight: typography.lineHeight.relaxed,
              marginBottom: 24,
            }}>
              {summaryData.summary}
            </Paragraph>
            
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {summaryData.topics.map((topic, index) => (
                <Tag
                  key={index}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    borderRadius: radii.full,
                    padding: '6px 16px',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  {topic}
                </Tag>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: radii["2xl"],
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <BookOutlined style={{ fontSize: 40, color: 'rgba(255,255,255,0.6)' }} />
            </div>
            <Text style={{ 
              display: 'block', 
              color: 'rgba(255,255,255,0.8)',
              fontSize: typography.fontSize.md,
            }}>
              点击"重新生成"按钮生成课堂摘要
            </Text>
          </div>
        )}
      </Card>

      {/* 关键知识点 */}
      {summaryData && (
        <Card
          className="animate-fade-in-up stagger-1"
          title={
            <Space>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: radii.md,
                background: colors.successSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircleOutlined style={{ color: colors.success, fontSize: 16 }} />
              </div>
              <span style={{ fontWeight: typography.fontWeight.semibold }}>关键知识点</span>
            </Space>
          }
          style={{ 
            borderRadius: radii.xl,
            border: `1px solid ${colors.border.subtle}`,
            boxShadow: shadows.card,
          }}
          styles={{ body: { padding: 24 } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {summaryData.keyPoints.map((point, index) => (
              <div
                key={index}
                className="animate-fade-in-up hover-lift"
                style={{
                  animationDelay: `${index * 50}ms`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  background: colors.background.muted,
                  borderRadius: radii.lg,
                  transition: `all ${transitions.duration.fast} ${transitions.easing.out}`,
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: radii.full,
                  background: colors.gradients.success,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}>
                  {index + 1}
                </div>
                <Text style={{ 
                  fontSize: typography.fontSize.base,
                  color: colors.text.primary,
                }}>
                  {point}
                </Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 课堂时间线 */}
      <Card
        className="animate-fade-in-up stagger-2"
        title={
          <Space>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: radii.md,
              background: colors.primarySoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ClockCircleOutlined style={{ color: colors.primary, fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: typography.fontWeight.semibold }}>课堂时间线</span>
          </Space>
        }
        style={{ 
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.card,
        }}
        styles={{ body: { padding: 24 } }}
      >
        {mockSummaryItems.length > 0 ? (
          <div>
            {mockSummaryItems.map((item, index) => (
              <TimelineCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <Empty 
            description="暂无课堂记录" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </div>
  );
};

export default Summary;
