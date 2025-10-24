import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { WizardContext } from "./WizardProvider";
import type { WizardContextValue } from "./WizardProvider";

type WizardState = WizardContextValue["state"];
type WizardActions = WizardContextValue["actions"];

const createBaseState = (): WizardState => ({
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

export const createWizardTestState = (
  overrides: Partial<WizardState> = {},
): WizardState => {
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

export const createWizardTestActions = (
  overrides: Partial<WizardActions> = {},
): WizardActions => {
  const base: WizardActions = {
    initialize: vi.fn().mockResolvedValue(undefined),
    setTeacher: vi.fn().mockResolvedValue(undefined),
    refreshExams: vi.fn().mockResolvedValue(undefined),
    selectExam: vi.fn(),
    goToStep: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
  };
  return { ...base, ...overrides };
};

interface RenderOptions {
  state?: Partial<WizardState>;
  actions?: Partial<WizardActions>;
}

export const renderWithWizard = (
  ui: ReactElement,
  options: RenderOptions = {},
) => {
  const state = createWizardTestState(options.state);
  const actions = createWizardTestActions(options.actions);
  const result = render(
    <WizardContext.Provider value={{ state, actions }}>
      {ui}
    </WizardContext.Provider>,
  );
  return { ...result, state, actions };
};
