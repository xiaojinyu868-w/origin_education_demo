---
name: scenarios-concept-ui
overview: 用前端代码（React + Tailwind CSS）创建精美的概念UI mockup，替换Scenarios组件中的两个家长端截图，展示产品理想效果。
design:
  architecture:
    framework: react
  styleKeywords:
    - 现代简洁
    - 移动端App风格
    - 卡片式布局
    - 数据可视化
    - 温暖亲和
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 18px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 12px
      weight: 400
  colorSystem:
    primary:
      - "#6366F1"
      - "#8B5CF6"
      - "#06B6D4"
    background:
      - "#F8FAFC"
      - "#FFFFFF"
      - "#F1F5F9"
    text:
      - "#1E293B"
      - "#64748B"
      - "#94A3B8"
    functional:
      - "#22C55E"
      - "#F59E0B"
      - "#EF4444"
todos:
  - id: explore-scenarios
    content: 使用[subagent:code-explorer]分析Scenarios.tsx组件结构和截图引用位置
    status: completed
  - id: create-info-gap-mockup
    content: 使用[skill:frontend-design]创建信息断层场景的概念UI组件
    status: completed
    dependencies:
      - explore-scenarios
  - id: create-feedback-gap-mockup
    content: 使用[skill:frontend-design]创建反馈断层场景的概念UI组件
    status: completed
    dependencies:
      - explore-scenarios
  - id: integrate-mockups
    content: 将概念UI组件集成到Scenarios.tsx中替换原有截图
    status: completed
    dependencies:
      - create-info-gap-mockup
      - create-feedback-gap-mockup
  - id: polish-and-verify
    content: 使用[skill:ui-ux-pro-max]优化视觉效果并验证整体一致性
    status: completed
    dependencies:
      - integrate-mockups
---

## 产品概述

为落地页Scenarios组件创建精美的概念UI mockup，用前端代码替换现有的家长端截图，展示产品理想效果。

## 核心功能

- 替换Scenarios.tsx中第1个场景卡片（信息断层）的家长端截图为概念UI
- 替换Scenarios.tsx中第3个场景卡片（反馈断层）的家长端截图为概念UI
- 概念UI需展示家长端产品的理想交互状态和视觉效果
- 确保概念UI与落地页整体设计风格一致

## 技术栈

- 前端框架：React + TypeScript
- 样式方案：Tailwind CSS
- 基于现有项目结构进行修改

## 技术架构

### 模块划分

- **概念UI组件模块**：创建两个独立的概念UI组件，分别对应信息断层和反馈断层场景
- **Scenarios组件修改**：替换原有截图引用为新的概念UI组件

### 数据流

Scenarios.tsx → 引用概念UI组件 → 渲染精美的mockup效果

## 实现细节

### 核心目录结构

```
src/
├── components/
│   ├── Scenarios.tsx              # 修改：替换截图引用
│   └── concept-ui/
│       ├── InfoGapMockup.tsx      # 新增：信息断层场景概念UI
│       └── FeedbackGapMockup.tsx  # 新增：反馈断层场景概念UI
```

### 关键代码结构

**InfoGapMockup组件**：展示家长端"信息断层"场景的理想UI状态，包含学生学习进度、作业完成情况、知识点掌握程度等信息展示。

**FeedbackGapMockup组件**：展示家长端"反馈断层"场景的理想UI状态，包含教师反馈通知、学习建议、互动消息等功能展示。

### 技术实现计划

1. 分析现有Scenarios.tsx结构，定位需要替换的截图位置
2. 设计概念UI的视觉方案，确保与落地页风格一致
3. 使用React + Tailwind CSS实现精美的mockup组件
4. 集成概念UI组件到Scenarios组件中

## 设计风格

采用现代简洁的移动端App界面风格，展示家长端产品的理想状态。

## 页面规划

### 信息断层场景概念UI

- **顶部导航栏**：显示"孩子学习动态"标题，带返回按钮
- **学习概览卡片**：展示今日学习时长、完成作业数、知识点掌握率等核心数据
- **学习进度模块**：可视化展示各科目学习进度条
- **最近学习记录**：列表展示最近的学习活动，包含时间、科目、完成状态

### 反馈断层场景概念UI

- **顶部导航栏**：显示"教师反馈"标题，带消息提醒图标
- **最新反馈卡片**：展示教师最新评语和建议，带教师头像
- **学习建议模块**：基于学习数据的个性化建议展示
- **互动消息区**：家长与教师的沟通记录预览

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose：探索现有项目结构，分析Scenarios.tsx组件的具体实现和截图引用方式
- Expected outcome：获取完整的组件结构信息和需要修改的具体位置

### Skill

- **frontend-design**
- Purpose：创建高质量、精美的概念UI mockup组件
- Expected outcome：生成具有专业设计感的家长端概念界面代码

- **ui-ux-pro-max**
- Purpose：指导概念UI的视觉设计，包括配色、布局、字体等
- Expected outcome：确保概念UI达到产品级的视觉标准