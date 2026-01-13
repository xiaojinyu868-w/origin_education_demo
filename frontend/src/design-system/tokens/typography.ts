/**
 * 智慧教研平台 - 字体令牌系统
 * 
 * 字体搭配: Plus Jakarta Sans + Noto Sans SC
 * - Plus Jakarta Sans: 现代、友好、专业 (用于标题和英文)
 * - Noto Sans SC: 清晰、易读 (用于中文正文)
 * 
 * 参考: ui-ux-pro-max "Friendly SaaS" 字体方案
 */

// ============================================
// 字体家族
// ============================================

export const fontFamily = {
  // 主字体 - 用于标题和界面元素
  heading: [
    '"Plus Jakarta Sans"',
    '"PingFang SC"',
    '"Noto Sans SC"',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'sans-serif',
  ].join(', '),
  
  // 正文字体 - 用于长文本阅读
  body: [
    '"Noto Sans SC"',
    '"PingFang SC"',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'sans-serif',
  ].join(', '),
  
  // 等宽字体 - 用于代码和数字
  mono: [
    '"JetBrains Mono"',
    '"Fira Code"',
    '"SF Mono"',
    'Consolas',
    '"Liberation Mono"',
    'monospace',
  ].join(', '),
  
  // 系统字体栈
  system: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(', '),
};

// ============================================
// 字体大小
// ============================================

export const fontSize = {
  // 超小 - 标签、徽章
  xs: '0.6875rem',      // 11px
  
  // 小 - 辅助文字、时间戳
  sm: '0.8125rem',      // 13px
  
  // 基准 - 正文
  base: '0.875rem',     // 14px
  
  // 中等 - 强调正文
  md: '0.9375rem',      // 15px
  
  // 大 - 小标题
  lg: '1rem',           // 16px
  
  // 超大 - 标题
  xl: '1.125rem',       // 18px
  '2xl': '1.25rem',     // 20px
  '3xl': '1.5rem',      // 24px
  '4xl': '1.875rem',    // 30px
  '5xl': '2.25rem',     // 36px
  '6xl': '3rem',        // 48px
  '7xl': '3.75rem',     // 60px
  '8xl': '4.5rem',      // 72px
};

// ============================================
// 字重
// ============================================

export const fontWeight = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

// ============================================
// 行高
// ============================================

export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
  
  // 具体数值 (用于精确控制)
  '3': '0.75rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
};

// ============================================
// 字间距
// ============================================

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

// ============================================
// 预设文字样式
// ============================================

export const textStyles = {
  // 大标题 - 页面主标题
  h1: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  
  // 标题 - 区块标题
  h2: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  
  // 小标题 - 卡片标题
  h3: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  
  // 子标题
  h4: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  
  // 小节标题
  h5: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  
  // 正文大
  bodyLarge: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  
  // 正文
  body: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  
  // 正文小
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  
  // 标签
  label: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  
  // 按钮
  button: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.normal,
  },
  
  // 代码
  code: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  
  // 数字 - 用于统计数据
  number: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.tight,
    fontVariantNumeric: 'tabular-nums',
  },
  
  // 辅助文字
  caption: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
};

// ============================================
// Google Fonts 导入
// ============================================

export const googleFontsImport = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Noto+Sans+SC:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

// ============================================
// 导出完整字体系统
// ============================================

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  googleFontsImport,
};

export default typography;
