/**
 * 模型设置页面 - 世界顶级设计 v3.0
 * 
 * 设计灵感:
 * - Linear: 精致的设置界面
 * - Stripe: 优雅的卡片选择
 * - Vercel: 极简的参数配置
 * - Shape of AI: AI 调优模式
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Slider,
  Button,
  Input,
  Space,
  Tag,
  Spin,
  message,
  Alert,
  Tooltip,
} from 'antd';
import {
  CheckCircleFilled,
  ThunderboltOutlined,
  EyeOutlined,
  RobotOutlined,
  SendOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CloudServerOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { getModels, chat, type ModelInfo } from '../../api/meetmind';
import { colors, radii, typography, shadows, transitions } from '../../styles/theme';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// 提供商配置
const PROVIDER_CONFIG: Record<string, { name: string; color: string; gradient: string }> = {
  qwen: { 
    name: '通义千问', 
    color: colors.primary,
    gradient: colors.gradients.primary,
  },
  gemini: { 
    name: 'Google Gemini', 
    color: colors.success,
    gradient: colors.gradients.success,
  },
  openai: { 
    name: 'OpenAI', 
    color: colors.warning,
    gradient: colors.gradients.warm,
  },
};

const ModelSettings: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      const result = await getModels();
      setModels(result.models);
      setSelectedModel(result.defaultModel);
      setLoading(false);
    };
    loadModels().catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  // 测试模型
  const handleTest = async () => {
    if (!testInput.trim()) {
      message.warning('请输入测试内容');
      return;
    }

    setTesting(true);
    setTestOutput('');

    const response = await chat({
      messages: [{ role: 'user', content: testInput }],
      model: selectedModel,
      temperature,
      maxTokens,
    });

    setTestOutput(response.content);
    setTesting(false);
  };

  // 获取提供商配置
  const getProviderConfig = (provider: string) => {
    return PROVIDER_CONFIG[provider] || { 
      name: provider, 
      color: colors.gray[500],
      gradient: `linear-gradient(135deg, ${colors.gray[400]} 0%, ${colors.gray[500]} 100%)`,
    };
  };

  // 模型卡片组件
  const ModelCard = ({ model }: { model: ModelInfo }) => {
    const isSelected = selectedModel === model.id;
    const config = getProviderConfig(model.provider);
    
    return (
      <div
        onClick={() => setSelectedModel(model.id)}
        className="animate-fade-in-up card-interactive"
        style={{
          padding: 20,
          borderRadius: radii.xl,
          border: isSelected 
            ? `2px solid ${config.color}`
            : `1px solid ${colors.border.subtle}`,
          background: isSelected 
            ? `linear-gradient(135deg, ${config.color}08 0%, ${config.color}03 100%)`
            : colors.background.elevated,
          cursor: 'pointer',
          transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 选中指示器 */}
        {isSelected && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: config.gradient,
          }} />
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: radii.lg,
                background: `${config.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CloudServerOutlined style={{ fontSize: 18, color: config.color }} />
              </div>
              <div>
                <Text style={{ 
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  display: 'block',
                }}>
                  {model.name}
                </Text>
                <Tag 
                  style={{
                    background: `${config.color}15`,
                    color: config.color,
                    border: 'none',
                    borderRadius: radii.sm,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                    marginTop: 2,
                  }}
                >
                  {config.name}
                </Tag>
              </div>
            </div>
          </div>
          {isSelected && (
            <CheckCircleFilled style={{ 
              color: config.color, 
              fontSize: 22,
              filter: `drop-shadow(0 2px 4px ${config.color}40)`,
            }} />
          )}
        </div>
        
        <Paragraph 
          style={{ 
            fontSize: typography.fontSize.sm, 
            color: colors.text.secondary,
            margin: '12px 0',
            lineHeight: typography.lineHeight.relaxed,
          }}
          ellipsis={{ rows: 2 }}
        >
          {model.description}
        </Paragraph>
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {model.supportsVision && (
            <Tag 
              icon={<EyeOutlined />} 
              style={{
                background: colors.successSoft,
                color: colors.success,
                border: 'none',
                borderRadius: radii.sm,
                fontSize: typography.fontSize.xs,
              }}
            >
              视觉理解
            </Tag>
          )}
          {model.supportsStreaming && (
            <Tag 
              icon={<ThunderboltOutlined />} 
              style={{
                background: colors.infoSoft,
                color: colors.info,
                border: 'none',
                borderRadius: radii.sm,
                fontSize: typography.fontSize.xs,
              }}
            >
              流式输出
            </Tag>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        flexDirection: 'column',
        gap: 16,
      }}>
        <div className="loading-spinner-lg" style={{
          width: 40,
          height: 40,
          border: `3px solid ${colors.border.default}`,
          borderTopColor: colors.primary,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <Text style={{ color: colors.text.secondary }}>加载模型列表...</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Row gutter={24}>
        {/* 左侧：模型选择与参数配置 */}
        <Col xs={24} lg={14}>
          {/* 模型选择 */}
          <Card
            className="animate-fade-in-up"
            title={
              <Space>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.md,
                  background: colors.primarySoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ApiOutlined style={{ color: colors.primary, fontSize: 16 }} />
                </div>
                <span style={{ fontWeight: typography.fontWeight.semibold }}>可用模型</span>
              </Space>
            }
            style={{ 
              borderRadius: radii.xl, 
              marginBottom: 24,
              border: `1px solid ${colors.border.subtle}`,
              boxShadow: shadows.card,
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Row gutter={[16, 16]}>
              {models.map((model, index) => (
                <Col xs={24} sm={12} key={model.id}>
                  <div style={{ animationDelay: `${index * 50}ms` }}>
                    <ModelCard model={model} />
                  </div>
                </Col>
              ))}
            </Row>

            {models.length === 0 && (
              <Alert
                type="warning"
                message="暂无可用模型"
                description="请在后端配置 API Key 以启用模型"
                showIcon
                style={{ borderRadius: radii.lg }}
              />
            )}
          </Card>

          {/* 参数配置 */}
          <Card
            className="animate-fade-in-up stagger-1"
            title={
              <Space>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.md,
                  background: colors.warningSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <SettingOutlined style={{ color: colors.warning, fontSize: 16 }} />
                </div>
                <span style={{ fontWeight: typography.fontWeight.semibold }}>参数配置</span>
              </Space>
            }
            style={{ 
              borderRadius: radii.xl,
              border: `1px solid ${colors.border.subtle}`,
              boxShadow: shadows.card,
            }}
            styles={{ body: { padding: 24 } }}
          >
            {/* Temperature */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Space>
                  <Text style={{ 
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}>
                    Temperature
                  </Text>
                  <Tooltip title="控制输出的随机性。较低的值更精确，较高的值更有创意。">
                    <InfoCircleOutlined style={{ color: colors.text.tertiary, fontSize: 14 }} />
                  </Tooltip>
                </Space>
                <Tag style={{
                  background: colors.primarySoft,
                  color: colors.primary,
                  border: 'none',
                  borderRadius: radii.sm,
                  fontWeight: typography.fontWeight.semibold,
                }}>
                  {temperature}
                </Tag>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={setTemperature}
                marks={{
                  0: { label: '精确', style: { fontSize: typography.fontSize.xs } },
                  0.5: { label: '平衡', style: { fontSize: typography.fontSize.xs } },
                  1: { label: '创意', style: { fontSize: typography.fontSize.xs } },
                }}
                tooltip={{ formatter: (value) => `${value}` }}
              />
            </div>

            {/* Max Tokens */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Space>
                  <Text style={{ 
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}>
                    Max Tokens
                  </Text>
                  <Tooltip title="控制输出的最大长度。更多 token 允许更长的回复。">
                    <InfoCircleOutlined style={{ color: colors.text.tertiary, fontSize: 14 }} />
                  </Tooltip>
                </Space>
                <Tag style={{
                  background: colors.infoSoft,
                  color: colors.info,
                  border: 'none',
                  borderRadius: radii.sm,
                  fontWeight: typography.fontWeight.semibold,
                }}>
                  {maxTokens}
                </Tag>
              </div>
              <Slider
                min={256}
                max={8192}
                step={256}
                value={maxTokens}
                onChange={setMaxTokens}
                marks={{
                  256: { label: '256', style: { fontSize: typography.fontSize.xs } },
                  2048: { label: '2K', style: { fontSize: typography.fontSize.xs } },
                  4096: { label: '4K', style: { fontSize: typography.fontSize.xs } },
                  8192: { label: '8K', style: { fontSize: typography.fontSize.xs } },
                }}
                tooltip={{ formatter: (value) => `${value} tokens` }}
              />
            </div>
          </Card>
        </Col>

        {/* 右侧：测试区域 */}
        <Col xs={24} lg={10}>
          <Card
            className="animate-fade-in-up stagger-2"
            title={
              <Space>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.md,
                  background: colors.gradients.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${colors.primaryGlow}`,
                }}>
                  <RobotOutlined style={{ color: colors.text.inverse, fontSize: 16 }} />
                </div>
                <span style={{ fontWeight: typography.fontWeight.semibold }}>测试对话</span>
              </Space>
            }
            style={{ 
              borderRadius: radii.xl, 
              position: 'sticky', 
              top: 24,
              border: `1px solid ${colors.border.subtle}`,
              boxShadow: shadows.card,
            }}
            styles={{ body: { padding: 24 } }}
          >
            {/* 当前模型 */}
            <div style={{ 
              padding: 16,
              background: colors.background.muted,
              borderRadius: radii.lg,
              marginBottom: 20,
            }}>
              <Text style={{ 
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}>
                当前模型
              </Text>
              <div style={{ 
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginTop: 4,
              }}>
                {models.find(m => m.id === selectedModel)?.name || selectedModel}
              </div>
            </div>

            {/* 输入区域 */}
            <TextArea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="输入测试内容..."
              autoSize={{ minRows: 4, maxRows: 8 }}
              style={{ 
                marginBottom: 16, 
                borderRadius: radii.lg,
                fontSize: typography.fontSize.md,
              }}
            />

            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleTest}
              loading={testing}
              block
              style={{ 
                borderRadius: radii.lg, 
                height: 44,
                fontWeight: typography.fontWeight.medium,
                background: colors.gradients.primary,
                border: 'none',
                boxShadow: `0 4px 12px ${colors.primaryGlow}`,
              }}
            >
              发送测试
            </Button>

            {/* 输出区域 */}
            {testOutput && (
              <div
                className="animate-fade-in-up"
                style={{
                  marginTop: 20,
                  padding: 20,
                  background: colors.background.muted,
                  borderRadius: radii.xl,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${colors.border.subtle}`,
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: radii.sm,
                    background: colors.gradients.success,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <RobotOutlined style={{ color: colors.text.inverse, fontSize: 12 }} />
                  </div>
                  <Text style={{ 
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.secondary,
                  }}>
                    AI 回复
                  </Text>
                </div>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <Paragraph style={{ 
                        margin: 0, 
                        color: colors.text.primary,
                        fontSize: typography.fontSize.base,
                        lineHeight: typography.lineHeight.relaxed,
                      }}>
                        {children}
                      </Paragraph>
                    ),
                  }}
                >
                  {testOutput}
                </ReactMarkdown>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ModelSettings;
