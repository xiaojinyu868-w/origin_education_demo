/**
 * 错题详情页面
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  message,
  Spin,
  Typography,
  Tag,
  Space,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { getErrorNote, deleteErrorNote, ErrorNoteItem } from './api';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;

export default function ErrorNoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<ErrorNoteItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadNote(id);
    }
  }, [id]);

  const loadNote = async (noteId: string) => {
    try {
      setLoading(true);
      const data = await getErrorNote(noteId);
      setNote(data);
    } catch (error: any) {
      message.error('加载失败: ' + (error.response?.data?.detail || error.message));
      navigate('/library/note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setDeleting(true);
      await deleteErrorNote(id);
      message.success('删除成功');
      navigate('/library/note');
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveImage = () => {
    if (!note?.note_image_url) return;
    
    // 打开图片链接进行下载
    const link = document.createElement('a');
    link.href = note.note_image_url;
    link.download = `错题笔记_${note.error_id}.png`;
    link.target = '_blank';
    link.click();
    message.success('图片已保存');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!note) {
    return null;
  }

  return (
    <div className={styles.detailContainer}>
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
          错题详情
        </Title>
        <Popconfirm
          title="确定删除这道错题吗？"
          onConfirm={handleDelete}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button 
            type="text" 
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
          />
        </Popconfirm>
      </div>

      {/* 内容区域 */}
      <div className={styles.detailContent}>
        {/* 笔记图片 */}
        {note.note_image_url ? (
          <div className={styles.noteImageContainer}>
            <img 
              src={note.note_image_url} 
              alt="笔记"
              className={styles.detailNoteImage}
            />
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleSaveImage}
              className={styles.saveButton}
            >
              保存到相册
            </Button>
          </div>
        ) : (
          <div className={styles.originalImageContainer}>
            <img 
              src={note.image_url} 
              alt="错题"
              className={styles.originalImage}
            />
            <Tag color="warning" className={styles.statusTag}>
              尚未生成笔记
            </Tag>
          </div>
        )}

        {/* 信息卡片 */}
        <Card className={styles.infoCard}>
          <Descriptions column={1} size="small">
            {note.summary?.subject && (
              <Descriptions.Item label="学科">
                <Tag color="blue">{note.summary.subject}</Tag>
              </Descriptions.Item>
            )}
            {note.summary?.topic && (
              <Descriptions.Item label="知识点">
                {note.summary.topic}
              </Descriptions.Item>
            )}
            {note.summary?.key_insight && (
              <Descriptions.Item label="关键要点">
                <Text strong style={{ color: '#1890ff' }}>
                  💡 {note.summary.key_insight}
                </Text>
              </Descriptions.Item>
            )}
            {note.summary?.error_reason && (
              <Descriptions.Item label="错因">
                <Text type="danger">
                  ❌ {note.summary.error_reason}
                </Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {formatDate(note.created_at)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 对话记录 */}
        {note.chat_history.length > 0 && (
          <Card 
            title="对话记录" 
            className={styles.chatCard}
            size="small"
          >
            <div className={styles.chatHistoryList}>
              {note.chat_history.map((msg, index) => (
                <div 
                  key={index}
                  className={`${styles.historyMessage} ${styles[msg.role]}`}
                >
                  <span className={styles.historyRole}>
                    {msg.role === 'ai' ? '🤖 AI' : '👤 我'}
                  </span>
                  <Paragraph 
                    className={styles.historyContent}
                    ellipsis={{ rows: 3, expandable: true }}
                  >
                    {msg.content}
                  </Paragraph>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
