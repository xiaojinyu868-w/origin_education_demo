---
name: add-demo-links
overview: 将落地页中4个"体验Demo"按钮改为链接到 meetmind.online，使用户可以点击跳转到Demo网站。
todos:
  - id: locate-buttons
    content: 使用 [subagent:code-explorer] 在项目中搜索定位所有"体验Demo"按钮的位置
    status: completed
  - id: modify-buttons
    content: 将4个"体验Demo"按钮改为a标签，链接到 https://meetmind.online
    status: completed
    dependencies:
      - locate-buttons
  - id: verify-links
    content: 验证所有链接能正常跳转且样式保持一致
    status: completed
    dependencies:
      - modify-buttons
---

## 产品概述

将MeetMind落地页中的4个"体验Demo"按钮修改为可点击的链接，使用户能够跳转到线上Demo网站 meetmind.online。

## 核心功能

- 将现有的4个button标签改为a标签或添加onClick跳转逻辑
- 链接目标地址设置为 meetmind.online
- 保持按钮原有的视觉样式不变
- 确保链接在新标签页中打开，提供良好的用户体验

## 技术方案

### 修改范围

这是一个简单的UI元素修改任务，仅需修改落地页中4个"体验Demo"按钮的实现方式。

### 实现方式

有两种可选方案：

**方案一：改为a标签（推荐）**

- 将button标签替换为a标签
- 添加href属性指向 https://meetmind.online
- 添加target="_blank"在新标签页打开
- 添加rel="noopener noreferrer"确保安全性
- 保留原有的样式类名

**方案二：保留button添加onClick**

- 保留button标签
- 添加onClick事件处理
- 使用window.open()方法跳转

### 代码示例

**方案一示例（推荐）：**

```
// 修改前
<button className="demo-btn">体验Demo</button>

// 修改后
<a 
  href="https://meetmind.online" 
  target="_blank" 
  rel="noopener noreferrer"
  className="demo-btn"
>
  体验Demo
</a>
```

### 注意事项

- 需要先定位落地页文件中的4个按钮位置
- 确保修改后按钮样式保持一致
- 验证链接能正常跳转

## Agent Extensions

### SubAgent

- **code-explorer**
- 用途：在项目中搜索定位4个"体验Demo"按钮所在的文件和具体位置
- 预期结果：找到所有需要修改的按钮代码位置，确保不遗漏任何一个