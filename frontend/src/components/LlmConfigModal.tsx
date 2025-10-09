import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import { updateAssistantConfig } from "../api/services";
import type { LLMConfigStatus, LLMConfigUpdate } from "../types";

interface LlmConfigModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated?: (status: LLMConfigStatus) => void;
}

const LlmConfigModal = ({ open, onClose, onUpdated }: LlmConfigModalProps) => {
  const [form] = Form.useForm<LLMConfigUpdate>();
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
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "配置保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="配置大模型 API 接入"
      open={open}
      onCancel={handleCancel}
      onOk={() => {
        void handleSubmit();
      }}
      okText="保存配置"
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="API Key"
          name="api_key"
          rules={[{ required: true, message: "请输入 API Key" }]}
        >
          <Input.Password placeholder="请输入 DashScope API Key" autoComplete="new-password" allowClear />
        </Form.Item>
        <Form.Item
          label="Base URL"
          name="base_url"
          extra="可选，留空则使用 DashScope 兼容模式默认地址"
        >
          <Input placeholder="例如：https://dashscope.aliyuncs.com/compatible-mode/v1" allowClear />
        </Form.Item>
        <Form.Item label="文本模型" name="text_model" extra="可选，例如 qwen-max">
          <Input placeholder="模型名称" allowClear />
        </Form.Item>
        <Form.Item label="视觉模型" name="vision_model" extra="可选，例如 qwen3-vl-plus">
          <Input placeholder="模型名称" allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LlmConfigModal;
