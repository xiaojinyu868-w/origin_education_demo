/**
 * Input - 输入框组件
 * 
 * 智慧教研平台统一输入框样式
 * 支持多种变体和状态
 */

import React, { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';

// ============================================
// 类型定义
// ============================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 输入框尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 左侧图标 */
  leftIcon?: React.ReactNode;
  /** 右侧图标 */
  rightIcon?: React.ReactNode;
  /** 前缀文本 */
  prefix?: React.ReactNode;
  /** 后缀文本 */
  suffix?: React.ReactNode;
  /** 错误状态 */
  error?: boolean;
  /** 错误信息 */
  errorMessage?: string;
  /** 成功状态 */
  success?: boolean;
  /** 标签 */
  label?: string;
  /** 帮助文本 */
  helperText?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否占满宽度 */
  fullWidth?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 容器类名 */
  containerClassName?: string;
}

// ============================================
// 样式配置
// ============================================

const sizeStyles = {
  sm: {
    height: '32px',
    padding: '0 12px',
    fontSize: '13px',
    borderRadius: '8px',
    iconSize: '14px',
  },
  md: {
    height: '40px',
    padding: '0 14px',
    fontSize: '14px',
    borderRadius: '10px',
    iconSize: '16px',
  },
  lg: {
    height: '48px',
    padding: '0 16px',
    fontSize: '15px',
    borderRadius: '12px',
    iconSize: '18px',
  },
};

// ============================================
// 组件实现
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'md',
  leftIcon,
  rightIcon,
  prefix,
  suffix,
  error = false,
  errorMessage,
  success = false,
  label,
  helperText,
  required = false,
  fullWidth = false,
  className = '',
  containerClassName = '',
  disabled,
  style,
  onFocus,
  onBlur,
  ...inputProps
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const sizeStyle = sizeStyles[size];

  // 边框颜色
  const getBorderColor = () => {
    if (error) return '#EF4444';
    if (success) return '#10B981';
    if (isFocused) return '#4F46E5';
    return 'rgba(0, 0, 0, 0.08)';
  };

  // 阴影
  const getBoxShadow = () => {
    if (error && isFocused) return '0 0 0 3px rgba(239, 68, 68, 0.15)';
    if (success && isFocused) return '0 0 0 3px rgba(16, 185, 129, 0.15)';
    if (isFocused) return '0 0 0 3px rgba(79, 70, 229, 0.12)';
    return 'none';
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: fullWidth ? '100%' : 'auto',
  };

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    height: sizeStyle.height,
    background: disabled ? '#F3F4F6' : '#FFFFFF',
    borderRadius: sizeStyle.borderRadius,
    border: `1.5px solid ${getBorderColor()}`,
    boxShadow: getBoxShadow(),
    transition: 'all 0.2s cubic-bezier(0, 0, 0.2, 1)',
    overflow: 'hidden',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    height: '100%',
    padding: sizeStyle.padding,
    paddingLeft: leftIcon ? '40px' : prefix ? '12px' : sizeStyle.padding.split(' ')[1],
    paddingRight: rightIcon ? '40px' : suffix ? '12px' : sizeStyle.padding.split(' ')[1],
    fontSize: sizeStyle.fontSize,
    fontFamily: '"Noto Sans SC", sans-serif',
    color: disabled ? '#9CA3AF' : '#0F172A',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    ...style,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '100%',
    color: isFocused ? '#4F46E5' : '#94A3B8',
    fontSize: sizeStyle.iconSize,
    transition: 'color 0.2s ease',
    pointerEvents: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: error ? '#EF4444' : success ? '#10B981' : '#6B7280',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className={containerClassName} style={containerStyle}>
      {/* 标签 */}
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      {/* 输入框包装器 */}
      <motion.div
        style={wrapperStyle}
        animate={{
          borderColor: getBorderColor(),
          boxShadow: getBoxShadow(),
        }}
        transition={{ duration: 0.2 }}
      >
        {/* 前缀 */}
        {prefix && (
          <span style={{ 
            paddingLeft: '12px', 
            color: '#6B7280', 
            fontSize: sizeStyle.fontSize,
            whiteSpace: 'nowrap',
          }}>
            {prefix}
          </span>
        )}
        
        {/* 左侧图标 */}
        {leftIcon && (
          <span style={{ ...iconStyle, left: 0 }}>
            {leftIcon}
          </span>
        )}
        
        {/* 输入框 */}
        <input
          ref={ref}
          className={`edu-input ${className}`}
          style={inputStyle}
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...inputProps}
        />
        
        {/* 右侧图标 */}
        {rightIcon && (
          <span style={{ ...iconStyle, right: 0 }}>
            {rightIcon}
          </span>
        )}
        
        {/* 后缀 */}
        {suffix && (
          <span style={{ 
            paddingRight: '12px', 
            color: '#6B7280', 
            fontSize: sizeStyle.fontSize,
            whiteSpace: 'nowrap',
          }}>
            {suffix}
          </span>
        )}
      </motion.div>
      
      {/* 帮助文本或错误信息 */}
      {(helperText || errorMessage) && (
        <span style={helperStyle}>
          {error && errorMessage ? errorMessage : helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// ============================================
// 搜索框变体
// ============================================

export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onKeyDown,
  ...props
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch((e.target as HTMLInputElement).value);
    }
    onKeyDown?.(e);
  };

  const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  return (
    <Input
      {...props}
      leftIcon={<SearchIcon />}
      onKeyDown={handleKeyDown}
    />
  );
};

// ============================================
// 密码输入框变体
// ============================================

export const PasswordInput: React.FC<Omit<InputProps, 'type' | 'rightIcon'>> = (props) => {
  const [showPassword, setShowPassword] = useState(false);

  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {showPassword ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  return (
    <Input
      {...props}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            color: 'inherit',
          }}
        >
          <EyeIcon />
        </button>
      }
    />
  );
};

export default Input;
