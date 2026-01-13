/**
 * Badge - 徽章组件
 * 
 * 用于状态标签、标记、计数等场景
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// 类型定义
// ============================================

export interface BadgeProps {
  /** 徽章内容 */
  children: React.ReactNode;
  /** 徽章变体 */
  variant?: 'solid' | 'soft' | 'outline' | 'dot';
  /** 徽章颜色 */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  /** 徽章尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 是否圆形 */
  rounded?: boolean;
  /** 左侧图标 */
  icon?: React.ReactNode;
  /** 是否可移除 */
  removable?: boolean;
  /** 移除回调 */
  onRemove?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ============================================
// 样式配置
// ============================================

const colorStyles = {
  primary: {
    solid: { bg: '#4F46E5', text: '#FFFFFF', border: '#4F46E5' },
    soft: { bg: 'rgba(79, 70, 229, 0.12)', text: '#4F46E5', border: 'transparent' },
    outline: { bg: 'transparent', text: '#4F46E5', border: '#4F46E5' },
    dot: '#4F46E5',
  },
  secondary: {
    solid: { bg: '#F97316', text: '#FFFFFF', border: '#F97316' },
    soft: { bg: 'rgba(249, 115, 22, 0.12)', text: '#EA580C', border: 'transparent' },
    outline: { bg: 'transparent', text: '#F97316', border: '#F97316' },
    dot: '#F97316',
  },
  success: {
    solid: { bg: '#10B981', text: '#FFFFFF', border: '#10B981' },
    soft: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'transparent' },
    outline: { bg: 'transparent', text: '#10B981', border: '#10B981' },
    dot: '#10B981',
  },
  warning: {
    solid: { bg: '#F59E0B', text: '#FFFFFF', border: '#F59E0B' },
    soft: { bg: 'rgba(245, 158, 11, 0.12)', text: '#D97706', border: 'transparent' },
    outline: { bg: 'transparent', text: '#F59E0B', border: '#F59E0B' },
    dot: '#F59E0B',
  },
  error: {
    solid: { bg: '#EF4444', text: '#FFFFFF', border: '#EF4444' },
    soft: { bg: 'rgba(239, 68, 68, 0.12)', text: '#DC2626', border: 'transparent' },
    outline: { bg: 'transparent', text: '#EF4444', border: '#EF4444' },
    dot: '#EF4444',
  },
  info: {
    solid: { bg: '#3B82F6', text: '#FFFFFF', border: '#3B82F6' },
    soft: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563EB', border: 'transparent' },
    outline: { bg: 'transparent', text: '#3B82F6', border: '#3B82F6' },
    dot: '#3B82F6',
  },
  neutral: {
    solid: { bg: '#6B7280', text: '#FFFFFF', border: '#6B7280' },
    soft: { bg: 'rgba(107, 114, 128, 0.12)', text: '#4B5563', border: 'transparent' },
    outline: { bg: 'transparent', text: '#6B7280', border: '#6B7280' },
    dot: '#6B7280',
  },
};

const sizeStyles = {
  xs: { height: '18px', padding: '0 6px', fontSize: '10px', iconSize: '10px', dotSize: '6px' },
  sm: { height: '22px', padding: '0 8px', fontSize: '11px', iconSize: '12px', dotSize: '8px' },
  md: { height: '26px', padding: '0 10px', fontSize: '12px', iconSize: '14px', dotSize: '8px' },
  lg: { height: '32px', padding: '0 14px', fontSize: '13px', iconSize: '16px', dotSize: '10px' },
};

// ============================================
// 组件实现
// ============================================

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'soft',
  color = 'primary',
  size = 'sm',
  rounded = false,
  icon,
  removable = false,
  onRemove,
  className = '',
}) => {
  const colorStyle = colorStyles[color];
  const sizeStyle = sizeStyles[size];

  if (variant === 'dot') {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: sizeStyle.fontSize,
          color: '#374151',
          fontWeight: 500,
        }}
      >
        <motion.span
          style={{
            width: sizeStyle.dotSize,
            height: sizeStyle.dotSize,
            borderRadius: '50%',
            background: colorStyle.dot as string,
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        {children}
      </span>
    );
  }

  const style = colorStyle[variant] as { bg: string; text: string; border: string };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        height: sizeStyle.height,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 500,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        lineHeight: 1,
        color: style.text,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: rounded ? '9999px' : '6px',
        whiteSpace: 'nowrap',
      }}
    >
      {icon && (
        <span style={{ display: 'flex', fontSize: sizeStyle.iconSize }}>
          {icon}
        </span>
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
            marginLeft: '2px',
            marginRight: '-4px',
            padding: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
            borderRadius: '50%',
            transition: 'opacity 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.background = 'none';
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

// ============================================
// 状态徽章变体
// ============================================

export interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'success' | 'error';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  online: { color: 'success' as const, label: '在线' },
  offline: { color: 'neutral' as const, label: '离线' },
  busy: { color: 'error' as const, label: '忙碌' },
  away: { color: 'warning' as const, label: '离开' },
  pending: { color: 'warning' as const, label: '待处理' },
  success: { color: 'success' as const, label: '成功' },
  error: { color: 'error' as const, label: '失败' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
}) => {
  const config = statusConfig[status];
  return (
    <Badge variant="dot" color={config.color} size={size}>
      {label || config.label}
    </Badge>
  );
};

// ============================================
// 计数徽章变体
// ============================================

export interface CountBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  color?: BadgeProps['color'];
  size?: 'xs' | 'sm' | 'md';
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  max = 99,
  showZero = false,
  color = 'error',
  size = 'xs',
}) => {
  if (count === 0 && !showZero) return null;
  
  const displayCount = count > max ? `${max}+` : count.toString();
  
  return (
    <Badge variant="solid" color={color} size={size} rounded>
      {displayCount}
    </Badge>
  );
};

export default Badge;
