/**
 * 错题笔记 API
 */

import axios from 'axios';

const API_BASE = '/api/v1/error';

export interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
}

export interface ErrorNoteSummary {
  subject: string | null;
  topic: string | null;
  key_insight: string | null;
  error_reason: string | null;
}

export interface ErrorNoteItem {
  error_id: string;
  image_url: string;
  chat_history: ChatMessage[];
  note_image_url: string | null;
  summary: ErrorNoteSummary | null;
  status: 'chatting' | 'completed' | 'generated';
  created_at: string;
}

export interface UploadResponse {
  error_id: string;
  image_url: string;
}

export interface ChatResponse {
  error_id: string;
  ai_message: string;
  is_complete: boolean;
  suggested_actions: string[];
}

export interface GenerateResponse {
  error_id: string;
  note_image_base64: string;
  note_image_url: string;
  summary: ErrorNoteSummary;
}

export interface ListResponse {
  items: ErrorNoteItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 上传错题图片
 */
export async function uploadErrorImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await axios.post<UploadResponse>(`${API_BASE}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

/**
 * AI对话
 */
export async function chatWithAI(
  errorId: string, 
  message: string = '', 
  isStart: boolean = false
): Promise<ChatResponse> {
  const response = await axios.post<ChatResponse>(`${API_BASE}/chat`, {
    error_id: errorId,
    message,
    is_start: isStart
  });
  return response.data;
}

/**
 * 生成笔记图片
 */
export async function generateNote(
  errorId: string, 
  style: string = 'minimal'
): Promise<GenerateResponse> {
  const response = await axios.post<GenerateResponse>(`${API_BASE}/generate`, {
    error_id: errorId,
    style
  });
  return response.data;
}

/**
 * 获取错题详情
 */
export async function getErrorNote(errorId: string): Promise<ErrorNoteItem> {
  const response = await axios.get<ErrorNoteItem>(`${API_BASE}/${errorId}`);
  return response.data;
}

/**
 * 获取错题列表
 */
export async function listErrorNotes(
  page: number = 1, 
  limit: number = 20
): Promise<ListResponse> {
  const response = await axios.get<ListResponse>(`${API_BASE}/list`, {
    params: { page, limit }
  });
  return response.data;
}

/**
 * 删除错题
 */
export async function deleteErrorNote(errorId: string): Promise<void> {
  await axios.delete(`${API_BASE}/${errorId}`);
}

/**
 * 健康检查
 */
export async function checkHealth(): Promise<{
  status: string;
  llm_available: boolean;
  image_gen_available: boolean;
}> {
  const response = await axios.get(`${API_BASE}/health/status`);
  return response.data;
}
