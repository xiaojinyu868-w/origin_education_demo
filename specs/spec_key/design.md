# 错题笔记 - 技术设计文档

> **版本**: 1.0 MVP  
> **更新**: 2025-12-27

---

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React H5)                       │
├─────────────────────────────────────────────────────────────────┤
│  拍照/上传  │  AI对话界面  │  图片预览  │  保存到相册           │
└──────┬──────┴──────┬───────┴─────┬──────┴──────┬────────────────┘
       │             │             │             │
       ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                           │
├─────────────────────────────────────────────────────────────────┤
│  /upload        │  /chat        │  /generate      │  /errors    │
└──────┬──────────┴───────┬───────┴───────┬─────────┴─────────────┘
       │                  │               │
       ▼                  ▼               ▼
┌──────────┐       ┌──────────┐    ┌─────────────┐
│  本地存储  │       │ Qwen LLM │    │ Gemini      │
│  (文件)   │       │ (引导对话) │    │ Imagen     │
└──────────┘       └──────────┘    └─────────────┘
```

---

## 2. 核心流程

### 2.1 主流程时序图

```
用户          前端           后端                    Qwen        Gemini
 │             │             │                       │            │
 │──拍照/上传──▶│             │                       │            │
 │             │──POST /upload─▶│                     │            │
 │             │◀──error_id────│                      │            │
 │             │             │                       │            │
 │             │──POST /chat (开始)─▶│                │            │
 │             │             │───识别题目+生成引导问题──▶│            │
 │             │◀──AI问题────│◀──────────────────────│            │
 │◀──显示问题──│             │                       │            │
 │             │             │                       │            │
 │──输入回答──▶│             │                       │            │
 │             │──POST /chat─▶│                      │            │
 │             │             │───分析回答+追问/总结───▶│            │
 │             │◀──AI追问/总结│◀─────────────────────│            │
 │◀──显示──────│             │                       │            │
 │             │             │                       │            │
 │  (重复2-4轮对话)           │                       │            │
 │             │             │                       │            │
 │──确认生成──▶│             │                       │            │
 │             │──POST /generate─▶│                  │            │
 │             │             │──────────────────────────────────▶│
 │             │             │◀──笔记图片base64─────────────────│
 │             │◀──返回图片───│                       │            │
 │◀──展示图片──│             │                       │            │
 │──长按保存──▶│             │                       │            │
```

---

## 3. API设计

### 3.1 上传错题图片

```
POST /api/v1/error/upload
Content-Type: multipart/form-data

Request:
  - image: File (required) - 错题图片

Response:
{
  "error_id": "err_20251227_001",
  "image_url": "/uploads/err_20251227_001.jpg"
}
```

### 3.2 AI引导对话

```
POST /api/v1/error/chat
Content-Type: application/json

Request:
{
  "error_id": "err_20251227_001",
  "message": "我直接求导了",  // 用户输入，首次可为空
  "is_start": false           // true=开始对话，false=继续对话
}

Response:
{
  "error_id": "err_20251227_001",
  "ai_message": "求导之前需要做什么呢？",
  "is_complete": false,       // true=对话完成可生成，false=继续对话
  "suggested_actions": ["继续回答", "生成笔记"]  // 可选操作提示
}
```

### 3.3 生成笔记图片

```
POST /api/v1/error/generate
Content-Type: application/json

Request:
{
  "error_id": "err_20251227_001",
  "style": "minimal"  // minimal=简约学术, cute=手账风, dark=暗黑极客
}

Response:
{
  "error_id": "err_20251227_001",
  "note_image_base64": "iVBORw0KGgo...",
  "note_image_url": "/notes/err_20251227_001_note.png",
  "summary": {
    "subject": "数学",
    "topic": "函数求导",
    "key_insight": "先求定义域，再求导",  // 用户自己总结的要点
    "error_reason": "忽略了定义域限制"
  }
}
```

### 3.4 获取错题详情

```
GET /api/v1/error/{error_id}

Response:
{
  "error_id": "err_20251227_001",
  "image_url": "/uploads/err_20251227_001.jpg",
  "chat_history": [...],      // 对话记录
  "note_image_url": "/notes/err_20251227_001_note.png",
  "summary": {...},
  "created_at": "2025-12-27T10:30:00Z"
}
```

### 3.5 错题列表

```
GET /api/v1/errors?page=1&limit=20

Response:
{
  "items": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## 4. 数据模型

### 4.1 错题记录 (ErrorNote)

```python
class ErrorNote:
    id: str                    # 唯一ID，如 err_20251227_001
    
    # 原始输入
    image_path: str            # 错题图片路径
    
    # 对话记录
    chat_history: list[dict]   # [{"role": "ai/user", "content": "..."}]
    
    # AI分析结果
    subject: str               # 学科
    topic: str                 # 知识点
    key_insight: str           # 用户总结的关键要点
    error_reason: str | None   # 错因分析
    
    # 生成的笔记
    note_image_path: str       # 生成的笔记图片路径
    note_style: str            # 图片风格
    
    # 元数据
    created_at: datetime
    updated_at: datetime
```

### 4.2 本地存储结构

```
data/
├── uploads/           # 用户上传的错题图片
│   ├── err_001.jpg
│   └── err_002.jpg
├── notes/             # AI生成的笔记图片
│   ├── err_001_note.png
│   └── err_002_note.png
└── db.json            # 简单JSON数据库（MVP阶段）
```

---

## 5. AI Prompt设计

### 5.1 引导对话 (Qwen) ⭐核心

```python
GUIDE_SYSTEM_PROMPT = """
你是一个温和、有耐心的学习助手，帮助学生整理错题。

## 你的任务
通过对话引导学生：
1. 回忆做题时的思路
2. 找出错误的原因
3. 总结正确的解法要点
4. 形成自己的记忆点

## 对话风格
- 像朋友一样聊天，不要太正式
- 多用引导性问题，少直接给答案
- 鼓励学生自己思考和总结
- 每次只问一个问题，不要连续追问

## 引导问题库（根据情况选用）
- "这道题你当时是怎么想的？"
- "在哪一步开始感觉不对了？"
- "现在知道正确答案了吗？关键点在哪？"
- "如果用一句话总结这道题的坑，你会怎么说？"
- "下次遇到类似的题，第一步应该做什么？"

## 对话控制
- 一般进行3-5轮对话
- 当学生能清晰总结出要点时，结束对话
- 输出 is_complete: true 表示可以生成笔记
"""

GUIDE_USER_TEMPLATE = """
## 题目图片信息
{image_description}

## 对话历史
{chat_history}

## 学生最新回复
{user_message}

请根据以上信息，给出下一个引导问题或总结。
输出JSON格式：
{
  "ai_message": "你的回复",
  "is_complete": false,
  "key_insight": null  // 如果学生总结出了关键点，填在这里
}
"""
```

### 5.2 笔记图片生成 (Gemini Imagen)

```python
NOTE_IMAGE_PROMPT_TEMPLATE = """
Create a beautiful study note image for a student.

## Style: {style_description}

## Content to include:
📚 Subject: {subject}
📝 Topic: {topic}

### The Question (brief)
{question_brief}

### Key Insight (MOST IMPORTANT - make this stand out!)
💡 "{key_insight}"

### Why I got it wrong
{error_reason}

### Steps to remember
{solution_steps}

## Design Requirements:
- Aspect ratio: 9:16 (mobile phone)
- The KEY INSIGHT should be the visual focus - make it big and memorable
- Clean, organized layout with clear sections
- Use {color_scheme} color palette
- Make it look like a beautiful note worth saving
- Include subtle decorative elements but keep it clean
- Typography: Clear, readable, modern Chinese-friendly fonts
"""

STYLE_CONFIGS = {
    "minimal": {
        "style_description": "Clean academic style, minimalist, professional",
        "color_scheme": "white background, black text, blue accent"
    },
    "cute": {
        "style_description": "Kawaii hand-drawn journal style, playful",
        "color_scheme": "pastel colors, pink, mint, soft yellow"
    },
    "dark": {
        "style_description": "Dark mode, modern tech aesthetic",
        "color_scheme": "dark gray background, white text, cyan accent"
    }
}
```

---

## 6. 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + TypeScript | 现有项目技术栈 |
| 前端UI | TailwindCSS | 快速开发 |
| 后端 | FastAPI (Python) | 现有项目技术栈 |
| AI对话 | Qwen (qwen-vl-max) | 多模态，能看图+对话 |
| 图片生成 | Gemini Imagen | 生成精美笔记图 |
| 存储 | 本地文件 + JSON | MVP简化方案 |

---

## 7. 前端页面设计

### 7.1 页面结构

```
/                    # 首页（错题列表）
/new                 # 新建错题（拍照+AI对话）
/note/{id}           # 查看笔记详情
```

### 7.2 核心交互

#### 新建错题页面 `/new`

```
┌────────────────────────────┐
│  ← 返回          新建错题   │
├────────────────────────────┤
│                            │
│   ┌────────────────────┐   │
│   │                    │   │
│   │   📷 点击拍照      │   │
│   │   或上传图片       │   │
│   │                    │   │
│   └────────────────────┘   │
│                            │
│   ─────── AI对话 ────────  │
│                            │
│   🤖 这道题你当时是怎么    │
│      想的？                │
│                            │
│   ┌────────────────────┐   │
│   │ 输入你的回答...     │   │
│   └────────────────────┘   │
│              [发送]        │
│                            │
│   ─────────────────────    │
│                            │
│   风格选择：               │
│   [简约] [手账] [暗黑]     │
│                            │
│   ┌────────────────────┐   │
│   │    ✨ 生成笔记      │   │
│   └────────────────────┘   │
│                            │
└────────────────────────────┘
```

#### 笔记详情页面 `/note/{id}`

```
┌────────────────────────────┐
│  ← 返回                    │
├────────────────────────────┤
│                            │
│   ┌────────────────────┐   │
│   │                    │   │
│   │   生成的精美笔记    │   │
│   │   图片展示         │   │
│   │                    │   │
│   │   (长按保存)       │   │
│   │                    │   │
│   └────────────────────┘   │
│                            │
│   📚 数学 · 函数求导       │
│   🕐 2025-12-27 10:30     │
│                            │
│   💡 关键要点：            │
│   "先求定义域，再求导"     │
│                            │
│   ┌────────────────────┐   │
│   │   💾 保存到相册     │   │
│   └────────────────────┘   │
│                            │
└────────────────────────────┘
```

---

## 8. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 图片上传失败 | 提示重试，检查网络 |
| AI对话超时 | 显示loading，15s超时提示重试 |
| 图片生成失败 | 重试一次，失败则提示稍后再试 |
| Gemini限流 | 指数退避重试（最多3次） |

---

## 9. MVP简化决策

| 完整方案 | MVP简化 | 原因 |
|---------|--------|------|
| PostgreSQL | JSON文件 | 快速开发，数据量小 |
| 用户系统 | 无需登录 | 先验证核心价值 |
| 云存储 | 本地存储 | 简化部署 |
| 多端适配 | H5优先 | 聚焦移动端 |
| OCR服务 | Qwen多模态 | 减少依赖 |

---

## 10. 后续扩展点

- [ ] 语音输入（通义听悟）
- [ ] 用户系统（微信登录）
- [ ] 云端同步
- [ ] 错题复习提醒
- [ ] 更多图片风格
- [ ] 分享功能
