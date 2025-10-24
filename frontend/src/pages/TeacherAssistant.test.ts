import { describe, expect, it } from "vitest";
import type { Mistake } from "../types";
import {
  buildContextMessage,
  buildMistakeSummaryLine,
  estimateTokensForMistakes,
  extractAssistantSections,
  extractKnowledgeTags,
} from "./TeacherAssistant.utils";

const baseMistake: Mistake = {
  id: 1,
  question_id: 3,
  response_id: 10,
  student_id: 5,
  knowledge_tags: "一次函数; 概念理解",
  misconception_label: "符号混淆",
  resolution_notes: "强调函数关系与图像对应",
  created_at: "2025-10-24T03:00:00.000Z",
  last_seen_at: "2025-10-23T11:00:00.000Z",
  times_practiced: 2,
  error_count: 3,
  data_status: "complete",
  root_cause: "概念未建立",
};

describe("TeacherAssistant helper utilities", () => {
  it("splits knowledge tags correctly", () => {
    const tags = extractKnowledgeTags(baseMistake.knowledge_tags);
    expect(tags).toEqual(["一次函数", "概念理解"]);
  });

  it("builds mistake summary line with key metadata", () => {
    const summary = buildMistakeSummaryLine(baseMistake);
    expect(summary).toContain("题目ID 3");
    expect(summary).toContain("知识点: 一次函数 / 概念理解");
    expect(summary).toContain("错误次数: 3");
    expect(summary).toContain("根因: 概念未建立");
  });

  it("estimates tokens for selected mistakes", () => {
    const estimate = estimateTokensForMistakes([baseMistake, baseMistake]);
    expect(estimate).toBeGreaterThan(0);
  });

  it("builds context message with structured list", () => {
    const message = buildContextMessage("张三", [baseMistake]);
    expect(message).toMatch(/学生：张三/);
    expect(message).toMatch(/1\. 题目ID 3/);
    expect(message).toMatch(/【共性诊断】/);
  });

  it("extracts assistant sections from structured answer", () => {
    const content = "【共性诊断】集中在函数概念理解不足。【课堂策略】通过板书和示例讲解。【家校建议】引导家长陪同复习。";
    const sections = extractAssistantSections(content);
    expect(sections).not.toBeNull();
    expect(sections?.map((item) => item.title)).toEqual(["共性诊断", "课堂策略", "家校建议"]);
  });
});
