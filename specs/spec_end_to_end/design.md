# 技术方案设计

## 1. 背景与目标

- 构建从首页 CTA 到批改历史回放的一体化批改向导，确保流程连续、上下文清晰。
- 在交付层面同时覆盖「前端用户引导」与「内部实现说明」，方便产品、设计、研发协作。
- 全流程统一接入通义千问多模态模型 `qwen3-vl-plus`（参考 `QWEN-VL-API-EXAMPLE.md`）完成试卷解析、答案抽取、批改比对与总结，不再依赖独立 OCR；所有模型输出需通过提示词约束为 JSON。
- 为后续支持多题型差异化批改策略、批改记录追溯等能力预留扩展点。

## 2. 现有架构概览

| 层级 | 技术栈 | 现状摘要 |
| --- | --- | --- |
| 前端 | React + Ant Design + Vite | `UploadCenter` 单页承载上传表单 + 历史列表，交互线性但缺少分步引导；缺少统一向导壳与标准化状态管理。 |
| 后端 | FastAPI + SQLModel + SQLite | 提供教师/班级/试卷 CRUD、提交上传、批改结果写入等接口，已具备配置 LLM API Key 的能力。仍需扩展流程 session、处理日志等结构。 |
| AI/处理 | 通义千问 `qwen3-vl-plus` | 通过统一的 AI 服务层调度多模态模型完成图文理解、答案抽取、批改与总结；调用需支持图片上传（base64 或 OSS URL），并强制 JSON 输出校验。 |

## 3. 总体方案

```
mermaid
flowchart TD
    A[工作台 CTA] --> B[批改向导壳]
    B --> C1[Step1 试卷配置]
    C1 --> C2[Step2 答案校对]
    C2 --> C3[Step3 学生上传]
    C3 --> C4[Step4 AI 批改确认]
    C4 --> C5[Step5 完成导出]
    C5 --> H[批改历史中心]
    H -->|查看详情| C4
    H -->|继续补批| C3
```

- 采用前端多步骤向导组件（Wizard Shell）承载五个核心步骤，保持单一主动作。
- 新增后端接口：试卷图片解析、批改流程状态保存/恢复、处理日志查询、AI 调用代理。
- 数据结构扩展：`Exam` 增加来源图片/解析 JSON 字段、`Submission` 增加处理日志与置信度信息。
- 把流程状态持久化并在首页记录「未完成流程」以便随时恢复。

## 4. 前端设计

### 4.1 路由与状态

| 页面 | 路由建议 | 状态管理 |
| --- | --- | --- |
| 工作台 | `/dashboard` | 全局 Context 存储未完成流程标记、最新批改结果。 |
| 批改向导 | `/grading/wizard` | Wizard context（当前步骤、已校验题目、上传队列、批改结果草稿）；需支持 URL 步骤编码避免刷新丢失。 |
| 历史中心 | `/grading/history` | 表格筛选条件保存在查询参数。 |

- 新增 `useWizardStore`（基于 React Context + reducer）统一管理步骤数据与 API 错误。
- 浏览器刷新时从后端拉取流程 session 恢复 `wizardPayload`。

### 4.2 组件拆分（含 UI 引导 vs 内部实现）

| 步骤 | 前端用户引导 | 内部实现说明 |
| --- | --- | --- |
| Step 0 CTA | 顶部 Hero 区，CTA + 两行提示；点击后淡入向导壳。 | 监听 CTA 点击 -> 跳转 `/grading/wizard?step=1`，调用 `POST /grading/sessions` 初始化流程。 |
| Step 1 试卷配置 | 仅两块区域（已有试卷卡片、`新建试卷` 按钮），右侧 Summary 卡片。 | 复用 `fetchExams` 获取卡片；新建流程调用 `POST /exams/draft` 上传图片；后端使用 `qwen3-vl-plus` 解析图片为 JSON（标题、科目、题目结构），验证后写入 `ExamDraft` state 并提交 `POST /exams`。 |
| Step 2 答案校对 | 单题卡 + 进度条 + `确认下一题` 按钮；题型差异化输入。 | 使用解析得到的题目结构渲染；本地 `checkedQuestions` map；提交 `PATCH /exams/{id}/answer-key`，并记录人工确认状态。 |
| Step 3 上传 | 左侧 dragger + 拍照引导，右侧队列状态； Toast 提示 `已加入批改队列，预计完成 X 秒`。 | 调用扩展后的 `uploadSubmission`，后端通过 `qwen3-vl-plus` 同时阅读标准答案 JSON 与学生卷面图片，输出规范 JSON：题号、学生答案、置信度（字符重合度字段）、差异说明；若置信度低写入 `manualReviewQueue`。 |
| Step 4 批改确认 | Notion Split View：左列分组过滤，中列图像 + 标注层，右列编辑表单。 | 使用 AI 返回的 `responses`、`mistakes`；前端提供人工覆盖/批注；调用 `PATCH /submissions/{id}/responses/{rid}` 同步人工调整。 |
| Step 5 完成 | 成功状态 + 三个 CTA + 温馨文案。 | 触发 `PATCH /grading/sessions/{id}/complete`；CTA 分别调用导出、练习生成、路由跳转。 |
| 历史中心 | 筛选表单 + 表格 + 操作按钮。 | 调用 `GET /submissions/history`（分页、筛选）；日志详情 `GET /submissions/{id}/logs`；“继续补批”恢复 session。 |

### 4.3 交互细节

- Breadcrumb 常驻在向导顶部，按步骤更新样式（完成/当前/待完成）。
- 所有按钮提供 loading/disable 状态；错误 Toast 给出重试建议。
- 未完成流程提示：工作台加载时调用 `GET /grading/sessions/active`，若存在则展示「继续/重开」对话框。

## 5. 后端设计

### 5.1 新增/调整接口

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/grading/sessions` | POST | 创建批改流程 session，返回 `session_id`、当前步骤。 |
| `/grading/sessions/{id}` | GET/PATCH | 获取或更新 session 状态（步骤、临时数据、最后活跃时间）。 |
| `/exams/draft` | POST | 接收试卷原始图片，调用 `qwen3-vl-plus` API 生成包含标题、科目、题目列表的 JSON 草稿（支持 base64 传输或 OSS URL）。 |
| `/exams/{id}/answer-key` | PATCH | 批量更新题目答案与校验状态。 |
| `/ai/grade` | POST | 统一 AI 代理：输入标准答案 JSON + 学生卷面图片，调用 `qwen3-vl-plus` 返回 JSON 批改结果、置信度、处理步骤。 |
| `/submissions/upload` | POST | 扩展上传接口，内部调用 `/ai/grade`，返回队列 ticket、预计完成时间、AI 置信度、matching_score。 |
| `/submissions/{id}/confirm` | PATCH | 更新题目确认状态、人工批注、分值。 |
| `/submissions/history` | GET | 历史查询接口，支持多维筛选与分页。 |
| `/submissions/{id}/logs` | GET | 查询处理日志（开始/结束时间、步骤、操作者、AI trace id、修改内容）。 |
| `/reports/{submission_id}` | GET | 导出报告（PDF/Excel）。

- Session 数据存于新表 `GradingSession`（字段：id、teacher_id、exam_id、current_step、payload(JSON)、status、updated_at）。
- 处理日志表：`ProcessingLog`（submission_id、step、actor_type、actor_id、ai_trace_id、detail、created_at）。

### 5.2 数据模型扩展

| 模型 | 新字段 | 用途 |
| --- | --- | --- |
| `Exam` | `source_image_path`、`parsed_outline`(JSON)、`answer_version` | 存储拍照原件与解析结构。 |
| `Question` | `answer_status`(enum: draft/confirmed)、`answer_confidence` | 标记答案校对情况。 |
| `Submission` | `session_id`、`overall_confidence`、`status_detail`、`ai_trace_id` | 关联流程 session、展示整体置信度与 AI 追踪编号。 |
| `Response` | `ai_confidence`、`review_status`、`teacher_comment`、`ai_raw`(JSON) | 支持置信度展示、人工批注和原始模型返回。 |

### 5.3 AI 服务与提示词策略

- **统一 AI 客户端**：扩展 `services` 中的客户端封装，读取 API Key/Endpoint，固定 `model="qwen3-vl-plus"`，支持多模态消息（`type: image_url` 或 `image_base64`）。
- **提示词结构化**：
  - 试卷解析 Prompt：明确输入为整张试卷照片，必须输出 `{ "title": str, "subject": str, "questions": [ { "number": str, "type": "multiple_choice"|"fill_in_blank"|"subjective", "prompt": str, "options": [...], "answer": str } ] }`，不得输出额外文字。
  - 批改 Prompt：提供标准答案 JSON、学生卷面图片，要求返回 `{ "responses": [...], "mistakes": [...], "processing_steps": [...], "summary": str, "matching_score": number }`，字段含义需在提示词中定义。
  - 如需生成总结/教学建议，复用同一模型的文本输出（若不涉及图像可切换文本角色，但仍保持 JSON）。
- **输出校验**：模型响应先做 `json.loads`；失败则根据策略自动重试一次，如仍失败返回错误并提示人工处理。
- **上传处理**：图片统一转存至对象存储或本地静态目录，生成可访问 URL，再传给模型；同时保留 base64 回退路径。

### 5.4 处理流程

1. **试卷新建**：上传图片 -> 文件服务存储 -> 调用 `qwen3-vl-plus` 解析 -> 校验题目结构 -> 返回前端。
2. **学生批改**：前端提交学生图片 -> 后端调用 `/ai/grade` -> 模型输出响应 JSON -> 写入 `Submission` & `Response` -> 返回前端展示。
3. **人工确认与日志**：每次人工调整调用接口写入 `ProcessingLog`，并同步更新 `Response.review_status`；AI 每次调用记录 `ai_trace_id` 以便追踪。

## 6. 安全与权限

- Session 校验：所有 `/grading/sessions/*` 与 `/submissions/*` 接口校验当前教师身份。
- AI 调用安全：API Key 安全存储（环境变量/加密字段），通过服务器代理调用，防止泄露。
- 文件安全：上传图片限制大小/格式，与现有上传策略保持一致；必要时使用临时访问凭证。
- 审计：ProcessingLog 记录操作者类型、AI trace id、IP（可选）。

## 7. 性能 & 伸缩

- 模型调用采用异步任务（FastAPI BackgroundTasks 或 Celery/RQ）避免阻塞；队列返回预估完成时间。
- 流程状态 JSON 控制在 256KB 内；答题卡图片存储使用对象存储/本地文件系统加定期清理。
- 历史列表分页（默认 20 条）并允许条件查询走索引（对 `submission.status`、`exam_id`、`student_id` 建索引）。

## 8. 测试策略

| 级别 | 样例 |
| --- | --- |
| 单元测试 | Session 服务、AI 客户端参数拼装（mock qwen3-vl-plus）、试卷解析/批改结果解析、置信度计算。 |
| 接口测试 | Step1~Step5 API、AI 代理 `/ai/grade`、历史查询过滤、日志回放。 |
| 前端集成 | Wizard 步骤切换、未完成流程恢复、上传反馈、批改确认交互。 |
| 端到端 | 模拟完整批改：CTA -> 新建试卷 -> 校对 -> 上传 -> AI 批改 -> 人工确认 -> 导出 -> 历史回放。 |

## 9. 风险与应对

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| AI 输出不符合 JSON | 流程中断 | 强化提示词 + JSON schema 校验 + 自动重试；提供人工 fallback。 |
| 模型理解错误 | 批改结果不可信 | 展示置信度、手动确认入口；保留原始图片/解析文本供人工核对。 |
| Session 状态损坏 | 无法恢复流程 | 定期备份 payload，提供“重开流程”选项。 |
| 历史数据膨胀 | 查询性能下降 | 添加分页与索引，必要时归档旧记录。 |

## 10. 里程碑建议

1. 完成后端实体/接口扩展 + Session 管理 + `qwen3-vl-plus` 客户端封装。
2. 实现前端 Wizard 壳与 Step1-Step2 UI/数据串联（联通 AI 解析）。
3. 完成 Step3 上传队列 + AI 批改调用及置信度提示。
4. 实现 Step4 工作台 + Step5 成功页 + AI 总结展示。
5. 打通历史中心与回放，并展示 AI 处理日志。
6. 联调测试 + 文档更新（用户引导、内部说明双轨）。

