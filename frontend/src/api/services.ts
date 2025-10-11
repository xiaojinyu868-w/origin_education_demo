
import type {
  AnalyticsSummary,
  AssistantChatResponse,
  AssistantMessage,
  LLMConfigStatus,
  Classroom,
  Exam,
  ExamDraftResponse,
  GradingSession,
  Mistake,
  Student,
  PracticeAssignment,
  ProcessingLogList,
  SubmissionDetail,
  SubmissionHistoryEntry,
  SubmissionProcessingResult,
  SubmissionResponse,
  Teacher,
  TeacherFeedback,
} from "../types";
import { apiClient } from "./client";

type DemoBootstrapResult = {
  message: string;
  teacher_id: number;
  classroom_id: number;
  student_ids: number[];
  exam_id: number;
};


export const bootstrapDemo = async () => {
  const { data } = await apiClient.post<DemoBootstrapResult>("/bootstrap/demo");
  return data;
};
export const refreshDemoData = async () => {
  const { data } = await apiClient.post<DemoBootstrapResult>("/bootstrap/demo/refresh");
  return data;
};

export const clearAllData = async () => {
  const { data } = await apiClient.post<{ message: string }>("/bootstrap/clear");
  return data;
};


export const fetchTeachers = async () => {
  const { data } = await apiClient.get<Teacher[]>("/teachers");
  return data;
};

export const createTeacher = async (payload: Pick<Teacher, "name" | "email">) => {
  const { data } = await apiClient.post<Teacher>("/teachers", payload);
  return data;
};

export const fetchClassrooms = async () => {
  const { data } = await apiClient.get<Classroom[]>("/classrooms");
  return data;
};

export const createClassroom = async (payload: {
  name: string;
  grade_level?: string;
  teacher_id: number;
}) => {
  const { data } = await apiClient.post<Classroom>("/classrooms", payload);
  return data;
};

export const fetchStudents = async () => {
  const { data } = await apiClient.get<Student[]>("/students");
  return data;
};

export const createStudent = async (payload: {
  name: string;
  email?: string;
  grade_level?: string;
}) => {
  const { data } = await apiClient.post("/students", payload);
  return data;
};

export const createEnrollment = async (payload: {
  classroom_id: number;
  student_id: number;
}) => {
  const { data } = await apiClient.post<{ id: number }>("/enrollments", payload);
  return data;
};

export const createExam = async (payload: unknown) => {
  const { data } = await apiClient.post<Exam>("/exams", payload);
  return data;
};

export const fetchExams = async () => {
  const { data } = await apiClient.get<Exam[]>("/exams");
  return data;
};

export const fetchExamDraft = async (formData: FormData) => {
  const { data } = await apiClient.post<ExamDraftResponse>("/exams/draft", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateExamAnswerKey = async (examId: number, payload: unknown) => {
  const { data } = await apiClient.patch<Exam>(`/exams/${examId}/answer-key`, payload);
  return data;
};

export const createGradingSession = async (payload: {
  teacher_id: number;
  exam_id?: number;
  payload?: Record<string, unknown>;
}) => {
  const { data } = await apiClient.post<GradingSession>("/grading/sessions", payload);
  return data;
};

export const fetchActiveGradingSession = async (teacherId: number) => {
  const { data } = await apiClient.get<GradingSession>("/grading/sessions/active", {
    params: { teacher_id: teacherId },
  });
  return data;
};

export const updateGradingSession = async (
  sessionId: number,
  payload: Partial<Pick<GradingSession, "current_step" | "status" | "exam_id">> & {
    payload?: Record<string, unknown> | null;
    last_error?: string | null;
  },
) => {
  const { data } = await apiClient.patch<GradingSession>(`/grading/sessions/${sessionId}`, payload);
  return data;
};

export const uploadSubmission = async (payload: FormData) => {
  const { data } = await apiClient.post<SubmissionProcessingResult>("/submissions/upload", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const fetchSubmission = async (id: number) => {
  const { data } = await apiClient.get<SubmissionDetail>(`/submissions/${id}`);
  return data;
};

export const fetchSubmissions = async (params: {
  exam_id?: number;
  student_id?: number;
  status?: string;
} = {}) => {
  const { data } = await apiClient.get<SubmissionDetail[]>("/submissions", { params });
  return data;
};

export const fetchSubmissionHistory = async (params: {
  exam_id?: number;
  student_id?: number;
  status?: string;
  limit?: number;
} = {}) => {
  const { data } = await apiClient.get<SubmissionHistoryEntry[]>("/submissions/history", { params });
  return data;
};


export const updateManualScore = async (payload: {
  response_id: number;
  new_score: number;
  new_comment?: string;
  override_annotation?: Record<string, unknown> | null;
}) => {
  const { data } = await apiClient.post<SubmissionResponse>(`/responses/manual-score`, payload);
  return data;
};

export const fetchSubmissionLogs = async (submissionId: number) => {
  const { data } = await apiClient.get<ProcessingLogList>(`/submissions/${submissionId}/logs`);
  return data;
};

export const fetchStudentMistakes = async (studentId: number) => {
  const { data } = await apiClient.get<Mistake[]>(`/students/${studentId}/mistakes`);
  return data;
};

export const createPractice = async (payload: {
  student_id: number;
  target_date?: string;
  knowledge_filters?: string[];
  max_items?: number;
}) => {
  const { data } = await apiClient.post<PracticeAssignment>("/practice", payload);
  return data;
};

export const completePractice = async (payload: {
  assignment_id: number;
  completed: boolean;
}) => {
  const { data } = await apiClient.post<PracticeAssignment>("/practice/complete", payload);
  return data;
};

export const fetchPracticeAssignments = async (params: { student_id?: number } = {}) => {
  const { data } = await apiClient.get<PracticeAssignment[]>("/practice", { params });
  return data;
};

export const fetchAnalytics = async (payload: {
  classroom_id?: number;
  exam_id?: number;
  knowledge_tags?: string[];
  start_date?: string;
  end_date?: string;
}) => {
  const { data } = await apiClient.post<AnalyticsSummary>("/analytics", payload);
  return data;
};

export interface AssistantChatOptions {
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stream?: boolean;
}

export const askTeachingAssistant = async (
  messages: AssistantMessage[],
  options: AssistantChatOptions = {},
) => {
  const { data } = await apiClient.post<AssistantChatResponse>("/assistant/chat", {
    messages,
    ...options,
    stream: false,
  });
  return data;
};

export const fetchAssistantStatus = async () => {
  const { data } = await apiClient.get<LLMConfigStatus>("/assistant/status");
  return data;
};

export const updateAssistantConfig = async (payload: {
  api_key: string;
  base_url?: string;
  text_model?: string;
  vision_model?: string;
}) => {
  const { data } = await apiClient.post<LLMConfigStatus>("/assistant/config", payload);
  return data;
};

export const submitTeacherFeedback = async (formData: FormData) => {
  const { data } = await apiClient.post<TeacherFeedback>("/feedback/teacher", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};
