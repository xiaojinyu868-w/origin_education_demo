/**
 * GlassCard - 玻璃态卡片组件
 * 
 * 智慧教研平台核心视觉组件
 * 实现 Glassmorphism 设计风格，营造科技感与层次感
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// ============================================
// 类型定义
// ============================================

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** 卡片内容 */
  children: React.ReactNode;
  /** 玻璃效果强度 */
  intensity?: 'light' | 'medium' | 'strong';
  /** 是否启用悬停效果 */
  hoverable?: boolean;
  /** 是否可点击 */
  clickable?: boolean;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否显示发光效果 */
  glow?: boolean;
  /** 发光颜色 */
  glowColor?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** 圆角大小 */
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** 自定义类名 */
  className?: string;
  /** 加载状态 */
  loading?: boolean;
}

// ============================================
// 样式配置
// ============================================

const intensityStyles = {
  light: {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(8px) saturate(150%)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  medium: {
    background: 'rgba(255, 255, 255, 0.78)',
    backdropFilter: 'blur(12px) saturate(180%)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  strong: {
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(20px) saturate(200%)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
};

const paddingStyles = {
  none: '0',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

const radiusStyles = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
};

const glowColors = {
  primary: 'rgba(79, 70, 229, 0.2)',
  accent: 'rgba(249, 115, 22, 0.2)',
  success: 'rgba(16, 185, 129, 0.2)',
  warning: 'rgba(245, 158, 11, 0.2)',
  error: 'rgba(239, 68, 68, 0.2)',
};

// ============================================
// 动画配置
// ============================================

const hoverAnimation = {
  rest: {
    y: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
  },
  hover: {
    y: -4,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
    transition: {
      duration: 0.25,
      ease: [0, 0, 0.2, 1],
    },
  },
  tap: {
    y: -2,
    scale: 0.995,
    transition: {
      duration: 0.1,
    },
  },
};

const shimmerAnimation = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

// ============================================
// 组件实现
// ============================================

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  intensity = 'medium',
  hoverable = false,
  clickable = false,
  bordered = true,
  glow = false,
  glowColor = 'primary',
  padding = 'md',
  radius = 'lg',
  className = '',
  loading = false,
  style,
  ...motionProps
}) => {
  const intensityStyle = intensityStyles[intensity];
  
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    background: intensityStyle.background,
    backdropFilter: intensityStyle.backdropFilter,
    WebkitBackdropFilter: intensityStyle.backdropFilter,
    borderRadius: radiusStyles[radius],
    padding: paddingStyles[padding],
    border: bordered ? `1px solid ${intensityStyle.borderColor}` : 'none',
    boxShadow: glow 
      ? `0 4px 12px rgba(0, 0, 0, 0.05), 0 0 24px ${glowColors[glowColor]}`
      : '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
    overflow: 'hidden',
    cursor: clickable ? 'pointer' : 'default',
    ...style,
  };

  // 高光效果
  const highlightStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
    borderRadius: `${radiusStyles[radius]} ${radiusStyles[radius]} 0 0`,
    pointerEvents: 'none',
  };

  // 骨架屏加载效果
  const shimmerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
    pointerEvents: 'none',
  };

  return (
    <motion.div
      className={`glass-card ${className}`}
      style={baseStyle}
      initial="rest"
      whileHover={hoverable ? 'hover' : undefined}
      whileTap={clickable ? 'tap' : undefined}
      variants={hoverable || clickable ? hoverAnimation : undefined}
      {...motionProps}
    >
      {/* 顶部高光 */}
      <div style={highlightStyle} />
      
      {/* 内容 */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
      
      {/* 加载状态 */}
      {loading && (
        <motion.div
          style={shimmerStyle}
          variants={shimmerAnimation}
          initial="initial"
          animate="animate"
        />
      )}
    </motion.div>
  );
};

// ============================================
// 变体组件
// ============================================

/** 可点击的玻璃卡片 */
export const GlassCardClickable: React.FC<Omit<GlassCardProps, 'clickable' | 'hoverable'>> = (props) => (
  <GlassCard {...props} clickable hoverable />
);

/** 统计数据卡片 */
export const GlassStatCard: React.FC<{
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
}> = ({ title, value, icon, trend, color = 'primary' }) => {
  const colorMap = {
    primary: '#4F46E5',
    accent: '#F97316',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  };
  
  return (
    <GlassCard hoverable padding="lg" glow glowColor={color}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ 
            fontSize: '13px', 
            color: '#64748B', 
            marginBottom: '8px',
            fontWeight: 500,
          }}>
            {title}
          </p>
          <p style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: '#0F172A',
            lineHeight: 1,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>
            {value}
          </p>
          {trend && (
            <p style={{ 
              fontSize: '12px', 
              color: trend.value >= 0 ? '#10B981' : '#EF4444',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span style={{ color: '#94A3B8' }}>{trend.label}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${colorMap[color]}15 0%, ${colorMap[color]}25 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colorMap[color],
            fontSize: '24px',
          }}>
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default GlassCard;
