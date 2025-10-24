import type { Mistake } from "../types";

export const TOKEN_WARNING_THRESHOLD = 3200;
export const TOKEN_ESTIMATE_DIVISOR = 3.5;

export const TIME_RANGE_OPTIONS = [
  { label: "最近10题", value: "latest" },
  { label: "最近7天", value: "7d" },
] as const;

export type TimeRangeValue = (typeof TIME_RANGE_OPTIONS)[number]["value"];

export const parseTimestamp = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatDateLabel = (value?: string) => {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
};

export const extractKnowledgeTags = (value?: string) => {
  if (!value) return [];
  return value
    .split(/[;,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const buildMistakeSummaryLine = (mistake: Mistake) => {
  const knowledge = extractKnowledgeTags(mistake.knowledge_tags).join(" / ") || "未标注";
  const appeared = formatDateLabel(mistake.last_seen_at);
  const fragments = [
    `题目ID ${mistake.question_id}`,
    `知识点: ${knowledge}`,
    `错误次数: ${mistake.error_count}`,
    `最近出现: ${appeared}`,
    `练习次数: ${mistake.times_practiced}`,
  ];
  if (mistake.root_cause) {
    fragments.push(`根因: ${mistake.root_cause}`);
  }
  if (mistake.resolution_notes) {
    fragments.push(`教师建议: ${mistake.resolution_notes}`);
  }
  return fragments.join(" | ");
};

export const estimateTokensForText = (text: string) => {
  if (!text) return 0;
  return Math.ceil(text.length / TOKEN_ESTIMATE_DIVISOR);
};

export const estimateTokensForMistakes = (mistakes: Mistake[]) => {
  if (mistakes.length === 0) return 0;
  const summary = mistakes.map(buildMistakeSummaryLine).join("\n");
  return estimateTokensForText(summary);
};

export const buildContextMessage = (studentName: string | undefined, mistakes: Mistake[]) => {
  if (mistakes.length === 0) {
    return "";
  }
  const header = studentName ? `学生：${studentName}` : "学生：未指定";
  const lines = mistakes.map((item, index) => `${index + 1}. ${buildMistakeSummaryLine(item)}`);
  return [
    "错题上下文，请先完整阅读再回答。",
    header,
    ...lines,
    "请基于以上错题，在后续回答中严格按照【共性诊断】【课堂策略】【家校建议】三段进行输出。",
  ].join("\n");
};

export const extractAssistantSections = (content: string) => {
  const matches = [...content.matchAll(/【([^】]+)】/g)];
  if (matches.length === 0) {
    return null;
  }
  const sections = matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    const body = content.slice(start + match[0].length, end).trim();
    return {
      title: match[1],
      body,
    };
  });
  return sections.some((section) => section.body) ? sections : null;
};

export const sortMistakesByRelevance = (items: Mistake[]) => {
  return [...items].sort((a, b) => {
    const errorDiff = (b.error_count ?? 0) - (a.error_count ?? 0);
    if (errorDiff !== 0) {
      return errorDiff;
    }
    return parseTimestamp(b.last_seen_at) - parseTimestamp(a.last_seen_at);
  });
};

