/**
 * 精选片段页面 - 世界顶级设计 v3.0
 * 
 * 设计灵感:
 * - YouTube: 优雅的视频卡片
 * - Pinterest: 瀑布流布局
 * - Linear: 精致的筛选器
 * - Shape of AI: 模块化展示
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Button,
  Modal,
  Space,
  Empty,
  message,
} from 'antd';
import {
  PlayCircleOutlined,
  ShareAltOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  StarOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
  EyeOutlined,
} from '@ant-design/icons';
import { colors, radii, typography, shadows, transitions } from '../../styles/theme';

const { Text, Paragraph, Title } = Typography;
const { Search } = Input;

interface Clip {
  id: string;
  title: string;
  content: string;
  duration: string;
  timestamp: string;
  course: string;
  tags: string[];
  isFavorite: boolean;
  views?: number;
}

// 课程颜色配置
const COURSE_CONFIG: Record<string, { color: string; gradient: string }> = {
  '数学': { color: colors.primary, gradient: colors.gradients.primary },
  '物理': { color: colors.success, gradient: colors.gradients.success },
  '化学': { color: colors.warning, gradient: colors.gradients.warm },
  '语文': { color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' },
  '英语': { color: colors.info, gradient: colors.gradients.accent },
};

const Clips: React.FC = () => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [filteredClips, setFilteredClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // 模拟数据
  const mockClips: Clip[] = [
    {
      id: '1',
      title: '二次函数顶点式推导',
      content: '通过配方法将一般式 y = ax² + bx + c 转化为顶点式 y = a(x-h)² + k。首先提取 a，然后对括号内的二次项和一次项配方...',
      duration: '3:45',
      timestamp: '2024-01-10 10:15',
      course: '数学',
      tags: ['二次函数', '配方法', '重点'],
      isFavorite: true,
      views: 128,
    },
    {
      id: '2',
      title: '牛顿第二定律应用',
      content: 'F = ma 是牛顿第二定律的数学表达式。在解决力学问题时，首先要进行受力分析，确定物体所受的所有力...',
      duration: '5:20',
      timestamp: '2024-01-09 14:30',
      course: '物理',
      tags: ['力学', '牛顿定律', '经典'],
      isFavorite: false,
      views: 256,
    },
    {
      id: '3',
      title: '化学方程式配平技巧',
      content: '配平化学方程式的基本原则是质量守恒。常用方法包括：最小公倍数法、奇偶法、观察法等...',
      duration: '4:10',
      timestamp: '2024-01-08 09:00',
      course: '化学',
      tags: ['化学方程式', '配平', '技巧'],
      isFavorite: true,
      views: 89,
    },
    {
      id: '4',
      title: '文言文翻译方法',
      content: '文言文翻译要做到"信、达、雅"。首先要理解原文意思，然后用现代汉语准确表达，最后润色使语言流畅...',
      duration: '6:00',
      timestamp: '2024-01-07 15:45',
      course: '语文',
      tags: ['文言文', '翻译', '技巧'],
      isFavorite: false,
      views: 167,
    },
    {
      id: '5',
      title: '英语定语从句讲解',
      content: '定语从句是修饰名词或代词的从句。关系代词 who、which、that 的选择取决于先行词是人还是物...',
      duration: '4:30',
      timestamp: '2024-01-06 11:20',
      course: '英语',
      tags: ['语法', '从句', '重点'],
      isFavorite: true,
      views: 203,
    },
    {
      id: '6',
      title: '三角函数图像变换',
      content: 'y = Asin(ωx + φ) 中，A 影响振幅，ω 影响周期，φ 影响相位。图像变换遵循"先平移后伸缩"或"先伸缩后平移"的原则...',
      duration: '5:15',
      timestamp: '2024-01-05 10:00',
      course: '数学',
      tags: ['三角函数', '图像', '变换'],
      isFavorite: false,
      views: 145,
    },
  ];

  useEffect(() => {
    setClips(mockClips);
    setFilteredClips(mockClips);
  }, []);

  useEffect(() => {
    let result = clips;

    if (searchText) {
      result = result.filter(
        clip =>
          clip.title.toLowerCase().includes(searchText.toLowerCase()) ||
          clip.content.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedCourse !== 'all') {
      result = result.filter(clip => clip.course === selectedCourse);
    }

    if (selectedTag !== 'all') {
      result = result.filter(clip => clip.tags.includes(selectedTag));
    }

    setFilteredClips(result);
  }, [searchText, selectedCourse, selectedTag, clips]);

  const courses = ['all', ...new Set(clips.map(c => c.course))];
  const allTags = ['all', ...new Set(clips.flatMap(c => c.tags))];

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setClips(prev =>
      prev.map(clip =>
        clip.id === id ? { ...clip, isFavorite: !clip.isFavorite } : clip
      )
    );
    message.success('操作成功');
  };

  const openDetail = (clip: Clip) => {
    setSelectedClip(clip);
    setModalVisible(true);
  };

  const getCourseConfig = (course: string) => {
    return COURSE_CONFIG[course] || { 
      color: colors.gray[500], 
      gradient: `linear-gradient(135deg, ${colors.gray[400]} 0%, ${colors.gray[500]} 100%)`,
    };
  };

  // 片段卡片组件
  const ClipCard = ({ clip, index }: { clip: Clip; index: number }) => {
    const config = getCourseConfig(clip.course);
    
    return (
      <div
        className="animate-fade-in-up card-interactive"
        style={{
          animationDelay: `${index * 50}ms`,
          borderRadius: radii.xl,
          overflow: 'hidden',
          background: colors.background.elevated,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.card,
          cursor: 'pointer',
          transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
        }}
        onClick={() => openDetail(clip)}
      >
        {/* 缩略图区域 */}
        <div
          style={{
            height: 160,
            background: `linear-gradient(135deg, ${config.color}15 0%, ${config.color}30 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 播放按钮 */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: radii.full,
            background: 'rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.lg,
            transition: `transform ${transitions.duration.normal} ${transitions.easing.bounce}`,
          }}>
            <PlayCircleOutlined style={{ 
              fontSize: 32, 
              color: config.color,
            }} />
          </div>
          
          {/* 时长标签 */}
          <Tag style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            color: '#fff',
            borderRadius: radii.sm,
            fontWeight: typography.fontWeight.medium,
          }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {clip.duration}
          </Tag>
          
          {/* 收藏标记 */}
          {clip.isFavorite && (
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: radii.full,
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: shadows.sm,
            }}>
              <StarFilled style={{ fontSize: 16, color: colors.warning }} />
            </div>
          )}
          
          {/* 观看次数 */}
          {clip.views && (
            <Tag style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              border: 'none',
              color: '#fff',
              borderRadius: radii.sm,
              fontSize: typography.fontSize.xs,
            }}>
              <EyeOutlined style={{ marginRight: 4 }} />
              {clip.views}
            </Tag>
          )}
        </div>

        {/* 内容区域 */}
        <div style={{ padding: 20 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', 
            marginBottom: 10,
          }}>
            <Text style={{ 
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              flex: 1,
              lineHeight: typography.lineHeight.snug,
            }}>
              {clip.title}
            </Text>
            <Tag style={{
              background: `${config.color}15`,
              color: config.color,
              border: 'none',
              borderRadius: radii.sm,
              marginLeft: 8,
              flexShrink: 0,
              fontWeight: typography.fontWeight.medium,
            }}>
              {clip.course}
            </Tag>
          </div>
          
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ 
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: 16,
              lineHeight: typography.lineHeight.relaxed,
            }}
          >
            {clip.content}
          </Paragraph>
          
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {clip.tags.slice(0, 3).map((tag, idx) => (
              <Tag
                key={idx}
                style={{
                  background: colors.background.muted,
                  border: 'none',
                  borderRadius: radii.sm,
                  color: colors.text.tertiary,
                  fontSize: typography.fontSize.xs,
                }}
              >
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 筛选栏 */}
      <Card
        className="animate-fade-in"
        style={{ 
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.card,
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={10}>
            <Input
              placeholder="搜索片段..."
              prefix={<SearchOutlined style={{ color: colors.text.tertiary }} />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ borderRadius: radii.lg }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={7}>
            <Select
              value={selectedCourse}
              onChange={setSelectedCourse}
              style={{ width: '100%' }}
              placeholder="选择课程"
              dropdownStyle={{ borderRadius: radii.lg }}
              options={courses.map(c => ({
                value: c,
                label: c === 'all' ? '全部课程' : c,
              }))}
            />
          </Col>
          <Col xs={12} sm={8} md={7}>
            <Select
              value={selectedTag}
              onChange={setSelectedTag}
              style={{ width: '100%' }}
              placeholder="选择标签"
              dropdownStyle={{ borderRadius: radii.lg }}
              options={allTags.map(t => ({
                value: t,
                label: t === 'all' ? '全部标签' : t,
              }))}
            />
          </Col>
        </Row>
      </Card>

      {/* 片段列表 */}
      {filteredClips.length > 0 ? (
        <Row gutter={[20, 20]}>
          {filteredClips.map((clip, index) => (
            <Col xs={24} sm={12} lg={8} key={clip.id}>
              <ClipCard clip={clip} index={index} />
            </Col>
          ))}
        </Row>
      ) : (
        <Card 
          style={{ 
            borderRadius: radii.xl, 
            textAlign: 'center', 
            padding: 60,
            border: `1px solid ${colors.border.subtle}`,
          }}
        >
          <Empty
            description={
              <Text style={{ color: colors.text.secondary }}>
                {searchText || selectedCourse !== 'all' || selectedTag !== 'all'
                  ? '没有找到匹配的片段'
                  : '暂无精选片段'}
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}

      {/* 详情弹窗 */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={640}
        centered
        styles={{ body: { padding: 0 } }}
      >
        {selectedClip && (
          <div>
            {/* 头部视频区 */}
            <div
              style={{
                height: 220,
                background: getCourseConfig(selectedClip.course).gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div style={{
                width: 80,
                height: 80,
                borderRadius: radii.full,
                background: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: shadows.xl,
                cursor: 'pointer',
                transition: `transform ${transitions.duration.normal} ${transitions.easing.bounce}`,
              }}>
                <PlayCircleOutlined style={{ 
                  fontSize: 40, 
                  color: getCourseConfig(selectedClip.course).color,
                }} />
              </div>
              <Tag style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                color: '#fff',
                borderRadius: radii.sm,
                padding: '6px 12px',
                fontWeight: typography.fontWeight.medium,
              }}>
                {selectedClip.duration}
              </Tag>
            </div>

            {/* 内容区 */}
            <div style={{ padding: 28 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <Title level={4} style={{ 
                    margin: 0,
                    marginBottom: 8,
                    color: colors.text.primary,
                  }}>
                    {selectedClip.title}
                  </Title>
                  <Text style={{ 
                    fontSize: typography.fontSize.sm,
                    color: colors.text.tertiary,
                  }}>
                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                    {selectedClip.timestamp}
                    {selectedClip.views && (
                      <>
                        <span style={{ margin: '0 8px' }}>·</span>
                        <EyeOutlined style={{ marginRight: 6 }} />
                        {selectedClip.views} 次观看
                      </>
                    )}
                  </Text>
                </div>
                <Tag style={{
                  background: `${getCourseConfig(selectedClip.course).color}15`,
                  color: getCourseConfig(selectedClip.course).color,
                  border: 'none',
                  borderRadius: radii.sm,
                  fontWeight: typography.fontWeight.medium,
                }}>
                  {selectedClip.course}
                </Tag>
              </div>

              <Paragraph style={{ 
                fontSize: typography.fontSize.md,
                lineHeight: typography.lineHeight.loose,
                color: colors.text.secondary,
                marginBottom: 24,
              }}>
                {selectedClip.content}
              </Paragraph>

              <div style={{ 
                display: 'flex', 
                gap: 10, 
                flexWrap: 'wrap', 
                marginBottom: 28,
              }}>
                {selectedClip.tags.map((tag, idx) => (
                  <Tag
                    key={idx}
                    style={{
                      background: colors.background.muted,
                      border: 'none',
                      borderRadius: radii.full,
                      padding: '6px 14px',
                      color: colors.text.secondary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    {tag}
                  </Tag>
                ))}
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  type={selectedClip.isFavorite ? 'primary' : 'default'}
                  icon={selectedClip.isFavorite ? <StarFilled /> : <StarOutlined />}
                  onClick={(e) => toggleFavorite(selectedClip.id, e)}
                  style={{ 
                    borderRadius: radii.lg, 
                    flex: 1,
                    height: 44,
                    fontWeight: typography.fontWeight.medium,
                    ...(selectedClip.isFavorite ? {
                      background: colors.gradients.warm,
                      border: 'none',
                    } : {}),
                  }}
                >
                  {selectedClip.isFavorite ? '已收藏' : '收藏'}
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => message.info('分享功能开发中')}
                  style={{ 
                    borderRadius: radii.lg, 
                    flex: 1,
                    height: 44,
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  分享
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Clips;
