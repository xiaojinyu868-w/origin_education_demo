import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  Modal,
  Row,
  Slider,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BulbOutlined,
  FireOutlined,
  SendOutlined,
  SettingOutlined,
  SlidersOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import PageLayout from "../components/PageLayout";
import LlmConfigModal from "../components/LlmConfigModal";
import type { AssistantMessage } from "../types";
import { fetchAssistantStatus } from "../api/services";

type ChatTuning = {
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
};

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const defaultTips: string[] = [
  "请帮我为函数图像这一节设计一堂40分钟的课堂讲评课，包括分层提问。",
  "根据最近错误率最高的三个知识点，给出专题小练和课后作业建议。",
  "生成一次家校沟通话术，主题是提醒家长陪伴错题复盘。",
];

const defaultTuning: ChatTuning = {
  temperature: 0.3,
  top_p: 0.9,
  presence_penalty: 0,
  frequency_penalty: 0,
};

const TeacherAssistant = () => {
  const [chatHistory, setChatHistory] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content:
        "你好，我是教研优化助手。告诉我班级情况或批改结果，我可以帮你梳理讲评策略、设计作业、生成家校沟通文案。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [llmStatus, setLlmStatus] = useState<"unknown" | "available" | "unavailable">("unknown");
  const [configVisible, setConfigVisible] = useState(false);
  const [tuningVisible, setTuningVisible] = useState(false);
  const [chatTuning, setChatTuning] = useState<ChatTuning>(defaultTuning);
  const [pendingTuning, setPendingTuning] = useState<ChatTuning>(defaultTuning);
  const streamControllerRef = useRef<AbortController | null>(null);

  const refreshLlmStatus = useCallback(async () => {
    try {
      const { available } = await fetchAssistantStatus();
      setLlmStatus(available ? "available" : "unavailable");
    } catch (error) {
      console.error(error);
      setLlmStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void refreshLlmStatus();
    return () => {
      streamControllerRef.current?.abort();
    };
  }, [refreshLlmStatus]);

  const handleTuningChange = (field: keyof ChatTuning) => (value: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return;
    }
    setPendingTuning((previous) => ({ ...previous, [field]: value }));
  };

  const handleTuningSubmit = () => {
    setChatTuning(pendingTuning);
    setTuningVisible(false);
    message.success("对话参数已更新");
  };

  const stopStreaming = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  const appendAssistantMessage = (content: string) => {
    setChatHistory((previous) => [...previous, { role: "assistant", content }]);
  };

  const updateAssistantMessage = (updater: (previous: string) => string) => {
    setChatHistory((previous) => {
      if (previous.length === 0) {
        return [{ role: "assistant", content: updater("") }];
      }
      const lastIndex = previous.length - 1;
      const lastMessage = previous[lastIndex];
      if (lastMessage.role !== "assistant") {
        return [...previous, { role: "assistant", content: updater("") }];
      }
      const next = [...previous];
      next[lastIndex] = { role: "assistant", content: updater(lastMessage.content) };
      return next;
    });
  };

  const handleSend = async (preset?: string) => {
    const prompt = (preset ?? input).trim();
    if (!prompt) {
      message.warning("请先输入想咨询的问题");
      return;
    }

    if (llmStatus === "unavailable") {
      message.warning("请先配置大模型的 API Key");
      return;
    }

    stopStreaming();

    const userMessage: AssistantMessage = { role: "user", content: prompt };
    const baseHistory = [...chatHistory, userMessage];
    setChatHistory([...baseHistory]);
    appendAssistantMessage("");
    setInput("");
    setSuggestions([]);
    setLoading(true);

    const controller = new AbortController();
    streamControllerRef.current = controller;

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: baseHistory,
          temperature: chatTuning.temperature,
          top_p: chatTuning.top_p,
          presence_penalty: chatTuning.presence_penalty,
          frequency_penalty: chatTuning.frequency_penalty,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `请求失败（${response.status}）`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("当前浏览器版本不支持流式输出，请升级或更换浏览器");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let streamFinished = false;

      const processEvent = (type: string | null, payload: unknown) => {
        if (!payload || typeof payload !== "object") {
          return;
        }
        const data = payload as Record<string, unknown>;

        switch (type) {
          case "answer_delta": {
            const text = typeof data.text === "string" ? data.text : "";
            if (text) {
              updateAssistantMessage((previous) => previous + text);
            }
            break;
          }
          case "answer_complete": {
            const text = typeof data.text === "string" ? data.text : "";
            if (text) {
              updateAssistantMessage(() => text);
            }
            break;
          }
          case "suggestions": {
            const items = Array.isArray(data.items)
              ? data.items.filter((item): item is string => typeof item === "string")
              : [];
            setSuggestions(items);
            break;
          }
          case "error": {
            const text = typeof data.message === "string" ? data.message : "大模型暂时不可用，请稍后再试或检查密钥配置";
            updateAssistantMessage(() => text);
            setSuggestions([]);
            message.error(text);
            if (text.includes("未检测到")) {
              setLlmStatus("unavailable");
            }
            break;
          }
          case "done": {
            streamFinished = true;
            stopStreaming();
            break;
          }
          default:
            break;
        }
      };

      const flushBuffer = (chunk: string) => {
        if (!chunk.trim()) {
          return;
        }
        const lines = chunk.split(/\r?\n/);
        let currentEvent: string | null = null;
        const dataLines: string[] = [];

        for (const raw of lines) {
          const line = raw.trim();
          if (!line) {
            continue;
          }
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim() || null;
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (dataLines.length === 0) {
          return;
        }

        try {
          const payload = JSON.parse(dataLines.join(""));
          processEvent(currentEvent, payload);
        } catch (error) {
          console.warn("流式事件解析失败", error);
        }
      };

      while (!streamFinished) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            flushBuffer(part);
          }
        }
        if (done) {
          break;
        }
      }

      if (buffer) {
        flushBuffer(buffer);
      }
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return;
      }
      console.error(error);
      const fallback = error instanceof Error ? error.message : "大模型暂时不可用，请稍后再试或检查密钥配置";
      updateAssistantMessage(() => fallback);
      setSuggestions([]);
      message.error(fallback);
      if (fallback.includes("未检测到")) {
        setLlmStatus("unavailable");
      }
    } finally {
      if (streamControllerRef.current === controller) {
        streamControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const quickActions = useMemo(
    () => [
      {
        icon: <BulbOutlined />,
        label: "讲评提纲",
        prompt: "请帮我根据错题生成一份课堂讲评提纲，包含导入、重难点拆解和课堂互动。",
      },
      {
        icon: <ThunderboltOutlined />,
        label: "作业建议",
        prompt: "结合最近的批改结果，推荐一份分层作业方案，区分基础巩固与拔高拓展。",
      },
      {
        icon: <FireOutlined />,
        label: "家校沟通",
        prompt: "为家长写一段错题巩固提醒，包含错题整理、复盘引导与陪伴建议。",
      },
    ],
    [],
  );

  const statusTag = useMemo(() => {
    if (llmStatus === "unknown") {
      return null;
    }
    return {
      color: llmStatus === "available" ? "success" : "warning",
      label: llmStatus === "available" ? "模型已配置" : "待配置 API Key",
    } as const;
  }, [llmStatus]);

  return (
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 28 }}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
            wrap
          >
            <Space direction="vertical" size={8} style={{ flex: 1, minWidth: 240 }}>
              <Title level={3} style={{ marginBottom: 0 }}>
                AI 教研助手 · 你的即时备课搭档
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                结合批改数据、错题热点和教学目标，实时获取课前讲评思路、课堂活动设计、作业建议与家校沟通话术。
              </Paragraph>
            </Space>
            <Space size={12} align="center">
              {statusTag && <Tag color={statusTag.color}>{statusTag.label}</Tag>}
              <Tag color="processing">
                温度 {chatTuning.temperature.toFixed(2)} · TopP {chatTuning.top_p.toFixed(2)}
              </Tag>
              <Button
                icon={<SlidersOutlined />}
                onClick={() => {
                  setPendingTuning(chatTuning);
                  setTuningVisible(true);
                }}
              >
                对话参数
              </Button>
              <Button
                type="primary"
                ghost
                icon={<SettingOutlined />}
                onClick={() => {
                  setConfigVisible(true);
                }}
              >
                配置 API Key
              </Button>
              {loading && (
                <Button danger onClick={stopStreaming}>
                  停止生成
                </Button>
              )}
            </Space>
          </Space>
          {llmStatus === "unavailable" && (
            <Alert
              type="warning"
              showIcon
              message="尚未配置大模型密钥"
              description="填写 API Key 后即可在此与 AI 教研助手对话。"
            />
          )}
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={16}>
          <PageLayout
            title="互动对话"
            description="与大模型对话，快速生成教学灵感。"
            extra={
              <Space>
                {quickActions.map((action) => (
                  <Tag
                    key={action.label}
                    color="processing"
                    icon={action.icon}
                    style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, padding: "6px 12px" }}
                    onClick={() => (!loading ? handleSend(action.prompt) : undefined)}
                  >
                    {action.label}
                  </Tag>
                ))}
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 8 }}>
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                  {chatHistory.map((item, index) => {
                    const isUser = item.role === "user";
                    return (
                      <Space
                        key={`${item.role}-${index}`}
                        align="start"
                        style={{ width: "100%", justifyContent: isUser ? "flex-end" : "flex-start" }}
                      >
                        {!isUser && <Avatar icon={<FireOutlined />} style={{ background: "#2563eb" }} />}
                        <Card
                          bordered={false}
                          style={{
                            maxWidth: "75%",
                            background: isUser ? "#2563eb" : "#f8fafc",
                            color: isUser ? "#ffffff" : "inherit",
                            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                          }}
                        >
                          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{item.content}</Paragraph>
                        </Card>
                        {isUser && <Avatar icon={<UserOutlined />} style={{ background: "#1e293b" }} />}
                      </Space>
                    );
                  })}
                </Space>
              </div>

              <TextArea
                autoSize={{ minRows: 3, maxRows: 5 }}
                placeholder="输入想解决的教学问题，按 Enter 发送"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onPressEnter={(event) => {
                  if (!event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={loading}
              />

              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  {defaultTips.map((tip) => (
                    <Tag
                      key={tip}
                      icon={<FireOutlined />}
                      style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
                      onClick={() => (!loading ? handleSend(tip) : undefined)}
                    >
                      一键生成
                    </Tag>
                  ))}
                </Space>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={loading}
                  onClick={() => handleSend()}
                >
                  发送
                </Button>
              </Space>
            </Space>
          </PageLayout>
        </Col>

        <Col xs={24} md={8}>
          <PageLayout
            title="灵感接力"
            description="智能续写你的想法，快速拓展教学方案。"
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {suggestions.length === 0 ? (
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  提问后，这里会给出可继续追问的灵感关键词，帮助你把课堂设计得更深入。
                </Paragraph>
              ) : (
                suggestions.map((item) => (
                  <Card key={item} size="small" bordered={false} className="shadow-panel">
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Text strong>{item}</Text>
                      <Button type="link" size="small" onClick={() => handleSend(item)}>
                        继续追问
                      </Button>
                    </Space>
                  </Card>
                ))
              )}

              <Divider style={{ margin: "12px 0" }}>
                <ThunderboltOutlined /> 教学加速技巧
              </Divider>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                · 先描述班级特点或错题热点，再提出需求，大模型会生成更贴近课堂的答案。
                <br />· 可以让它输出课件提纲、板书示例、课堂提问脚本，兼顾不同层次学生。
                <br />· 支持追问和润色，直到方案满足预期为止。
              </Paragraph>
            </Space>
          </PageLayout>
        </Col>
      </Row>


      <LlmConfigModal
        open={configVisible}
        onClose={() => setConfigVisible(false)}
        onUpdated={(status) => {
          setLlmStatus(status.available ? "available" : "unavailable");
        }}
      />

      <Modal
        title="对话参数调节"
        open={tuningVisible}
        onCancel={() => setTuningVisible(false)}
        onOk={handleTuningSubmit}
        okText="保存参数"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size={20}>
          <div>
            <Text strong>回答温度</Text>
            <Space style={{ width: "100%" }}>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={pendingTuning.temperature}
                onChange={(value) => handleTuningChange("temperature")(Array.isArray(value) ? value[0] : value)}
                style={{ flex: 1 }}
              />
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={pendingTuning.temperature}
                onChange={handleTuningChange("temperature")}
              />
            </Space>
          </div>
          <div>
            <Text strong>Top P</Text>
            <Space style={{ width: "100%" }}>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={pendingTuning.top_p}
                onChange={(value) => handleTuningChange("top_p")(Array.isArray(value) ? value[0] : value)}
                style={{ flex: 1 }}
              />
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={pendingTuning.top_p}
                onChange={handleTuningChange("top_p")}
              />
            </Space>
          </div>
          <div>
            <Text strong>Presence Penalty</Text>
            <Space style={{ width: "100%" }}>
              <Slider
                min={-2}
                max={2}
                step={0.1}
                value={pendingTuning.presence_penalty}
                onChange={(value) => handleTuningChange("presence_penalty")(Array.isArray(value) ? value[0] : value)}
                style={{ flex: 1 }}
              />
              <InputNumber
                min={-2}
                max={2}
                step={0.1}
                value={pendingTuning.presence_penalty}
                onChange={handleTuningChange("presence_penalty")}
              />
            </Space>
          </div>
          <div>
            <Text strong>Frequency Penalty</Text>
            <Space style={{ width: "100%" }}>
              <Slider
                min={-2}
                max={2}
                step={0.1}
                value={pendingTuning.frequency_penalty}
                onChange={(value) => handleTuningChange("frequency_penalty")(Array.isArray(value) ? value[0] : value)}
                style={{ flex: 1 }}
              />
              <InputNumber
                min={-2}
                max={2}
                step={0.1}
                value={pendingTuning.frequency_penalty}
                onChange={handleTuningChange("frequency_penalty")}
              />
            </Space>
          </div>
        </Space>
      </Modal>
    </Space>
  );
};

export default TeacherAssistant;
