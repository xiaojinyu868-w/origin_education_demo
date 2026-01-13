/**
 * Skeleton - 骨架屏组件
 * 
 * 用于内容加载时的占位显示
 * 遵循 ui-ux-pro-max UX 指南：使用骨架屏而非空白
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// 类型定义
// ============================================

export interface SkeletonProps {
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 圆角 */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 是否显示动画 */
  animate?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

// ============================================
// 样式配置
// ============================================

const radiusMap = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// ============================================
// 动画配置
// ============================================

const shimmerAnimation = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

// ============================================
// 基础骨架屏组件
// ============================================

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  radius = 'md',
  animate = true,
  className = '',
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: radiusMap[radius],
    background: animate
      ? 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)'
      : '#F3F4F6',
    backgroundSize: '200% 100%',
    ...style,
  };

  if (animate) {
    return (
      <motion.div
        className={className}
        style={baseStyle}
        variants={shimmerAnimation}
        initial="initial"
        animate="animate"
      />
    );
  }

  return <div className={className} style={baseStyle} />;
};

// ============================================
// 文本骨架屏
// ============================================

export interface SkeletonTextProps {
  /** 行数 */
  lines?: number;
  /** 最后一行宽度 */
  lastLineWidth?: string;
  /** 行间距 */
  gap?: number;
  /** 行高 */
  lineHeight?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = '60%',
  gap = 8,
  lineHeight = 16,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          radius="sm"
        />
      ))}
    </div>
  );
};

// ============================================
// 头像骨架屏
// ============================================

export interface SkeletonAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({ size = 'md' }) => {
  const dimension = avatarSizeMap[size];
  return <Skeleton width={dimension} height={dimension} radius="full" />;
};

// ============================================
// 卡片骨架屏
// ============================================

export interface SkeletonCardProps {
  /** 是否显示头像 */
  avatar?: boolean;
  /** 是否显示图片 */
  image?: boolean;
  /** 文本行数 */
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  avatar = false,
  image = false,
  lines = 3,
}) => {
  return (
    <div
      style={{
        padding: '20px',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* 图片区域 */}
      {image && (
        <Skeleton
          height={160}
          radius="lg"
          style={{ marginBottom: '16px' }}
        />
      )}
      
      {/* 头部区域 */}
      {avatar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <SkeletonAvatar size="md" />
          <div style={{ flex: 1 }}>
            <Skeleton height={14} width="40%" radius="sm" style={{ marginBottom: '8px' }} />
            <Skeleton height={12} width="25%" radius="sm" />
          </div>
        </div>
      )}
      
      {/* 内容区域 */}
      <SkeletonText lines={lines} />
    </div>
  );
};

// ============================================
// 统计卡片骨架屏
// ============================================

export const SkeletonStatCard: React.FC = () => {
  return (
    <div
      style={{
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.35)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Skeleton height={14} width="50%" radius="sm" style={{ marginBottom: '12px' }} />
          <Skeleton height={36} width="70%" radius="md" style={{ marginBottom: '12px' }} />
          <Skeleton height={12} width="40%" radius="sm" />
        </div>
        <Skeleton width={48} height={48} radius="lg" />
      </div>
    </div>
  );
};

// ============================================
// 列表项骨架屏
// ============================================

export interface SkeletonListProps {
  /** 列表项数量 */
  count?: number;
  /** 是否显示头像 */
  avatar?: boolean;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  avatar = true,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          {avatar && <SkeletonAvatar size="md" />}
          <div style={{ flex: 1 }}>
            <Skeleton height={14} width="60%" radius="sm" style={{ marginBottom: '8px' }} />
            <Skeleton height={12} width="40%" radius="sm" />
          </div>
          <Skeleton width={60} height={24} radius="md" />
        </div>
      ))}
    </div>
  );
};

// ============================================
// 表格骨架屏
// ============================================

export interface SkeletonTableProps {
  /** 行数 */
  rows?: number;
  /** 列数 */
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.05)' }}>
      {/* 表头 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '16px',
          padding: '16px',
          background: '#F9FAFB',
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} height={14} width="70%" radius="sm" />
        ))}
      </div>
      
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '16px',
            padding: '16px',
            background: '#FFFFFF',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              height={14}
              width={colIndex === 0 ? '80%' : '60%'}
              radius="sm"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// ============================================
// 别名导出（兼容性）
// ============================================

export const TextSkeleton = SkeletonText;
export const CardSkeleton = SkeletonCard;
export const TableSkeleton = SkeletonTable;

export default Skeleton;
