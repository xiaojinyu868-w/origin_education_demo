---
name: landing-page-polish
overview: 优化MeetMind落地页：1) 精简Hero区文字密度；2) 移除AI slop装饰元素；3) 更新Demo链接为meetmind.online；4) 全站细节打磨。
todos:
  - id: explore-project
    content: 使用[subagent:code-explorer]探索项目结构，定位Hero组件和装饰元素文件
    status: completed
  - id: simplify-hero
    content: 使用[skill:frontend-design]精简Hero区内容层级，保留标题+副标题+CTA三层核心信息
    status: completed
    dependencies:
      - explore-project
  - id: remove-slop
    content: 移除AI slop元素：渐变背景、对话气泡装饰、过度阴影效果
    status: completed
    dependencies:
      - explore-project
  - id: update-demo-link
    content: 全局替换Demo链接为 meetmind.online
    status: completed
    dependencies:
      - explore-project
  - id: polish-details
    content: 使用[skill:ui-ux-pro-max]打磨全站细节，统一视觉语言
    status: completed
    dependencies:
      - simplify-hero
      - remove-slop
---

## 产品概述

MeetMind落地页视觉优化项目，聚焦于提升页面专业感与可读性，消除AI生成内容的廉价感。

## 核心功能

- Hero区内容精简：将现有6层内容（标题+副标题+详细描述+数据卡片+CTA+微文字）精简为3层核心信息
- 移除AI slop装饰元素：清理渐变背景、浮动对话气泡、过度装饰性元素
- Demo链接更新：将所有Demo入口链接更新为真实地址 meetmind.online
- 全站细节打磨：统一视觉语言，提升整体质感

## 技术方案

本次为现有项目UI优化，需先了解当前技术栈再进行针对性修改。

## 实现细节

### 修改范围

基于现有项目结构，主要涉及以下修改：

- Hero区组件样式与内容调整
- 全局装饰元素清理
- 链接地址批量更新

### 技术实施要点

1. **内容层级优化**：保留核心价值主张（标题+副标题+CTA），移除冗余描述文字和数据卡片
2. **样式清理**：移除渐变背景、对话气泡装饰、过度阴影等AI slop元素
3. **链接替换**：全局搜索并替换Demo相关链接为 meetmind.online

## 代理扩展

### SubAgent

- **code-explorer**
- 用途：探索现有项目结构，定位Hero组件、装饰元素和Demo链接位置
- 预期结果：获取完整的文件结构和需要修改的文件清单

### Skill

- **frontend-design**
- 用途：优化Hero区布局设计，打造专业简洁的视觉效果
- 预期结果：生成精简、高质量的Hero区代码

- **ui-ux-pro-max**
- 用途：审查并优化全站UI细节，确保设计一致性
- 预期结果：消除廉价感，提升整体专业质感