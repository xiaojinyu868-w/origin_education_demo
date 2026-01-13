/**
 * Button - 按钮组件
 * 
 * 智慧教研平台统一按钮样式
 * 支持多种变体、尺寸和状态
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// ============================================
// 类型定义
// ============================================

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** 按钮内容 */
  children: React.ReactNode;
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  /** 按钮尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 是否为圆形按钮 */
  rounded?: boolean;
  /** 是否占满宽度 */
  fullWidth?: boolean;
  /** 左侧图标 */
  leftIcon?: React.ReactNode;
  /** 右侧图标 */
  rightIcon?: React.ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================
// 样式配置
// ============================================

const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    color: '#FFFFFF',
    border: 'none',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    hoverBackground: 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)',
    hoverBoxShadow: '0 4px 16px rgba(79, 70, 229, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  },
  secondary: {
    background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
    color: '#FFFFFF',
    border: 'none',
    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    hoverBackground: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
    hoverBoxShadow: '0 4px 16px rgba(249, 115, 22, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  },
  outline: {
    background: 'transparent',
    color: '#4F46E5',
    border: '1.5px solid #4F46E5',
    boxShadow: 'none',
    hoverBackground: 'rgba(79, 70, 229, 0.08)',
    hoverBoxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)',
  },
  ghost: {
    background: 'transparent',
    color: '#475569',
    border: 'none',
    boxShadow: 'none',
    hoverBackground: 'rgba(0, 0, 0, 0.05)',
    hoverBoxShadow: 'none',
  },
  danger: {
    background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
    color: '#FFFFFF',
    border: 'none',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    hoverBackground: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
    hoverBoxShadow: '0 4px 16px rgba(239, 68, 68, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  },
  success: {
    background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    color: '#FFFFFF',
    border: 'none',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    hoverBackground: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    hoverBoxShadow: '0 4px 16px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  },
};

const sizeStyles = {
  xs: {
    height: '24px',
    padding: '0 10px',
    fontSize: '11px',
    borderRadius: '6px',
    gap: '4px',
    iconSize: '12px',
  },
  sm: {
    height: '32px',
    padding: '0 14px',
    fontSize: '13px',
    borderRadius: '8px',
    gap: '6px',
    iconSize: '14px',
  },
  md: {
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    borderRadius: '10px',
    gap: '8px',
    iconSize: '16px',
  },
  lg: {
    height: '48px',
    padding: '0 28px',
    fontSize: '15px',
    borderRadius: '12px',
    gap: '10px',
    iconSize: '18px',
  },
  xl: {
    height: '56px',
    padding: '0 36px',
    fontSize: '16px',
    borderRadius: '14px',
    gap: '12px',
    iconSize: '20px',
  },
};

// ============================================
// 动画配置
// ============================================

const buttonAnimation = {
  tap: {
    scale: 0.97,
    transition: { duration: 0.1 },
  },
};

const spinnerAnimation = {
  animate: {
    rotate: 360,
    transition: {
      repeat: Infinity,
      duration: 0.8,
      ease: 'linear',
    },
  },
};

// ============================================
// 加载动画组件
// ============================================

const LoadingSpinner: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    animate={spinnerAnimation.animate}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="32"
      strokeDashoffset="12"
      opacity="0.9"
    />
  </motion.svg>
);

// ============================================
// 组件实现
// ============================================

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  className = '',
  style,
  ...motionProps
}) => {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sizeStyle.gap,
    height: sizeStyle.height,
    padding: sizeStyle.padding,
    fontSize: sizeStyle.fontSize,
    fontWeight: 500,
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    lineHeight: 1,
    letterSpacing: '0.01em',
    borderRadius: rounded ? '9999px' : sizeStyle.borderRadius,
    background: variantStyle.background,
    color: variantStyle.color,
    border: variantStyle.border,
    boxShadow: variantStyle.boxShadow,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    transition: 'all 0.2s cubic-bezier(0, 0, 0.2, 1)',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>, isHover: boolean) => {
    if (isDisabled) return;
    const target = e.currentTarget;
    target.style.background = isHover ? variantStyle.hoverBackground : variantStyle.background;
    target.style.boxShadow = isHover ? variantStyle.hoverBoxShadow : variantStyle.boxShadow;
  };

  return (
    <motion.button
      className={`edu-button ${className}`}
      style={baseStyle}
      disabled={isDisabled}
      whileTap={!isDisabled ? buttonAnimation.tap : undefined}
      onMouseEnter={(e) => handleHover(e, true)}
      onMouseLeave={(e) => handleHover(e, false)}
      {...motionProps}
    >
      {/* 左侧图标或加载动画 */}
      {loading ? (
        <LoadingSpinner size={sizeStyle.iconSize} color={variantStyle.color} />
      ) : leftIcon ? (
        <span style={{ display: 'flex', fontSize: sizeStyle.iconSize }}>
          {leftIcon}
        </span>
      ) : null}
      
      {/* 按钮文字 */}
      <span style={{ opacity: loading ? 0.7 : 1 }}>
        {children}
      </span>
      
      {/* 右侧图标 */}
      {rightIcon && !loading && (
        <span style={{ display: 'flex', fontSize: sizeStyle.iconSize }}>
          {rightIcon}
        </span>
      )}
    </motion.button>
  );
};

// ============================================
// 图标按钮变体
// ============================================

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  /** 图标 */
  icon: React.ReactNode;
  /** 无障碍标签 */
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'md',
  rounded = true,
  ...props
}) => {
  const sizeMap = {
    xs: { size: '24px', iconSize: '12px' },
    sm: { size: '32px', iconSize: '14px' },
    md: { size: '40px', iconSize: '18px' },
    lg: { size: '48px', iconSize: '22px' },
    xl: { size: '56px', iconSize: '26px' },
  };

  return (
    <Button
      {...props}
      size={size}
      rounded={rounded}
      style={{
        width: sizeMap[size].size,
        height: sizeMap[size].size,
        padding: 0,
        minWidth: sizeMap[size].size,
        ...props.style,
      }}
    >
      <span style={{ display: 'flex', fontSize: sizeMap[size].iconSize }}>
        {icon}
      </span>
    </Button>
  );
};

export default Button;
