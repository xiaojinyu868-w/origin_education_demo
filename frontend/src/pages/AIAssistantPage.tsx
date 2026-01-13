/**
 * AI 助教对话 - 世界级智能对话体验
 * 
 * 设计风格: Glassmorphism + Chat UI
 * 特点:
 * - 流畅的对话界面
 * - 智能的上下文理解
 * - 精美的消息气泡
 * - 丰富的快捷操作
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  message, 
  Select, 
  Slider, 
  Modal, 
  Checkbox,
  Tooltip,
  Avatar,
} from 'antd';
import {
  SendOutlined,
  BulbOutlined,
  SettingOutlined,
  UserOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BookOutlined,
  FileTextOutlined,
  TeamOutlined,
  ReloadOutlined,
  StarOutlined,
  StarFilled,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import { GlassCard } from '../design-system/components/GlassCard';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { Badge } from '../design-system/components/Badge';
import { Skeleton } from '../design-system/components/Skeleton';
import { AppShell } from '../components/layout/AppShell';
import LlmConfigModal from '../components/LlmConfigModal';
import type { AssistantMessage, Mistake, Student } from '../types';
import { fetchAssistantStatus, fetchStudentMistakes, fetchStudents } from '../api/services';
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
} from './TeacherAssistant.utils';
import useResponsive from '../hooks/useResponsive';

// ============================================
// 类型定义
// ============================================

type ChatTuning = {
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
};

// ============================================
// 动画配置
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// ============================================
// 常量
// ============================================

const defaultTuning: ChatTuning = {
  temperature: 0.3,
  top_p: 0.9,
  presence_penalty: 0,
  frequency_penalty: 0,
};

const QUICK_PROMPTS = [
  { icon: <BookOutlined />, label: '讲评策略', prompt: '请帮我设计一份针对本次考试的讲评策略' },
  { icon: <FileTextOutlined />, label: '作业设计', prompt: '请根据学生的薄弱知识点设计一份针对性作业' },
  { icon: <TeamOutlined />, label: '家校沟通', prompt: '请帮我生成一份家校沟通文案，总结学生近期学习情况' },
  { icon: <BulbOutlined />, label: '教学建议', prompt: '请根据学情分析给出教学改进建议' },
];

const AI_CAPABILITIES = [
  { icon: '🎯', title: '学科问答', desc: '解答各学科知识问题' },
  { icon: '📝', title: '作业辅导', desc: '批改作业、讲解错题' },
  { icon: '📊', title: '学情分析', desc: '分析学习数据和趋势' },
  { icon: '📅', title: '学习规划', desc: '制定个性化学习计划' },
];

// ============================================
// 子组件
// ============================================

// 消息气泡
const MessageBubble: React.FC<{
  message: AssistantMessage;
  onCopy: () => void;
  onStar: () => void;
  isStarred: boolean;
}> = ({ message, onCopy, onStar, isStarred }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      variants={messageVariants}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* 头像 */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
            : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
        }`}
      >
        {isUser ? <UserOutlined /> : <RobotOutlined />}
      </div>

      {/* 消息内容 */}
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative group rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-tr-md'
              : 'bg-white/80 backdrop-blur-sm border border-slate-200/50 text-slate-700 rounded-tl-md shadow-sm'
          }`}
        >
          {/* 消息文本 */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>

          {/* 操作按钮 */}
          {!isUser && (
            <div className="absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip title="复制">
                <button
                  className="w-7 h-7 rounded-lg bg-white/80 backdrop-blur border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                  onClick={onCopy}
                >
                  <CopyOutlined className="text-xs" />
                </button>
              </Tooltip>
              <Tooltip title={isStarred ? '取消收藏' : '收藏'}>
                <button
                  className={`w-7 h-7 rounded-lg backdrop-blur border flex items-center justify-center transition-all ${
                    isStarred
                      ? 'bg-amber-50 border-amber-200 text-amber-500'
                      : 'bg-white/80 border-slate-200/50 text-slate-400 hover:text-amber-500 hover:bg-white'
                  }`}
                  onClick={onStar}
                >
                  {isStarred ? <StarFilled className="text-xs" /> : <StarOutlined className="text-xs" />}
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// 快捷提问标签
const QuickPromptTag: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur border border-slate-200/50 text-sm text-slate-600 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all shrink-0"
    onClick={onClick}
  >
    {icon}
    {label}
  </motion.button>
);

// AI 能力介绍卡片
const CapabilityCard: React.FC<{
  icon: string;
  title: string;
  desc: string;
}> = ({ icon, title, desc }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="p-4 rounded-xl bg-white/50 backdrop-blur border border-slate-200/50 hover:bg-white hover:shadow-sm transition-all"
  >
    <div className="text-2xl mb-2">{icon}</div>
    <div className="font-semibold text-slate-800 mb-1">{title}</div>
    <div className="text-xs text-slate-500">{desc}</div>
  </motion.div>
);

// 参数调节弹窗
const TuningModal: React.FC<{
  visible: boolean;
  tuning: ChatTuning;
  onCancel: () => void;
  onConfirm: (tuning: ChatTuning) => void;
}> = ({ visible, tuning, onCancel, onConfirm }) => {
  const [pending, setPending] = useState(tuning);

  useEffect(() => {
    setPending(tuning);
  }, [tuning]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SlidersOutlined className="text-indigo-500" />
          <span>对话参数调节</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <div className="space-y-6 py-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Temperature</span>
            <span className="text-sm text-slate-500">{pending.temperature}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={pending.temperature}
            onChange={(v) => setPending((p) => ({ ...p, temperature: v }))}
          />
          <div className="text-xs text-slate-400 mt-1">控制回复的随机性，值越低越确定</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Top P</span>
            <span className="text-sm text-slate-500">{pending.top_p}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={pending.top_p}
            onChange={(v) => setPending((p) => ({ ...p, top_p: v }))}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" fullWidth onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" fullWidth onClick={() => onConfirm(pending)}>
            应用
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// 主组件
// ============================================

export const AIAssistantPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  // 状态
  const [chatHistory, setChatHistory] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: '你好，我是智慧教研助手！👋\n\n我可以帮你：\n• 设计讲评策略和作业\n• 分析学情数据\n• 生成家校沟通文案\n• 解答教学相关问题\n\n请告诉我你需要什么帮助？',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmStatus, setLlmStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const [configVisible, setConfigVisible] = useState(false);
  const [tuningVisible, setTuningVisible] = useState(false);
  const [chatTuning, setChatTuning] = useState<ChatTuning>(defaultTuning);
  const [starredMessages, setStarredMessages] = useState<Set<number>>(new Set());
  const [showCapabilities, setShowCapabilities] = useState(true);

  // 学生和错题数据
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRangeValue>('latest');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 检查 LLM 状态
  const refreshLlmStatus = useCallback(async () => {
    const { available } = await fetchAssistantStatus();
    setLlmStatus(available ? 'available' : 'unavailable');
  }, []);

  // 加载学生列表
  useEffect(() => {
    void (async () => {
      await refreshLlmStatus();
      const list = await fetchStudents();
      setStudents(list);
    })();
  }, [refreshLlmStatus]);

  // 加载学生错题
  useEffect(() => {
    if (!selectedStudentId) return;
    void (async () => {
      const list = await fetchStudentMistakes(selectedStudentId);
      setMistakes(list);
    })();
  }, [selectedStudentId]);

  // 滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (llmStatus === 'unavailable') {
      message.warning('AI 服务暂不可用，请先配置');
      setConfigVisible(true);
      return;
    }

    const userMessage: AssistantMessage = { role: 'user', content: input.trim() };
    setChatHistory((prev) => [...prev, userMessage]);
    setInput('');
    setShowCapabilities(false);
    setLoading(true);

    // 模拟 AI 回复
    setTimeout(() => {
      const aiResponse: AssistantMessage = {
        role: 'assistant',
        content: `收到您的问题："${userMessage.content}"\n\n我正在分析相关数据，这是一个模拟回复。在实际应用中，这里会调用 AI 接口生成真实的回复内容。\n\n如果您需要：\n1. 讲评策略 - 我可以根据学情数据设计\n2. 作业设计 - 我可以针对薄弱知识点出题\n3. 家校沟通 - 我可以生成专业的沟通文案`,
      };
      setChatHistory((prev) => [...prev, aiResponse]);
      setLoading(false);
    }, 1500);
  };

  // 使用快捷提问
  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // 复制消息
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  // 收藏消息
  const toggleStar = (index: number) => {
    setStarredMessages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 清空对话
  const clearChat = () => {
    setChatHistory([
      {
        role: 'assistant',
        content: '对话已清空。有什么我可以帮助你的吗？',
      },
    ]);
    setShowCapabilities(true);
  };

  return (
    <AppShell>
      <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* 顶部栏 */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg">
                <RobotOutlined />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">AI 教研助手</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={llmStatus === 'available' ? 'success' : 'warning'}>
                    {llmStatus === 'available' ? '在线' : '离线'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                allowClear
                placeholder="选择学生上下文"
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                options={students.map((s) => ({ value: s.id, label: s.name }))}
                style={{ width: 160 }}
              />
              <Tooltip title="参数调节">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<SlidersOutlined />}
                  onClick={() => setTuningVisible(true)}
                />
              </Tooltip>
              <Tooltip title="配置 AI">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<SettingOutlined />}
                  onClick={() => setConfigVisible(true)}
                />
              </Tooltip>
              <Tooltip title="清空对话">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<DeleteOutlined />}
                  onClick={clearChat}
                />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 对话区域 */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {/* AI 能力介绍 */}
            <AnimatePresence>
              {showCapabilities && chatHistory.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
                >
                  {AI_CAPABILITIES.map((cap) => (
                    <CapabilityCard key={cap.title} {...cap} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 消息列表 */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <AnimatePresence>
                {chatHistory.map((msg, index) => (
                  <MessageBubble
                    key={index}
                    message={msg}
                    onCopy={() => handleCopy(msg.content)}
                    onStar={() => toggleStar(index)}
                    isStarred={starredMessages.has(index)}
                  />
                ))}
              </AnimatePresence>

              {/* 加载状态 */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg">
                    <RobotOutlined />
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* 快捷提问栏 */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-200/30 bg-white/30 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map((item) => (
              <QuickPromptTag
                key={item.label}
                icon={item.icon}
                label={item.label}
                onClick={() => handleQuickPrompt(item.prompt)}
              />
            ))}
          </div>
        </div>

        {/* 输入区域 */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-200/50 bg-white/70 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入你的问题，按 Enter 发送..."
                  className="w-full px-4 py-3 pr-12 rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all text-sm"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<SendOutlined />}
                onClick={handleSend}
                loading={loading}
                disabled={!input.trim()}
                className="shrink-0"
              >
                发送
              </Button>
            </div>
            <div className="text-xs text-slate-400 mt-2 text-center">
              按 Enter 发送，Shift + Enter 换行
            </div>
          </div>
        </div>

        {/* 配置弹窗 */}
        <LlmConfigModal
          visible={configVisible}
          onClose={() => {
            setConfigVisible(false);
            refreshLlmStatus();
          }}
        />

        {/* 参数调节弹窗 */}
        <TuningModal
          visible={tuningVisible}
          tuning={chatTuning}
          onCancel={() => setTuningVisible(false)}
          onConfirm={(tuning) => {
            setChatTuning(tuning);
            setTuningVisible(false);
            message.success('参数已更新');
          }}
        />
      </div>
    </AppShell>
  );
};

export default AIAssistantPage;
