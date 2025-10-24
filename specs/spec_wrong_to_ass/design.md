# 技术方案设计

## 架构概览
- **前端**：沿用现有 `TeacherAssistant` 页面，新增错题上下文状态管理与 UI 组件；使用 React hooks + Ant Design 元件。无需引入新依赖。
- **后端**：继续使用 `/students/{id}/mistakes` 与 `/assistant/chat`。仅在业务层控制查询参数与 prompt 文案；不新增模型或表。
- **数据流**：
  ```mermaid
  flowchart LR
    Teacher-->UI["教师选择学生/时间范围"]
    UI-->API1["GET /students/{id}/mistakes?limit=10&order=recent"]
    API1-->UI
    UI-->Context["选中错题摘要生成 System Message"]
    Context-->API2["POST /assistant/chat"]
    API2-->UI
    UI-->Teacher
  ```

## 前端实现要点
1. **错题拉取 & 排序**  
   - 调用现有 `fetchStudentMistakes`，在服务层增加 limit/order 参数；若接口暂不支持则于前端截取最新 10 条并按 `error_count`、`last_seen_at` 排序。
   - 使用 `useEffect` 监听学生与时间范围，触发加载骨架状态。
2. **错题选择逻辑**  
   - 建立 `selectedMistakeIds` 与 `starredMistakeIds` state，默认全选。
   - 计算 tokens 估值：根据字符长度粗略估算（例如 `Math.ceil(totalChars / 4)`）。
3. **上下文拼接**  
   - 在 `handleSend` 中构造 `contextMessage`：
     ```ts
     const context = renderMistakeSummary(selectedMistakes, { template });
     const enrichedMessages = [contextMessage, ...baseHistory];
     ```
   - 模板文本控制在前端，确保无需修改接口 schema。
4. **结构化渲染**  
   - 在助手响应后，基于约定标题分割（正则匹配 `【共性诊断】` 等），生成卡片组件；若缺段落则显示“未提供”。
5. **异常处理**  
   - `fetch` 失败时保持选择状态，并显示 `message.error`。若返回 503/502，提示检查模型配置。

## 后端改动
1. **Prompt 调整**  
   - 更新 `TEACHER_ASSISTANT_PROMPT`，强调输入包含错题摘要并要求固定结构输出。示例：
     ```txt
     ... Read the upcoming <context> block summarizing selected mistakes.
     Format your response as:
     【共性诊断】...
     【课堂策略】...
     【家校建议】...
     ```
   - 若需区分模板，可在前端 user message 中增加指令，无需额外参数。
2. **错题 API 参数**（可选）  
   - 若要支持 limit/order，通过查询参数控制 `select` 语句排序（`created_at DESC, error_count DESC`）。保持向后兼容。

## 测试策略
- **单元**：
  - 前端 utility：错题排序、token 估算、上下文渲染函数。
  - 后端 prompt 构建：添加最小化字符串测试，确保段落标签存在。
- **集成**：
  - Mock `/students/{id}/mistakes` 返回多条错题，验证默认全选与提示条更新。
  - Mock `/assistant/chat` 输出示例，检查分段渲染与错误提示。
- **手工回归**：
  - 未配置模型情况下的错误处理。
  - 大量错题（>10）时的截取与警告。

## 安全与性能
- 所有新逻辑仅在既有接口之上，无新增权限点。继续依赖当前认证流程。
- 引入 token 估算与错题限制，避免构造超长请求造成 LLM 费用或性能异常。

