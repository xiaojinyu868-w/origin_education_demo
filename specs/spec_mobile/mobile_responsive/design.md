# 技术方案设计

## 总体架构
- 继续采用现有的单体前端（React 18 + Vite + Ant Design）架构，通过响应式布局与组件自适应机制覆盖桌面与移动端，避免分裂代码基线。
- 保持现有路由结构（React Router），在页面与通用组件内部引入断点感知逻辑（`useBreakpoint`、自定义 `useResponsive` Hook）以动态调整布局与交互。
- 样式层在现有全局 CSS 基础上补充现代响应式能力：CSS 自定义属性、`clamp()`、`@media (prefers-reduced-motion)` 等，同时遵循 AntD 主题化能力统一色彩与密度。

## 体验设计原则
- **对齐国际大厂标准**：融合 Google Material 3 的布局密度与动态感、Apple HIG 的层级清晰与动效克制、Meta 的社交化信息分组手法，确保信息层级与视觉节奏一致。
- **单一信息焦点**：每屏突出一个核心操作或数据集，辅以「渐进揭示」模式（折叠、分段、底部抽屉），避免移动端信息泛滥。
- **手势 + 点击并重**：可通过滑动关闭抽屉、拖动面板等方式增强触屏体验，同时保留桌面端点击体验。
- **反馈即时可察**：加载、提交、错误等状态采用底部 SnackBar/顶部 Toast，与桌面端通知保持同源组件，避免割裂。

## 响应式断点策略
| 断点 | 宽度范围 | 主要布局策略 |
| --- | --- | --- |
| `xl` | ≥ 1280px | 保持现有桌面多列布局，使用侧边栏 + 三栏内容。 |
| `lg` | 1280px > 宽度 ≥ 992px | 轻度压缩间距，侧边栏宽度缩至 220px，内容区最大宽度 1080px。 |
| `md` | 992px > 宽度 ≥ 768px | 转为上方顶栏 + 抽屉导航，内容区两列（卡片）或紧凑表格。 |
| `sm` | 768px > 宽度 ≥ 480px | 单列内容，关键操作固定于底部操作条，表格转卡片化。 |
| `xs` | < 480px | 极简模式，隐藏次要入口，使用底部 TabBar 访问核心功能。 |

- 通过 `antd` 的 `Grid.useBreakpoint()` 提供实时断点信息，并在组件中配合 `CSS` 媒体查询保证层叠一致。

## 页面与组件改造方案

### 全局框架（App.tsx）
- **导航壳层**：拆分当前侧边栏为 `DesktopNav` 与 `MobileNav` 两个组件，通过断点控制渲染；移动端采用抽屉 + 底部 TabBar（参考 Material Bottom Navigation 与 Apple Tab Bar）。
- **头部区域**：标题、描述改用 `clamp()` 控制字号，移动端采用渐隐背景与吸顶阴影；在 md 以下隐藏次要按钮，仅保留核心 CTA（如「上传」）。
- **内容容器**：将 `app-content-wrapper` 改为自适应栅格，使用 `gap` 和 `max-width` 配合 `calc()` 实现可伸缩间距；为移动端增加 `padding-inline: clamp(16px, 4vw, 24px)`。
- **浮动操作**：扩展底部操作条组件，实现「反馈」等动作在移动端聚合，桌面端仍放置于侧栏底部。

### 导航与信息架构
- 为主导航引入图标 + 标签的缩略模式，在桌面端折叠时保留图标提示，移动端使用抽屉列表 + 底部快捷 Tab（最多 4 项，优先 Dashboard/Upload/Assistant/Analytics）。
- 路由切换后自动关闭移动抽屉并滚动至顶部（对齐 iOS/Android 官方应用的导航切换习惯）。
- 增加面包屑组件，用于复杂流程（上传、批改向导）显示上下文路径。

### 数据密集型页面
- **表格**：为 AntD Table 添加 `responsive` 属性和自定义 `render`，在 `md` 以下转换成卡片列表（Bento 卡片布局），每条记录内通过 `definition list` 排列字段，支持折叠二级信息。
- **图表**：统一采用响应式容器（`resize-observer`）控制；阈值以下自动隐藏次要图例或启用横向滚动（带指示器）；引入 `aria-label` 和可见的单位说明。
- **仪表盘卡片**：使用 `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`，移动端默认为单列，允许用户通过轻扫在两个指标之间切换（Carousel 风格）。

### 表单与交互
- 增加全局 `Form` 自适应样式：调整标签位置（移动端顶部、桌面端左侧/内联）；所有输入控件设置最小高度 44px，按钮使用触控友好的圆角与阴影。
- 上传组件在移动端透传 `accept="image/*"` 并调用原生相机；使用全屏模态展示上传进度（对齐 Google Files/Apple Files 的进度模式）。
- 多步流程（批改向导）在移动端转换为 `Stepper` + 底部固定操作条，显示当前步骤与剩余步骤数，增强流程感知。

### 动效与视觉统一
- 引入基于运动曲线的统一动效：快进出（Material 的标准曲线）用于抽屉与对话框；自定义 `fade-in-up` 用于内容列表，以保持苹果式的层级感。
- 背景与阴影按密度梯度调整，移动端降低阴影强度，避免白底发灰；全局色彩统一使用 AntD token（`colorPrimary`, `borderRadius`, `wireframe`）。

## 技术实现细节
- 构建 `useResponsive` Hook，封装 `Grid.useBreakpoint()`，提供 `isMobile`, `isTablet`, `isDesktop` bool；供布局、组件和容器调用。
- 样式层集中在 `src/styles/index.css` 与新增的 `src/styles/responsive.css`，通过 `@layer` 分层管理基础样式与响应式增强，避免大量内联样式。
- 为导航、底部条等新增组件使用 `CSS Modules` 或 `styled`？现有项目以全局 CSS 为主，优先保持一致，必要时在组件内使用 `styled-components`-like？Better maintain global? We'll state: keep in global by BEM style classes. 
- 引入 `react-helmet-async`? maybe not necessary. Instead mention lighten.
- 对图表（如果使用 ECharts / AntD charts? need check). Without specifics plan to wrap charts with `ResizeObserver`.
- 使用 `IntersectionObserver` 触发懒加载, reduce first load.
- Accessibility: ARIA attributes, focus trap for drawer, ensures keyboard accessible.

## 性能与可访问性
- 启用路由级代码拆分（已有? check). maybe not. mention use React lazy for heavy pages. 
- Skeleton screens for data heavy pages, reuse existing `EmptyState`.
- Mobile contexts: prefetch critical fonts? lighten? mention using `prefers-reduced-motion`.
- Focus on `aria`, skip hover only states.

## 安全性与兼容性
- No major server changes. Mention cross origin etc. Provide fallback to older browsers (Chromium iOS 16+, Safari 15+).

## 风险与缓解
- 复杂度: component duplication? mitigate by incremental toggles behind feature flag.
- Regression risk: set `isMobile` gating to avoid messing with existing flows.

## 测试策略
- 编写单元/组件测试 verifying layout toggles? Maybe doable with React Testing Library.
- Visual regression via Storybook? Not existing but can propose using `@testing-library`.
- Manual QA matrix covering breakpoints, devices, orientation, high contrast.

## 验证计划
- Use Lighthouse mobile mode to measure.
- Collect teacher feedback via instrumentation? maybe hooking existing feedback forms.

