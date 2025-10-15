import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Badge, Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber, List, Modal, Row, Select, Space, Spin, Tag, Typography, Upload, message, } from "antd";
import { InboxOutlined, PlusOutlined, ReloadOutlined, SettingOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createExam, fetchAssistantStatus, fetchExamDraft } from "../../api/services";
import { useWizardStore } from "../useWizardStore";
import LlmConfigModal from "../../components/LlmConfigModal";
import useResponsive from "../../hooks/useResponsive";
const { Title, Text, Paragraph } = Typography;
const QUESTION_TYPE_OPTIONS = [
    { label: "选择题", value: "multiple_choice" },
    { label: "填空题", value: "fill_in_blank" },
    { label: "主观题", value: "subjective" },
];
const normalizeType = (value) => {
    const normalized = String(value ?? "multiple_choice").toLowerCase();
    if (normalized.includes("fill"))
        return "fill_in_blank";
    if (normalized.includes("subject"))
        return "subjective";
    return "multiple_choice";
};
const safeString = (value, fallback = "") => (typeof value === "string" ? value : fallback);
const outlineToFormValues = (outline) => {
    const questions = Array.isArray(outline.questions) ? outline.questions : [];
    return {
        title: safeString(outline.title, "未命名试卷"),
        subject: safeString(outline.subject, undefined),
        questions: questions.map((item, index) => {
            const node = item && typeof item === "object" ? item : {};
            const number = safeString(node.number, String(index + 1));
            const prompt = safeString(node.prompt, "");
            const maxScore = Number(node.maxScore ?? node.max_score ?? 1) || 1;
            const answerKey = node.answerKey ?? node.answer_key ?? {};
            return {
                number,
                type: normalizeType(node.type),
                prompt,
                max_score: maxScore,
                knowledge_tags: safeString(node.knowledgeTags, undefined),
                answer_json: JSON.stringify(answerKey ?? {}, null, 2),
            };
        }),
    };
};
const parseAnswer = (value, index) => {
    const trimmed = value.trim();
    if (!trimmed)
        return {};
    try {
        return JSON.parse(trimmed);
    }
    catch (error) {
        throw new SyntaxError(`题目 ${index + 1} 的答案 JSON 无法解析`);
    }
};
const StepExamConfig = () => {
    const { state: { teachers, teacherId, exams, examsLoading, selectedExamId, savingStep }, actions: { refreshExams, selectExam, setTeacher, goToStep }, } = useWizardStore();
    const { isMobile, isTablet } = useResponsive();
    const isCompact = isMobile || isTablet;
    const [draftModalOpen, setDraftModalOpen] = useState(false);
    const [draftPreview, setDraftPreview] = useState(null);
    const [draftLoading, setDraftLoading] = useState(false);
    const [draftError, setDraftError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();
    const [, setFileList] = useState([]);
    const [llmStatus, setLlmStatus] = useState("unknown");
    const [configVisible, setConfigVisible] = useState(false);
    const selectedExam = useMemo(() => exams.find((exam) => exam.id === selectedExamId), [exams, selectedExamId]);
    const teacherOptions = useMemo(() => teachers.map((teacher) => ({ label: teacher.name, value: teacher.id })), [teachers]);
    const refreshLlmStatus = useCallback(async () => {
        try {
            const { available } = await fetchAssistantStatus();
            setLlmStatus(available ? "available" : "unavailable");
        }
        catch (_error) {
            setLlmStatus("unavailable");
        }
    }, []);
    const canUpload = Boolean(teacherId);
    const llmReady = llmStatus === "available";
    const uploadDisabled = !canUpload || draftLoading || teacherOptions.length === 0 || !llmReady;
    const statusTag = useMemo(() => {
        if (llmStatus === "unknown") {
            return null;
        }
        return llmReady
            ? { color: "success", label: "AI ?????" }
            : { color: "warning", label: "??????" };
    }, [llmReady, llmStatus]);
    useEffect(() => {
        void refreshLlmStatus();
    }, [refreshLlmStatus]);
    useEffect(() => {
        if (!teacherId && teachers.length > 0) {
            void setTeacher(teachers[0].id);
        }
    }, [teacherId, teachers, setTeacher]);
    const uploadProps = {
        multiple: false,
        showUploadList: false,
        accept: "image/*",
        beforeUpload: (file) => {
            if (!canUpload) {
                message.warning("请先选择负责教师");
                return Upload.LIST_IGNORE;
            }
            void handleDraftUpload(file);
            return false;
        },
        disabled: uploadDisabled,
    };
    const handleDraftUpload = async (file) => {
        if (!teacherId) {
            message.warning("请先选择负责教师后再上传试卷");
            return;
        }
        setDraftLoading(true);
        setDraftError(null);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("teacher_id", String(teacherId));
            const response = await fetchExamDraft(formData);
            setDraftPreview(response);
            form.setFieldsValue(outlineToFormValues(response.outline));
            message.success("试卷解析完成，请核对信息");
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "试卷解析失败"));
            setDraftError(detail);
            setDraftPreview(null);
            form.resetFields();
            message.error(detail);
        }
        finally {
            setDraftLoading(false);
        }
    };
    const handleCreateExam = async () => {
        if (!teacherId) {
            message.warning("请先选择负责教师后再上传试卷");
            return;
        }
        try {
            const values = await form.validateFields();
            const payload = values.questions.map((question, index) => ({
                number: question.number.trim() || String(index + 1),
                type: question.type,
                prompt: question.prompt.trim(),
                max_score: Number(question.max_score) || 1,
                knowledge_tags: question.knowledge_tags?.trim() || undefined,
                answer_key: parseAnswer(question.answer_json, index),
            }));
            setCreating(true);
            const created = await createExam({
                title: values.title.trim() || "未命名试卷",
                subject: values.subject?.trim() || undefined,
                teacher_id: teacherId,
                questions: payload,
                source_image_path: draftPreview?.source_image_path,
                parsed_outline: draftPreview?.outline,
            });
            message.success(`试卷「${created.title}」已创建`);
            await refreshExams();
            selectExam(created.id);
            setDraftModalOpen(false);
            setDraftPreview(null);
            setFileList([]);
            form.resetFields();
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                message.error(error.message);
                return;
            }
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "保存试卷失败"));
            message.error(detail);
        }
        finally {
            setCreating(false);
        }
    };
    const handleProceed = async (examId) => {
        try {
            await goToStep(2, { examId });
            message.success("已进入标准答案校对阶段");
        }
        catch (error) {
            const detail = (error?.response?.data?.detail ||
                (error instanceof Error ? error.message : "无法进入下一步"));
            message.error(detail);
        }
    };
    const resetModal = () => {
        setDraftModalOpen(false);
        setDraftPreview(null);
        setDraftError(null);
        setFileList([]);
        form.resetFields();
    };
    return (_jsxs(Space, { direction: "vertical", size: 24, style: { width: "100%" }, children: [_jsxs("div", { style: {
                    display: "flex",
                    flexDirection: isCompact ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isCompact ? "flex-start" : "center",
                    gap: isCompact ? 16 : 24,
                }, children: [_jsxs(Space, { direction: "vertical", size: 8, style: { flex: 1, maxWidth: isCompact ? "100%" : 620 }, children: [_jsx(Title, { level: isCompact ? 4 : 3, style: { marginBottom: 0 }, children: "\u9009\u62E9\u8BD5\u5377\uFF0C\u5F00\u542F\u6279\u6539\u65C5\u7A0B" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u4ECE\u5DF2\u6709\u8BD5\u5377\u4E2D\u5FEB\u901F\u8FDB\u5165\u6279\u6539\uFF0C\u6216\u4E0A\u4F20\u626B\u63CF\u4EF6\u8BA9 AI \u81EA\u52A8\u89E3\u6790\u7ED3\u6784\u3002" })] }), _jsxs(Space, { size: 12, align: "center", wrap: true, style: { width: isCompact ? "100%" : "auto", justifyContent: isCompact ? "flex-start" : "flex-end" }, children: [teachers.length === 0 ? (_jsx(Alert, { type: "warning", showIcon: true, message: "\u8BF7\u5148\u5728\u73ED\u7EA7\u642D\u5EFA\u4E2D\u521B\u5EFA\u6559\u5E08\u4FE1\u606F", description: "\u4E0A\u4F20\u8BD5\u5377\u9700\u8981\u7ED1\u5B9A\u6559\u5E08\u8D26\u53F7\uFF0C\u53EF\u5728\u73ED\u7EA7\u642D\u5EFA\u9875\u9762\u6DFB\u52A0\u3002" })) : (_jsx(Select, { style: { width: isCompact ? "100%" : 220 }, placeholder: "\u9009\u62E9\u8D1F\u8D23\u6559\u5E08", value: teacherId ?? undefined, options: teacherOptions, onChange: (value) => {
                                    void setTeacher(value);
                                } })), statusTag && _jsx(Tag, { color: statusTag.color, children: statusTag.label }), _jsx(Button, { icon: _jsx(SettingOutlined, {}), type: llmReady ? "default" : "primary", ghost: llmReady, onClick: () => {
                                    setConfigVisible(true);
                                }, block: isCompact, children: "\u914D\u7F6E\u5927\u6A21\u578B" }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: () => refreshExams(), loading: examsLoading, block: isCompact, children: "\u5237\u65B0\u5217\u8868" }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setDraftModalOpen(true), disabled: !teacherId || !llmReady, block: isCompact, children: "\u65B0\u5EFA\u8BD5\u5377" })] })] }), llmStatus === "unavailable" && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5C1A\u672A\u914D\u7F6E\u5927\u6A21\u578B API Key", description: "\u4E0A\u4F20\u626B\u63CF\u4EF6\u9700\u8981\u8C03\u7528 AI \u89E3\u6790\uFF0C\u8BF7\u5148\u5B8C\u6210\u914D\u7F6E\u3002", action: _jsx(Button, { size: "small", type: "primary", icon: _jsx(SettingOutlined, {}), onClick: () => setConfigVisible(true), children: "\u7ACB\u5373\u914D\u7F6E" }) })), _jsxs(Row, { gutter: [24, 24], wrap: true, children: [_jsx(Col, { xs: 24, xl: 14, children: _jsx(Card, { title: "\u9009\u62E9\u5DF2\u6709\u8BD5\u5377", bodyStyle: { padding: 0 }, style: { borderRadius: 20 }, children: _jsx("div", { style: { padding: 20 }, children: examsLoading ? (_jsx("div", { style: { display: "flex", justifyContent: "center", padding: "80px 0" }, children: _jsx(Spin, { size: "large" }) })) : exams.length === 0 ? (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: teacherId ? "暂无试卷" : "请先选择负责教师" })) : (_jsx(List, { grid: { gutter: 16, column: 2 }, dataSource: exams, renderItem: (exam) => {
                                        const active = exam.id === selectedExamId;
                                        return (_jsx(List.Item, { children: _jsx(Card, { hoverable: true, onClick: () => selectExam(exam.id), style: {
                                                    borderRadius: 18,
                                                    border: active ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                                                    boxShadow: active
                                                        ? "0 18px 42px rgba(37,99,235,0.18)"
                                                        : "0 14px 36px rgba(15,23,42,0.08)",
                                                }, children: _jsxs(Space, { direction: "vertical", size: 6, children: [_jsxs(Space, { align: "center", size: 8, children: [_jsx(Text, { strong: true, children: exam.title }), exam.subject && _jsx(Tag, { color: "blue", children: exam.subject })] }), _jsxs(Text, { type: "secondary", children: ["\u9898\u76EE\u6570\u91CF\uFF1A", exam.questions.length] }), _jsxs(Text, { type: "secondary", children: ["\u7B54\u6848\u7248\u672C\uFF1AV", exam.answer_key_version] }), active && _jsx(Tag, { color: "geekblue", children: "\u5F53\u524D\u9009\u62E9" })] }) }) }, exam.id));
                                    } })) }) }) }), _jsx(Col, { xs: 24, xl: 10, children: _jsx(Card, { title: "\u8BD5\u5377\u6458\u8981", style: { borderRadius: 20 }, bodyStyle: { padding: 24 }, children: selectedExam ? (_jsxs(Space, { direction: "vertical", size: 20, style: { width: "100%" }, children: [_jsxs(Descriptions, { column: 1, labelStyle: { fontWeight: 600, width: 120 }, children: [_jsx(Descriptions.Item, { label: "\u8BD5\u5377\u540D\u79F0", children: selectedExam.title }), _jsx(Descriptions.Item, { label: "\u6240\u5C5E\u5B66\u79D1", children: selectedExam.subject ?? "--" }), _jsx(Descriptions.Item, { label: "\u9898\u76EE\u6570\u91CF", children: _jsx(Badge, { color: "#2563eb", text: `${selectedExam.questions.length} 道` }) }), _jsxs(Descriptions.Item, { label: "\u7B54\u6848\u7248\u672C", children: ["V", selectedExam.answer_key_version] }), _jsx(Descriptions.Item, { label: "\u6765\u6E90", children: selectedExam.source_image_path ? "由扫描件解析" : "手动创建" })] }), _jsx(Button, { type: "primary", size: "large", shape: "round", loading: savingStep, onClick: () => handleProceed(selectedExam.id), children: "\u524D\u5F80\u6807\u51C6\u7B54\u6848\u6821\u5BF9" }), _jsx(Text, { type: "secondary", children: "\u786E\u8BA4\u8BD5\u5377\u4FE1\u606F\u65E0\u8BEF\u540E\uFF0C\u70B9\u51FB\u6309\u94AE\u8FDB\u5165\u4E0B\u4E00\u9636\u6BB5\u3002" })] })) : (_jsx(Empty, { description: "\u8BF7\u9009\u62E9\u5DE6\u4FA7\u8BD5\u5377\u67E5\u770B\u6458\u8981", image: Empty.PRESENTED_IMAGE_SIMPLE })) }) })] }), _jsx(Modal, { title: "\u65B0\u5EFA\u8BD5\u5377", open: draftModalOpen, width: 960, onCancel: resetModal, onOk: handleCreateExam, okText: "\u4FDD\u5B58\u5E76\u8BBE\u4E3A\u5F53\u524D\u8BD5\u5377", cancelText: "\u53D6\u6D88", confirmLoading: creating, okButtonProps: { disabled: draftLoading || !draftPreview }, destroyOnClose: true, children: _jsxs(Space, { direction: "vertical", size: 20, style: { width: "100%" }, children: [teacherOptions.length > 0 ? (_jsxs(Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [_jsx(Text, { strong: true, children: "\u8D1F\u8D23\u6559\u5E08" }), _jsx(Select, { placeholder: "\u9009\u62E9\u8D1F\u8D23\u6559\u5E08", value: teacherId ?? undefined, options: teacherOptions, onChange: (value) => {
                                        void setTeacher(value);
                                    } }), !teacherId && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u8BF7\u5148\u9009\u62E9\u8D1F\u8D23\u6559\u5E08\uFF0C\u518D\u4E0A\u4F20\u626B\u63CF\u4EF6" }))] })) : (_jsx(Alert, { type: "warning", showIcon: true, message: "\u6682\u672A\u68C0\u6D4B\u5230\u6559\u5E08\u8D26\u53F7", description: "\u8BF7\u5148\u5728\u73ED\u7EA7\u642D\u5EFA\u4E2D\u521B\u5EFA\u6559\u5E08\u4FE1\u606F\uFF0C\u8FD4\u56DE\u6B64\u5904\u540E\u5373\u53EF\u4E0A\u4F20\u8BD5\u5377\u3002" })), _jsxs(Upload.Dragger, { ...uploadProps, children: [_jsx("p", { className: "ant-upload-drag-icon", children: _jsx(InboxOutlined, {}) }), _jsx("p", { className: "ant-upload-text", children: "\u62D6\u62FD\u6216\u70B9\u51FB\u4E0A\u4F20\u8BD5\u5377\u626B\u63CF\u4EF6" }), _jsx("p", { className: "ant-upload-hint", children: "\u7CFB\u7EDF\u5C06\u8C03\u7528 AI \u81EA\u52A8\u89E3\u6790\u9898\u76EE\u7ED3\u6784\uFF0C\u5EFA\u8BAE\u6E05\u6670\u5EA6 \u2265 300dpi" })] }), draftLoading && _jsx(Alert, { type: "info", showIcon: true, message: "\u6B63\u5728\u89E3\u6790\u8BD5\u5377\uFF0C\u8BF7\u7A0D\u5019\u2026" }), draftError && _jsx(Alert, { type: "error", showIcon: true, message: draftError }), draftPreview && (_jsxs(Form, { form: form, layout: "vertical", children: [_jsx(Form.Item, { name: "title", label: "\u8BD5\u5377\u540D\u79F0", rules: [{ required: true, message: "请输入试卷名称" }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u9AD8\u4E00\u6570\u5B66\u6708\u8003\u5377" }) }), _jsx(Form.Item, { name: "subject", label: "\u5B66\u79D1", children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u6570\u5B66" }) }), _jsx(Form.List, { name: "questions", children: (fields) => (_jsx(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: fields.map((field, index) => (_jsxs(Card, { type: "inner", title: `题目 ${index + 1}`, style: { borderRadius: 16 }, children: [_jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: [field.name, "number"], label: "\u9898\u53F7", rules: [{ required: true, message: "请输入题号" }], children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A1" }) }) }), _jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: [field.name, "type"], label: "\u9898\u578B", rules: [{ required: true, message: "请选择题型" }], children: _jsx(Select, { options: QUESTION_TYPE_OPTIONS }) }) })] }), _jsx(Form.Item, { name: [field.name, "prompt"], label: "\u9898\u5E72\u63CF\u8FF0", rules: [{ required: true, message: "请输入题干" }], children: _jsx(Input.TextArea, { autoSize: { minRows: 2, maxRows: 4 }, placeholder: "\u8BF7\u8F93\u5165\u9898\u5E72" }) }), _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: [field.name, "max_score"], label: "\u5206\u503C", rules: [{ required: true, message: "请输入分值" }], children: _jsx(InputNumber, { min: 0, style: { width: "100%" } }) }) }), _jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { name: [field.name, "knowledge_tags"], label: "\u77E5\u8BC6\u70B9\u6807\u7B7E", children: _jsx(Input, { placeholder: "\u591A\u4E2A\u6807\u7B7E\u4EE5\u9017\u53F7\u5206\u9694" }) }) })] }), _jsx(Form.Item, { name: [field.name, "answer_json"], label: "\u6807\u51C6\u7B54\u6848\uFF08JSON \u683C\u5F0F\uFF09", rules: [{ required: true, message: "请填写标准答案" }], children: _jsx(Input.TextArea, { autoSize: { minRows: 3, maxRows: 6 }, placeholder: '{ "correct": "A" }' }) })] }, field.key))) })) })] }))] }) }), _jsx(LlmConfigModal, { open: configVisible, onClose: () => setConfigVisible(false), onUpdated: (status) => {
                    setLlmStatus(status.available ? "available" : "unavailable");
                    if (status.available) {
                        message.success("模型配置已更新，可以继续上传扫描件");
                    }
                } })] }));
};
export default StepExamConfig;
