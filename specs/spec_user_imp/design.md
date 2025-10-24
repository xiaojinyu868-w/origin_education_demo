# 设计方案

## 概述
在保持现有 Qwen3 大模型与 FastAPI + React 技术栈的前提下，通过最小化规则、提示词调优与页面交互重构，解决批改流程中“一题一确认”“复合题号无法匹配”“答案扩写失控”“导出流程不清晰”等体验问题。设计坚持“少即是多”，所有面向教师的文案与提示均使用中文，杜绝杂乱信息。

## 现状摘要
- `StepAnswerReview`、`StepReviewConfirm` 仅支持逐题操作，缺乏批量确认入口与清晰的状态反馈。
- 后端 `grading.auto_grade_submission` 直接按题号原文匹配，遇到 5(1) 等编号就失败，也未保留匹配策略说明。
- Qwen 默认允许补充答案，严格模式下难以阻止扩写；可疑答案缺乏统一结构。
- 导出流程由多个分散条件控制，遇到阻断只提示“需要逐题确认”，操作不透明。
- 操作日志直接显示在主界面，教师看到大量英文或技术词汇时容易迷惑。

## 目标架构
```mermaid
flowchart LR
  subgraph Frontend
    StepAnswerReview -->|一键确认全部| APIConfirmAll
    StepReviewConfirm -->|一键通过| APIBulkPass
    StepAnswerReview -->|切换答案模式| APIExamUpdate
    StepReviewConfirm -->|查看可疑项| APISubmission
    WizardShell --> CompletionGuard
  end
  subgraph Backend
    APIConfirmAll[POST /exams/{id}/answers/confirm_all]
    APIBulkPass[POST /submissions/{id}/responses/bulk_confirm]
    APIExamUpdate[PATCH /exams/{id}]
    APISubmission[GET /submissions/{id}]
    MatchSvc[Matching Service]
    PromptSvc[Qwen Prompt Builder]
    LogSvc[GET /wizard/logs]
  end
  StepAnswerReview --> APIConfirmAll
  StepReviewConfirm --> APIBulkPass
  StepAnswerReview --> APIExamUpdate
  StepReviewConfirm --> APISubmission
  WizardShell --> CompletionGuard --> LogSvc
  MatchSvc <--> PromptSvc
  APISubmission --> MatchSvc
```

## 前端设计
- **批量确认交互**：`StepAnswerReview` 顶部新增全局操作条，显示“当前题目”“已确认”“剩余待确认”和「一键确认全部」按钮；按钮成功后以进度条动画提示。批量操作的所有文案采用简体中文。
- **动态阻断提示**：`WizardProvider` 维护 `blockingReasons` 状态，导航条与页面顶部同步显示中文阻断说明，并提供立即处理的按钮，避免重复弹窗。
- **AI 批改确认**：`StepReviewConfirm` 顶部提供「一键通过」「标记为待查」两个批量操作。每个题卡只保留题号、分数、核心按钮，匹配策略通过“自动匹配”“待核对”等中文徽标轻量呈现，更多说明放入折叠提示。
- **答案模式切换**：标准答案页侧栏使用中文单选按钮「严格匹配」「智能参考」，下方附简明提示说明；切换后立即调用后端接口并在页面顶部展示状态 toast。
- **完成与导出**：完成页采用三栏卡片「数据概览」「导出目标」「后续操作」，主按钮为「完成并导出」。当条件未满足时，弹出包含待办事项的中文阻断模态，并附可跳转按钮。
- **操作历史容器**：导航栏右上角放置「操作历史」悬浮按钮，点击后打开全屏抽屉展示日志列表，可按时间、学生筛选。默认页面不展示日志，保证视觉简洁。
- **渐进披露**：次要信息（匹配策略、提示词说明、日志详情）全部通过 tooltip、折叠面板或抽屉按需显示，首屏只保留核心行动按钮。
- **视觉与动效**：沿用柔和阴影、流体栅格、渐进过渡动画；CTA 居中、长文案使用 14px/16px 中文字体，确保教师快速找到下一步操作。

## 后端设计
- **批量接口**：新增 `POST /exams/{exam_id}/answers/confirm_all` 批量更新 `answer_status`；新增 `POST /submissions/{submission_id}/responses/bulk_confirm` 支持按筛选条件批量通过，所有返回值内含中文字段 `message`。
- **题号结构**：Qwen 解析时强制输出 `subQuestions`，字段包括 `label`、`normalizedLabel`，例如 `{"label":"5(1)","normalizedLabel":"5-1","prompt":...}`。写入数据库时将 `normalizedLabel` 填入 `Question.extra_metadata.normalizedNumber`。
- **匹配逻辑**：新增 `lookup_question_by_label`，优先按黄金字段匹配；若失败，计算字符集合重叠度（>=0.8）作为回退，并在 `Response.extra_metadata.matchStrategy` 填写中文说明（如“黄金匹配”“字符占比回退”）。
- **可疑结构**：`Response.extra_metadata` 存储 `suspiciousMatches` 数组，元素包含 `answer`、`reason`、`suggestedScore`、`confidence`，均使用中文内容；`blockedSupplement` 字段记录严格模式下模型的阻断理由。
- **日志聚合**：`GET /wizard/logs` 输出按 session 分组的操作日志，字段包括 `time`、`actor`、`action`、`detail`，后端直接返回中文描述给前端抽屉展示。

## LLM 提示词策略
- **标准答案解析**：系统提示强调不可新增答案、必须输出 `subQuestions` 与 `normalizedLabel`，并说明所有字段需使用中文。严格模式附加语句：“仅复述教师提供的答案，如答案不足请在 blockedSupplement 给出中文原因，不得生成新答案。”
- **学生答案批改**：提示词要求按 `normalizedLabel` 输出题号，并在回答中给出“匹配度百分比”“可疑理由”中文描述。智能参考模式时引导模型列出 `suspiciousMatches`；严格模式默认不返回该字段。
- **结果校验**：后端校验当 strict 模式下返回 `blockedSupplement` 时不做自动修改；当 `suspiciousMatches` 不为空时自动将题目置为待查，并记录匹配策略。

## 数据模型与迁移
- `Question.extra_metadata` 新增 `normalizedNumber`（字符串）与 `hasSubQuestions`（布尔）。
- `Response.extra_metadata` 新增 `matchStrategy`、`suspiciousMatches`、`blockedSupplement`。
- 提供一次性脚本遍历既有题目，调用轻量函数生成 `normalizedNumber`，缺失时回填原题号。

## 测试策略
- **后端单测**：覆盖批量确认接口、字符占比匹配函数、strict/智能模式输出校验。
- **前端测试**：React Testing Library 验证批量按钮、阻断提示、操作历史抽屉的显示逻辑；快照测试确保页面文案均为中文。
- **人工回归**：准备含复合题号的试卷，在严格/智能模式下各走一次流程，检查匹配提示、可疑标记、导出动线。

## 安全与权限
- 新增接口沿用教师权限校验；批量操作采用事务保证一致性。
- 操作日志对敏感字段脱敏，仅展示题号和状态变化。

## 风险与缓解
- **模型未按指示输出**：通过提示词单测与结果校验保证 strict 模式不扩写；必要时在前端提示教师“答案需补充”。
- **批量操作误触**：执行前弹出确认气泡，并提供 3 秒撤销按钮。
- **字符占比回退误判**：提供操作历史入口和可疑徽标，让教师随时复核。

## 范围之外
- 不重构 OCR 流程、不引入新评分模型。
- 不改动学生端界面。
- 不实现非中文本地化；教师视图默认使用中文。
