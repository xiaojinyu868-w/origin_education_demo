/**
 * 错题列表页面
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  Card, 
  Empty, 
  List, 
  Spin, 
  Tag, 
  Typography,
  message 
} from 'antd';
import { PlusOutlined, BookOutlined } from '@ant-design/icons';
import { listErrorNotes, ErrorNoteItem } from './api';
import styles from './styles.module.css';

const { Title, Text } = Typography;

export default function ErrorNoteList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ErrorNoteItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await listErrorNotes(1, 50);
      setNotes(data.items);
      setTotal(data.total);
    } catch (error) {
      message.error('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'chatting':
        return <Tag color="processing">对话中</Tag>;
      case 'completed':
        return <Tag color="warning">待生成</Tag>;
      case 'generated':
        return <Tag color="success">已完成</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
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

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <BookOutlined /> 我的错题笔记
          </Title>
          <Text type="secondary">共 {total} 道错题</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/library/note/new')}
        >
          拍错题
        </Button>
      </div>

      {/* 列表 */}
      {notes.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="还没有错题笔记"
          style={{ marginTop: 100 }}
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/library/note/new')}
          >
            拍第一道错题
          </Button>
        </Empty>
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3 }}
          dataSource={notes}
          renderItem={(note) => (
            <List.Item>
              <Card
                hoverable
                className={styles.noteCard}
                onClick={() => navigate(`/library/note/${note.error_id}`)}
                cover={
                  <div className={styles.cardCover}>
                    <img 
                      src={note.note_image_url || note.image_url} 
                      alt="错题"
                    />
                  </div>
                }
              >
                <Card.Meta
                  title={
                    <div className={styles.cardTitle}>
                      <span>
                        {note.summary?.topic || '未分类'}
                      </span>
                      {getStatusTag(note.status)}
                    </div>
                  }
                  description={
                    <div className={styles.cardDesc}>
                      {note.summary?.key_insight && (
                        <Text 
                          ellipsis 
                          className={styles.keyInsight}
                        >
                          💡 {note.summary.key_insight}
                        </Text>
                      )}
                      <Text type="secondary" className={styles.date}>
                        {formatDate(note.created_at)}
                      </Text>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      )}

      {/* 浮动按钮 */}
      <Button
        type="primary"
        shape="circle"
        icon={<PlusOutlined />}
        size="large"
        className={styles.fab}
            onClick={() => navigate('/library/note/new')}
      />
    </div>
  );
}
