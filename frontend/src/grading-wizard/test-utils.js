import { jsx as _jsx } from "react/jsx-runtime";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { WizardContext } from "./WizardProvider";
const createBaseState = () => ({
    initializing: false,
    teachers: [],
    teacherId: undefined,
    session: null,
    step: 1,
    exams: [],
    examsLoading: false,
    selectedExamId: undefined,
    savingStep: false,
    error: undefined,
    progress: {
        answers: { total: 0, confirmed: 0, pending: 0, ready: false },
        uploads: { total: 0, confirmed: 0, pending: 0, ready: false },
        review: { total: 0, confirmed: 0, pending: 0, ready: false },
    },
    blocking: {},
});
export const createWizardTestState = (overrides = {}) => {
    const base = createBaseState();
    return {
        ...base,
        ...overrides,
        progress: {
            answers: { ...base.progress.answers, ...(overrides.progress?.answers ?? {}) },
            uploads: { ...base.progress.uploads, ...(overrides.progress?.uploads ?? {}) },
            review: { ...base.progress.review, ...(overrides.progress?.review ?? {}) },
        },
        blocking: { ...base.blocking, ...(overrides.blocking ?? {}) },
    };
};
export const createWizardTestActions = (overrides = {}) => {
    const base = {
        initialize: vi.fn().mockResolvedValue(undefined),
        setTeacher: vi.fn().mockResolvedValue(undefined),
        refreshExams: vi.fn().mockResolvedValue(undefined),
        selectExam: vi.fn(),
        goToStep: vi.fn().mockResolvedValue(undefined),
        clearError: vi.fn(),
    };
    return { ...base, ...overrides };
};
export const renderWithWizard = (ui, options = {}) => {
    const state = createWizardTestState(options.state);
    const actions = createWizardTestActions(options.actions);
    const result = render(_jsx(WizardContext.Provider, { value: { state, actions }, children: ui }));
    return { ...result, state, actions };
};
