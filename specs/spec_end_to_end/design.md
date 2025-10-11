# 演示版技术方案

## 1. 系统架构概览
- **展示流程**：登录主页看到 CTA → 进入批改向导（Step1~Step5） → 洞察与练习页面 → 历史与复位。
- **模块划分**：
  - 前端单页应用（React + Ant Design）：负责页面导航、步骤状态、演示提示。
  - 后端 API（FastAPI + SQLModel + SQLite）：提供 Demo Session、试卷解析、学生批改、洞察及练习接口。
  - AI 服务（Qwen）：`qwen3-vl-plus` 处理图像解析与批改，`qwen-max` 生成总结/练习文案；支持 Mock 切换。
  - 资源文件：本地示例试卷、学生卷、练习 PDF，用于离线演示。
- **数据流**：
  - Session 保存当前演示上下文。
  - Exam/Question 存储试卷解析结果。
  - Submission/Response/ProcessingLog 记录批改与复核过程。
  - AnalyticsSnapshot / PracticeAssignment 保存洞察与练习数据。

## 2. 技术选型与栈
- 前端：React 18、Vite、Ant Design、React Router、React Query（缓存洞察数据）。
- 后端：FastAPI、SQLModel、SQLite、Pydantic，用 BackgroundTasks 处理批改任务。
- AI：OpenAI SDK 兼容模式调用阿里通义；Mock 通过本地 JSON（`demo_payloads/`）输出。
- 其他：Pillow + EasyOCR 作为解析兜底；Logging 使用标准库记录操作。

## 3. 数据与接口设计
### 数据表
| 表 | 关键字段 | 用途 |
| --- | --- | --- |
| `demo_session` | id, teacher_id, current_step, status, payload | 记录演示上下文 |
| `exam` / `question` | parsed_outline, answer_key, confidence | 试卷结构与答案 |
| `submission` | session_id, overall_confidence, status_detail | 学生批改结果 |
| `response` | ai_confidence, teacher_comment, ai_raw | 题目级批改细节 |
| `processing_log` | step, actor_type, detail, extra | 处理时间线（OCR/AI/人工） |
| `analytics_snapshot` | summary_payload | 洞察页使用的数据快照 |
| `practice_assignment` / `practice_item` | recommendation, student_ids | 练习预览 |
| `export_job`（可选） | type, file_path, status | 报告/练习下载 |

### 核心接口（均位于 `/demo` 前缀）
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/sessions` | 创建/恢复演示 Session |
| POST | `/exams/draft` | 试卷解析 |
| POST | `/exams` | 保存试卷 |
| PATCH | `/exams/{id}/answer-key` | 更新答案 |
| POST | `/submissions/upload` | 上传学生卷并批改 |
| GET | `/submissions/{id}` | 批改详情 |
| GET | `/submissions/{id}/logs` | 处理日志 |
| POST | `/analytics/snapshot` | 生成洞察数据 |
| POST | `/practice/previews` | 生成练习推荐 |
| GET | `/history` | 历史列表 |
| POST | `/reset` | 一键重置演示数据 |
| GET/POST | `/setup/config` | 查看并修改 Mock/LLM 配置（可合并为一个接口） |
接口统一支持参数 `use_mock=true` 以便离线演示。

## 4. 前端页面设计
1. **首页 `/demo`**：CTA、流程说明、素材检查提示、电量条。
2. **向导 `/demo/wizard`**：
   - Step1：示例试卷卡片 + 上传控件 + 解析结果侧栏。
   - Step2：题目卡片、置信度、确认按钮、进度条。
   - Step3：上传队列、匹配度、OCR/AI 状态。
   - Step4：学生列表、分数、AI 评语、抽屉复核 / 日志时间轴。
   - Step5：完成提示 + 洞察、练习、历史跳转按钮。
3. **洞察 `/demo/insights`**：班级概览卡片、知识点图、学生榜、学生抽屉、练习列表。
4. **历史 `/demo/history`**：表格筛选、详情抽屉（日志、练习摘要、导出记录）、重新打开按钮。
5. **设置 `/demo/setup`**：当前配置、重置按钮、Mock 切换。

## 5. AI/Mock 策略
- 默认模式：调用 Qwen，8 秒超时，失败自动重试一次。
- Mock 模式：读取 `demo_payloads/` 示例 JSON 直接返回，保证演示稳定。
- 所有请求/响应摘要写入 ProcessingLog，便于历史回放展示。
- 可通过环境变量 `DEMO_USE_MOCK` 或配置接口切换。

## 6. 安全与复位
- 演示环境使用 SQLite 与本地文件，重置时删除相关表并重新导入 seed 数据。
- LLM Key 存储于环境变量或配置文件，不在前端展示完整值。
- 重置操作写入日志，包含操作者时间戳。
- 导出的 PDF/练习文件存放在临时目录，可随重置清理。

## 7. 测试策略
- 单元测试：Session 状态流转、答案校对保存逻辑、Mock 数据解析。
- 集成测试：`/demo/exams/draft`、`/demo/submissions/upload`、`/demo/reset` 等接口完整路径。
- 前端测试：向导步骤切换、上传队列状态、练习按钮下载行为（可通过 Cypress 简单录制）。
- 演示彩排：重置 → 完整跑一次 → 验证洞察数据与练习下载 → 检查历史回放与日志。

## 8. 部署要点
- 推荐使用 `docker-compose` 启动前后端及 SQLite 文件卷。
- 提供 `scripts/reset_demo.py` 方便手动重置数据。
- 将 Demo 资源打包在仓库中（避免依赖外部网络）。

## 9. 后续扩展（可选）
- 接入更多示例试卷，增加试卷选择下拉。
- 为洞察页面加入动态图表与学生对比。
- 补充学生端 H5 页面，展示练习任务预览。
