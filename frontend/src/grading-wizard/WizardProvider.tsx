import { createContext, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createGradingSession,
  fetchActiveGradingSession,
  fetchExams,
  fetchTeachers,
  updateGradingSession,
} from "../api/services";
import type { Exam, GradingSession, Teacher } from "../types";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  initializing: boolean;
  teachers: Teacher[];
  teacherId?: number;
  session: GradingSession | null;
  step: WizardStep;
  exams: Exam[];
  examsLoading: boolean;
  selectedExamId?: number;
  savingStep: boolean;
  error?: string | null;
}

const initialState: WizardState = {
  initializing: true,
  teachers: [],
  teacherId: undefined,
  session: null,
  step: 1,
  exams: [],
  examsLoading: false,
  selectedExamId: undefined,
  savingStep: false,
  error: undefined,
};

const clampStep = (value: number): WizardStep => {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return value as WizardStep;
};

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    const maybeResponse = error as { response?: { data?: { detail?: string; message?: string } } };
    const detail = maybeResponse.response?.data?.detail ?? maybeResponse.response?.data?.message;
    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "发生未知错误";
};

export interface WizardContextValue {
  state: WizardState;
  actions: {
    initialize: (options?: { teacherId?: number }) => Promise<void>;
    setTeacher: (teacherId: number) => Promise<void>;
    refreshExams: () => Promise<void>;
    selectExam: (examId?: number) => void;
    goToStep: (
      step: WizardStep,
      options?: { examId?: number; payload?: Record<string, unknown> },
    ) => Promise<void>;
    clearError: () => void;
  };
}

export const WizardContext = createContext<WizardContextValue | undefined>(undefined);

interface WizardProviderProps {
  children: ReactNode;
}

export const WizardProvider = ({ children }: WizardProviderProps) => {
  const [state, setState] = useState<WizardState>(initialState);

  const ensureSession = useCallback(
    async (
      teacherId: number,
      options: { step?: WizardStep; examId?: number; payload?: Record<string, unknown> } = {},
    ) => {
      let session: GradingSession | null;
      try {
        session = await fetchActiveGradingSession(teacherId);
      } catch (_error) {
        session = null;
      }

      if (!session) {
        session = await createGradingSession({
          teacher_id: teacherId,
          exam_id: options.examId,
          payload: options.payload,
        });
      }

      const updatePayload: Parameters<typeof updateGradingSession>[1] = {};
      const targetStep = options.step ?? (session.current_step < 1 ? 1 : session.current_step);

      if (session.current_step !== targetStep) {
        updatePayload.current_step = targetStep;
      }
      if (options.examId !== undefined && session.exam_id !== options.examId) {
        updatePayload.exam_id = options.examId;
      }
      if (options.payload) {
        updatePayload.payload = { ...(session.payload || {}), ...options.payload };
      }

      if (Object.keys(updatePayload).length > 0) {
        session = await updateGradingSession(session.id, updatePayload);
      }

      if (session.current_step < 1) {
        session = await updateGradingSession(session.id, { current_step: 1 });
      }

      return session;
    },
    [],
  );

  const initialize = useCallback(
    async (options?: { teacherId?: number }) => {
      setState((prev) => ({ ...prev, initializing: true, error: undefined }));
      try {
        const [teacherList, examList] = await Promise.all([fetchTeachers(), fetchExams()]);
        const preferredTeacherId = options?.teacherId ?? state.teacherId ?? teacherList[0]?.id;

        if (!preferredTeacherId) {
          setState((prev) => ({
            ...prev,
            teachers: teacherList,
            teacherId: undefined,
            session: null,
            step: 1,
            exams: examList,
            examsLoading: false,
            selectedExamId: undefined,
            initializing: false,
            error: teacherList.length === 0 ? "请先在班级搭建中创建教师账号" : prev.error,
          }));
          return;
        }

        const session = await ensureSession(preferredTeacherId);
        const normalizedStep = clampStep(session.current_step);
        const filteredExams = examList.filter((exam) => exam.teacher_id === preferredTeacherId);

        const normalizedExamId = typeof session.exam_id === "number" ? session.exam_id : undefined;
        setState((prev) => ({
          ...prev,
          teachers: teacherList,
          teacherId: preferredTeacherId,
          session,
          step: normalizedStep,
          exams: filteredExams,
          examsLoading: false,
          selectedExamId: normalizedExamId ?? prev.selectedExamId,
          initializing: false,
          error: undefined,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          initializing: false,
          error: extractErrorMessage(error),
        }));
      }
    },
    [ensureSession, state.teacherId],
  );

  const setTeacher = useCallback(
    async (teacherId: number) => {
      await initialize({ teacherId });
    },
    [initialize],
  );

  const refreshExams = useCallback(async () => {
    setState((prev) => ({ ...prev, examsLoading: true, error: undefined }));
    try {
      const exams = await fetchExams();
      setState((prev) => {
        const teacherId = prev.teacherId;
        const filtered = teacherId ? exams.filter((exam) => exam.teacher_id === teacherId) : exams;
        return {
          ...prev,
          exams: filtered,
          examsLoading: false,
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        examsLoading: false,
        error: extractErrorMessage(error),
      }));
    }
  }, []);

  const selectExam = useCallback((examId?: number) => {
    setState((prev) => ({ ...prev, selectedExamId: examId }));
  }, []);

  const goToStep = useCallback(
    async (
      step: WizardStep,
      options: { examId?: number; payload?: Record<string, unknown> } = {},
    ) => {
      const teacherId = state.teacherId;
      if (!teacherId) {
        setState((prev) => ({
          ...prev,
          error: "未找到可用教师，请先完成班级搭建",
        }));
        throw new Error("teacher not selected");
      }

      setState((prev) => ({
        ...prev,
        savingStep: true,
        error: undefined,
        selectedExamId: options.examId ?? prev.selectedExamId,
      }));

      try {
        const session = await ensureSession(teacherId, {
          step,
          examId: options.examId ?? (state.session?.exam_id ?? undefined),
          payload: options.payload,
        });

        const normalizedExamId = typeof session.exam_id === "number" ? session.exam_id : undefined;
        setState((prev) => ({
          ...prev,
          session,
          step: clampStep(session.current_step),
          selectedExamId: normalizedExamId ?? prev.selectedExamId ?? options.examId,
          savingStep: false,
          error: undefined,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          savingStep: false,
          error: extractErrorMessage(error),
        }));
        throw error;
      }
    },
    [ensureSession, state.session, state.teacherId],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: undefined }));
  }, []);

  const value = useMemo<WizardContextValue>(
    () => ({
      state,
      actions: {
        initialize,
        setTeacher,
        refreshExams,
        selectExam,
        goToStep,
        clearError,
      },
    }),
    [state, initialize, setTeacher, refreshExams, selectExam, goToStep, clearError],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};
