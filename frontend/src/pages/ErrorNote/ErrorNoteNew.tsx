/**
 * 新建错题页面 - 拍照 + AI对话 + 生成笔记
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  message,
  Spin,
  Typography,
  Upload,
  Card,
  Space,
  Radio,
} from 'antd';
import {
  ArrowLeftOutlined,
  CameraOutlined,
  SendOutlined,
  PictureOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { uploadErrorImage, chatWithAI, generateNote, ChatMessage } from './api';
import styles from './styles.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

type Step = 'upload' | 'chat' | 'generate' | 'done';

export default function ErrorNoteNew() {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // 状态
  const [step, setStep] = useState<Step>('upload');
  const [errorId, setErrorId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [style, setStyle] = useState('minimal');
  const [noteImageBase64, setNoteImageBase64] = useState<string>('');
  
  // Loading状态
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 上传图片
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      setUploading(true);
      const result = await uploadErrorImage(file as File);
      setErrorId(result.error_id);
      setImageUrl(result.image_url);
      onSuccess?.(result);
      
      // 开始AI对话
      setStep('chat');
      setChatLoading(true);
      const chatResult = await chatWithAI(result.error_id, '', true);
      setChatHistory([{ role: 'ai', content: chatResult.ai_message }]);
      setChatLoading(false);
      scrollToBottom();
    } catch (error: any) {
      onError?.(error);
      message.error('上传失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || chatLoading) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    
    // 添加用户消息
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    scrollToBottom();
    
    try {
      setChatLoading(true);
      const result = await chatWithAI(errorId, userMessage, false);
      
      // 添加AI回复
      setChatHistory(prev => [...prev, { role: 'ai', content: result.ai_message }]);
      setIsComplete(result.is_complete);
      scrollToBottom();
    } catch (error: any) {
      message.error('发送失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setChatLoading(false);
    }
  };

  // 生成笔记
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setStep('generate');
      
      const result = await generateNote(errorId, style);
      setNoteImageBase64(result.note_image_base64);
      setStep('done');
      message.success('笔记生成成功！');
    } catch (error: any) {
      message.error('生成失败: ' + (error.response?.data?.detail || error.message));
      setStep('chat');
    } finally {
      setGenerating(false);
    }
  };

  // 保存图片
  const handleSaveImage = () => {
    if (!noteImageBase64) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${noteImageBase64}`;
    link.download = `错题笔记_${errorId}.png`;
    link.click();
    message.success('图片已保存');
  };

  // 渲染上传步骤
  const renderUploadStep = () => (
    <div className={styles.uploadContainer}>
      <Upload.Dragger
        accept="image/*"
        showUploadList={false}
        customRequest={handleUpload}
        disabled={uploading}
        className={styles.uploader}
      >
        {uploading ? (
          <div className={styles.uploadContent}>
            <LoadingOutlined style={{ fontSize: 48 }} />
            <p>上传中...</p>
          </div>
        ) : (
          <div className={styles.uploadContent}>
            <CameraOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <p className={styles.uploadTitle}>点击拍照或上传错题图片</p>
            <p className={styles.uploadHint}>支持 JPG、PNG 格式</p>
          </div>
        )}
      </Upload.Dragger>
    </div>
  );

  // 渲染对话步骤
  const renderChatStep = () => (
    <div className={styles.chatContainer}>
      {/* 题目图片预览 */}
      <div className={styles.imagePreview}>
        <img src={imageUrl} alt="错题" />
      </div>
      
      {/* 对话区域 */}
      <div className={styles.chatArea}>
        <div className={styles.chatMessages}>
          {chatHistory.map((msg, index) => (
            <div 
              key={index} 
              className={`${styles.message} ${styles[msg.role]}`}
            >
              <div className={styles.messageContent}>
                {msg.role === 'ai' && <span className={styles.aiAvatar}>🤖</span>}
                <div className={styles.messageBubble}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {chatLoading && (
            <div className={`${styles.message} ${styles.ai}`}>
              <div className={styles.messageContent}>
                <span className={styles.aiAvatar}>🤖</span>
                <div className={styles.messageBubble}>
                  <Spin size="small" /> 思考中...
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
        
        {/* 输入区域 */}
        <div className={styles.inputArea}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入你的回答..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={chatLoading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!inputValue.trim() || chatLoading}
          />
        </div>
        
        {/* 操作按钮 */}
        {(isComplete || chatHistory.length >= 4) && (
          <div className={styles.actionArea}>
            <div className={styles.styleSelector}>
              <Text type="secondary">选择风格：</Text>
              <Radio.Group 
                value={style} 
                onChange={(e) => setStyle(e.target.value)}
                size="small"
              >
                <Radio.Button value="minimal">简约</Radio.Button>
                <Radio.Button value="cute">手账</Radio.Button>
                <Radio.Button value="dark">暗黑</Radio.Button>
              </Radio.Group>
            </div>
            <Button
              type="primary"
              size="large"
              onClick={handleGenerate}
              loading={generating}
              icon={<PictureOutlined />}
            >
              生成笔记图片
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染生成中
  const renderGenerating = () => (
    <div className={styles.generatingContainer}>
      <Spin size="large" />
      <Title level={4}>正在生成精美笔记...</Title>
      <Text type="secondary">AI正在为你绘制专属笔记图片</Text>
    </div>
  );

  // 渲染完成
  const renderDone = () => (
    <div className={styles.doneContainer}>
      <div className={styles.noteImageWrapper}>
        <img 
          src={`data:image/png;base64,${noteImageBase64}`} 
          alt="笔记"
          className={styles.noteImage}
        />
      </div>
      
      <Space direction="vertical" className={styles.doneActions}>
        <Button
          type="primary"
          size="large"
          block
          onClick={handleSaveImage}
        >
          💾 保存到相册
        </Button>
        <Button
          size="large"
          block
          onClick={() => navigate('/library/note')}
        >
          返回列表
        </Button>
        <Button
          type="link"
          onClick={() => {
            setStep('upload');
            setErrorId('');
            setImageUrl('');
            setChatHistory([]);
            setIsComplete(false);
            setNoteImageBase64('');
          }}
        >
          继续拍下一道
        </Button>
      </Space>
    </div>
  );

  return (
    <div className={styles.newContainer}>
      {/* 顶部导航 */}
      <div className={styles.topNav}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/library/note')}
        >
          返回
        </Button>
        <Title level={5} style={{ margin: 0 }}>
          {step === 'upload' && '拍错题'}
          {step === 'chat' && 'AI对话'}
          {step === 'generate' && '生成中'}
          {step === 'done' && '完成'}
        </Title>
        <div style={{ width: 60 }} />
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {step === 'upload' && renderUploadStep()}
        {step === 'chat' && renderChatStep()}
        {step === 'generate' && renderGenerating()}
        {step === 'done' && renderDone()}
      </div>
    </div>
  );
}
