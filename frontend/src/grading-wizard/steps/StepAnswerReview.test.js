import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { message } from "antd";
import StepAnswerReview from "./StepAnswerReview.tsx";
import { renderWithWizard } from "../test-utils";
const baseExam = () => ({
    id: 2,
    title: "物理阶段测验",
    subject: "物理",
    scheduled_date: undefined,
    teacher_id: 1,
    classroom_id: undefined,
    answer_key_version: 1,
    questions: [
        {
            id: 201,
            number: "1",
            type: "subjective",
            prompt: "简答题",
            max_score: 10,
            knowledge_tags: "动力学",
            answer_key: { standardAnswer: "示例" },
            rubric: null,
            target_student_ids: null,
            answer_status: "confirmed",
            answer_confidence: 1,
            extra_metadata: null,
        },
        {
            id: 202,
            number: "2",
            type: "subjective",
            prompt: "推导题",
            max_score: 10,
            knowledge_tags: "能量守恒",
            answer_key: { standardAnswer: "示例" },
            rubric: null,
            target_student_ids: null,
            answer_status: "draft",
            answer_confidence: null,
            extra_metadata: null,
        },
    ],
    source_image_path: null,
    parsed_outline: null,
    extra_metadata: { answerMode: "strict" },
});
describe("StepAnswerReview", () => {
    it("保持中文文案并在未完成时隐藏下一步按钮", () => {
        const exam = baseExam();
        renderWithWizard(_jsx(MemoryRouter, { children: _jsx(StepAnswerReview, {}) }), {
            state: {
                step: 2,
                exams: [exam],
                selectedExamId: exam.id,
                progress: {
                    answers: { total: 2, confirmed: 1, pending: 1, ready: false },
                    uploads: { total: 0, confirmed: 0, pending: 0, ready: false },
                    review: { total: 0, confirmed: 0, pending: 0, ready: false },
                },
            },
        });
        expect(screen.getByText("严格匹配")).toBeInTheDocument();
        expect(screen.getByText("智能参考")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "前往学生试卷上传" })).not.toBeInTheDocument();
    });
    it("全部确认后写入进度并跳转下一阶段", async () => {
        const confirmedExam = {
            ...baseExam(),
            questions: baseExam().questions.map((question) => ({
                ...question,
                answer_status: "confirmed",
            })),
        };
        const goToStep = vi.fn().mockResolvedValue(undefined);
        const successSpy = vi.spyOn(message, "success").mockImplementation(() => { });
        try {
            renderWithWizard(_jsx(MemoryRouter, { children: _jsx(StepAnswerReview, {}) }), {
                state: {
                    step: 2,
                    exams: [confirmedExam],
                    selectedExamId: confirmedExam.id,
                    progress: {
                        answers: { total: 2, confirmed: 2, pending: 0, ready: true },
                        uploads: { total: 0, confirmed: 0, pending: 0, ready: false },
                        review: { total: 0, confirmed: 0, pending: 0, ready: false },
                    },
                },
                actions: { goToStep },
            });
            const proceedButton = screen.getByRole("button", { name: "前往学生试卷上传" });
            fireEvent.click(proceedButton);
            await waitFor(() => {
                expect(goToStep).toHaveBeenCalledWith(3, expect.objectContaining({
                    examId: confirmedExam.id,
                    payload: expect.objectContaining({
                        wizardProgress: expect.objectContaining({
                            answers: expect.objectContaining({
                                total: confirmedExam.questions.length,
                                confirmed: confirmedExam.questions.length,
                                pending: 0,
                            }),
                        }),
                    }),
                }));
            });
        }
        finally {
            successSpy.mockRestore();
        }
    });
});
