export type QuestionType = "multiple_choice" | "fill_in_blank" | "subjective";

export interface Student {
  id: number;
  name: string;
  email?: string;
  grade_level?: string;
}

export interface Teacher {
  id: number;
  name: string;
  email?: string;
}

export interface Classroom {
  id: number;
  name: string;
  grade_level?: string;
  teacher_id: number;
}

export interface Question {
  id: number;
  number: string;
  type: QuestionType;
  prompt?: string;
  max_score: number;
  knowledge_tags?: string;
  answer_key?: Record<string, unknown>;
  rubric?: Record<string, unknown>;
  target_student_ids?: number[] | null;
}

export interface Exam {
  id: number;
  title: string;
  subject?: string;
  scheduled_date?: string;
  teacher_id: number;
  classroom_id?: number;
  answer_key_version: number;
  questions: Question[];
}

export interface SubmissionResponse {
  id: number;
  question_id: number;
  student_answer?: string;
  normalized_answer?: string;
  score?: number;
  is_correct?: boolean;
  ocr_confidence?: number;
  teacher_annotation?: Record<string, unknown> | null;
  comments?: string;
  applies_to_student: boolean;
}

export interface SubmissionDetail {
  id: number;
  student_id: number;
  exam_id: number;
  submitted_at: string;
  total_score?: number;
  status: string;
  metadata?: Record<string, unknown> | null;
  responses: SubmissionResponse[];
}

export interface OCRRow {
  question_number: string;
  raw_text: string;
  annotation?: string | null;
  confidence: number;
}

export interface ProcessingStep {
  name: string;
  status: "success" | "warning" | "error";
  detail?: string;
}

export interface Mistake {
  id: number;
  question_id: number;
  knowledge_tags?: string;
  misconception_label?: string;
  resolution_notes?: string;
  created_at: string;
  last_seen_at: string;
  times_practiced: number;
}

export interface PracticeAssignment {
  id: number;
  student_id: number;
  scheduled_for: string;
  due_date?: string;
  status: string;
  generated_pdf_path?: string;
  items: PracticeItem[];
}

export interface PracticeItem {
  id: number;
  question_id: number;
  order_index: number;
  source_mistake_id?: number;
}

export interface SubmissionProcessingResult {
  submission: SubmissionDetail;
  responses: SubmissionResponse[];
  mistakes: Mistake[];
  ocr_rows: OCRRow[];
  processing_steps: ProcessingStep[];
  ai_summary?: string;
}

export interface AnalyticsSummary {
  total_students: number;
  total_submissions: number;
  average_score: number;
  median_score: number;
  knowledge_breakdown: KnowledgePointBreakdown[];
}

export interface KnowledgePointBreakdown {
  knowledge_tag: string;
  total_attempts: number;
  incorrect_count: number;
  accuracy: number;
  average_score: number;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantChatResponse {
  reply: AssistantMessage;
  suggestions?: string[];
}

export interface LLMConfigStatus {
  available: boolean;
}

export interface LLMConfigUpdate {
  api_key: string;
  base_url?: string;
  text_model?: string;
  vision_model?: string;
}


export interface TeacherFeedback {
  id: number;
  content: string;
  is_anonymous: boolean;
  attachments: string[];
  status: string;
  created_at: string;
  teacher_id?: number;
  teacher_name?: string;
  teacher_email?: string;
}

