# Upload Center 历史回放 / Upload Center History Playback

## 模块目标 / Objectives
- **CN**：为教师提供带筛选条件的�?0条上传记录回放，快速定位需要继续人工复核的考卷�?- **EN**: Provide teachers a filtered list of the latest 20 uploads so they can quickly resume or review specific submissions.
- **CN**：串�?OCR �?自动批改 �?AI 总结 �?教师复核等关键节点，补全处理轨迹�?- **EN**: Capture the complete processing trail including OCR, auto grading, AI summaries, and teacher overrides.

## 新增后端能力 / Backend Enhancements
- **CN**：新�?`ProcessingLog` 表以�?`/submissions/history`、`/submissions/{id}/logs` 两个接口，返回处理步骤、匹配分与操作日志�?- **EN**: Added the `ProcessingLog` table and two endpoints (`/submissions/history`, `/submissions/{id}/logs`) exposing processing steps, matching score, and timeline logs.
- **CN**：上传流程会�?OCR 与批改步骤写�?`Submission.extra_metadata.processing_steps`，并计算题目匹配度�?- **EN**: The upload pipeline now stores normalized processing steps in `Submission.extra_metadata.processing_steps` and calculates the question matching ratio.
- **CN**：人工改分会自动写入“教师复核”日志，便于追踪线下干预�?- **EN**: Manual score overrides append a "��ʦ����" log entry so human interventions remain traceable.

## 前端交互 / Frontend Experience
- **CN**：UploadCenter 页面增加状态、考试、学生联合筛选，并以颜色区分成功/警告/失败步骤�?- **EN**: UploadCenter supports combined status/exam/student filters and color codes steps by success, warning, or error.
- **CN**：详情抽屉展示处理日志（含触发方标识）与时间戳，支持一键回到对应批改向导步骤�?- **EN**: The detail drawer lists processing logs with actor badges and timestamps, and offers quick links back into the grading wizard.

## 测试与验�?/ Testing
- **CN**：新�?`backend/tests/test_submission_history.py` 覆盖上传→回放→日志链路，并�?`monkeypatch` 模拟 OCR/批处理�?- **EN**: Added `backend/tests/test_submission_history.py` to exercise the upload-to-history-to-log flow using monkeypatched OCR and grading services.
- **CN**：执�?`pytest backend/tests/test_submission_history.py` 验证 API 行为，前端可使用 `npm run dev` 手动核验筛选与日志呈现�?- **EN**: Run `pytest backend/tests/test_submission_history.py` to validate backend behavior; use `npm run dev` for manual UI verification.
