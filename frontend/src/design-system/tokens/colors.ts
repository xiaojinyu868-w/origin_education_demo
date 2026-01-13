/**
 * 智慧教研平台 - 色彩令牌系统
 * 
 * 设计理念: "智慧与温度"
 * - 主色采用教育类应用推荐的靛蓝紫 (#4F46E5)
 * - 辅以温暖的橙色作为行动色 (#F97316)
 * - 柔和的背景色营造专注学习氛围
 * 
 * 参考: ui-ux-pro-max Educational App 配色方案
 */

// ============================================
// 品牌色
// ============================================

export const brand = {
  // 主色 - 智慧靛蓝紫
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',  // 主色
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },
  
  // 强调色 - 活力橙
  accent: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',  // CTA 色
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  
  // 辅助色 - 智慧青
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },
};

// ============================================
// 语义色
// ============================================

export const semantic = {
  // 成功 - 翠绿
  success: {
    light: '#D1FAE5',
    main: '#10B981',
    dark: '#059669',
    contrast: '#FFFFFF',
    soft: 'rgba(16, 185, 129, 0.12)',
  },
  
  // 警告 - 琥珀
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#D97706',
    contrast: '#FFFFFF',
    soft: 'rgba(245, 158, 11, 0.12)',
  },
  
  // 错误 - 珊瑚红
  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#DC2626',
    contrast: '#FFFFFF',
    soft: 'rgba(239, 68, 68, 0.12)',
  },
  
  // 信息 - 天蓝
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#2563EB',
    contrast: '#FFFFFF',
    soft: 'rgba(59, 130, 246, 0.12)',
  },
};

// ============================================
// 中性色
// ============================================

export const neutral = {
  white: '#FFFFFF',
  black: '#000000',
  
  gray: {
    25: '#FCFCFD',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
  
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
};

// ============================================
// 背景色
// ============================================

export const background = {
  // 页面背景
  page: '#EEF2FF',          // 柔和的靛蓝白
  pageAlt: '#F8FAFC',       // 备用背景
  
  // 卡片背景
  card: '#FFFFFF',
  cardHover: '#FAFBFC',
  cardActive: '#F8FAFC',
  
  // 玻璃态背景
  glass: {
    light: 'rgba(255, 255, 255, 0.72)',
    medium: 'rgba(255, 255, 255, 0.85)',
    strong: 'rgba(255, 255, 255, 0.95)',
    dark: 'rgba(15, 23, 42, 0.72)',
  },
  
  // 遮罩
  overlay: {
    light: 'rgba(255, 255, 255, 0.6)',
    dark: 'rgba(0, 0, 0, 0.5)',
    darker: 'rgba(0, 0, 0, 0.75)',
  },
  
  // 输入框
  input: '#FFFFFF',
  inputHover: '#F8FAFC',
  inputFocus: '#FFFFFF',
  inputDisabled: '#F3F4F6',
};

// ============================================
// 文字色
// ============================================

export const text = {
  primary: '#0F172A',       // 主要文字
  secondary: '#475569',     // 次要文字
  tertiary: '#94A3B8',      // 辅助文字
  muted: '#CBD5E1',         // 禁用文字
  inverse: '#FFFFFF',       // 反色文字
  
  // 链接
  link: {
    default: '#4F46E5',
    hover: '#4338CA',
    active: '#3730A3',
    visited: '#6366F1',
  },
  
  // 状态文字
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
};

// ============================================
// 边框色
// ============================================

export const border = {
  subtle: 'rgba(0, 0, 0, 0.04)',
  default: 'rgba(0, 0, 0, 0.08)',
  strong: 'rgba(0, 0, 0, 0.12)',
  
  // 焦点边框
  focus: {
    primary: 'rgba(79, 70, 229, 0.5)',
    success: 'rgba(16, 185, 129, 0.5)',
    error: 'rgba(239, 68, 68, 0.5)',
  },
  
  // 分割线
  divider: '#E5E7EB',
  dividerStrong: '#D1D5DB',
};

// ============================================
// 渐变色
// ============================================

export const gradients = {
  // 品牌渐变
  primary: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)',
  primarySoft: 'linear-gradient(135deg, #818CF8 0%, #A5B4FC 100%)',
  
  // 强调渐变
  accent: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
  accentWarm: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  
  // 成功渐变
  success: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  
  // 信息渐变
  info: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  
  // 背景网格渐变
  mesh: `
    radial-gradient(at 40% 20%, rgba(79, 70, 229, 0.08) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.06) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(249, 115, 22, 0.04) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(129, 140, 248, 0.05) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(79, 70, 229, 0.06) 0px, transparent 50%)
  `,
  
  // 玻璃高光
  glassHighlight: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%)',
  
  // 卡片渐变
  cardShine: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
};

// ============================================
// 图表色板
// ============================================

export const charts = {
  // 主色板 - 用于多系列数据
  palette: [
    '#4F46E5',  // 靛蓝紫
    '#10B981',  // 翠绿
    '#F59E0B',  // 琥珀
    '#3B82F6',  // 天蓝
    '#EC4899',  // 粉红
    '#8B5CF6',  // 紫罗兰
    '#14B8A6',  // 青色
    '#F97316',  // 橙色
  ],
  
  // 渐变色板
  gradientPalette: [
    ['#4F46E5', '#818CF8'],
    ['#10B981', '#34D399'],
    ['#F59E0B', '#FBBF24'],
    ['#3B82F6', '#60A5FA'],
    ['#EC4899', '#F472B6'],
  ],
  
  // 状态色
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280',
  
  // 热力图
  heatmap: {
    cold: '#3B82F6',
    cool: '#60A5FA',
    neutral: '#F3F4F6',
    warm: '#FBBF24',
    hot: '#EF4444',
  },
};

// ============================================
// 导出完整色彩系统
// ============================================

export const colors = {
  brand,
  semantic,
  neutral,
  background,
  text,
  border,
  gradients,
  charts,
  
  // 快捷访问
  primary: brand.primary[600],
  primaryHover: brand.primary[700],
  primaryActive: brand.primary[800],
  primarySoft: 'rgba(79, 70, 229, 0.12)',
  primaryGlow: 'rgba(79, 70, 229, 0.25)',
  
  accent: brand.accent[500],
  accentHover: brand.accent[600],
  accentActive: brand.accent[700],
  
  success: semantic.success.main,
  warning: semantic.warning.main,
  error: semantic.error.main,
  info: semantic.info.main,
};

export default colors;
