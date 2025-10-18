const KNOWLEDGE_TAG_LABELS = {
    algebraic_expressions: "代数表达式",
    linear_equations: "线性方程",
    coordinate_geometry: "坐标几何",
    unspecified: "未标注",
};
const normalizeTag = (tag) => tag.trim().toLowerCase().replace(/\s+/g, "_");
export const formatKnowledgeTag = (tag) => {
    if (!tag || !tag.trim()) {
        return KNOWLEDGE_TAG_LABELS.unspecified;
    }
    const normalized = normalizeTag(tag);
    if (normalized in KNOWLEDGE_TAG_LABELS) {
        return KNOWLEDGE_TAG_LABELS[normalized];
    }
    // 兜底：移除下划线，展示更友好的格式
    return tag.replace(/[_-]+/g, " ");
};
