/**
 * 智慧教研平台 - 动画令牌系统
 * 
 * 遵循 ui-ux-pro-max UX 指南:
 * - 微交互动画: 150-300ms
 * - 使用 ease-out 进入, ease-in 退出
 * - 支持 prefers-reduced-motion
 */

// ============================================
// 持续时间
// ============================================

export const duration = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
  
  // 语义化
  micro: '100ms',       // 微交互
  short: '150ms',       // 快速反馈
  medium: '250ms',      // 标准过渡
  long: '400ms',        // 复杂动画
  entrance: '300ms',    // 进入动画
  exit: '200ms',        // 退出动画
};

// ============================================
// 缓动函数
// ============================================

export const easing = {
  // 标准缓动
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // 特殊缓动
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
  
  // 进入/退出专用
  enter: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  
  // 弹性效果
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // 强调效果
  emphasis: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// ============================================
// 预设过渡
// ============================================

export const transitions = {
  // 通用过渡
  all: `all ${duration.normal} ${easing.easeOut}`,
  allFast: `all ${duration.fast} ${easing.easeOut}`,
  allSlow: `all ${duration.slow} ${easing.easeOut}`,
  
  // 颜色过渡
  colors: `color ${duration.fast} ${easing.easeOut}, background-color ${duration.fast} ${easing.easeOut}, border-color ${duration.fast} ${easing.easeOut}`,
  
  // 透明度过渡
  opacity: `opacity ${duration.normal} ${easing.easeOut}`,
  
  // 变换过渡
  transform: `transform ${duration.normal} ${easing.easeOut}`,
  transformFast: `transform ${duration.fast} ${easing.easeOut}`,
  
  // 阴影过渡
  shadow: `box-shadow ${duration.normal} ${easing.easeOut}`,
  
  // 尺寸过渡
  size: `width ${duration.normal} ${easing.easeOut}, height ${duration.normal} ${easing.easeOut}`,
  
  // 按钮过渡
  button: `all ${duration.fast} ${easing.easeOut}, transform ${duration.faster} ${easing.bounce}`,
  
  // 卡片过渡
  card: `transform ${duration.normal} ${easing.easeOut}, box-shadow ${duration.normal} ${easing.easeOut}`,
  
  // 输入框过渡
  input: `border-color ${duration.fast} ${easing.easeOut}, box-shadow ${duration.fast} ${easing.easeOut}`,
  
  // 菜单过渡
  menu: `opacity ${duration.fast} ${easing.easeOut}, transform ${duration.fast} ${easing.easeOut}`,
  
  // 模态框过渡
  modal: `opacity ${duration.normal} ${easing.easeOut}, transform ${duration.normal} ${easing.spring}`,
};

// ============================================
// 关键帧动画
// ============================================

export const keyframes = {
  // 淡入
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  
  // 淡出
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  
  // 淡入上滑
  fadeInUp: {
    from: { opacity: 0, transform: 'translateY(16px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  
  // 淡入下滑
  fadeInDown: {
    from: { opacity: 0, transform: 'translateY(-16px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  
  // 淡入左滑
  fadeInLeft: {
    from: { opacity: 0, transform: 'translateX(-16px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  
  // 淡入右滑
  fadeInRight: {
    from: { opacity: 0, transform: 'translateX(16px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  
  // 缩放进入
  scaleIn: {
    from: { opacity: 0, transform: 'scale(0.95)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
  
  // 缩放退出
  scaleOut: {
    from: { opacity: 1, transform: 'scale(1)' },
    to: { opacity: 0, transform: 'scale(0.95)' },
  },
  
  // 弹跳
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-8px)' },
  },
  
  // 脉冲
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  
  // 呼吸
  breathe: {
    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
    '50%': { transform: 'scale(1.02)', opacity: 0.9 },
  },
  
  // 旋转
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  
  // 摇晃
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },
  
  // 骨架屏闪烁
  shimmer: {
    from: { backgroundPosition: '-200% 0' },
    to: { backgroundPosition: '200% 0' },
  },
  
  // 波纹
  ripple: {
    from: { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
    to: { transform: 'translate(-50%, -50%) scale(4)', opacity: 0 },
  },
  
  // 滑入
  slideInUp: {
    from: { transform: 'translateY(100%)' },
    to: { transform: 'translateY(0)' },
  },
  
  slideInDown: {
    from: { transform: 'translateY(-100%)' },
    to: { transform: 'translateY(0)' },
  },
  
  slideInLeft: {
    from: { transform: 'translateX(-100%)' },
    to: { transform: 'translateX(0)' },
  },
  
  slideInRight: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
  },
  
  // 渐变流动
  gradientFlow: {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  
  // 打字机光标
  blink: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0 },
  },
};

// ============================================
// 预设动画
// ============================================

export const animations = {
  fadeIn: `fadeIn ${duration.normal} ${easing.easeOut} forwards`,
  fadeOut: `fadeOut ${duration.fast} ${easing.easeIn} forwards`,
  fadeInUp: `fadeInUp ${duration.entrance} ${easing.easeOut} forwards`,
  fadeInDown: `fadeInDown ${duration.entrance} ${easing.easeOut} forwards`,
  fadeInLeft: `fadeInLeft ${duration.entrance} ${easing.easeOut} forwards`,
  fadeInRight: `fadeInRight ${duration.entrance} ${easing.easeOut} forwards`,
  scaleIn: `scaleIn ${duration.normal} ${easing.spring} forwards`,
  scaleOut: `scaleOut ${duration.fast} ${easing.easeIn} forwards`,
  bounce: `bounce 1s ${easing.easeInOut} infinite`,
  pulse: `pulse 2s ${easing.easeInOut} infinite`,
  breathe: `breathe 3s ${easing.easeInOut} infinite`,
  spin: `spin 1s ${easing.linear} infinite`,
  shake: `shake 0.5s ${easing.easeInOut}`,
  shimmer: `shimmer 1.5s ${easing.linear} infinite`,
  ripple: `ripple 0.6s ${easing.easeOut}`,
  slideInUp: `slideInUp ${duration.entrance} ${easing.easeOut} forwards`,
  slideInDown: `slideInDown ${duration.entrance} ${easing.easeOut} forwards`,
  slideInLeft: `slideInLeft ${duration.entrance} ${easing.easeOut} forwards`,
  slideInRight: `slideInRight ${duration.entrance} ${easing.easeOut} forwards`,
};

// ============================================
// 交错动画延迟
// ============================================

export const stagger = {
  fast: 50,     // ms
  normal: 100,  // ms
  slow: 150,    // ms
  
  // 生成延迟数组
  generate: (count: number, delay: number = 100) => 
    Array.from({ length: count }, (_, i) => i * delay),
};

// ============================================
// 减少动画偏好
// ============================================

export const reducedMotion = {
  // 媒体查询
  query: '(prefers-reduced-motion: reduce)',
  
  // 安全的过渡 (用于减少动画模式)
  safeTransition: `opacity ${duration.fast} ${easing.linear}`,
  
  // 禁用动画的样式
  disabled: {
    animation: 'none',
    transition: 'none',
  },
};

// ============================================
// 导出完整动画系统
// ============================================

export const animationTokens = {
  duration,
  easing,
  transitions,
  keyframes,
  animations,
  stagger,
  reducedMotion,
};

export default animationTokens;
