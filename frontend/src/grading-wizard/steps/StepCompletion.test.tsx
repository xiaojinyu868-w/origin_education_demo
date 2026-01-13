import { MemoryRouter } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithWizard } from "../test-utils";
import StepCompletion from "./StepCompletion";

const createExam = () => ({
  id: 1,
  title: "数学月考卷",
  subject: "数学",
  scheduled_date: undefined,
  teacher_id: 1,
  classroom_id: undefined,
  answer_key_version: 1,
  questions: [],
  source_image_path: null,
  parsed_outline: null,
  extra_metadata: null,
});

describe("StepCompletion", () => {
  it("renders中文卡片并在准备完成时允许导出", () => {
    const exam = createExam();
    renderWithWizard(
      <MemoryRouter>
        <StepCompletion />
      </MemoryRouter>,
      {
        state: {
          step: 5,
          exams: [exam],
          selectedExamId: exam.id,
          progress: {
            answers: { total: 2, confirmed: 2, pending: 0, ready: true },
            uploads: { total: 1, confirmed: 1, pending: 0, ready: true },
            review: { total: 2, confirmed: 2, pending: 0, ready: true },
          },
          blocking: { 5: [] },
        },
      },
    );

    expect(screen.getByRole("heading", { level: 3, name: "批改流程完成" })).toBeInTheDocument();
    expect(screen.getByText("导出批改成果")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /导出批改报告/ })).toBeEnabled();
  });

  it("出现阻断提示时禁用导出按钮", () => {
    const exam = createExam();
    renderWithWizard(
      <MemoryRouter>
        <StepCompletion />
      </MemoryRouter>,
      {
        state: {
          step: 5,
          exams: [exam],
          selectedExamId: exam.id,
          progress: {
            answers: { total: 2, confirmed: 2, pending: 0, ready: true },
            uploads: { total: 1, confirmed: 1, pending: 0, ready: true },
            review: { total: 2, confirmed: 1, pending: 1, ready: false },
          },
          blocking: {
            5: [{ code: "review-incomplete", message: "仍有 1 项批改待确认" }],
          },
        },
      },
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("导出前须完成以下事项");
    expect(screen.getByRole("button", { name: /导出批改报告/ })).toBeDisabled();
  });
});
