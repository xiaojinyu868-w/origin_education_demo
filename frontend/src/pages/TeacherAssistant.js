import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Avatar, Button, Card, Col, Divider, Input, InputNumber, Modal, Row, Slider, Space, Tag, Typography, message, } from "antd";
import { BulbOutlined, FireOutlined, SendOutlined, SettingOutlined, SlidersOutlined, ThunderboltOutlined, UserOutlined, } from "@ant-design/icons";
import PageLayout from "../components/PageLayout";
import LlmConfigModal from "../components/LlmConfigModal";
import { fetchAssistantStatus } from "../api/services";
const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
const defaultTips = [
    "请帮我为函数图像这一节设计一堂40分钟的课堂讲评课，包括分层提问。",
    "根据最近错误率最高的三个知识点，给出专题小练和课后作业建议。",
    "生成一次家校沟通话术，主题是提醒家长陪伴错题复盘。",
];
const defaultTuning = {
    temperature: 0.3,
    top_p: 0.9,
    presence_penalty: 0,
    frequency_penalty: 0,
};
const TeacherAssistant = () => {
    const [chatHistory, setChatHistory] = useState([
        {
            role: "assistant",
            content: "你好，我是教研优化助手。告诉我班级情况或批改结果，我可以帮你梳理讲评策略、设计作业、生成家校沟通文案。",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [llmStatus, setLlmStatus] = useState("unknown");
    const [configVisible, setConfigVisible] = useState(false);
    const [tuningVisible, setTuningVisible] = useState(false);
    const [chatTuning, setChatTuning] = useState(defaultTuning);
    const [pendingTuning, setPendingTuning] = useState(defaultTuning);
    const streamControllerRef = useRef(null);
    const refreshLlmStatus = useCallback(async () => {
        try {
            const { available } = await fetchAssistantStatus();
            setLlmStatus(available ? "available" : "unavailable");
        }
        catch (error) {
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
    const handleTuningChange = (field) => (value) => {
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
    const appendAssistantMessage = (content) => {
        setChatHistory((previous) => [...previous, { role: "assistant", content }]);
    };
    const updateAssistantMessage = (updater) => {
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
    const handleSend = async (preset) => {
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
        const userMessage = { role: "user", content: prompt };
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
            const processEvent = (type, payload) => {
                if (!payload || typeof payload !== "object") {
                    return;
                }
                const data = payload;
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
                            ? data.items.filter((item) => typeof item === "string")
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
            const flushBuffer = (chunk) => {
                if (!chunk.trim()) {
                    return;
                }
                const lines = chunk.split(/\r?\n/);
                let currentEvent = null;
                const dataLines = [];
                for (const raw of lines) {
                    const line = raw.trim();
                    if (!line) {
                        continue;
                    }
                    if (line.startsWith("event:")) {
                        currentEvent = line.slice(6).trim() || null;
                    }
                    else if (line.startsWith("data:")) {
                        dataLines.push(line.slice(5).trim());
                    }
                }
                if (dataLines.length === 0) {
                    return;
                }
                try {
                    const payload = JSON.parse(dataLines.join(""));
                    processEvent(currentEvent, payload);
                }
                catch (error) {
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
        }
        catch (error) {
            if (error.name === "AbortError") {
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
        }
        finally {
            if (streamControllerRef.current === controller) {
                streamControllerRef.current = null;
            }
            setLoading(false);
        }
    };
    const quickActions = useMemo(() => [
        {
            icon: _jsx(BulbOutlined, {}),
            label: "讲评提纲",
            prompt: "请帮我根据错题生成一份课堂讲评提纲，包含导入、重难点拆解和课堂互动。",
        },
        {
            icon: _jsx(ThunderboltOutlined, {}),
            label: "作业建议",
            prompt: "结合最近的批改结果，推荐一份分层作业方案，区分基础巩固与拔高拓展。",
        },
        {
            icon: _jsx(FireOutlined, {}),
            label: "家校沟通",
            prompt: "为家长写一段错题巩固提醒，包含错题整理、复盘引导与陪伴建议。",
        },
    ], []);
    const statusTag = useMemo(() => {
        if (llmStatus === "unknown") {
            return null;
        }
        return {
            color: llmStatus === "available" ? "success" : "warning",
            label: llmStatus === "available" ? "模型已配置" : "待配置 API Key",
        };
    }, [llmStatus]);
    return (_jsxs(Space, { direction: "vertical", size: 28, style: { width: "100%" }, children: [_jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 28 }, children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", style: { width: "100%", justifyContent: "space-between" }, wrap: true, children: [_jsxs(Space, { direction: "vertical", size: 8, style: { flex: 1, minWidth: 240 }, children: [_jsx(Title, { level: 3, style: { marginBottom: 0 }, children: "AI \u6559\u7814\u52A9\u624B \u00B7 \u4F60\u7684\u5373\u65F6\u5907\u8BFE\u642D\u6863" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u7ED3\u5408\u6279\u6539\u6570\u636E\u3001\u9519\u9898\u70ED\u70B9\u548C\u6559\u5B66\u76EE\u6807\uFF0C\u5B9E\u65F6\u83B7\u53D6\u8BFE\u524D\u8BB2\u8BC4\u601D\u8DEF\u3001\u8BFE\u5802\u6D3B\u52A8\u8BBE\u8BA1\u3001\u4F5C\u4E1A\u5EFA\u8BAE\u4E0E\u5BB6\u6821\u6C9F\u901A\u8BDD\u672F\u3002" })] }), _jsxs(Space, { size: 12, align: "center", children: [statusTag && _jsx(Tag, { color: statusTag.color, children: statusTag.label }), _jsxs(Tag, { color: "processing", children: ["\u6E29\u5EA6 ", chatTuning.temperature.toFixed(2), " \u00B7 TopP ", chatTuning.top_p.toFixed(2)] }), _jsx(Button, { icon: _jsx(SlidersOutlined, {}), onClick: () => {
                                                setPendingTuning(chatTuning);
                                                setTuningVisible(true);
                                            }, children: "\u5BF9\u8BDD\u53C2\u6570" }), _jsx(Button, { type: "primary", ghost: true, icon: _jsx(SettingOutlined, {}), onClick: () => {
                                                setConfigVisible(true);
                                            }, children: "\u914D\u7F6E API Key" }), loading && (_jsx(Button, { danger: true, onClick: stopStreaming, children: "\u505C\u6B62\u751F\u6210" }))] })] }), llmStatus === "unavailable" && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5C1A\u672A\u914D\u7F6E\u5927\u6A21\u578B\u5BC6\u94A5", description: "\u586B\u5199 API Key \u540E\u5373\u53EF\u5728\u6B64\u4E0E AI \u6559\u7814\u52A9\u624B\u5BF9\u8BDD\u3002" }))] }) }), _jsxs(Row, { gutter: [20, 20], children: [_jsx(Col, { xs: 24, md: 16, children: _jsx(PageLayout, { title: "\u4E92\u52A8\u5BF9\u8BDD", description: "\u4E0E\u5927\u6A21\u578B\u5BF9\u8BDD\uFF0C\u5FEB\u901F\u751F\u6210\u6559\u5B66\u7075\u611F\u3002", extra: _jsx(Space, { children: quickActions.map((action) => (_jsx(Tag, { color: "processing", icon: action.icon, style: { cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, padding: "6px 12px" }, onClick: () => (!loading ? handleSend(action.prompt) : undefined), children: action.label }, action.label))) }), children: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, size: 16, children: [_jsx("div", { style: { maxHeight: 420, overflowY: "auto", paddingRight: 8 }, children: _jsx(Space, { direction: "vertical", style: { width: "100%" }, size: 16, children: chatHistory.map((item, index) => {
                                                const isUser = item.role === "user";
                                                return (_jsxs(Space, { align: "start", style: { width: "100%", justifyContent: isUser ? "flex-end" : "flex-start" }, children: [!isUser && _jsx(Avatar, { icon: _jsx(FireOutlined, {}), style: { background: "#2563eb" } }), _jsx(Card, { bordered: false, style: {
                                                                maxWidth: "75%",
                                                                background: isUser ? "#2563eb" : "#f8fafc",
                                                                color: isUser ? "#ffffff" : "inherit",
                                                                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                                                            }, children: _jsx(Paragraph, { style: { marginBottom: 0, whiteSpace: "pre-wrap" }, children: item.content }) }), isUser && _jsx(Avatar, { icon: _jsx(UserOutlined, {}), style: { background: "#1e293b" } })] }, `${item.role}-${index}`));
                                            }) }) }), _jsx(TextArea, { autoSize: { minRows: 3, maxRows: 5 }, placeholder: "\u8F93\u5165\u60F3\u89E3\u51B3\u7684\u6559\u5B66\u95EE\u9898\uFF0C\u6309 Enter \u53D1\u9001", value: input, onChange: (event) => setInput(event.target.value), onPressEnter: (event) => {
                                            if (!event.shiftKey) {
                                                event.preventDefault();
                                                void handleSend();
                                            }
                                        }, disabled: loading }), _jsxs(Space, { style: { width: "100%", justifyContent: "space-between" }, children: [_jsx(Space, { children: defaultTips.map((tip) => (_jsx(Tag, { icon: _jsx(FireOutlined, {}), style: { cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }, onClick: () => (!loading ? handleSend(tip) : undefined), children: "\u4E00\u952E\u751F\u6210" }, tip))) }), _jsx(Button, { type: "primary", icon: _jsx(SendOutlined, {}), loading: loading, onClick: () => handleSend(), children: "\u53D1\u9001" })] })] }) }) }), _jsx(Col, { xs: 24, md: 8, children: _jsx(PageLayout, { title: "\u7075\u611F\u63A5\u529B", description: "\u667A\u80FD\u7EED\u5199\u4F60\u7684\u60F3\u6CD5\uFF0C\u5FEB\u901F\u62D3\u5C55\u6559\u5B66\u65B9\u6848\u3002", children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [suggestions.length === 0 ? (_jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u63D0\u95EE\u540E\uFF0C\u8FD9\u91CC\u4F1A\u7ED9\u51FA\u53EF\u7EE7\u7EED\u8FFD\u95EE\u7684\u7075\u611F\u5173\u952E\u8BCD\uFF0C\u5E2E\u52A9\u4F60\u628A\u8BFE\u5802\u8BBE\u8BA1\u5F97\u66F4\u6DF1\u5165\u3002" })) : (suggestions.map((item) => (_jsx(Card, { size: "small", bordered: false, className: "shadow-panel", children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsx(Text, { strong: true, children: item }), _jsx(Button, { type: "link", size: "small", onClick: () => handleSend(item), children: "\u7EE7\u7EED\u8FFD\u95EE" })] }) }, item)))), _jsxs(Divider, { style: { margin: "12px 0" }, children: [_jsx(ThunderboltOutlined, {}), " \u6559\u5B66\u52A0\u901F\u6280\u5DE7"] }), _jsxs(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: ["\u00B7 \u5148\u63CF\u8FF0\u73ED\u7EA7\u7279\u70B9\u6216\u9519\u9898\u70ED\u70B9\uFF0C\u518D\u63D0\u51FA\u9700\u6C42\uFF0C\u5927\u6A21\u578B\u4F1A\u751F\u6210\u66F4\u8D34\u8FD1\u8BFE\u5802\u7684\u7B54\u6848\u3002", _jsx("br", {}), "\u00B7 \u53EF\u4EE5\u8BA9\u5B83\u8F93\u51FA\u8BFE\u4EF6\u63D0\u7EB2\u3001\u677F\u4E66\u793A\u4F8B\u3001\u8BFE\u5802\u63D0\u95EE\u811A\u672C\uFF0C\u517C\u987E\u4E0D\u540C\u5C42\u6B21\u5B66\u751F\u3002", _jsx("br", {}), "\u00B7 \u652F\u6301\u8FFD\u95EE\u548C\u6DA6\u8272\uFF0C\u76F4\u5230\u65B9\u6848\u6EE1\u8DB3\u9884\u671F\u4E3A\u6B62\u3002"] })] }) }) })] }), _jsx(LlmConfigModal, { open: configVisible, onClose: () => setConfigVisible(false), onUpdated: (status) => {
                    setLlmStatus(status.available ? "available" : "unavailable");
                } }), _jsx(Modal, { title: "\u5BF9\u8BDD\u53C2\u6570\u8C03\u8282", open: tuningVisible, onCancel: () => setTuningVisible(false), onOk: handleTuningSubmit, okText: "\u4FDD\u5B58\u53C2\u6570", destroyOnClose: true, children: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, size: 20, children: [_jsxs("div", { children: [_jsx(Text, { strong: true, children: "\u56DE\u7B54\u6E29\u5EA6" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: 0, max: 1, step: 0.05, value: pendingTuning.temperature, onChange: (value) => handleTuningChange("temperature")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: 0, max: 1, step: 0.05, value: pendingTuning.temperature, onChange: handleTuningChange("temperature") })] })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Top P" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: 0, max: 1, step: 0.05, value: pendingTuning.top_p, onChange: (value) => handleTuningChange("top_p")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: 0, max: 1, step: 0.05, value: pendingTuning.top_p, onChange: handleTuningChange("top_p") })] })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Presence Penalty" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: -2, max: 2, step: 0.1, value: pendingTuning.presence_penalty, onChange: (value) => handleTuningChange("presence_penalty")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: -2, max: 2, step: 0.1, value: pendingTuning.presence_penalty, onChange: handleTuningChange("presence_penalty") })] })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Frequency Penalty" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: -2, max: 2, step: 0.1, value: pendingTuning.frequency_penalty, onChange: (value) => handleTuningChange("frequency_penalty")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: -2, max: 2, step: 0.1, value: pendingTuning.frequency_penalty, onChange: handleTuningChange("frequency_penalty") })] })] })] }) })] }));
};
export default TeacherAssistant;
