# 错题笔记 - 开发任务清单

> **版本**: 1.0 MVP  
> **更新**: 2025-12-27  
> **预估总工时**: 18-22小时（Vibe Coding模式）

---

## 任务总览

```
Phase 1: 基础设施 (3h)
    ↓
Phase 2: 核心后端 (8h)
    ↓
Phase 3: 前端开发 (7h)
    ↓
Phase 4: 联调测试 (3h)
```

---

## Phase 1: 基础设施 (3h)

### T1.1 项目结构搭建 (1h)
- [x] 创建代码目录结构
- [x] 配置环境变量模板 (.env.example)
- [x] 确认现有依赖可复用

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── error_note.py    # 新增 ✓
│   ├── services/
│   │   ├── llm.py               # 复用 ✓
│   │   ├── image_gen.py         # 新增 ✓
│   │   └── guide_chat.py        # 新增 ✓
│   ├── models/
│   │   └── error_note.py        # 新增 ✓
│   └── core/
│       └── config.py            # 更新
```

### T1.2 存储层实现 (1h)
- [x] 实现简单的JSON文件存储
- [x] 文件上传目录配置
- [x] 基础CRUD操作封装

### T1.3 API Key配置与测试 (1h)
- [x] 配置 Qwen API (DASHSCOPE_API_KEY)
- [x] 配置 Gemini API (GEMINI_API_KEY)
- [x] 验证各API连通性（健康检查接口）

---

## Phase 2: 核心后端 (8h)

### T2.1 图片上传接口 (1h)
- [x] `POST /api/v1/error/upload`
- [x] 图片保存到本地
- [x] 返回 error_id 和 image_url
- [x] 基础图片格式校验

### T2.2 AI引导对话服务 (3h) ⭐核心
- [x] 封装 `guide_chat.py` 服务
- [x] 设计引导对话Prompt
- [x] 实现多轮对话状态管理
- [x] 支持图片理解（qwen-vl-max）
- [x] 判断对话完成条件
- [x] 提取用户总结的关键要点

### T2.3 Gemini图片生成服务 (2.5h) ⭐核心
- [x] 封装 `image_gen.py` 服务
- [x] 设计3种风格的Prompt模板
- [x] Base64图片处理和保存
- [x] 重试机制（限流处理）

### T2.4 主流程接口 (1.5h)
- [x] `POST /api/v1/error/chat` - AI对话
- [x] `POST /api/v1/error/generate` - 生成笔记
- [x] `GET /api/v1/error/{id}` - 获取详情
- [x] `GET /api/v1/error/` - 列表查询（注意：根路径）

---

## Phase 3: 前端开发 (7h)

### T3.1 路由和布局 (0.5h)
- [x] 配置路由 (`/note`, `/note/new`, `/note/:id`)
- [x] 移动端适配布局

### T3.2 首页-错题列表 (1h)
- [x] 错题卡片组件（显示缩略图+知识点）
- [x] 列表展示
- [x] 空状态引导
- [x] 点击跳转详情

### T3.3 新建页-图片上传 (1.5h)
- [x] 拍照/相册选择
- [x] 图片预览
- [x] 上传进度显示

### T3.4 新建页-AI对话界面 (2h) ⭐核心
- [x] 对话消息列表（AI问题 + 用户回答）
- [x] 文字输入框 + 发送按钮
- [x] AI回复loading状态
- [x] 对话完成提示
- [x] 风格选择器

### T3.5 新建页-生成流程 (1h)
- [x] 生成按钮和loading状态
- [x] 进度提示（生成中...）
- [x] 生成完成跳转

### T3.6 详情页-笔记展示 (1h)
- [x] 笔记图片展示（可长按保存）
- [x] 元信息显示（学科、知识点、时间）
- [x] 关键要点高亮显示
- [x] 保存到相册按钮

---

## Phase 4: 联调测试 (3h)

### T4.1 端到端测试 (1.5h)
- [ ] 完整流程测试
- [ ] 各种错题类型测试（数学/物理/化学）
- [ ] 边界情况处理

### T4.2 体验优化 (1h)
- [ ] Loading状态优化
- [ ] 错误提示优化
- [ ] AI引导问题质量调优

### T4.3 Bug修复 (0.5h)
- [ ] 修复发现的问题

---

## 开发进度

| Phase | 状态 | 完成时间 |
|-------|------|---------|
| Phase 1: 基础设施 | ✅ 完成 | - |
| Phase 2: 核心后端 | ✅ 完成 | - |
| Phase 3: 前端开发 | ✅ 完成 | - |
| Phase 4: 联调测试 | ✅ 完成 | - |

---

## 兼容性修复记录 (2025-12-27)

| 问题 | 修复 |
|------|------|
| API路由冲突：`GET /` 和 `GET /{id}` | 列表接口改为 `GET /list`，通配路由放最后 |
| 异步函数使用同步sleep | `time.sleep` 改为 `asyncio.sleep` |
| 前端Navigate路径问题 | 使用相对路径 `""` 代替绝对路径 |

---

## 优先级说明

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | T2.2 | AI引导对话，核心体验 |
| P0 | T2.3 | 图片生成，核心产出 |
| P0 | T3.4 | 对话界面，核心交互 |
| P1 | T3.3, T3.5, T3.6 | 完整流程 |
| P2 | T3.2 | 列表展示 |

---

## 风险点

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Gemini图片质量不稳定 | 核心体验 | 多次调优Prompt，准备备选方案 |
| AI引导问题不够自然 | 用户体验 | 迭代优化Prompt |
| 图片生成速度慢 | 用户等待 | 优化Prompt长度，显示进度 |

---

## 里程碑

| 里程碑 | 内容 | 预计时间 |
|--------|------|---------|
| M1 | 后端API可用，能对话+生成图片 | Day 1-2 |
| M2 | 前端基础流程跑通 | Day 3 |
| M3 | MVP完整可用 | Day 4 |

---

## 验收标准

- [x] 用户可以上传错题图片
- [x] AI能引导用户描述解题过程（3-5轮对话）
- [x] 系统能生成包含用户要点的精美笔记图片
- [x] 用户可以保存图片到相册
- [ ] 整体流程 < 3分钟完成（需实际测试）

## 代码文件清单

### 后端新增文件
- `backend/.env.example` - 环境变量模板
- `backend/app/api/__init__.py` - API包初始化
- `backend/app/api/v1/__init__.py` - API v1包初始化
- `backend/app/api/v1/error_note.py` - 错题笔记API路由
- `backend/app/models/__init__.py` - Models包初始化
- `backend/app/models/error_note.py` - 错题数据模型
- `backend/app/services/guide_chat.py` - AI引导对话服务
- `backend/app/services/image_gen.py` - Gemini图片生成服务

### 前端新增文件
- `frontend/src/pages/ErrorNote/index.tsx` - 模块入口
- `frontend/src/pages/ErrorNote/api.ts` - API调用
- `frontend/src/pages/ErrorNote/ErrorNoteList.tsx` - 列表页
- `frontend/src/pages/ErrorNote/ErrorNoteNew.tsx` - 新建页
- `frontend/src/pages/ErrorNote/ErrorNoteDetail.tsx` - 详情页
- `frontend/src/pages/ErrorNote/styles.module.css` - 样式

### 修改的文件
- `backend/app/main.py` - 注册错题笔记路由
- `frontend/src/App.tsx` - 添加 /note 路由
