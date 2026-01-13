/**
 * 智慧教研平台 - 效果令牌系统
 * 
 * 包含阴影、圆角、模糊等视觉效果
 * 实现 Glassmorphism 和 Claymorphism 风格
 */

// ============================================
// 阴影系统
// ============================================

export const shadows = {
  // 基础阴影
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.03)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  
  // 内阴影
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
  innerLg: 'inset 0 4px 8px rgba(0, 0, 0, 0.06)',
  
  // 发光阴影
  glow: {
    primary: '0 0 20px rgba(79, 70, 229, 0.15)',
    primaryStrong: '0 0 40px rgba(79, 70, 229, 0.25)',
    accent: '0 0 20px rgba(249, 115, 22, 0.15)',
    success: '0 0 20px rgba(16, 185, 129, 0.15)',
    error: '0 0 20px rgba(239, 68, 68, 0.15)',
  },
  
  // 组件专用阴影
  card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(0, 0, 0, 0.03)',
  cardHover: '0 12px 28px rgba(0, 0, 0, 0.08), 0 8px 12px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04)',
  cardActive: '0 4px 8px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)',
  
  button: '0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  buttonHover: '0 4px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  buttonActive: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  
  dropdown: '0 4px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.04)',
  modal: '0 24px 48px rgba(0, 0, 0, 0.12), 0 12px 24px rgba(0, 0, 0, 0.08)',
  tooltip: '0 4px 12px rgba(0, 0, 0, 0.12)',
  
  // Claymorphism 阴影 (柔和的双层阴影)
  clay: {
    sm: '6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.8)',
    md: '10px 10px 20px rgba(0, 0, 0, 0.08), -10px -10px 20px rgba(255, 255, 255, 0.8)',
    lg: '16px 16px 32px rgba(0, 0, 0, 0.08), -16px -16px 32px rgba(255, 255, 255, 0.8)',
    pressed: 'inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -4px -4px 8px rgba(255, 255, 255, 0.8)',
  },
};

// ============================================
// 圆角系统
// ============================================

export const radii = {
  none: '0',
  xs: '0.25rem',      // 4px
  sm: '0.375rem',     // 6px
  md: '0.5rem',       // 8px
  lg: '0.75rem',      // 12px
  xl: '1rem',         // 16px
  '2xl': '1.25rem',   // 20px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
  
  // 语义化
  button: '0.5rem',
  card: '1rem',
  modal: '1.25rem',
  input: '0.5rem',
  tag: '0.375rem',
  avatar: '9999px',
};

// ============================================
// 模糊效果
// ============================================

export const blur = {
  none: '0',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '40px',
  
  // Glassmorphism 模糊
  glass: {
    light: '8px',
    medium: '12px',
    strong: '20px',
  },
};

// ============================================
// 玻璃态效果
// ============================================

export const glass = {
  // 浅色玻璃
  light: {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  
  // 中等玻璃
  medium: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
  },
  
  // 强玻璃
  strong: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  
  // 深色玻璃
  dark: {
    background: 'rgba(15, 23, 42, 0.72)',
    backdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  
  // 品牌色玻璃
  primary: {
    background: 'rgba(79, 70, 229, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(79, 70, 229, 0.2)',
  },
};

// ============================================
// 边框样式
// ============================================

export const borders = {
  // 宽度
  width: {
    none: '0',
    thin: '1px',
    medium: '2px',
    thick: '3px',
  },
  
  // 样式
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
  },
  
  // 预设边框
  subtle: '1px solid rgba(0, 0, 0, 0.04)',
  default: '1px solid rgba(0, 0, 0, 0.08)',
  strong: '1px solid rgba(0, 0, 0, 0.12)',
  focus: '2px solid rgba(79, 70, 229, 0.5)',
  error: '1px solid rgba(239, 68, 68, 0.5)',
  success: '1px solid rgba(16, 185, 129, 0.5)',
  
  // 分割线
  divider: '1px solid #E5E7EB',
  dividerStrong: '1px solid #D1D5DB',
};

// ============================================
// 透明度
// ============================================

export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
  
  // 语义化
  disabled: '0.5',
  hover: '0.8',
  muted: '0.6',
  overlay: '0.5',
};

// ============================================
// 滤镜效果
// ============================================

export const filters = {
  // 灰度
  grayscale: {
    none: 'grayscale(0)',
    partial: 'grayscale(50%)',
    full: 'grayscale(100%)',
  },
  
  // 亮度
  brightness: {
    dim: 'brightness(0.9)',
    normal: 'brightness(1)',
    bright: 'brightness(1.1)',
  },
  
  // 对比度
  contrast: {
    low: 'contrast(0.9)',
    normal: 'contrast(1)',
    high: 'contrast(1.1)',
  },
  
  // 饱和度
  saturate: {
    low: 'saturate(0.8)',
    normal: 'saturate(1)',
    high: 'saturate(1.2)',
    vibrant: 'saturate(1.5)',
  },
  
  // 组合滤镜
  disabled: 'grayscale(100%) opacity(0.5)',
  hover: 'brightness(1.05)',
  active: 'brightness(0.95)',
};

// ============================================
// 导出完整效果系统
// ============================================

export const effects = {
  shadows,
  radii,
  blur,
  glass,
  borders,
  opacity,
  filters,
};

export default effects;
