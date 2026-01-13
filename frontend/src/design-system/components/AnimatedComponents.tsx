/**
 * 动画组件库 - 微交互与过渡动效
 * 
 * 提供丰富的动画组件，提升用户体验
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// ============================================
// 动画配置
// ============================================

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    x: -10,
    transition: { duration: 0.2 }
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    x: 10,
    transition: { duration: 0.2 }
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0, 0, 0.2, 1] }
  },
};

// ============================================
// 页面过渡组件
// ============================================

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    exit="exit"
    variants={fadeInUp}
    className={className}
  >
    {children}
  </motion.div>
);

// ============================================
// 交错动画容器
// ============================================

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({ 
  children, 
  className,
  delay = 0.1,
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
          delayChildren: delay,
        },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <motion.div variants={staggerItem} className={className}>
    {children}
  </motion.div>
);

// ============================================
// 悬停效果组件
// ============================================

interface HoverLiftProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  y?: number;
}

export const HoverLift: React.FC<HoverLiftProps> = ({ 
  children, 
  className,
  scale = 1.02,
  y = -4,
}) => (
  <motion.div
    whileHover={{ scale, y }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.2 }}
    className={className}
  >
    {children}
  </motion.div>
);

// ============================================
// 数字计数动画
// ============================================

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({ 
  end, 
  duration = 1, 
  prefix = '', 
  suffix = '',
  className,
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {prefix}{count}{suffix}
    </motion.span>
  );
};

// ============================================
// 脉冲点动画
// ============================================

interface PulseDotProps {
  color?: string;
  size?: number;
}

export const PulseDot: React.FC<PulseDotProps> = ({ 
  color = '#10B981', 
  size = 8 
}) => (
  <span className="relative inline-flex">
    <span
      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
      style={{ backgroundColor: color }}
    />
    <span
      className="relative inline-flex rounded-full"
      style={{ 
        backgroundColor: color,
        width: size,
        height: size,
      }}
    />
  </span>
);

// ============================================
// 加载点动画
// ============================================

interface LoadingDotsProps {
  color?: string;
  size?: number;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ 
  color = '#4F46E5', 
  size = 8 
}) => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
        }}
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.15,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

// ============================================
// 打字机效果
// ============================================

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export const Typewriter: React.FC<TypewriterProps> = ({ 
  text, 
  speed = 50, 
  className,
  onComplete,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-0.5 h-5 bg-current ml-0.5 align-middle"
      />
    </span>
  );
};

// ============================================
// 进度环动画
// ============================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#4F46E5',
  bgColor = 'rgba(0,0,0,0.06)',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================
// 波纹效果按钮
// ============================================

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const RippleButton: React.FC<RippleButtonProps> = ({ children, className, ...props }) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);

    props.onClick?.(e);
  };

  return (
    <button
      {...props}
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
            }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
};

// ============================================
// 成功打勾动画
// ============================================

interface CheckmarkProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const Checkmark: React.FC<CheckmarkProps> = ({
  size = 48,
  color = '#10B981',
  strokeWidth = 3,
}) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    />
    <motion.path
      d="M8 12l2.5 2.5L16 9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
    />
  </motion.svg>
);

// ============================================
// 浮动装饰元素
// ============================================

interface FloatingElementProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  duration = 6,
  delay = 0,
  className,
}) => (
  <motion.div
    animate={{
      y: [0, -15, 0],
      rotate: [0, 2, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// ============================================
// 导出所有动画变体
// ============================================

export const animations = {
  fadeInUp,
  fadeInScale,
  slideInLeft,
  slideInRight,
  staggerContainer,
  staggerItem,
};

export default {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  CountUp,
  PulseDot,
  LoadingDots,
  Typewriter,
  ProgressRing,
  RippleButton,
  Checkmark,
  FloatingElement,
  animations,
};
