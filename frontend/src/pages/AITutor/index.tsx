/**
 * AI 家教对话页面 - 世界顶级设计 v3.0
 * 
 * 设计灵感:
 * - ChatGPT: 流畅的对话体验
 * - Claude: 精致的消息气泡
 * - Linear: 优雅的动效与交互
 * - Shape of AI: AI 交互设计模式
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Input,
  Button,
  Select,
  Typography,
  Space,
  Avatar,
  message,
  Tooltip,
  Tag,
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  PictureOutlined,
  ClearOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  SparklesOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { tutorChatStream, getModels, type ModelInfo, type ChatMessage } from '../../api/meetmind';
import { colors, radii, typography, shadows, transitions } from '../../styles/theme';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  model?: string;
}

// 建议问题
const SUGGESTIONS = [
  { icon: <QuestionCircleOutlined />, text: '这道数学题怎么解？', category: '解题' },
  { icon: <BookOutlined />, text: '帮我理解这个概念', category: '概念' },
  { icon: <BulbOutlined />, text: '这篇文章的主旨是什么？', category: '阅读' },
  { icon: <ThunderboltOutlined />, text: '如何提高学习效率？', category: '方法' },
];

const AITutor: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<any>(null);

  // 加载可用模型
  useEffect(() => {
    const loadModels = async () => {
      const result = await getModels();
      setModels(result.models);
      setSelectedModel(result.defaultModel);
    };
    loadModels().catch(console.error);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 生成消息 ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 发送消息
  const handleSend = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;
    if (isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // 构建对话历史
    const conversationHistory: ChatMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 添加助手占位消息
    const assistantMessageId = generateId();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    // 流式请求
    let fullContent = '';
    abortRef.current = tutorChatStream(
      {
        studentQuestion: trimmedInput,
        conversationHistory,
        model: selectedModel,
        temperature: 0.7,
        stream: true,
      },
      (chunk) => {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: fullContent }
            : msg
        ));
      },
      (content) => {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content, isStreaming: false, model: selectedModel }
            : msg
        ));
        setIsLoading(false);
        inputRef.current?.focus();
      },
      (error) => {
        message.error(`对话失败: ${error}`);
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        setIsLoading(false);
      },
    );
  }, [inputValue, isLoading, messages, selectedModel]);

  // 清空对话
  const handleClear = () => {
    if (abortRef.current) {
      abortRef.current();
    }
    setMessages([]);
    setIsLoading(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 渲染消息气泡
  const MessageBubble = ({ msg }: { msg: Message }) => {
    const isUser = msg.role === 'user';
    
    return (
      <div
        className="animate-fade-in-up"
        style={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* 头像 */}
        <Avatar
          size={44}
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          style={{
            background: isUser ? colors.gradients.primary : colors.gradients.success,
            flexShrink: 0,
            boxShadow: isUser 
              ? `0 4px 12px ${colors.primaryGlow}`
              : '0 4px 12px rgba(16, 185, 129, 0.25)',
          }}
        />
        
        {/* 消息内容 */}
        <div
          style={{
            maxWidth: '75%',
            position: 'relative',
          }}
        >
          {/* 气泡 */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: isUser 
                ? `${radii.xl}px ${radii.xl}px ${radii.sm}px ${radii.xl}px` 
                : `${radii.xl}px ${radii.xl}px ${radii.xl}px ${radii.sm}px`,
              background: isUser 
                ? colors.gradients.primary 
                : colors.background.elevated,
              color: isUser ? colors.text.inverse : colors.text.primary,
              boxShadow: isUser 
                ? `0 4px 16px ${colors.primaryGlow}` 
                : shadows.md,
              border: isUser ? 'none' : `1px solid ${colors.border.subtle}`,
            }}
          >
            {msg.isStreaming && !msg.content ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <Text style={{ color: colors.text.secondary }}>思考中...</Text>
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <Paragraph style={{ 
                      margin: 0, 
                      color: 'inherit',
                      fontSize: typography.fontSize.md,
                      lineHeight: typography.lineHeight.relaxed,
                    }}>
                      {children}
                    </Paragraph>
                  ),
                  code: ({ children }) => (
                    <code style={{
                      backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : colors.background.muted,
                      padding: '3px 8px',
                      borderRadius: radii.sm,
                      fontSize: typography.fontSize.sm,
                      fontFamily: typography.fontFamily.mono,
                    }}>
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre style={{
                      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : colors.gray[900],
                      color: isUser ? colors.text.inverse : colors.gray[100],
                      padding: 16,
                      borderRadius: radii.lg,
                      overflow: 'auto',
                      fontSize: typography.fontSize.sm,
                      fontFamily: typography.fontFamily.mono,
                      margin: '12px 0',
                    }}>
                      {children}
                    </pre>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ 
                      margin: '12px 0', 
                      paddingLeft: 20,
                      color: 'inherit',
                    }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ 
                      margin: '12px 0', 
                      paddingLeft: 20,
                      color: 'inherit',
                    }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ 
                      marginBottom: 6,
                      lineHeight: typography.lineHeight.relaxed,
                    }}>
                      {children}
                    </li>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
            
            {/* 流式指示器 */}
            {msg.isStreaming && msg.content && (
              <span 
                className="animate-pulse"
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 18,
                  background: colors.primary,
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  borderRadius: 2,
                }}
              />
            )}
          </div>
          
          {/* 模型标签 */}
          {msg.model && !msg.isStreaming && (
            <div style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}>
              <Tag style={{
                background: colors.background.muted,
                border: 'none',
                borderRadius: radii.sm,
                fontSize: typography.fontSize.xs,
                color: colors.text.tertiary,
              }}>
                {msg.model}
              </Tag>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 空状态
  const EmptyState = () => (
    <div 
      className="animate-fade-in"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
      }}
    >
      {/* 图标 */}
      <div style={{
        width: 100,
        height: 100,
        borderRadius: radii["2xl"],
        background: `linear-gradient(135deg, ${colors.primarySoft} 0%, ${colors.infoSoft} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <RobotOutlined style={{ 
          fontSize: 48, 
          background: colors.gradients.primary,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }} />
      </div>
      
      <Text style={{ 
        fontSize: typography.fontSize["2xl"], 
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: 8,
      }}>
        开始你的学习之旅
      </Text>
      <Text style={{ 
        fontSize: typography.fontSize.md, 
        color: colors.text.secondary,
        marginBottom: 32,
      }}>
        输入你的问题，AI 家教将帮助你解答
      </Text>
      
      {/* 建议问题 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 12,
        maxWidth: 500,
      }}>
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => setInputValue(suggestion.text)}
            className="animate-fade-in-up card-interactive"
            style={{
              animationDelay: `${index * 50}ms`,
              padding: '14px 18px',
              background: colors.background.elevated,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.lg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              transition: `all ${transitions.duration.fast} ${transitions.easing.out}`,
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: radii.md,
              background: colors.primarySoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.primary,
              fontSize: 16,
              flexShrink: 0,
            }}>
              {suggestion.icon}
            </div>
            <div>
              <Text style={{ 
                fontSize: typography.fontSize.sm,
                color: colors.text.primary,
                display: 'block',
              }}>
                {suggestion.text}
              </Text>
              <Text style={{ 
                fontSize: typography.fontSize.xs,
                color: colors.text.tertiary,
              }}>
                {suggestion.category}
              </Text>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 240px)',
      minHeight: 500,
    }}>
      {/* 顶部工具栏 */}
      <div 
        className="animate-fade-in"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          padding: '12px 16px',
          background: colors.background.elevated,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border.subtle}`,
        }}
      >
        <Space size={12}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: radii.lg,
            background: colors.gradients.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text.inverse,
            boxShadow: `0 4px 12px ${colors.primaryGlow}`,
          }}>
            <RobotOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <Text style={{ 
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              display: 'block',
            }}>
              AI 家教
            </Text>
            <Text style={{ 
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
            }}>
              智能对话助手
            </Text>
          </div>
        </Space>
        
        <Space size={12}>
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            style={{ width: 180 }}
            placeholder="选择模型"
            dropdownStyle={{ borderRadius: radii.lg }}
            options={models.map(m => ({
              value: m.id,
              label: (
                <Space>
                  <span>{m.name}</span>
                  {m.supportsVision && (
                    <PictureOutlined style={{ color: colors.success, fontSize: 12 }} />
                  )}
                </Space>
              ),
            }))}
          />
          <Tooltip title="清空对话">
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={messages.length === 0}
              style={{ borderRadius: radii.md }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 对话区域 */}
      <div
        style={{
          flex: 1,
          background: colors.background.elevated,
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.card,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 消息列表 */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 24,
          }}
        >
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div style={{
          padding: 20,
          borderTop: `1px solid ${colors.border.subtle}`,
          background: colors.background.subtle,
        }}>
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
          }}>
            <div style={{ 
              flex: 1,
              background: colors.background.elevated,
              borderRadius: radii.xl,
              border: `1px solid ${colors.border.default}`,
              overflow: 'hidden',
              transition: `all ${transitions.duration.fast} ${transitions.easing.out}`,
            }}>
              <TextArea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题... (Shift+Enter 换行)"
                autoSize={{ minRows: 1, maxRows: 5 }}
                style={{
                  border: 'none',
                  boxShadow: 'none',
                  padding: '14px 18px',
                  fontSize: typography.fontSize.md,
                  resize: 'none',
                  background: 'transparent',
                }}
                disabled={isLoading}
              />
            </div>
            <Button
              type="primary"
              icon={isLoading ? <LoadingOutlined /> : <SendOutlined />}
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              style={{
                height: 52,
                width: 52,
                borderRadius: radii.xl,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: colors.gradients.primary,
                border: 'none',
                boxShadow: `0 4px 12px ${colors.primaryGlow}`,
              }}
            />
          </div>
          
          {/* 提示文字 */}
          <Text style={{
            display: 'block',
            marginTop: 10,
            fontSize: typography.fontSize.xs,
            color: colors.text.tertiary,
            textAlign: 'center',
          }}>
            AI 生成的内容仅供参考，请结合实际情况判断
          </Text>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
