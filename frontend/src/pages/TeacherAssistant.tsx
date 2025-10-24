import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Checkbox,
  Divider,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Slider,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BulbOutlined,
  FireOutlined,
  InfoCircleOutlined,
  SendOutlined,
  SettingOutlined,
  SlidersOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import PageLayout from "../components/PageLayout";
import LlmConfigModal from "../components/LlmConfigModal";
import type { AssistantMessage, Mistake, Student } from "../types";
import { fetchAssistantStatus, fetchStudentMistakes, fetchStudents } from "../api/services";
import {
  TIME_RANGE_OPTIONS,
  TimeRangeValue,
  TOKEN_WARNING_THRESHOLD,
  buildContextMessage,
  estimateTokensForMistakes,
  extractAssistantSections,
  extractKnowledgeTags,
  formatDateLabel,
  sortMistakesByRelevance,
} from "./TeacherAssistant.utils";

type ChatTuning = {
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
};

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

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
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [mistakeLoading, setMistakeLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("latest");
  const [selectedMistakeIds, setSelectedMistakeIds] = useState<Set<number>>(new Set());
  const [starredMistakeIds, setStarredMistakeIds] = useState<Set<number>>(new Set());
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

  useEffect(() => {
    void (async () => {
      try {
        const list = await fetchStudents();
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].id);
        }
      } catch (error) {
        console.error(error);
        message.error("获取学生列表失败，请稍后再试");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setMistakes([]);
      setSelectedMistakeIds(new Set());
      setStarredMistakeIds(new Set());
      return;
    }
    const params: { limit: number; recent_days?: number } = { limit: 10 };
    if (timeRange === "7d") {
      params.recent_days = 7;
    }

    setMistakeLoading(true);
    void (async () => {
      try {
        const list = await fetchStudentMistakes(selectedStudentId, params);
        const sorted = sortMistakesByRelevance(list).slice(0, params.limit);
        setMistakes(sorted);
        setSelectedMistakeIds(new Set(sorted.map((item) => item.id)));
        setStarredMistakeIds(new Set(sorted.slice(0, Math.min(3, sorted.length)).map((item) => item.id)));
      } catch (error) {
        console.error(error);
        message.error("获取错题列表失败，请稍后再试");
        setMistakes([]);
        setSelectedMistakeIds(new Set());
        setStarredMistakeIds(new Set());
      } finally {
        setMistakeLoading(false);
      }
    })();
  }, [selectedStudentId, timeRange]);

  const studentsById = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const selectedStudent = selectedStudentId ? studentsById.get(selectedStudentId) ?? null : null;

  const displayMistakes = useMemo(() => {
    const sorted = sortMistakesByRelevance(mistakes);
    return sorted.sort((a, b) => {
      const aStar = starredMistakeIds.has(a.id);
      const bStar = starredMistakeIds.has(b.id);
      if (aStar === bStar) {
        return 0;
      }
      return aStar ? -1 : 1;
    });
  }, [mistakes, starredMistakeIds]);

  const selectedMistakes = useMemo(
    () => displayMistakes.filter((item) => selectedMistakeIds.has(item.id)),
    [displayMistakes, selectedMistakeIds],
  );

  const knowledgeCoverage = useMemo(() => {
    const set = new Set<string>();
    selectedMistakes.forEach((item) => {
      extractKnowledgeTags(item.knowledge_tags).forEach((tag) => set.add(tag));
    });
    return set;
  }, [selectedMistakes]);

  const tokenEstimate = useMemo(
    () => estimateTokensForMistakes(selectedMistakes),
    [selectedMistakes],
  );
  const tokenOverLimit = tokenEstimate > TOKEN_WARNING_THRESHOLD;

  const contextPreview = useMemo(
    () => buildContextMessage(selectedStudent?.name, selectedMistakes),
    [selectedStudent, selectedMistakes],
  );

  const contextPreviewSnippet = useMemo(() => {
    if (!contextPreview) {
      return "";
    }
    const lines = contextPreview.split("\n");
    if (lines.length <= 4) {
      return contextPreview;
    }
    return `${lines.slice(0, 4).join("\n")}\n...`;
  }, [contextPreview]);

  const toggleMistakeSelection = (mistakeId: number) => {
    setSelectedMistakeIds((previous) => {
      const next = new Set(previous);
      if (next.has(mistakeId)) {
        next.delete(mistakeId);
      } else {
        next.add(mistakeId);
      }
      return next;
    });
  };

  const toggleStarMistake = (mistakeId: number) => {
    setStarredMistakeIds((previous) => {
      const next = new Set(previous);
      if (next.has(mistakeId)) {
        next.delete(mistakeId);
      } else {
        next.add(mistakeId);
      }
      return next;
    });
    setSelectedMistakeIds((previous) => {
      if (previous.has(mistakeId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(mistakeId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedMistakeIds(new Set(displayMistakes.map((item) => item.id)));
  };

  const handleClearSelection = () => {
    setSelectedMistakeIds(new Set());
  };

  const handleTrimToStarred = () => {
    if (starredMistakeIds.size > 0) {
      setSelectedMistakeIds(new Set(starredMistakeIds));
      message.success("已保留关键错题作为上下文");
      return;
    }
    if (displayMistakes.length === 0) {
      return;
    }
    const fallback = displayMistakes.slice(0, Math.min(5, displayMistakes.length)).map((item) => item.id);
    setSelectedMistakeIds(new Set(fallback));
    message.info("已精简至前 5 条错题");
  };

  const summaryTags = useMemo(() => {
    return [
      { label: `已选 ${selectedMistakes.length} 题`, color: "processing" as const },
      { label: `知识点 ${knowledgeCoverage.size}`, color: "geekblue" as const },
      { label: `≈ ${tokenEstimate} tokens`, color: tokenOverLimit ? "volcano" : "success" as const },
    ];
  }, [knowledgeCoverage.size, selectedMistakes.length, tokenEstimate, tokenOverLimit]);

  const renderAssistantContent = useCallback(
    (content: string) => {
      const sections = extractAssistantSections(content);
      if (!sections) {
        return <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{content}</Paragraph>;
      }
      return (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {sections.map((section, index) => (
            <Space key={`${section.title}-${index}`} direction="vertical" size={4} style={{ width: "100%" }}>
              <Text strong>{`【${section.title}】`}</Text>
              <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{section.body}</Paragraph>
            </Space>
          ))}
        </Space>
      );
    },
    [],
  );

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

    if (!selectedStudent) {
      message.warning("请先选择学生");
      return;
    }

    if (selectedMistakes.length === 0) {
      message.warning("请至少勾选一条错题作为上下文");
      return;
    }

    stopStreaming();

    const userMessage: AssistantMessage = { role: "user", content: prompt };
    const historyBeforeSend = [...chatHistory];
    const requestMessages: AssistantMessage[] = [...historyBeforeSend];
    const contextMessage = buildContextMessage(selectedStudent.name, selectedMistakes);
    if (contextMessage) {
      requestMessages.push({ role: "user", content: contextMessage });
    }
    requestMessages.push(userMessage);

    setChatHistory([...historyBeforeSend, userMessage]);
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
          messages: requestMessages,
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
        label: "共性分析",
        prompt:
          "请结合上述错题上下文，先总结共性诊断与典型错误，再点出最容易被忽视的知识盲点，并按照【共性诊断】【课堂策略】【家校建议】输出。",
      },
      {
        icon: <ThunderboltOutlined />,
        label: "课堂讲评",
        prompt:
          "请基于错题上下文，设计一份40分钟的课堂讲评方案，包含导入、分层互动与当堂检测，最终以【共性诊断】【课堂策略】【家校建议】格式呈现。",
      },
      {
        icon: <FireOutlined />,
        label: "家校沟通",
        prompt:
          "请根据错题上下文，为家长撰写沟通建议，说明需要关注的知识点与陪伴方式，最后按照【共性诊断】【课堂策略】【家校建议】结构输出。",
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

      <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 24 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
            wrap
          >
            <Space size={12} wrap align="center">
              <Select
                placeholder="选择学生"
                value={selectedStudentId ?? undefined}
                onChange={(value) => {
                  if (value === undefined || value === null) {
                    setSelectedStudentId(null);
                    return;
                  }
                  setSelectedStudentId(Number(value));
                }}
                options={students.map((student) => ({ label: student.name, value: student.id }))}
                style={{ minWidth: 200 }}
                loading={students.length === 0}
              />
              <Select
                value={timeRange}
                onChange={(value) => setTimeRange(value as TimeRangeValue)}
                options={TIME_RANGE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
                style={{ width: 140 }}
              />
            </Space>
            <Space size={8}>
              <Button type="link" onClick={handleSelectAll} disabled={displayMistakes.length === 0}>
                全选
              </Button>
              <Button type="link" onClick={handleClearSelection} disabled={selectedMistakes.length === 0}>
                清空
              </Button>
              <Button type="link" onClick={handleTrimToStarred} disabled={displayMistakes.length === 0}>
                精简至关键
              </Button>
            </Space>
          </Space>

          <Space size={8} wrap align="center">
            {summaryTags.map((item) => (
              <Tag key={item.label} color={item.color}>
                {item.label}
              </Tag>
            ))}
            {tokenOverLimit && <Text type="danger">已超过建议的 3200 tokens，建议精简上下文</Text>}
            {selectedMistakes.length === 0 && (
              <Text type="secondary">请选择至少一条错题，助手才会拼接上下文</Text>
            )}
          </Space>

          {contextPreviewSnippet ? (
            <Card size="small" bordered={false} style={{ background: "#f8fafc" }}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Space align="center" size={6}>
                  <InfoCircleOutlined style={{ color: "#2563eb" }} />
                  <Text type="secondary">上下文预览（发送时自动拼接）</Text>
                </Space>
                <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }} type="secondary">
                  {contextPreviewSnippet}
                </Paragraph>
              </Space>
            </Card>
          ) : null}

          {mistakeLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : displayMistakes.length === 0 ? (
            <Empty
              description={selectedStudent ? "暂无符合条件的错题" : "请选择学生后查看错题上下文"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              itemLayout="vertical"
              dataSource={displayMistakes}
              split={false}
              rowKey={(item) => item.id}
              renderItem={(item) => {
                const selected = selectedMistakeIds.has(item.id);
                const starred = starredMistakeIds.has(item.id);
                const knowledgeTags = extractKnowledgeTags(item.knowledge_tags);
                return (
                  <List.Item style={{ padding: "12px 0" }}>
                    <Space align="start" style={{ width: "100%" }} size={12}>
                      <Checkbox checked={selected} onChange={() => toggleMistakeSelection(item.id)} />
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space
                          align="center"
                          style={{ width: "100%", justifyContent: "space-between" }}
                          wrap
                        >
                          <Space size={8} align="center" wrap>
                            <Text strong>{`题目 ID ${item.question_id}`}</Text>
                            {starred && <Tag color="gold">关键</Tag>}
                          </Space>
                          <Space size={12} align="center">
                            <Text type="secondary">最近：{formatDateLabel(item.last_seen_at)}</Text>
                            <Button
                              type="text"
                              size="small"
                              icon={starred ? <StarFilled style={{ color: "#fbbf24" }} /> : <StarOutlined />}
                              onClick={() => toggleStarMistake(item.id)}
                            >
                              {starred ? "取消关键" : "设为关键"}
                            </Button>
                          </Space>
                        </Space>
                        <Space size={6} wrap>
                          {knowledgeTags.length === 0 ? (
                            <Tag color="default">未标注</Tag>
                          ) : (
                            knowledgeTags.map((tag) => (
                              <Tag key={`${item.id}-${tag}`} color="processing">
                                {tag}
                              </Tag>
                            ))
                          )}
                        </Space>
                        <Space size={12}>
                          <Text type="secondary">错误次数 {item.error_count}</Text>
                          <Text type="secondary">练习次数 {item.times_practiced}</Text>
                        </Space>
                        {item.root_cause && (
                          <Paragraph style={{ marginBottom: 0 }} type="secondary">
                            根因：{item.root_cause}
                          </Paragraph>
                        )}
                        {item.resolution_notes && (
                          <Paragraph style={{ marginBottom: 0 }} type="secondary">
                            教师建议：{item.resolution_notes}
                          </Paragraph>
                        )}
                      </Space>
                    </Space>
                  </List.Item>
                );
              }}
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
                          {isUser ? (
                            <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{item.content}</Paragraph>
                          ) : (
                            renderAssistantContent(item.content)
                          )}
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
                  {quickActions.map((action) => (
                    <Tag
                      key={action.label}
                      icon={action.icon}
                      style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
                      onClick={() => (!loading ? handleSend(action.prompt) : undefined)}
                    >
                      {action.label}
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
