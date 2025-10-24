import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Avatar, Button, Card, Col, Checkbox, Divider, Empty, Input, InputNumber, List, Modal, Row, Select, Slider, Skeleton, Space, Tag, Typography, message, } from "antd";
import { BulbOutlined, FireOutlined, InfoCircleOutlined, SendOutlined, SettingOutlined, SlidersOutlined, StarFilled, StarOutlined, ThunderboltOutlined, UserOutlined, } from "@ant-design/icons";
import PageLayout from "../components/PageLayout";
import LlmConfigModal from "../components/LlmConfigModal";
import { fetchAssistantStatus, fetchStudentMistakes, fetchStudents } from "../api/services";
import { TIME_RANGE_OPTIONS, TOKEN_WARNING_THRESHOLD, buildContextMessage, estimateTokensForMistakes, extractAssistantSections, extractKnowledgeTags, formatDateLabel, sortMistakesByRelevance, } from "./TeacherAssistant.utils";
const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
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
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [mistakes, setMistakes] = useState([]);
    const [mistakeLoading, setMistakeLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("latest");
    const [selectedMistakeIds, setSelectedMistakeIds] = useState(new Set());
    const [starredMistakeIds, setStarredMistakeIds] = useState(new Set());
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
    useEffect(() => {
        void (async () => {
            try {
                const list = await fetchStudents();
                setStudents(list);
                if (list.length > 0) {
                    setSelectedStudentId(list[0].id);
                }
            }
            catch (error) {
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
        const params = { limit: 10 };
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
            }
            catch (error) {
                console.error(error);
                message.error("获取错题列表失败，请稍后再试");
                setMistakes([]);
                setSelectedMistakeIds(new Set());
                setStarredMistakeIds(new Set());
            }
            finally {
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
    const selectedMistakes = useMemo(() => displayMistakes.filter((item) => selectedMistakeIds.has(item.id)), [displayMistakes, selectedMistakeIds]);
    const knowledgeCoverage = useMemo(() => {
        const set = new Set();
        selectedMistakes.forEach((item) => {
            extractKnowledgeTags(item.knowledge_tags).forEach((tag) => set.add(tag));
        });
        return set;
    }, [selectedMistakes]);
    const tokenEstimate = useMemo(() => estimateTokensForMistakes(selectedMistakes), [selectedMistakes]);
    const tokenOverLimit = tokenEstimate > TOKEN_WARNING_THRESHOLD;
    const contextPreview = useMemo(() => buildContextMessage(selectedStudent?.name, selectedMistakes), [selectedStudent, selectedMistakes]);
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
    const toggleMistakeSelection = (mistakeId) => {
        setSelectedMistakeIds((previous) => {
            const next = new Set(previous);
            if (next.has(mistakeId)) {
                next.delete(mistakeId);
            }
            else {
                next.add(mistakeId);
            }
            return next;
        });
    };
    const toggleStarMistake = (mistakeId) => {
        setStarredMistakeIds((previous) => {
            const next = new Set(previous);
            if (next.has(mistakeId)) {
                next.delete(mistakeId);
            }
            else {
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
            { label: `已选 ${selectedMistakes.length} 题`, color: "processing" },
            { label: `知识点 ${knowledgeCoverage.size}`, color: "geekblue" },
            { label: `≈ ${tokenEstimate} tokens`, color: tokenOverLimit ? "volcano" : "success" },
        ];
    }, [knowledgeCoverage.size, selectedMistakes.length, tokenEstimate, tokenOverLimit]);
    const renderAssistantContent = useCallback((content) => {
        const sections = extractAssistantSections(content);
        if (!sections) {
            return _jsx(Paragraph, { style: { marginBottom: 0, whiteSpace: "pre-wrap" }, children: content });
        }
        return (_jsx(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: sections.map((section, index) => (_jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsx(Text, { strong: true, children: `【${section.title}】` }), _jsx(Paragraph, { style: { marginBottom: 0, whiteSpace: "pre-wrap" }, children: section.body })] }, `${section.title}-${index}`))) }));
    }, []);
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
        if (!selectedStudent) {
            message.warning("请先选择学生");
            return;
        }
        if (selectedMistakes.length === 0) {
            message.warning("请至少勾选一条错题作为上下文");
            return;
        }
        stopStreaming();
        const userMessage = { role: "user", content: prompt };
        const historyBeforeSend = [...chatHistory];
        const requestMessages = [...historyBeforeSend];
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
            label: "共性分析",
            prompt: "请结合上述错题上下文，先总结共性诊断与典型错误，再点出最容易被忽视的知识盲点，并按照【共性诊断】【课堂策略】【家校建议】输出。",
        },
        {
            icon: _jsx(ThunderboltOutlined, {}),
            label: "课堂讲评",
            prompt: "请基于错题上下文，设计一份40分钟的课堂讲评方案，包含导入、分层互动与当堂检测，最终以【共性诊断】【课堂策略】【家校建议】格式呈现。",
        },
        {
            icon: _jsx(FireOutlined, {}),
            label: "家校沟通",
            prompt: "请根据错题上下文，为家长撰写沟通建议，说明需要关注的知识点与陪伴方式，最后按照【共性诊断】【课堂策略】【家校建议】结构输出。",
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
                                            }, children: "\u914D\u7F6E API Key" }), loading && (_jsx(Button, { danger: true, onClick: stopStreaming, children: "\u505C\u6B62\u751F\u6210" }))] })] }), llmStatus === "unavailable" && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u5C1A\u672A\u914D\u7F6E\u5927\u6A21\u578B\u5BC6\u94A5", description: "\u586B\u5199 API Key \u540E\u5373\u53EF\u5728\u6B64\u4E0E AI \u6559\u7814\u52A9\u624B\u5BF9\u8BDD\u3002" }))] }) }), _jsx(Card, { bordered: false, className: "shadow-panel", bodyStyle: { padding: 24 }, children: _jsxs(Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", style: { width: "100%", justifyContent: "space-between" }, wrap: true, children: [_jsxs(Space, { size: 12, wrap: true, align: "center", children: [_jsx(Select, { placeholder: "\u9009\u62E9\u5B66\u751F", value: selectedStudentId ?? undefined, onChange: (value) => {
                                                if (value === undefined || value === null) {
                                                    setSelectedStudentId(null);
                                                    return;
                                                }
                                                setSelectedStudentId(Number(value));
                                            }, options: students.map((student) => ({ label: student.name, value: student.id })), style: { minWidth: 200 }, loading: students.length === 0 }), _jsx(Select, { value: timeRange, onChange: (value) => setTimeRange(value), options: TIME_RANGE_OPTIONS.map((item) => ({ label: item.label, value: item.value })), style: { width: 140 } })] }), _jsxs(Space, { size: 8, children: [_jsx(Button, { type: "link", onClick: handleSelectAll, disabled: displayMistakes.length === 0, children: "\u5168\u9009" }), _jsx(Button, { type: "link", onClick: handleClearSelection, disabled: selectedMistakes.length === 0, children: "\u6E05\u7A7A" }), _jsx(Button, { type: "link", onClick: handleTrimToStarred, disabled: displayMistakes.length === 0, children: "\u7CBE\u7B80\u81F3\u5173\u952E" })] })] }), _jsxs(Space, { size: 8, wrap: true, align: "center", children: [summaryTags.map((item) => (_jsx(Tag, { color: item.color, children: item.label }, item.label))), tokenOverLimit && _jsx(Text, { type: "danger", children: "\u5DF2\u8D85\u8FC7\u5EFA\u8BAE\u7684 3200 tokens\uFF0C\u5EFA\u8BAE\u7CBE\u7B80\u4E0A\u4E0B\u6587" }), selectedMistakes.length === 0 && (_jsx(Text, { type: "secondary", children: "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u6761\u9519\u9898\uFF0C\u52A9\u624B\u624D\u4F1A\u62FC\u63A5\u4E0A\u4E0B\u6587" }))] }), contextPreviewSnippet ? (_jsx(Card, { size: "small", bordered: false, style: { background: "#f8fafc" }, children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", size: 6, children: [_jsx(InfoCircleOutlined, { style: { color: "#2563eb" } }), _jsx(Text, { type: "secondary", children: "\u4E0A\u4E0B\u6587\u9884\u89C8\uFF08\u53D1\u9001\u65F6\u81EA\u52A8\u62FC\u63A5\uFF09" })] }), _jsx(Paragraph, { style: { marginBottom: 0, whiteSpace: "pre-wrap" }, type: "secondary", children: contextPreviewSnippet })] }) })) : null, mistakeLoading ? (_jsx(Skeleton, { active: true, paragraph: { rows: 4 } })) : displayMistakes.length === 0 ? (_jsx(Empty, { description: selectedStudent ? "暂无符合条件的错题" : "请选择学生后查看错题上下文", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(List, { itemLayout: "vertical", dataSource: displayMistakes, split: false, rowKey: (item) => item.id, renderItem: (item) => {
                                const selected = selectedMistakeIds.has(item.id);
                                const starred = starredMistakeIds.has(item.id);
                                const knowledgeTags = extractKnowledgeTags(item.knowledge_tags);
                                return (_jsx(List.Item, { style: { padding: "12px 0" }, children: _jsxs(Space, { align: "start", style: { width: "100%" }, size: 12, children: [_jsx(Checkbox, { checked: selected, onChange: () => toggleMistakeSelection(item.id) }), _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsxs(Space, { align: "center", style: { width: "100%", justifyContent: "space-between" }, wrap: true, children: [_jsxs(Space, { size: 8, align: "center", wrap: true, children: [_jsx(Text, { strong: true, children: `题目 ID ${item.question_id}` }), starred && _jsx(Tag, { color: "gold", children: "\u5173\u952E" })] }), _jsxs(Space, { size: 12, align: "center", children: [_jsxs(Text, { type: "secondary", children: ["\u6700\u8FD1\uFF1A", formatDateLabel(item.last_seen_at)] }), _jsx(Button, { type: "text", size: "small", icon: starred ? _jsx(StarFilled, { style: { color: "#fbbf24" } }) : _jsx(StarOutlined, {}), onClick: () => toggleStarMistake(item.id), children: starred ? "取消关键" : "设为关键" })] })] }), _jsx(Space, { size: 6, wrap: true, children: knowledgeTags.length === 0 ? (_jsx(Tag, { color: "default", children: "\u672A\u6807\u6CE8" })) : (knowledgeTags.map((tag) => (_jsx(Tag, { color: "processing", children: tag }, `${item.id}-${tag}`)))) }), _jsxs(Space, { size: 12, children: [_jsxs(Text, { type: "secondary", children: ["\u9519\u8BEF\u6B21\u6570 ", item.error_count] }), _jsxs(Text, { type: "secondary", children: ["\u7EC3\u4E60\u6B21\u6570 ", item.times_practiced] })] }), item.root_cause && (_jsxs(Paragraph, { style: { marginBottom: 0 }, type: "secondary", children: ["\u6839\u56E0\uFF1A", item.root_cause] })), item.resolution_notes && (_jsxs(Paragraph, { style: { marginBottom: 0 }, type: "secondary", children: ["\u6559\u5E08\u5EFA\u8BAE\uFF1A", item.resolution_notes] }))] })] }) }));
                            } }))] }) }), _jsxs(Row, { gutter: [20, 20], children: [_jsx(Col, { xs: 24, md: 16, children: _jsx(PageLayout, { title: "\u4E92\u52A8\u5BF9\u8BDD", description: "\u4E0E\u5927\u6A21\u578B\u5BF9\u8BDD\uFF0C\u5FEB\u901F\u751F\u6210\u6559\u5B66\u7075\u611F\u3002", extra: _jsx(Space, { children: quickActions.map((action) => (_jsx(Tag, { color: "processing", icon: action.icon, style: { cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, padding: "6px 12px" }, onClick: () => (!loading ? handleSend(action.prompt) : undefined), children: action.label }, action.label))) }), children: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, size: 16, children: [_jsx("div", { style: { maxHeight: 420, overflowY: "auto", paddingRight: 8 }, children: _jsx(Space, { direction: "vertical", style: { width: "100%" }, size: 16, children: chatHistory.map((item, index) => {
                                                const isUser = item.role === "user";
                                                return (_jsxs(Space, { align: "start", style: { width: "100%", justifyContent: isUser ? "flex-end" : "flex-start" }, children: [!isUser && _jsx(Avatar, { icon: _jsx(FireOutlined, {}), style: { background: "#2563eb" } }), _jsx(Card, { bordered: false, style: {
                                                                maxWidth: "75%",
                                                                background: isUser ? "#2563eb" : "#f8fafc",
                                                                color: isUser ? "#ffffff" : "inherit",
                                                                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                                                            }, children: isUser ? (_jsx(Paragraph, { style: { marginBottom: 0, whiteSpace: "pre-wrap" }, children: item.content })) : (renderAssistantContent(item.content)) }), isUser && _jsx(Avatar, { icon: _jsx(UserOutlined, {}), style: { background: "#1e293b" } })] }, `${item.role}-${index}`));
                                            }) }) }), _jsx(TextArea, { autoSize: { minRows: 3, maxRows: 5 }, placeholder: "\u8F93\u5165\u60F3\u89E3\u51B3\u7684\u6559\u5B66\u95EE\u9898\uFF0C\u6309 Enter \u53D1\u9001", value: input, onChange: (event) => setInput(event.target.value), onPressEnter: (event) => {
                                            if (!event.shiftKey) {
                                                event.preventDefault();
                                                void handleSend();
                                            }
                                        }, disabled: loading }), _jsxs(Space, { style: { width: "100%", justifyContent: "space-between" }, children: [_jsx(Space, { children: quickActions.map((action) => (_jsx(Tag, { icon: action.icon, style: { cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }, onClick: () => (!loading ? handleSend(action.prompt) : undefined), children: action.label }, action.label))) }), _jsx(Button, { type: "primary", icon: _jsx(SendOutlined, {}), loading: loading, onClick: () => handleSend(), children: "\u53D1\u9001" })] })] }) }) }), _jsx(Col, { xs: 24, md: 8, children: _jsx(PageLayout, { title: "\u7075\u611F\u63A5\u529B", description: "\u667A\u80FD\u7EED\u5199\u4F60\u7684\u60F3\u6CD5\uFF0C\u5FEB\u901F\u62D3\u5C55\u6559\u5B66\u65B9\u6848\u3002", children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [suggestions.length === 0 ? (_jsx(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: "\u63D0\u95EE\u540E\uFF0C\u8FD9\u91CC\u4F1A\u7ED9\u51FA\u53EF\u7EE7\u7EED\u8FFD\u95EE\u7684\u7075\u611F\u5173\u952E\u8BCD\uFF0C\u5E2E\u52A9\u4F60\u628A\u8BFE\u5802\u8BBE\u8BA1\u5F97\u66F4\u6DF1\u5165\u3002" })) : (suggestions.map((item) => (_jsx(Card, { size: "small", bordered: false, className: "shadow-panel", children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsx(Text, { strong: true, children: item }), _jsx(Button, { type: "link", size: "small", onClick: () => handleSend(item), children: "\u7EE7\u7EED\u8FFD\u95EE" })] }) }, item)))), _jsxs(Divider, { style: { margin: "12px 0" }, children: [_jsx(ThunderboltOutlined, {}), " \u6559\u5B66\u52A0\u901F\u6280\u5DE7"] }), _jsxs(Paragraph, { type: "secondary", style: { marginBottom: 0 }, children: ["\u00B7 \u5148\u63CF\u8FF0\u73ED\u7EA7\u7279\u70B9\u6216\u9519\u9898\u70ED\u70B9\uFF0C\u518D\u63D0\u51FA\u9700\u6C42\uFF0C\u5927\u6A21\u578B\u4F1A\u751F\u6210\u66F4\u8D34\u8FD1\u8BFE\u5802\u7684\u7B54\u6848\u3002", _jsx("br", {}), "\u00B7 \u53EF\u4EE5\u8BA9\u5B83\u8F93\u51FA\u8BFE\u4EF6\u63D0\u7EB2\u3001\u677F\u4E66\u793A\u4F8B\u3001\u8BFE\u5802\u63D0\u95EE\u811A\u672C\uFF0C\u517C\u987E\u4E0D\u540C\u5C42\u6B21\u5B66\u751F\u3002", _jsx("br", {}), "\u00B7 \u652F\u6301\u8FFD\u95EE\u548C\u6DA6\u8272\uFF0C\u76F4\u5230\u65B9\u6848\u6EE1\u8DB3\u9884\u671F\u4E3A\u6B62\u3002"] })] }) }) })] }), _jsx(LlmConfigModal, { open: configVisible, onClose: () => setConfigVisible(false), onUpdated: (status) => {
                    setLlmStatus(status.available ? "available" : "unavailable");
                } }), _jsx(Modal, { title: "\u5BF9\u8BDD\u53C2\u6570\u8C03\u8282", open: tuningVisible, onCancel: () => setTuningVisible(false), onOk: handleTuningSubmit, okText: "\u4FDD\u5B58\u53C2\u6570", destroyOnClose: true, children: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, size: 20, children: [_jsxs("div", { children: [_jsx(Text, { strong: true, children: "\u56DE\u7B54\u6E29\u5EA6" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: 0, max: 1, step: 0.05, value: pendingTuning.temperature, onChange: (value) => handleTuningChange("temperature")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: 0, max: 1, step: 0.05, value: pendingTuning.temperature, onChange: handleTuningChange("temperature") })] })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Top P" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: 0, max: 1, step: 0.05, value: pendingTuning.top_p, onChange: (value) => handleTuningChange("top_p")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: 0, max: 1, step: 0.05, value: pendingTuning.top_p, onChange: handleTuningChange("top_p") })] })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Presence Penalty" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: -2, max: 2, step: 0.1, value: pendingTuning.presence_penalty, onChange: (value) => handleTuningChange("presence_penalty")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: -2, max: 2, step: 0.1, value: pendingTuning.presence_penalty, onChange: handleTuningChange("presence_penalty") })] })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Frequency Penalty" }), _jsxs(Space, { style: { width: "100%" }, children: [_jsx(Slider, { min: -2, max: 2, step: 0.1, value: pendingTuning.frequency_penalty, onChange: (value) => handleTuningChange("frequency_penalty")(Array.isArray(value) ? value[0] : value), style: { flex: 1 } }), _jsx(InputNumber, { min: -2, max: 2, step: 0.1, value: pendingTuning.frequency_penalty, onChange: handleTuningChange("frequency_penalty") })] })] })] }) })] }));
};
export default TeacherAssistant;
