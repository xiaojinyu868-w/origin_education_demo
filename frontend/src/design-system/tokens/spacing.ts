/**
 * 智慧教研平台 - 间距令牌系统
 * 
 * 基于 4px 基准单位的间距系统
 * 确保界面元素之间的视觉节奏一致
 */

// ============================================
// 基础间距 (基于 4px)
// ============================================

export const space = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  5: '1.25rem',       // 20px
  6: '1.5rem',        // 24px
  7: '1.75rem',       // 28px
  8: '2rem',          // 32px
  9: '2.25rem',       // 36px
  10: '2.5rem',       // 40px
  11: '2.75rem',      // 44px
  12: '3rem',         // 48px
  14: '3.5rem',       // 56px
  16: '4rem',         // 64px
  20: '5rem',         // 80px
  24: '6rem',         // 96px
  28: '7rem',         // 112px
  32: '8rem',         // 128px
  36: '9rem',         // 144px
  40: '10rem',        // 160px
  44: '11rem',        // 176px
  48: '12rem',        // 192px
  52: '13rem',        // 208px
  56: '14rem',        // 224px
  60: '15rem',        // 240px
  64: '16rem',        // 256px
  72: '18rem',        // 288px
  80: '20rem',        // 320px
  96: '24rem',        // 384px
};

// ============================================
// 语义化间距
// ============================================

export const semanticSpacing = {
  // 组件内部间距
  component: {
    xs: space[1],       // 4px - 紧凑元素
    sm: space[2],       // 8px - 小型组件
    md: space[3],       // 12px - 中型组件
    lg: space[4],       // 16px - 大型组件
    xl: space[6],       // 24px - 超大组件
  },
  
  // 区块间距
  section: {
    sm: space[6],       // 24px
    md: space[8],       // 32px
    lg: space[12],      // 48px
    xl: space[16],      // 64px
  },
  
  // 页面内边距
  page: {
    x: 'clamp(1rem, 4vw, 3rem)',
    y: space[6],
    top: space[6],
    bottom: space[12],
  },
  
  // 卡片内边距
  card: {
    sm: space[3],       // 12px
    md: space[4],       // 16px
    lg: space[6],       // 24px
    xl: space[8],       // 32px
  },
  
  // 按钮内边距
  button: {
    xs: `${space[1]} ${space[2]}`,
    sm: `${space[1.5]} ${space[3]}`,
    md: `${space[2]} ${space[4]}`,
    lg: `${space[3]} ${space[6]}`,
    xl: `${space[4]} ${space[8]}`,
  },
  
  // 输入框内边距
  input: {
    sm: `${space[1.5]} ${space[2.5]}`,
    md: `${space[2]} ${space[3]}`,
    lg: `${space[3]} ${space[4]}`,
  },
  
  // 间隙
  gap: {
    xs: space[1],       // 4px
    sm: space[2],       // 8px
    md: space[3],       // 12px
    lg: space[4],       // 16px
    xl: space[6],       // 24px
    '2xl': space[8],    // 32px
  },
};

// ============================================
// 尺寸
// ============================================

export const sizes = {
  // 图标尺寸
  icon: {
    xs: '0.75rem',      // 12px
    sm: '1rem',         // 16px
    md: '1.25rem',      // 20px
    lg: '1.5rem',       // 24px
    xl: '2rem',         // 32px
    '2xl': '2.5rem',    // 40px
  },
  
  // 头像尺寸
  avatar: {
    xs: '1.5rem',       // 24px
    sm: '2rem',         // 32px
    md: '2.5rem',       // 40px
    lg: '3rem',         // 48px
    xl: '4rem',         // 64px
    '2xl': '5rem',      // 80px
  },
  
  // 按钮高度
  button: {
    xs: '1.5rem',       // 24px
    sm: '1.75rem',      // 28px
    md: '2.25rem',      // 36px
    lg: '2.75rem',      // 44px
    xl: '3.25rem',      // 52px
  },
  
  // 输入框高度
  input: {
    sm: '2rem',         // 32px
    md: '2.5rem',       // 40px
    lg: '3rem',         // 48px
  },
  
  // 触摸目标最小尺寸 (无障碍)
  touchTarget: '2.75rem',  // 44px
};

// ============================================
// 布局尺寸
// ============================================

export const layout = {
  // 侧边栏
  sidebar: {
    width: '16rem',           // 256px
    collapsedWidth: '4.5rem', // 72px
  },
  
  // 顶部导航
  header: {
    height: '4rem',           // 64px
  },
  
  // 内容区域
  content: {
    maxWidth: '80rem',        // 1280px
    narrowWidth: '48rem',     // 768px
    wideWidth: '96rem',       // 1536px
  },
  
  // 模态框
  modal: {
    sm: '24rem',              // 384px
    md: '32rem',              // 512px
    lg: '42rem',              // 672px
    xl: '56rem',              // 896px
    full: 'calc(100vw - 4rem)',
  },
  
  // 抽屉
  drawer: {
    sm: '20rem',              // 320px
    md: '28rem',              // 448px
    lg: '36rem',              // 576px
    xl: '48rem',              // 768px
  },
  
  // 卡片
  card: {
    minWidth: '16rem',        // 256px
    maxWidth: '24rem',        // 384px
  },
};

// ============================================
// 断点
// ============================================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================
// Z-Index 层级
// ============================================

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  max: 9999,
};

// ============================================
// 导出完整间距系统
// ============================================

export const spacing = {
  space,
  semanticSpacing,
  sizes,
  layout,
  breakpoints,
  zIndex,
};

export default spacing;
