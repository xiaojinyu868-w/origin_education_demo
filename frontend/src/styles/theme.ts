import { ThemeConfig } from "antd";

/**
 * 世界顶级设计系统 v3.0 - Ant Design 主题配置
 * 
 * 灵感来源:
 * - Shape of AI: 结构化、模块化、功能主义
 * - Linear: 克制优雅、精致动效
 * - Vercel: 黑白对比、极致性能感
 * - Stripe: 细节打磨、专业感
 */

// ============================================
// 色彩系统
// ============================================

export const colors = {
  // 主色 - 深邃的靛蓝紫，科技感与专业感并存
  primary: "#6366F1",
  primaryHover: "#5558E3",
  primaryActive: "#4F46E5",
  primarySoft: "rgba(99, 102, 241, 0.1)",
  primaryGlow: "rgba(99, 102, 241, 0.25)",
  
  // 渐变
  gradients: {
    primary: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)",
    accent: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
    success: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
    warm: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
    mesh: `radial-gradient(at 40% 20%, hsla(240, 100%, 74%, 0.08) 0px, transparent 50%),
           radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 0.06) 0px, transparent 50%),
           radial-gradient(at 0% 50%, hsla(355, 100%, 93%, 0.05) 0px, transparent 50%),
           radial-gradient(at 80% 50%, hsla(340, 100%, 76%, 0.05) 0px, transparent 50%),
           radial-gradient(at 0% 100%, hsla(240, 100%, 70%, 0.08) 0px, transparent 50%)`,
  },
  
  // 语义色
  success: "#10B981",
  successSoft: "rgba(16, 185, 129, 0.1)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.1)",
  error: "#EF4444",
  errorSoft: "rgba(239, 68, 68, 0.1)",
  info: "#3B82F6",
  infoSoft: "rgba(59, 130, 246, 0.1)",
  
  // 中性色 - 精心调制的灰度
  gray: {
    25: "#FCFCFD",
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#030712",
  },
  
  // 背景色
  background: {
    base: "#FAFBFC",
    subtle: "#F8FAFC",
    muted: "#F1F5F9",
    elevated: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.6)",
    glass: "rgba(255, 255, 255, 0.72)",
    glassStrong: "rgba(255, 255, 255, 0.88)",
  },
  
  // 文字色
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    tertiary: "#94A3B8",
    muted: "#CBD5E1",
    inverse: "#FFFFFF",
    link: "#6366F1",
  },
  
  // 边框色
  border: {
    subtle: "rgba(0, 0, 0, 0.04)",
    default: "rgba(0, 0, 0, 0.08)",
    strong: "rgba(0, 0, 0, 0.12)",
    focus: "rgba(99, 102, 241, 0.5)",
  },
};

// ============================================
// 阴影系统
// ============================================

export const shadows = {
  xs: "0 1px 2px rgba(0, 0, 0, 0.03)",
  sm: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.03)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
  // 特殊阴影
  glow: "0 0 20px rgba(99, 102, 241, 0.15)",
  glowStrong: "0 0 40px rgba(99, 102, 241, 0.25)",
  card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(0, 0, 0, 0.03)",
  cardHover: "0 12px 28px rgba(0, 0, 0, 0.08), 0 8px 12px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04)",
  button: "0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  dropdown: "0 4px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.04)",
  modal: "0 24px 48px rgba(0, 0, 0, 0.12), 0 12px 24px rgba(0, 0, 0, 0.08)",
};

// ============================================
// 圆角系统
// ============================================

export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
};

// ============================================
// 间距系统 (8px 基准)
// ============================================

export const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
};

// ============================================
// 动画系统
// ============================================

export const transitions = {
  // 持续时间
  duration: {
    instant: "50ms",
    fast: "100ms",
    normal: "200ms",
    slow: "300ms",
    slower: "400ms",
    slowest: "500ms",
  },
  // 缓动函数
  easing: {
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
};

// ============================================
// 字体系统
// ============================================

export const typography = {
  fontFamily: {
    sans: [
      '"SF Pro Display"',
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Noto Sans SC"',
      '"PingFang SC"',
      '"Hiragino Sans GB"',
      "sans-serif",
    ].join(","),
    mono: [
      '"SF Mono"',
      '"Fira Code"',
      '"JetBrains Mono"',
      "Consolas",
      "monospace",
    ].join(","),
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 30,
    "5xl": 36,
    "6xl": 48,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
  },
};

// ============================================
// 布局变量
// ============================================

export const layout = {
  sidebarWidth: 260,
  sidebarCollapsedWidth: 72,
  headerHeight: 64,
  contentMaxWidth: 1200,
  contentPadding: "clamp(16px, 4vw, 48px)",
};

// ============================================
// Ant Design 主题配置
// ============================================

export const appTheme: ThemeConfig = {
  token: {
    // 色彩
    colorPrimary: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    colorTextBase: colors.text.primary,
    colorBgLayout: colors.background.base,
    colorBgContainer: colors.background.elevated,
    colorBorder: colors.border.default,
    colorBorderSecondary: colors.border.subtle,
    
    // 字体
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.base,
    fontSizeHeading1: typography.fontSize["4xl"],
    fontSizeHeading2: typography.fontSize["3xl"],
    fontSizeHeading3: typography.fontSize["2xl"],
    fontSizeHeading4: typography.fontSize.xl,
    fontSizeHeading5: typography.fontSize.lg,
    
    // 行高
    lineHeight: typography.lineHeight.normal,
    lineHeightHeading1: typography.lineHeight.tight,
    lineHeightHeading2: typography.lineHeight.snug,
    lineHeightHeading3: typography.lineHeight.snug,
    
    // 圆角
    borderRadius: radii.md,
    borderRadiusSM: radii.sm,
    borderRadiusLG: radii.lg,
    borderRadiusXS: radii.xs,
    
    // 控件
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    
    // 阴影
    boxShadow: shadows.sm,
    boxShadowSecondary: shadows.md,
    
    // 动画
    motionDurationFast: transitions.duration.fast,
    motionDurationMid: transitions.duration.normal,
    motionDurationSlow: transitions.duration.slow,
    motionEaseInOut: transitions.easing.inOut,
    motionEaseOut: transitions.easing.out,
  },
  components: {
    Button: {
      borderRadius: radii.md,
      borderRadiusLG: radii.lg,
      borderRadiusSM: radii.sm,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      fontWeight: typography.fontWeight.medium,
      paddingContentHorizontal: spacing[4],
      primaryShadow: shadows.button,
      defaultShadow: "none",
      defaultBorderColor: colors.border.default,
    },
    Card: {
      borderRadiusLG: radii.xl,
      boxShadowTertiary: shadows.card,
      paddingLG: spacing[6],
      headerBg: "transparent",
    },
    Layout: {
      bodyBg: colors.background.base,
      headerBg: colors.background.elevated,
      siderBg: colors.background.elevated,
      headerPadding: `0 ${spacing[6]}px`,
      headerHeight: layout.headerHeight,
    },
    Menu: {
      itemBorderRadius: radii.md,
      itemHeight: 40,
      itemMarginInline: spacing[2],
      itemMarginBlock: spacing[1],
      activeBarWidth: 0,
      itemSelectedBg: colors.primarySoft,
      itemSelectedColor: colors.primary,
      itemHoverBg: colors.gray[100],
      subMenuItemBg: "transparent",
      iconSize: 18,
      collapsedIconSize: 20,
    },
    Input: {
      controlHeight: 40,
      controlHeightLG: 48,
      borderRadius: radii.md,
      activeShadow: `0 0 0 3px ${colors.primarySoft}`,
      hoverBorderColor: colors.primary,
    },
    Select: {
      controlHeight: 40,
      borderRadius: radii.md,
      optionSelectedBg: colors.primarySoft,
    },
    Table: {
      borderRadius: radii.lg,
      headerBg: colors.background.muted,
      rowHoverBg: colors.background.subtle,
    },
    Modal: {
      borderRadiusLG: radii["2xl"],
      paddingContentHorizontalLG: spacing[6],
    },
    Drawer: {
      paddingLG: spacing[6],
    },
    Tag: {
      borderRadiusSM: radii.sm,
      defaultBg: colors.background.muted,
    },
    Tabs: {
      cardBg: colors.background.muted,
      itemSelectedColor: colors.primary,
      inkBarColor: colors.primary,
    },
    Progress: {
      defaultColor: colors.primary,
      remainingColor: colors.gray[200],
    },
    Typography: {
      fontFamilyCode: typography.fontFamily.mono,
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
    Statistic: {
      titleFontSize: typography.fontSize.sm,
      contentFontSize: typography.fontSize["4xl"],
    },
    Alert: {
      borderRadiusLG: radii.lg,
    },
    Message: {
      borderRadiusLG: radii.lg,
    },
    Notification: {
      borderRadiusLG: radii.lg,
    },
    Popover: {
      borderRadiusLG: radii.lg,
    },
    Dropdown: {
      borderRadiusLG: radii.lg,
    },
    DatePicker: {
      borderRadius: radii.md,
    },
    Switch: {
      handleSize: 18,
    },
    Slider: {
      handleSize: 14,
      handleSizeHover: 16,
    },
  },
};

// ============================================
// 导出设计 Token
// ============================================

export const designTokens = {
  colors,
  shadows,
  radii,
  spacing,
  transitions,
  typography,
  layout,
};

// ============================================
// 工具函数
// ============================================

/**
 * 生成渐变背景
 */
export function createGradient(
  direction: string,
  ...stops: string[]
): string {
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}

/**
 * 生成玻璃态效果
 */
export function createGlassEffect(
  blur: number = 12,
  saturation: number = 180,
  opacity: number = 0.72
): { background: string; backdropFilter: string; WebkitBackdropFilter: string } {
  return {
    background: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
  };
}

/**
 * 生成阴影
 */
export function createShadow(
  offsetY: number,
  blur: number,
  spread: number = 0,
  opacity: number = 0.1
): string {
  return `0 ${offsetY}px ${blur}px ${spread}px rgba(0, 0, 0, ${opacity})`;
}

/**
 * 生成过渡效果
 */
export function createTransition(
  properties: string | string[],
  duration: keyof typeof transitions.duration = "normal",
  easing: keyof typeof transitions.easing = "out"
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  return props
    .map((prop) => `${prop} ${transitions.duration[duration]} ${transitions.easing[easing]}`)
    .join(", ");
}
