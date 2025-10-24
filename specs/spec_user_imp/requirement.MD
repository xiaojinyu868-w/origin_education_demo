# 需求文档

## 介绍
本规格聚焦“错题批改”MVP 的核心痛点：标准答案与 AI 批改需要逐题确认、复合题号匹配失败、答案输出过度扩写、导出步骤阻断不清晰。方案坚持依托 Qwen3 大模型的能力，通过提示词和轻量规则实现灵活匹配，并在前端提供世界级但极简的交互体验；所有教师可见文案均使用中文。

## 需求

### 需求 1 - 批改关键步骤一键确认

**用户故事：** 作为改卷教师，我希望在标准答案校对与 AI 批改确认阶段都能一键完成批量确认，避免逐题点击，从而更快完成整套流程。

#### 验收标准

1. While 当前试卷存在未确认答案，when 教师在「标准答案校对」页点击「一键确认全部」，the Grading Wizard shall 将该试卷所有题目标记为 `confirmed`，刷新确认进度并允许直接跳转到下一步骤。
2. While 教师逐题编辑答案，when 任意题目保存成功，the Grading Wizard shall 自动更新「已确认 / 总题数」统计，并在概览提示剩余待确认数量（中文文案）。
3. While 所有题目已确认，when 教师点击「下一步」，the Grading Wizard shall 不再弹出“需逐题确认”的阻断提示，并直接进入「学生试卷上传」或「AI 批改确认」。
4. While AI 批改确认列表存在 `pending` 或 `needs_review` 状态，when 教师点击「一键通过当前筛选」，the Review Console shall 将当前筛选范围内的待确认项批量标记为已通过，并在日志中记录操作。

### 需求 2 - 灵活对应复合题号与子问

**用户故事：** 作为改卷教师，我希望 5(1)、5① 等复合题号在标准答案、学生答案和 AI 批改结果之间都能正确对应，避免因题号格式差异导致匹配失败。

#### 验收标准

1. While Qwen 解析到包含括号或序号的题目，when 返回试卷结构时，the Ingestion Pipeline shall 要求模型输出 `subQuestions` 数组，每个对象必须含 `label` 与 `normalizedLabel`（统一半角括号或连字符、保持中文提示）。
2. While 试卷结构写入数据库，when 系统创建题目记录时，the Ingestion Pipeline shall 将 `normalizedLabel` 作为黄金匹配字段写入 `extra_metadata.normalizedNumber`，同时保留原始 `label` 以便展示。
3. While 学生卷 OCR 结果回传，when 大模型给出题号映射，the Matching Logic shall 优先使用黄金字段匹配；若未命中，则按字符集合重叠度 ≥ 80% 的规则回退，并将匹配策略写入 `Response.extra_metadata.matchStrategy`，值为中文（例如“黄金匹配”“字符占比回退”）。
4. While 匹配结果进入复核队列，when 教师查看题目卡片，the Review Console shall 仅通过中文状态徽标或提示气泡说明匹配策略（如“自动匹配”“待核对”），默认不显示冗长文本，教师需进一步了解时可点击了解详情。

### 需求 3 - 答案输出模式与可疑提示

**用户故事：** 作为改卷教师，我希望能够控制 AI 是否扩展答案，并在填空题场景下看到“可疑但接近”的提示，以便人工裁决。

#### 验收标准

1. While 教师在标准答案校对阶段配置试卷，when 切换答案模式为「严格匹配」，the Prompt Builder shall 注入“禁止扩展答案，仅复述教师答案，如不足请在 `blockedSupplement` 写中文原因”的提示，并将该模式写入试卷元数据。
2. While 答案模式为「严格匹配」，when Qwen 判断教师答案不足以覆盖判定，the Prompt Builder shall 指示模型在 `blockedSupplement` 字段输出中文原因而不新增候选答案，the Grading Engine shall 回显该原因并将题目标记为待确认。
3. While 答案模式为「智能参考」，when Qwen 判断学生答案与标准答案接近但不完全一致，the Prompt Builder shall 指示模型输出 `suspiciousMatches`（含原文、相似理由、建议得分、置信度，全部中文），后端据此将题目标记为 `needs_review`。
4. While Review Console 接收到 `suspiciousMatches` 项，when 教师查看题目详情，the UI shall 显示中文徽章“可疑匹配”及模型解释，并提供「采纳」「改判」「继续待查」三个中文操作按钮。

### 需求 4 - 批改流程导航与导出流程修复

**用户故事：** 作为改卷教师，我希望整个批改流程的导航逻辑直观统一，导出步骤明确无歧义，并且默认界面只呈现必要信息。

#### 验收标准

1. While 教师通过导航条在流程步骤间跳转，when 某步骤存在阻断条件，the Grading Wizard shall 在导航条与页面顶部同步显示中文阻断原因，并提供“立即处理”入口。
2. While 所有必需步骤满足完成条件（标准答案已确认、至少处理一份学生卷），when 教师进入「完成并导出」页，the Completion Page shall 自动激活主按钮并展示将要导出的内容摘要（中文）。
3. While 任一步骤未满足完成条件，when 教师点击「完成并导出」，the Completion Page shall 弹出中文阻断模态，列出未完成项并附跳转链接。
4. While 教师在导出页完成操作，when 导出流程成功，the Completion Page shall 提供「返回批改详情」「查看导出记录」「重新开始批改」三个中文 CTA，符合苹果、微软、谷歌等大厂的最新设计风格。
5. While 教师需要查看批改过程记录，when 点击「操作历史」入口时，the Grading Wizard shall 在独立容器（抽屉或模态）中展示日志列表，默认主界面不显示日志内容，所有标题与标签为中文。
6. While 页面存在辅助信息，when 信息非当前必要，the Grading Wizard shall 通过折叠或悬浮提示的渐进披露方式显示，保持主界面仅保留核心操作与状态。
