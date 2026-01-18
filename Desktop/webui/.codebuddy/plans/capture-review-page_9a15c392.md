---
name: capture-review-page
overview: 截取MeetMind产品首页的复习模式（review视图）截图，用于落地页Scenarios组件中"方法断层"场景的配图。
todos:
  - id: explore-meetmind
    content: 使用[subagent:code-explorer]探索MeetMind项目，确认review视图的访问方式
    status: completed
  - id: start-dev-server
    content: 启动MeetMind本地开发服务器
    status: completed
    dependencies:
      - explore-meetmind
  - id: capture-screenshot
    content: 使用[skill:webapp-testing]截取review视图页面截图
    status: completed
    dependencies:
      - start-dev-server
  - id: save-screenshot
    content: 将截图保存至webui项目目录供落地页使用
    status: completed
    dependencies:
      - capture-screenshot
---

## 产品概述

截取MeetMind产品首页的复习模式（review视图）截图，用于落地页Scenarios组件中"方法断层"场景的配图展示。

## 核心功能

- 启动MeetMind本地应用并导航至首页
- 切换到review视图模式（复习模式）
- 截取包含时间线、精选片段、摘要、笔记等Tab的完整页面截图
- 保存截图文件供落地页使用

## 技术方案

- 工具：Playwright浏览器自动化
- 目标应用路径：C:\Users\Li Hao\Desktop\meetmind
- 首页代码位置：src/app/page.tsx
- 视图切换参数：viewMode='review'

## 实现步骤

### 截图流程

1. 启动MeetMind本地开发服务器
2. 使用Playwright打开浏览器访问本地应用
3. 导航至首页并切换到review视图模式
4. 等待页面完全加载（包含时间线、精选片段、摘要、笔记等Tab）
5. 截取完整页面截图并保存

### 截图保存位置

截图将保存至当前工作目录（webui项目），便于后续在落地页Scenarios组件中引用。

## Agent Extensions

### Skill

- **webapp-testing**
- Purpose：使用Playwright自动化工具访问MeetMind本地应用，切换到review视图模式并截取页面截图
- Expected outcome：成功截取MeetMind首页review视图的完整截图，包含时间线、精选片段、摘要、笔记等核心功能Tab

### SubAgent

- **code-explorer**
- Purpose：探索MeetMind项目结构，确认首页代码位置和viewMode切换机制
- Expected outcome：获取准确的页面路由和视图切换方式，确保截图操作正确执行