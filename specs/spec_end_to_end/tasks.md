# 实施计划

- [x] 初始化 AI 客户端与配置
  - 新增 `QwenClient` 支持 `qwen3-vl-plus` 多模态调用（图片上传 base64/URL、JSON 输出校验、重试策略）
  - 接入 API Key 存储与健康检查接口
  - 需求：8

- [x] 后端数据模型与接口扩展
  - 创建 `GradingSession`、`ProcessingLog` 数据表，扩展 Exam/Question/Submission/Response 字段
  - 实现 `/grading/sessions`、`/exams/draft`、`/ai/grade`、`/submissions/history` 等新接口
  - 新接口调用 AI 客户端解析试卷、批改学生试卷
  - 需求：2,3,4,5,7,8

- [x] 前端批改向导框架
  - 新建 `/grading/wizard` 路由与 Wizard Shell 组件，实现 Step0 CTA 与 Breadcrumb
  - 实现 `useWizardStore` 状态管理与 session 恢复逻辑
  - 需求：1,2,8

- [x] Step1 试卷配置前端改造
  - 构建“选择已有试卷/新建试卷”界面，接入 `POST /exams/draft`
  - 可编辑题目结构与人工确认流程
  - 需求：2

- [x] Step2 标准答案校对
  - 渲染单题大卡、进度条，连接答题确认 API
  - 需求：3

- [x] Step3 学生试卷上传与队列
  - 实现上传控件、队列状态展示、置信度提示
  - 调用扩展的 `uploadSubmission` 并处理异步结果
  - 需求：4

- [x] Step4 工作台与 Step5 完成页
  - 实现三栏复核工作台（队列/题目导航/人工批注）、手动调分入口与处理日志
  - 完成页提供导出/练习/重启操作，后续可补充卷面预览与更多提示

- [ ] 历史中心与回放
  - UploadCenter 已输出历史列表与向导入口，后续补充筛选、日志详情、继续补批入口
  - 需求：7,8

- [ ] 测试与质量保障
  - 编写单元/接口/前端集成测试，模拟完整端到端流程
  - 完成文档更新（用户引导、内部实现说明双轨）
  - 需求：1-8
