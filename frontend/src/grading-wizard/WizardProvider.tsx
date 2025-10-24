import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface WizardProgressSegment {
  total: number;
  confirmed: number;
  pending: number;
  ready: boolean;
  updatedAt?: string;
}

interface WizardProgress {
  answers: WizardProgressSegment;
  uploads: WizardProgressSegment;
  review: WizardProgressSegment;
}

interface BlockingAction {
  label: string;
  step: WizardStep;
}

export interface BlockingReason {
  code: string;
  message: string;
  action?: BlockingAction;
}

type BlockingMap = Partial<Record<WizardStep, BlockingReason[]>>;

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
  progress: WizardProgress;
  blocking: BlockingMap;
}

const WIZARD_STEPS: WizardStep[] = [1, 2, 3, 4, 5];

const createEmptyProgress = (): WizardProgress => ({
  answers: { total: 0, confirmed: 0, pending: 0, ready: false },
  uploads: { total: 0, confirmed: 0, pending: 0, ready: false },
  review: { total: 0, confirmed: 0, pending: 0, ready: false },
});

const baseInitialState: WizardState = {
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
  progress: createEmptyProgress(),
  blocking: {},
};

interface WizardProgressPayloadSegment {
  total?: number;
  confirmed?: number;
  completed?: number;
  pending?: number;
  updatedAt?: string;
}

interface WizardProgressPayload {
  answers?: WizardProgressPayloadSegment;
  uploads?: WizardProgressPayloadSegment;
  review?: WizardProgressPayloadSegment;
}

const clampStep = (value: number): WizardStep => {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return value as WizardStep;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const extractWizardProgressPayload = (payload: unknown): WizardProgressPayload => {
  const root = asRecord(payload);
  if (!root) return {};

  const progressRoot = asRecord(root.wizardProgress) ?? root;

  const parseSegment = (node: Record<string, unknown> | null): WizardProgressPayloadSegment | undefined => {
    if (!node) return undefined;

    const total =
      toNumber(node.total) ??
      toNumber(node.count) ??
      toNumber(node.totalCount) ??
      toNumber(node.items) ??
      toNumber(node.size);
    const pending =
      toNumber(node.pending) ??
      toNumber(node.remaining) ??
      toNumber(node.todo) ??
      toNumber(node.unresolved) ??
      toNumber(node.left);
    const baseConfirmed =
      toNumber(node.confirmed) ??
      toNumber(node.done) ??
      toNumber(node.finished) ??
      toNumber(node.completed) ??
      toNumber(node.approved) ??
      toNumber(node.success);
    const completed =
      toNumber(node.completed) ??
      toNumber(node.done) ??
      toNumber(node.finished) ??
      toNumber(node.approved) ??
      toNumber(node.success) ??
      baseConfirmed;

    let confirmed = baseConfirmed;
    if (typeof confirmed === "undefined" && typeof total === "number" && typeof pending === "number") {
      confirmed = Math.max(total - pending, 0);
    }

    const updatedAt =
      typeof node.updatedAt === "string"
        ? node.updatedAt
        : typeof node.lastUpdatedAt === "string"
        ? node.lastUpdatedAt
        : undefined;

    return {
      total,
      confirmed,
      completed,
      pending,
      updatedAt,
    };
  };

  return {
    answers: parseSegment(asRecord(progressRoot.answers) ?? asRecord(progressRoot.answerReview)),
    uploads: parseSegment(asRecord(progressRoot.uploads) ?? asRecord(progressRoot.studentUploads)),
    review: parseSegment(
      asRecord(progressRoot.review) ??
        asRecord(progressRoot.reviewSummary) ??
        asRecord(progressRoot.aiReview),
    ),
  };
};

const mergeWizardProgressSegments = (existing: unknown, incoming: unknown): Record<string, unknown> => {
  const existingRecord = asRecord(existing) ?? {};
  const incomingRecord = asRecord(incoming) ?? {};
  const merged: Record<string, unknown> = { ...existingRecord };

  Object.entries(incomingRecord).forEach(([segmentKey, segmentValue]) => {
    const existingSegment = asRecord(existingRecord[segmentKey]);
    const incomingSegment = asRecord(segmentValue);
    if (existingSegment || incomingSegment) {
      merged[segmentKey] = {
        ...(existingSegment ?? {}),
        ...(incomingSegment ?? {}),
      };
    } else {
      merged[segmentKey] = segmentValue;
    }
  });

  return merged;
};

const mergeSessionPayload = (
  base: unknown,
  update?: Record<string, unknown>,
): Record<string, unknown> => {
  const baseRecord = asRecord(base) ?? {};
  const updateRecord = asRecord(update) ?? {};

  const merged: Record<string, unknown> = { ...baseRecord, ...updateRecord };

  if ("wizardProgress" in baseRecord || "wizardProgress" in updateRecord) {
    merged.wizardProgress = mergeWizardProgressSegments(
      baseRecord["wizardProgress"],
      updateRecord["wizardProgress"],
    );
  }

  return merged;
};

const buildProgress = (state: WizardState): WizardProgress => {
  const selectedExam = state.exams.find((exam) => exam.id === state.selectedExamId);
  const answersTotal = selectedExam?.questions?.length ?? 0;
  const answersConfirmed =
    selectedExam?.questions?.filter((question) => question.answer_status === "confirmed").length ?? 0;
  const answersPending = Math.max(answersTotal - answersConfirmed, 0);

  const payload = extractWizardProgressPayload(state.session?.payload);
  const uploadsCompletedRaw = Math.max(
    0,
    payload.uploads?.completed ??
      payload.uploads?.confirmed ??
      (typeof payload.uploads?.total === "number" && typeof payload.uploads?.pending === "number"
        ? payload.uploads.total - payload.uploads.pending
        : 0),
  );
  const uploadsPendingRaw = payload.uploads?.pending;
  const uploadsTotalRaw = payload.uploads?.total;
  const uploadsAny = Math.max(
    0,
    uploadsTotalRaw ?? 0,
    uploadsCompletedRaw + (uploadsPendingRaw ?? 0),
  );
  const normalizedUploadsCompleted = Math.max(
    0,
    Math.min(uploadsAny, uploadsCompletedRaw),
  );
  const normalizedUploadsPending = Math.max(
    0,
    uploadsPendingRaw ?? Math.max(uploadsAny - normalizedUploadsCompleted, 0),
  );
  const uploadsTotal = Math.max(uploadsAny, normalizedUploadsCompleted + normalizedUploadsPending);
  const uploadsReady = uploadsTotal > 0;

  const reviewTotal = Math.max(
    0,
    payload.review?.total ??
      (typeof payload.review?.confirmed === "number" || typeof payload.review?.pending === "number"
        ? (payload.review?.confirmed ?? 0) + (payload.review?.pending ?? 0)
        : 0),
  );
  const reviewPending = Math.max(
    0,
    payload.review?.pending ?? Math.max(reviewTotal - (payload.review?.confirmed ?? 0), 0),
  );
  const reviewConfirmed = Math.max(
    0,
    Math.min(reviewTotal, (payload.review?.confirmed ?? Math.max(reviewTotal - reviewPending, 0))),
  );
  const reviewReady = reviewTotal > 0 && reviewPending === 0;

  return {
    answers: {
      total: answersTotal,
      confirmed: answersConfirmed,
      pending: answersPending,
      ready: answersTotal > 0 && answersPending === 0,
      updatedAt: payload.answers?.updatedAt,
    },
    uploads: {
      total: uploadsTotal,
      confirmed: normalizedUploadsCompleted,
      pending: normalizedUploadsPending,
      ready: uploadsReady,
      updatedAt: payload.uploads?.updatedAt,
    },
    review: {
      total: Math.max(reviewTotal, reviewConfirmed + reviewPending),
      confirmed: reviewConfirmed,
      pending: reviewPending,
      ready: reviewReady,
      updatedAt: payload.review?.updatedAt,
    },
  };
};

const computeBlockingForStep = (
  step: WizardStep,
  context: { teacherId?: number; selectedExam?: Exam; progress: WizardProgress },
): BlockingReason[] => {
  const reasons: BlockingReason[] = [];

  if (step > 1 && !context.teacherId) {
    reasons.push({
      code: "missing-teacher",
      message: "尚未选择负责教师，请先在试卷配置阶段完成教师指派。",
      action: { step: 1, label: "返回试卷配置" },
    });
  }

  if (step >= 2 && !context.selectedExam) {
    reasons.push({
      code: "missing-exam",
      message: "尚未选择试卷，请先完成第一步试卷配置。",
      action: { step: 1, label: "前往试卷配置" },
    });
    return reasons;
  }

  if (step >= 3 && !context.progress.answers.ready) {
    const pending = context.progress.answers.pending;
    reasons.push({
      code: "answers-incomplete",
      message:
        pending > 0
          ? `仍有 ${pending} 道题目未确认标准答案，请在第二步完成校对。`
          : "标准答案校对尚未完成，请回到第二步核对。",
      action: { step: 2, label: "前往答案校对" },
    });
  }

  if (step >= 4 && !context.progress.uploads.ready) {
    reasons.push({
      code: "uploads-missing",
      message: "尚未上传并处理学生卷面，请在第三步完成至少一份上传。",
      action: { step: 3, label: "返回学生上传" },
    });
  }

  if (step >= 5 && !context.progress.review.ready) {
    const pending = context.progress.review.pending;
    reasons.push({
      code: "review-incomplete",
      message:
        pending > 0
          ? `仍有 ${pending} 项批改待确认，请返回第四步完成确认。`
          : "批改确认尚未完成，请回到第四步复核结果。",
      action: { step: 4, label: "前往批改确认" },
    });
  }

  return reasons;
};

const computeBlockingMap = (state: WizardState, progress: WizardProgress): BlockingMap => {
  const selectedExam = state.exams.find((exam) => exam.id === state.selectedExamId);
  const context = {
    teacherId: state.teacherId,
    selectedExam,
    progress,
  };
  const blocking: BlockingMap = {};
  WIZARD_STEPS.forEach((step) => {
    if (step === 1) {
      blocking[step] = [];
    } else {
      blocking[step] = computeBlockingForStep(step, context);
    }
  });
  return blocking;
};

const resolveAccessibleStep = (desired: WizardStep, blocking: BlockingMap): WizardStep => {
  let candidate = desired;
  while (candidate > 1 && (blocking[candidate]?.length ?? 0) > 0) {
    candidate = (candidate - 1) as WizardStep;
  }
  return candidate;
};

const applyDerivedState = (state: WizardState): WizardState => {
  const progress = buildProgress(state);
  const blocking = computeBlockingMap(state, progress);
  return {
    ...state,
    progress,
    blocking,
  };
};

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    const maybeResponse = error as {
      response?: { data?: { detail?: string; message?: string } };
    };
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
  const [state, setState] = useState<WizardState>(() => applyDerivedState(baseInitialState));
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
      const targetStep = clampStep(options.step ?? session.current_step);

      if (session.current_step !== targetStep) {
        updatePayload.current_step = targetStep;
      }
      if (options.examId !== undefined && session.exam_id !== options.examId) {
        updatePayload.exam_id = options.examId;
      }
      if (options.payload) {
        updatePayload.payload = mergeSessionPayload(session.payload, options.payload);
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
      setState((prev) => applyDerivedState({ ...prev, initializing: true, error: undefined }));
      try {
        const snapshot = stateRef.current;
        const [teacherList, examList] = await Promise.all([fetchTeachers(), fetchExams()]);
        const preferredTeacherId = options?.teacherId ?? snapshot.teacherId ?? teacherList[0]?.id;

        if (!preferredTeacherId) {
          setState((prev) =>
            applyDerivedState({
              ...prev,
              teachers: teacherList,
              teacherId: undefined,
              session: null,
              step: 1,
              exams: examList,
              examsLoading: false,
              selectedExamId: undefined,
              initializing: false,
              savingStep: false,
              error: teacherList.length === 0 ? "请先在班级搭建中创建教师账号" : prev.error,
            }),
          );
          return;
        }

        let session = await ensureSession(preferredTeacherId);
        const filteredExams = examList.filter((exam) => exam.teacher_id === preferredTeacherId);
        const normalizedExamId =
          typeof session.exam_id === "number" ? session.exam_id : snapshot.selectedExamId;
        const initialStep = clampStep(session.current_step);

        let draftState = applyDerivedState({
          ...snapshot,
          initializing: false,
          teachers: teacherList,
          teacherId: preferredTeacherId,
          session,
          step: initialStep,
          exams: filteredExams,
          examsLoading: false,
          selectedExamId: normalizedExamId,
          savingStep: false,
          error: undefined,
        });

        const safeStep = resolveAccessibleStep(draftState.step, draftState.blocking);
        if (session && safeStep !== draftState.step) {
          session = await updateGradingSession(session.id, { current_step: safeStep });
          draftState = applyDerivedState({
            ...draftState,
            session,
            step: clampStep(session.current_step),
          });
        }

        setState(draftState);
      } catch (error) {
        setState((prev) =>
          applyDerivedState({
            ...prev,
            initializing: false,
            error: extractErrorMessage(error),
          }),
        );
      }
    },
    [ensureSession],
  );

  const setTeacher = useCallback(
    async (teacherId: number) => {
      await initialize({ teacherId });
    },
    [initialize],
  );

  const refreshExams = useCallback(async () => {
    setState((prev) => applyDerivedState({ ...prev, examsLoading: true, error: undefined }));
    try {
      const exams = await fetchExams();
      setState((prev) => {
        const teacherId = prev.teacherId;
        const filtered = teacherId ? exams.filter((exam) => exam.teacher_id === teacherId) : exams;
        return applyDerivedState({
          ...prev,
          exams: filtered,
          examsLoading: false,
        });
      });
    } catch (error) {
      setState((prev) =>
        applyDerivedState({
          ...prev,
          examsLoading: false,
          error: extractErrorMessage(error),
        }),
      );
    }
  }, []);

  const selectExam = useCallback((examId?: number) => {
    setState((prev) =>
      applyDerivedState({
        ...prev,
        selectedExamId: examId,
      }),
    );
  }, []);

  const goToStep = useCallback(
    async (
      step: WizardStep,
      options: { examId?: number; payload?: Record<string, unknown> } = {},
    ) => {
      const snapshot = stateRef.current;
      const teacherId = snapshot.teacherId;
      if (!teacherId) {
        const message = "未找到可用教师，请先完成班级搭建";
        setState((prev) => applyDerivedState({ ...prev, error: message }));
        throw new Error("teacher not selected");
      }

      const nextSelectedExamId =
        options.examId ??
        snapshot.selectedExamId ??
        (typeof snapshot.session?.exam_id === "number" ? snapshot.session.exam_id : undefined);

      const mergedSession =
        snapshot.session
          ? {
              ...snapshot.session,
              ...(nextSelectedExamId !== undefined ? { exam_id: nextSelectedExamId } : {}),
              ...(options.payload
                ? { payload: mergeSessionPayload(snapshot.session.payload, options.payload) }
                : {}),
            }
          : snapshot.session;

      const previewState = applyDerivedState({
        ...snapshot,
        session: mergedSession,
        selectedExamId: nextSelectedExamId,
      });

      const blockingForTarget = previewState.blocking[step] ?? [];
      if (blockingForTarget.length > 0) {
        const message = blockingForTarget.map((item) => item.message).join("；");
        setState((prev) => applyDerivedState({ ...prev, error: message }));
        throw new Error(message);
      }

      setState((prev) =>
        applyDerivedState({
          ...prev,
          savingStep: true,
          error: undefined,
          selectedExamId: nextSelectedExamId,
        }),
      );

      try {
        let session = await ensureSession(teacherId, {
          step,
          examId: nextSelectedExamId ?? snapshot.session?.exam_id,
          payload: options.payload,
        });

        let nextState = applyDerivedState({
          ...snapshot,
          session,
          step: clampStep(session.current_step),
          selectedExamId:
            typeof session.exam_id === "number" ? session.exam_id : nextSelectedExamId,
          savingStep: false,
          error: undefined,
        });

        const safeStep = resolveAccessibleStep(nextState.step, nextState.blocking);
        if (safeStep !== nextState.step) {
          session = await updateGradingSession(session.id, { current_step: safeStep });
          nextState = applyDerivedState({
            ...nextState,
            session,
            step: clampStep(session.current_step),
          });
        }

        setState(nextState);
      } catch (error) {
        setState((prev) =>
          applyDerivedState({
            ...prev,
            savingStep: false,
            error: extractErrorMessage(error),
          }),
        );
        throw error;
      }
    },
    [ensureSession],
  );

  const clearError = useCallback(() => {
    setState((prev) => applyDerivedState({ ...prev, error: undefined }));
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
