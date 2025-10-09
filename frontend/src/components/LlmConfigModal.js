import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import { updateAssistantConfig } from "../api/services";
const LlmConfigModal = ({ open, onClose, onUpdated }) => {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const handleCancel = () => {
        form.resetFields();
        onClose();
    };
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const status = await updateAssistantConfig(values);
            onUpdated?.(status);
            message.success("模型配置已更新");
            form.resetFields();
            onClose();
        }
        catch (error) {
            if (error?.errorFields) {
                return;
            }
            const detail = error?.response?.data?.detail;
            message.error(detail ?? "配置保存失败，请稍后重试");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Modal, { title: "\u914D\u7F6E\u5927\u6A21\u578B API \u63A5\u5165", open: open, onCancel: handleCancel, onOk: () => {
            void handleSubmit();
        }, okText: "\u4FDD\u5B58\u914D\u7F6E", confirmLoading: saving, destroyOnClose: true, children: _jsxs(Form, { form: form, layout: "vertical", children: [_jsx(Form.Item, { label: "API Key", name: "api_key", rules: [{ required: true, message: "请输入 API Key" }], children: _jsx(Input.Password, { placeholder: "\u8BF7\u8F93\u5165 DashScope API Key", autoComplete: "new-password", allowClear: true }) }), _jsx(Form.Item, { label: "Base URL", name: "base_url", extra: "\u53EF\u9009\uFF0C\u7559\u7A7A\u5219\u4F7F\u7528 DashScope \u517C\u5BB9\u6A21\u5F0F\u9ED8\u8BA4\u5730\u5740", children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1Ahttps://dashscope.aliyuncs.com/compatible-mode/v1", allowClear: true }) }), _jsx(Form.Item, { label: "\u6587\u672C\u6A21\u578B", name: "text_model", extra: "\u53EF\u9009\uFF0C\u4F8B\u5982 qwen-max", children: _jsx(Input, { placeholder: "\u6A21\u578B\u540D\u79F0", allowClear: true }) }), _jsx(Form.Item, { label: "\u89C6\u89C9\u6A21\u578B", name: "vision_model", extra: "\u53EF\u9009\uFF0C\u4F8B\u5982 qwen3-vl-plus", children: _jsx(Input, { placeholder: "\u6A21\u578B\u540D\u79F0", allowClear: true }) })] }) }));
};
export default LlmConfigModal;
