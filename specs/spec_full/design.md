# 技术方案设计

## 1. 架构概览
- **前端**：现有 React + Ant Design 应用新增“错题分析”视图，包括错题选择、分析展示、追问对话、历史列表。
- **后端**：FastAPI 新增 `/demo/insights` 体系下的错题分析子模块（例如 `/demo/mistakes/analysis`），复用 SQLModel 数据访问层；对外暴露异步分析接口与历史查询接口。
- **AI 服务**：调用通义千问（文本模型为主，若需要可附带题目截图 URL），依赖 `backend/app/services/llm.py` 的客户端封装，新增错题分析 Prompt 模板。
- **存储**：在 SQLite 中新增 `MistakeAnalysis` 与 `MistakeAnalysisDialog` 两张表，记录分析摘要和追问对话；复用 `ProcessingLog` 记录调用情况。

```
mermaid
flowchart TD
    A[教师选择错题] --> B[后端构造错题输入包]
    B --> C[LLM 调用封装]
    C -->|成功| D[解析并落库]
    D --> E[前端展示分析摘要/追问建议]
    E --> F[教师追问]
    F --> C
    D --> G[历史记录列表]
```

## 2. 模块与技术选型
- **错题数据收集**：复用现有 `Submission`、`Response`、`Mistake` 数据表，通过筛选题目 ID、学生 ID、考试 ID 获取错题信息。
- **LLM 请求构造**：在 `services/llm.py` 中新增 `generate_mistake_analysis(messages: list[dict], use_mock: bool)` 方法，支持 `use_mock` 走本地样例数据。
- **前端状态管理**：使用 React Query 管理分析任务、追问对话、历史记录，保持与现有 API 调用风格一致。
- **安全性**：分析数据仅对有权限教师可见；API 需验证教师身份并确保错题属于其班级；敏感文本在日志中脱敏。

## 3. 数据结构与接口设计

### 新增数据表
| 表名 | 字段 | 说明 |
| --- | --- | --- |
| `mistake_analysis` | id, session_id, exam_id, class_id, student_scope, top_n, input_snapshot, summary, created_at, created_by | 存储一次错题分析的概要及原始输入快照 |
| `mistake_analysis_dialog` | id, analysis_id, turn_index, role("teacher"/"assistant"), message, created_at | 存储追问对话历史 |

### 后端接口
| 方法 | 路径 | 描述 |
| --- | --- | --- |
| POST | `/demo/mistakes/analysis` | 创建错题分析任务，返回分析结果与建议 |
| POST | `/demo/mistakes/analysis/{analysis_id}/followups` | 在指定分析上追加追问 |
| GET | `/demo/mistakes/analysis` | 查询历史分析列表，支持考试/班级筛选 |
| GET | `/demo/mistakes/analysis/{analysis_id}` | 获取某次分析的详细摘要与对话 |
| GET | `/demo/mistakes/top-candidates` | 根据班级/考试/学生返回可选错题列表（含频次、知识点） |

所有接口复用 JWT/Session 校验，返回值统一包含 request_id，便于日志追踪。

### Prompt 模板（示例）
```
系统提示：你是一名教学分析助理，需要总结错题共性，输出 JSON：
{
  "overall_summary": "...",
  "knowledge_focus": [{"tag": "...", "reason": "..."}],
  "root_causes": ["...", "..."],
  "teacher_questions": ["...", "..."]
}
输入为多道题目，包含题干、标准答案、学生答案、错题频次、知识点标签等。
```

## 4. 前端交互设计
- **错题选择弹窗**：选择班级/学生/考试，展示候选错题表格（题目摘要、错题率、知识点），支持搜索和分页。
- **分析结果面板**：展示共性描述、知识点建议、错因剖析、追问建议卡片；顶部显示分析时间、Top N 参数。
- **追问对话区**：右侧浮层展示对话历史，提供推荐追问按钮和自由输入框。
- **历史记录页面**：列表视图按时间排序，点击进入详情（只读），支持“复用此分析”按钮将条件回填至选择弹窗。

## 5. 流程与时序
1. 前端请求可选错题列表 `/top-candidates`。
2. 教师选择题目并提交 `POST /analysis`。
3. 后端汇总错题数据 -> 构造 LLM 请求 -> 调用 Qwen API -> 解析结果。
4. 结果写入 `mistake_analysis` + `processing_log`，返回给前端。
5. 教师可继续追问：`POST /analysis/{id}/followups`。
6. 后端记录对话，返回追加的回答。
7. 历史查询调用 `GET /analysis`、`GET /analysis/{id}`。

## 6. 测试与质量保证
- **单元测试**：错题输入构造、对话上下文裁剪、Mock 模式返回。
- **接口测试**：使用 pytest + httpx 测试上述接口的成功与异常场景。
- **前端测试**：Cypress/Playwright 覆盖错题选择、分析展示、追问流程。
- **验证数据**：准备一份示例错题 JSON 作为 Mock，用于无网演示。

## 7. 安全与日志
- API 需校验教师对班级/考试的访问权限。
- `ProcessingLog` 记录每次 LLM 调用的 request_id、耗时、状态；错误时写入 detail 字段。
- 避免在日志中记录学生姓名，可仅保留匿名 ID。

## 8. 部署注意事项
- 保证 Qwen API Key 已在演示环境配置；Mock 切换通过环境变量或 `/setup` 页面设置。
- `mistake_analysis` 表数据量增长有限，可定期清理旧分析或限制历史保留数。
- 导出的 Markdown 文件存储于临时目录，定期清理。
