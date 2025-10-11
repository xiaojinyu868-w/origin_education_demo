import { apiClient } from "./client";
export const bootstrapDemo = async () => {
    const { data } = await apiClient.post("/bootstrap/demo");
    return data;
};
export const refreshDemoData = async () => {
    const { data } = await apiClient.post("/bootstrap/demo/refresh");
    return data;
};
export const clearAllData = async () => {
    const { data } = await apiClient.post("/bootstrap/clear");
    return data;
};
export const fetchTeachers = async () => {
    const { data } = await apiClient.get("/teachers");
    return data;
};
export const createTeacher = async (payload) => {
    const { data } = await apiClient.post("/teachers", payload);
    return data;
};
export const fetchClassrooms = async () => {
    const { data } = await apiClient.get("/classrooms");
    return data;
};
export const createClassroom = async (payload) => {
    const { data } = await apiClient.post("/classrooms", payload);
    return data;
};
export const fetchStudents = async () => {
    const { data } = await apiClient.get("/students");
    return data;
};
export const createStudent = async (payload) => {
    const { data } = await apiClient.post("/students", payload);
    return data;
};
export const createEnrollment = async (payload) => {
    const { data } = await apiClient.post("/enrollments", payload);
    return data;
};
export const createExam = async (payload) => {
    const { data } = await apiClient.post("/exams", payload);
    return data;
};
export const fetchExams = async () => {
    const { data } = await apiClient.get("/exams");
    return data;
};
export const fetchExamDraft = async (formData) => {
    const { data } = await apiClient.post("/exams/draft", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};
export const updateExamAnswerKey = async (examId, payload) => {
    const { data } = await apiClient.patch(`/exams/${examId}/answer-key`, payload);
    return data;
};
export const createGradingSession = async (payload) => {
    const { data } = await apiClient.post("/grading/sessions", payload);
    return data;
};
export const fetchActiveGradingSession = async (teacherId) => {
    const { data } = await apiClient.get("/grading/sessions/active", {
        params: { teacher_id: teacherId },
    });
    return data;
};
export const updateGradingSession = async (sessionId, payload) => {
    const { data } = await apiClient.patch(`/grading/sessions/${sessionId}`, payload);
    return data;
};
export const uploadSubmission = async (payload) => {
    const { data } = await apiClient.post("/submissions/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};
export const fetchSubmission = async (id) => {
    const { data } = await apiClient.get(`/submissions/${id}`);
    return data;
};
export const fetchSubmissions = async (params = {}) => {
    const { data } = await apiClient.get("/submissions", { params });
    return data;
};
export const fetchSubmissionHistory = async (params = {}) => {
    const { data } = await apiClient.get("/submissions/history", { params });
    return data;
};
export const updateManualScore = async (payload) => {
    const { data } = await apiClient.post(`/responses/manual-score`, payload);
    return data;
};
export const fetchSubmissionLogs = async (submissionId) => {
    const { data } = await apiClient.get(`/submissions/${submissionId}/logs`);
    return data;
};
export const fetchStudentMistakes = async (studentId) => {
    const { data } = await apiClient.get(`/students/${studentId}/mistakes`);
    return data;
};
export const createPractice = async (payload) => {
    const { data } = await apiClient.post("/practice", payload);
    return data;
};
export const completePractice = async (payload) => {
    const { data } = await apiClient.post("/practice/complete", payload);
    return data;
};
export const fetchPracticeAssignments = async (params = {}) => {
    const { data } = await apiClient.get("/practice", { params });
    return data;
};
export const fetchAnalytics = async (payload) => {
    const { data } = await apiClient.post("/analytics", payload);
    return data;
};
export const askTeachingAssistant = async (messages, options = {}) => {
    const { data } = await apiClient.post("/assistant/chat", {
        messages,
        ...options,
        stream: false,
    });
    return data;
};
export const fetchAssistantStatus = async () => {
    const { data } = await apiClient.get("/assistant/status");
    return data;
};
export const updateAssistantConfig = async (payload) => {
    const { data } = await apiClient.post("/assistant/config", payload);
    return data;
};
export const submitTeacherFeedback = async (formData) => {
    const { data } = await apiClient.post("/feedback/teacher", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};
