/**
 * 世界级设计系统 - 对标 Linear, Vercel, Stripe
 *
 * 设计原则:
 * 1. 克制 - 少即是多，留白呼吸
 * 2. 精致 - 每个像素都有意义
 * 3. 动感 - 微妙的动画提升体验
 * 4. 一致 - 统一的视觉语言
 */
// 色彩系统 - 受 Linear 启发的冷色调
export const colors = {
    // 主色 - 深邃的靛蓝，不是 AI slop 的紫色
    primary: "#5B5FC7", // 柔和的靛蓝
    primaryHover: "#4F52B2",
    primaryActive: "#444791",
    // 强调色 - 用于重要操作
    accent: "#0091FF", // 明亮的蓝
    accentSoft: "rgba(0, 145, 255, 0.1)",
    // 语义色
    success: "#00A870", // 翠绿，不是荧光绿
    warning: "#FF9500", // 暖橙
    error: "#FF3B30", // 苹果红
    info: "#5AC8FA",
    // 中性色 - 精心调制的灰度
    gray: {
        50: "#FAFAFA",
        100: "#F5F5F5",
        200: "#EEEEEE",
        300: "#E0E0E0",
        400: "#BDBDBD",
        500: "#9E9E9E",
        600: "#757575",
        700: "#616161",
        800: "#424242",
        900: "#212121",
    },
    // 背景色
    background: {
        primary: "#FAFBFC",
        secondary: "#F6F8FA",
        elevated: "#FFFFFF",
        overlay: "rgba(0, 0, 0, 0.5)",
    },
    // 文字色
    text: {
        primary: "#1A1A1A",
        secondary: "#6B7280",
        tertiary: "#9CA3AF",
        muted: "#9CA3AF",
        inverse: "#FFFFFF",
        link: "#5B5FC7",
    },
    // 边框色
    border: {
        light: "rgba(0, 0, 0, 0.06)",
        subtle: "rgba(0, 0, 0, 0.06)",
        default: "rgba(0, 0, 0, 0.1)",
        strong: "rgba(0, 0, 0, 0.15)",
    },
    // 渐变色
    gradients: {
        primary: "linear-gradient(135deg, #5B5FC7 0%, #4F52B2 100%)",
        accent: "linear-gradient(135deg, #0091FF 0%, #0070CC 100%)",
        success: "linear-gradient(135deg, #00A870 0%, #008A5C 100%)",
    },
};
// 阴影系统 - 柔和、自然
export const shadows = {
    xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
    sm: "0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
    md: "0 4px 8px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02)",
    lg: "0 8px 16px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.02)",
    xl: "0 16px 32px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.03)",
    // 特殊阴影
    button: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
    card: "0 2px 8px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.04)",
    cardHover: "0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
    dropdown: "0 4px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.04)",
    modal: "0 24px 48px rgba(0, 0, 0, 0.12), 0 12px 24px rgba(0, 0, 0, 0.08)",
};
// 圆角系统 - 不是统一的大圆角
export const radii = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    "2xl": 20,
    full: 9999,
};
// 间距系统 - 8px 基准
export const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
};
// 动画系统
export const transitions = {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
    // 弹性动画
    bounce: "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    // 入场动画
    enter: "200ms cubic-bezier(0, 0, 0.2, 1)",
    // 退场动画
    exit: "150ms cubic-bezier(0.4, 0, 1, 1)",
    // 时长
    duration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
    },
    // 缓动函数
    easing: {
        out: "cubic-bezier(0, 0, 0.2, 1)",
        in: "cubic-bezier(0.4, 0, 1, 1)",
        inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
};

// 字体系统
export const typography = {
    fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        "'SF Pro Display'",
        "'SF Pro Text'",
        "'Segoe UI'",
        "Roboto",
        "'Noto Sans SC'",
        "'PingFang SC'",
        "'Hiragino Sans GB'",
        "sans-serif",
    ].join(","),
    fontFamilyCode: "'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
    fontSize: {
        xs: 12,
        sm: 13,
        md: 14,
        base: 14,
        lg: 16,
        xl: 18,
        "2xl": 20,
        "3xl": 24,
        "4xl": 32,
        "5xl": 40,
    },
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
    lineHeight: {
        tight: 1.25,
        snug: 1.375,
        normal: 1.6,
        relaxed: 1.75,
    },
    letterSpacing: {
        tight: "-0.02em",
        normal: "0",
        wide: "0.02em",
    },
};
// Ant Design 主题配置
export const appTheme = {
    token: {
        // 色彩
        colorPrimary: colors.primary,
        colorSuccess: colors.success,
        colorWarning: colors.warning,
        colorError: colors.error,
        colorInfo: colors.info,
        colorTextBase: colors.text.primary,
        colorBgLayout: colors.background.primary,
        colorBgContainer: colors.background.elevated,
        colorBorder: colors.border.default,
        colorBorderSecondary: colors.border.light,
        // 字体 - 系统字体栈，不用 Inter
        fontFamily: [
            "-apple-system",
            "BlinkMacSystemFont",
            "'SF Pro Display'",
            "'SF Pro Text'",
            "'Segoe UI'",
            "Roboto",
            "'Noto Sans SC'",
            "'PingFang SC'",
            "'Hiragino Sans GB'",
            "sans-serif",
        ].join(","),
        fontSize: 14,
        fontSizeHeading1: 32,
        fontSizeHeading2: 24,
        fontSizeHeading3: 20,
        fontSizeHeading4: 16,
        fontSizeHeading5: 14,
        // 行高
        lineHeight: 1.6,
        lineHeightHeading1: 1.25,
        lineHeightHeading2: 1.3,
        lineHeightHeading3: 1.35,
        // 圆角 - 不是统一大圆角
        borderRadius: radii.md,
        borderRadiusSM: radii.sm,
        borderRadiusLG: radii.lg,
        borderRadiusXS: 2,
        // 控件
        controlHeight: 36,
        controlHeightLG: 44,
        controlHeightSM: 28,
        // 阴影
        boxShadow: shadows.sm,
        boxShadowSecondary: shadows.md,
        // 动画
        motionDurationFast: "150ms",
        motionDurationMid: "200ms",
        motionDurationSlow: "300ms",
        motionEaseInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
        motionEaseOut: "cubic-bezier(0, 0, 0.2, 1)",
    },
    components: {
        Button: {
            borderRadius: radii.md,
            borderRadiusLG: radii.lg,
            borderRadiusSM: radii.sm,
            controlHeight: 36,
            controlHeightLG: 44,
            controlHeightSM: 28,
            fontWeight: 500,
            paddingContentHorizontal: 16,
            // 主按钮样式
            primaryShadow: shadows.button,
            defaultShadow: "none",
            defaultBorderColor: colors.border.default,
        },
        Card: {
            borderRadiusLG: radii.xl,
            boxShadowTertiary: shadows.card,
            paddingLG: 24,
            headerBg: "transparent",
        },
        Layout: {
            bodyBg: colors.background.primary,
            headerBg: colors.background.elevated,
            siderBg: colors.background.elevated,
            headerPadding: "0 24px",
            headerHeight: 64,
        },
        Menu: {
            itemBorderRadius: radii.md,
            itemHeight: 40,
            itemMarginInline: 8,
            itemMarginBlock: 4,
            activeBarWidth: 0,
            itemSelectedBg: colors.accentSoft,
            itemSelectedColor: colors.primary,
            itemHoverBg: "rgba(0, 0, 0, 0.04)",
            subMenuItemBg: "transparent",
            iconSize: 18,
            collapsedIconSize: 20,
        },
        Input: {
            controlHeight: 40,
            controlHeightLG: 48,
            borderRadius: radii.md,
            activeShadow: `0 0 0 2px ${colors.accentSoft}`,
            hoverBorderColor: colors.primary,
        },
        Select: {
            controlHeight: 40,
            borderRadius: radii.md,
            optionSelectedBg: colors.accentSoft,
        },
        Table: {
            borderRadius: radii.lg,
            headerBg: colors.background.secondary,
            rowHoverBg: "rgba(0, 0, 0, 0.02)",
        },
        Modal: {
            borderRadiusLG: radii.xl,
            paddingContentHorizontalLG: 24,
        },
        Drawer: {
            paddingLG: 24,
        },
        Tag: {
            borderRadiusSM: radii.sm,
            defaultBg: colors.background.secondary,
        },
        Tabs: {
            cardBg: colors.background.secondary,
            itemSelectedColor: colors.primary,
            inkBarColor: colors.primary,
        },
        Progress: {
            defaultColor: colors.primary,
            remainingColor: colors.gray[200],
        },
        Typography: {
            fontFamilyCode: "'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
            titleMarginBottom: 0,
            titleMarginTop: 0,
        },
        Statistic: {
            titleFontSize: 13,
            contentFontSize: 28,
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
    },
};
// 导出设计 token 供组件使用
export const designTokens = {
    colors,
    shadows,
    radii,
    spacing,
    transitions,
    typography,
};
