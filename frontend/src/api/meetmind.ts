/**
 * MeetMind 对齐的 API 服务
 * 
 * 与 meetmind 项目的 API 接口保持一致
 */

import { apiClient } from './client';

// ============ 类型定义 ============

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface TutorRequest {
  timestamp?: number;
  segments?: TranscriptSegment[];
  studentQuestion?: string;
  messageContent?: MessageContent[];
  conversationHistory?: ChatMessage[];
  enableGuidance?: boolean;
  enableWeb?: boolean;
  selectedOptionId?: string;
  model?: string;
  temperature?: number;
  stream?: boolean;
  context?: string;
  subject?: string;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface TutorResponse {
  explanation?: {
    teacherSaid: string;
    citation?: {
      text: string;
      timeRange?: string;
      startMs?: number;
      endMs?: number;
    };
    possibleStuckPoints: string[];
    followUpQuestion?: string;
  };
  actionItems: ActionItem[];
  rawContent: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  guidanceQuestion?: {
    question: string;
    options: { id: string; text: string }[];
  };
  citations?: { url: string; title: string }[];
  conversationId?: string;
}

export interface ActionItem {
  id: string;
  type: 'replay' | 'exercise' | 'review';
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  supportsVision: boolean;
  supportsStreaming: boolean;
  maxContextLength: number;
  defaultTemperature: number;
}

export interface SummaryRequest {
  sessionId: string;
  transcript: TranscriptSegment[];
  sessionInfo?: {
    subject?: string;
    topic?: string;
    teacher?: string;
  };
  format?: 'structured' | 'parent';
  model?: string;
}

export interface ClassSummary {
  id: string;
  overview: string;
  takeaways: {
    title: string;
    description: string;
    importance: string;
  }[];
  keyDifficulties: string[];
  structure: string[];
}

export interface SummaryResponse {
  success: boolean;
  summary: ClassSummary;
  modelUsed: string;
}

export interface TopicsRequest {
  sessionId: string;
  transcript: TranscriptSegment[];
  mode?: 'smart' | 'fast';
  maxTopics?: number;
  theme?: string;
  sessionInfo?: {
    subject?: string;
    topic?: string;
    teacher?: string;
  };
  excludeTopicKeys?: string[];
  includeCandidatePool?: boolean;
  model?: string;
}

export interface HighlightTopic {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  importance: 'high' | 'medium' | 'low';
  duration: number;
  segments: TranscriptSegment[];
  keywords?: string[];
  quote?: {
    timestamp: string;
    text: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TopicsResponse {
  success: boolean;
  topics: HighlightTopic[];
  candidates?: {
    key: string;
    title: string;
    startMs: number;
    endMs: number;
    score: number;
  }[];
  modelUsed: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    email?: string;
    nickname: string;
    role: string;
    permissions: string[];
  };
}

// ============ API 函数 ============

/**
 * AI 家教对话
 */
export async function tutorChat(request: TutorRequest): Promise<TutorResponse> {
  const response = await apiClient.post('/api/v1/tutor', request);
  return response.data;
}

/**
 * AI 家教流式对话
 */
export function tutorChatStream(
  request: TutorRequest,
  onChunk: (chunk: string) => void,
  onDone: (fullContent: string) => void,
  onError: (error: string) => void,
): () => void {
  const controller = new AbortController();
  
  fetch('/api/v1/tutor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...request, stream: true }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullContent += data.text;
              onChunk(data.text);
            }
            if (data.fullContent) {
              onDone(data.fullContent);
            }
          } else if (line.startsWith('event: error')) {
            // 下一行是错误数据
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error.message);
      }
    });
  
  return () => controller.abort();
}

/**
 * 通用 AI 对话
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const response = await apiClient.post('/api/v1/chat', request);
  return response.data;
}

/**
 * 获取可用模型列表
 */
export async function getModels(): Promise<{ models: ModelInfo[]; defaultModel: string }> {
  const response = await apiClient.get('/api/v1/chat');
  return response.data;
}

/**
 * 生成课堂摘要
 */
export async function generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
  const response = await apiClient.post('/api/v1/generate-summary', request);
  return response.data;
}

/**
 * 生成精选片段
 */
export async function generateTopics(request: TopicsRequest): Promise<TopicsResponse> {
  const response = await apiClient.post('/api/v1/generate-topics', request);
  return response.data;
}

/**
 * 用户登录
 */
export async function login(username: string, password: string, rememberMe = false): Promise<AuthResponse> {
  const response = await apiClient.post('/api/v1/auth/login', {
    username,
    password,
    rememberMe,
  });
  return response.data;
}

/**
 * 用户注册
 */
export async function register(
  username: string,
  email: string,
  password: string,
  nickname?: string,
): Promise<AuthResponse> {
  const response = await apiClient.post('/api/v1/auth/register', {
    username,
    email,
    password,
    nickname,
  });
  return response.data;
}

/**
 * 刷新 Token
 */
export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  const response = await apiClient.post('/api/v1/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const response = await apiClient.get('/api/v1/auth/me');
  return response.data;
}
