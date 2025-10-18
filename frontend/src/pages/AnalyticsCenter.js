import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DatePicker, Empty, Select, Space, Spin, Statistic, Table, Typography } from "antd";
import * as echarts from "echarts";
import { fetchAnalytics, fetchExams } from "../api/services";
import PageLayout from "../components/PageLayout";
import useResponsive from "../hooks/useResponsive";
import { formatKnowledgeTag } from "../utils/knowledge";
const { Paragraph, Title } = Typography;
const AnalyticsCenter = () => {
    const { isMobile, isTablet } = useResponsive();
    const isCompact = isMobile || isTablet;
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const loadAnalytics = async (examId) => {
        setLoading(true);
        try {
            if (!exams.length) {
                const examList = await fetchExams();
                setExams(examList);
            }
            const payload = {};
            if (examId)
                payload.exam_id = examId;
            if (dateRange[0] && dateRange[1]) {
                payload.start_date = dateRange[0].format("YYYY-MM-DD");
                payload.end_date = dateRange[1].format("YYYY-MM-DD");
            }
            const data = await fetchAnalytics(payload);
            setSummary(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void loadAnalytics();
        return () => {
            chartInstance.current?.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (!summary)
            return;
        if (!chartInstance.current && chartRef.current) {
            chartInstance.current = echarts.init(chartRef.current);
        }
        if (!chartInstance.current)
            return;
        const tags = summary.knowledge_breakdown.map((item) => formatKnowledgeTag(item.knowledge_tag));
        const accuracy = summary.knowledge_breakdown.map((item) => Math.round(item.accuracy * 100));
        chartInstance.current.setOption({
            tooltip: {},
            xAxis: {
                type: "category",
                data: tags,
                axisLabel: { rotate: 30 },
            },
            yAxis: {
                type: "value",
                max: 100,
                axisLabel: { formatter: "{value}%" },
            },
            series: [
                {
                    type: "bar",
                    data: accuracy,
                    itemStyle: {
                        color: (params) => (params.value > 70 ? "#22c55e" : "#f97316"),
                    },
                },
            ],
            grid: { left: 40, right: 20, bottom: 60, top: 40 },
        });
        chartInstance.current.resize();
    }, [summary]);
    useEffect(() => {
        const handleResize = () => {
            chartInstance.current?.resize();
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    useEffect(() => {
        chartInstance.current?.resize();
    }, [isCompact]);
    const tableData = useMemo(() => summary?.knowledge_breakdown.map((item) => ({
        ...item,
        displayTag: formatKnowledgeTag(item.knowledge_tag),
    })) ?? [], [summary]);
    return (_jsxs(Space, { direction: "vertical", size: 28, style: { width: "100%" }, children: [_jsx(PageLayout, { title: "\u73ED\u7EA7\u5B66\u60C5\u96F7\u8FBE", description: "\u9009\u62E9\u8003\u8BD5\u4E0E\u65F6\u95F4\u8303\u56F4\u5373\u53EF\u751F\u6210\u77E5\u8BC6\u70B9\u70ED\u529B\u56FE\u4E0E\u5173\u952E\u6307\u6807\uFF0C\u8F85\u52A9\u7CBE\u51C6\u6559\u5B66\u3002", extra: _jsxs("div", { className: "filters-stack", children: [_jsx(Select, { allowClear: true, placeholder: "\u6309\u8003\u8BD5\u7B5B\u9009", value: selectedExam, onChange: (value) => {
                                setSelectedExam(value);
                                void loadAnalytics(value);
                            }, style: { width: isCompact ? "100%" : 240 }, options: exams.map((exam) => ({ value: exam.id, label: `${exam.title} · ${exam.subject || "未分类"}` })) }), _jsx(DatePicker.RangePicker, { value: dateRange, onChange: (range) => {
                                setDateRange(range);
                                void loadAnalytics(selectedExam);
                            }, style: { width: isCompact ? "100%" : undefined } }), _jsx(Button, { block: isCompact, onClick: () => void loadAnalytics(selectedExam), children: "\u5237\u65B0" })] }), children: _jsx(Spin, { spinning: loading, tip: "\u52A0\u8F7D\u5B66\u60C5\u6570\u636E...", "aria-live": "polite", children: summary ? (_jsxs(Space, { direction: "vertical", size: 20, style: { width: "100%" }, children: [_jsx("div", { className: "stats-grid", children: [
                                    { title: "覆盖学生", value: summary.total_students, suffix: "人" },
                                    { title: "已批改试卷", value: summary.total_submissions, suffix: "份" },
                                    { title: "平均分", value: summary.average_score, suffix: "分", precision: 1 },
                                    { title: "中位数", value: summary.median_score, suffix: "分", precision: 1 },
                                ].map((item) => (_jsx(Card, { className: "shadow-panel", bordered: false, children: _jsx(Statistic, { title: item.title, value: item.value, suffix: item.suffix, precision: item.precision }) }, item.title))) }), _jsx("div", { className: "chart-container", ref: chartRef })] })) : (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\u8BF7\u9009\u62E9\u8003\u8BD5\u6216\u4E0A\u4F20\u8BD5\u5377\u540E\u67E5\u770B\u5B66\u60C5\u6570\u636E\u3002" })) }) }), _jsx(PageLayout, { title: "\u77E5\u8BC6\u70B9\u8BE6\u7EC6\u5217\u8868", description: "\u638C\u63E1\u51FA\u9898\u6B21\u6570\u3001\u9519\u8BEF\u6B21\u6570\u4E0E\u5E73\u5747\u5F97\u5206\uFF0C\u66F4\u5408\u7406\u5730\u5B89\u6392\u8BFE\u5802\u65F6\u95F4\u3002", children: isCompact ? (tableData.length ? (_jsx(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: tableData.map((item, index) => (_jsx(Card, { className: "list-card", size: "small", bordered: false, children: _jsxs(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: [_jsx(Typography.Text, { strong: true, children: item.displayTag }), _jsxs(Typography.Text, { type: "secondary", children: ["\u51FA\u9898\u6570\uFF1A", item.total_attempts, " \u00B7 \u9519\u8BEF\u6B21\u6570\uFF1A", item.incorrect_count] }), _jsxs(Typography.Text, { type: "secondary", children: ["\u6B63\u786E\u7387\uFF1A", Math.round(item.accuracy * 100), "% \u00B7 \u5E73\u5747\u5F97\u5206\uFF1A", item.average_score] })] }) }, item.knowledge_tag || `knowledge-${index}`))) })) : (_jsx(Empty, { description: "\u6682\u65F6\u6CA1\u6709\u53EF\u5206\u6790\u7684\u6570\u636E", image: Empty.PRESENTED_IMAGE_SIMPLE }))) : (_jsx(Table, { rowKey: (record, index) => record.knowledge_tag ?? `knowledge-${index}`, dataSource: tableData, pagination: false, locale: { emptyText: "暂时没有可分析的数据" }, columns: [
                        { title: "知识点", dataIndex: "displayTag" },
                        { title: "出题数", dataIndex: "total_attempts" },
                        { title: "错误次数", dataIndex: "incorrect_count" },
                        {
                            title: "正确率",
                            dataIndex: "accuracy",
                            render: (value) => `${Math.round(value * 100)}%`,
                        },
                        { title: "平均得分", dataIndex: "average_score" },
                    ] })) })] }));
};
export default AnalyticsCenter;
