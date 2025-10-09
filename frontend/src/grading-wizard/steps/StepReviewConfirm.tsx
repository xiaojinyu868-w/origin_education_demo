

import dayjs from "dayjs";

import {

  Alert,

  Badge,

  Button,

  Card,

  Collapse,

  Descriptions,

  Empty,

  Input,

  InputNumber,

  List,

  Segmented,

  Space,

  Spin,

  Tag,

  Typography,

  message,

} from "antd";

import {

  CheckCircleOutlined,

  ClockCircleOutlined,

  CommentOutlined,

  ReloadOutlined,

} from "@ant-design/icons";

import { useLocation } from "react-router-dom";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {

  ProcessingLog,

  SubmissionDetail,

  SubmissionResponse,

  Student,

  Question,

} from "../../types";

import {

  fetchStudents,

  fetchSubmission,

  fetchSubmissionLogs,

  fetchSubmissions,

  updateManualScore,

} from "../../api/services";

import { useWizardStore } from "../useWizardStore";



const { Title, Text, Paragraph } = Typography;



const SUBMISSION_FILTERS = [

  { label: "全部", value: "all" },

  { label: "待复核", value: "needs_review" },

  { label: "待处理", value: "pending" },

  { label: "已完成", value: "graded" },

] as const;



type SubmissionFilterValue = (typeof SUBMISSION_FILTERS)[number]["value"];



const formatConfidence = (value?: number | null) =>

  typeof value === "number" ? `${Math.round(value * 100)}%` : "--";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "选择题",
  fill_in_blank: "填空题",
  subjective: "主观题",
};



const StepReviewConfirm = () => {

  const {

    state: { selectedExamId, exams },

    actions: { goToStep },

  } = useWizardStore();

  const location = useLocation();



  const resumeSubmissionId = useMemo(() => {

    const params = new URLSearchParams(location.search);

    const raw = params.get("resume");

    if (!raw) return null;

    const parsed = Number(raw);

    return Number.isNaN(parsed) ? null : parsed;

  }, [location.search]);



  const [studentsMap, setStudentsMap] = useState<Record<number, Student>>({});

  const [studentsLoading, setStudentsLoading] = useState(false);



  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);

  const [submissionLoading, setSubmissionLoading] = useState(false);

  const [submissionFilter, setSubmissionFilter] =

    useState<SubmissionFilterValue>("needs_review");

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);



  const [detail, setDetail] = useState<SubmissionDetail | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  const [logsLoading, setLogsLoading] = useState(false);



  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);

  const [scoreDraft, set得分Draft] = useState<number | null>(null);

  const [commentDraft, setCommentDraft] = useState<string>("");

  const [savingResponse, setSavingResponse] = useState(false);



  const selectedExam = useMemo(

    () => exams.find((exam) => exam.id === selectedExamId),

    [exams, selectedExamId],

  );



  const questionMap = useMemo(() => {

    const map = new Map<number, Question>();

    if (!selectedExam) return map;

    selectedExam.questions.forEach((question) => map.set(question.id, question));

    return map;

  }, [selectedExam]);



  const responseList = useMemo(

    () => detail?.responses.filter((item) => item.applies_to_student) ?? [],

    [detail],

  );



  const currentResponse = useMemo(

    () => responseList.find((item) => item.id === selectedResponseId) ?? null,

    [responseList, selectedResponseId],

  );



  const currentQuestion = currentResponse

    ? questionMap.get(currentResponse.question_id) ?? null

    : null;



  useEffect(() => {

    if (resumeSubmissionId) {

      setSubmissionFilter("all");

      setSelectedSubmissionId(resumeSubmissionId);

    }

  }, [resumeSubmissionId]);



  useEffect(() => {

    if (!currentResponse) {

      set得分Draft(null);

      setCommentDraft("");

      return;

    }

    set得分Draft(currentResponse.score ?? null);

    setCommentDraft(currentResponse.teacher_comment ?? "");

  }, [currentResponse]);



  const filteredSubmissions = useMemo(() => {

    if (submissionFilter === "all") return submissions;

    return submissions.filter((item) => {

      const statusText = (item.status ?? "").toLowerCase();

      if (submissionFilter === "graded") return statusText.includes("graded");

      if (submissionFilter === "pending") return statusText.includes("pending");

      return (

        statusText.includes("needs") ||

        statusText.includes("review") ||

        item.responses.some((response) => response.review_status === "needs_review")

      );

    });

  }, [submissionFilter, submissions]);



  const loadStudents = useCallback(async () => {

    setStudentsLoading(true);

    try {

      const data = await fetchStudents();

      const map: Record<number, Student> = {};

      data.forEach((student) => {

        map[student.id] = student;

      });

      setStudentsMap(map);

    } catch (error) {

      const detailMessage = (

        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||

        (error instanceof Error ? error.message : "加载学生列表失败")

      );

      message.error(detailMessage);

    } finally {

      setStudentsLoading(false);

    }

  }, []);



  const loadSubmissions = useCallback(async () => {

    if (!selectedExamId) return;

    setSubmissionLoading(true);

    try {

      const data = await fetchSubmissions({ exam_id: selectedExamId });

      data.sort((a, b) => {

        const priority = (status: string | undefined | null) => {

          const value = (status ?? "").toLowerCase();

          if (value.includes("needs")) return 0;

          if (value.includes("pending")) return 1;

          return 2;

        };

        const diff = priority(a.status) - priority(b.status);

        if (diff !== 0) return diff;

        return (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "");

      });

      setSubmissions(data);

      if (data.length > 0) {

        setSelectedSubmissionId((prev) => prev ?? data[0].id);

      } else {

        setSelectedSubmissionId(null);

      }

    } catch (error) {

      const detailMessage = (

        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||

        (error instanceof Error ? error.message : "加载提交记录失败")

      );

      message.error(detailMessage);

    } finally {

      setSubmissionLoading(false);

    }

  }, [selectedExamId]);



  const loadSubmissionDetail = useCallback(

    async (submissionId: number) => {

      setDetailLoading(true);

      setLogsLoading(true);

      try {

        const [submissionDetail, logList] = await Promise.all([

          fetchSubmission(submissionId),

          fetchSubmissionLogs(submissionId).catch(() => ({ items: [] })),

        ]);

        setDetail(submissionDetail);

        setLogs(logList.items ?? []);

        setSubmissions((prev) =>

          prev.map((item) => (item.id === submissionDetail.id ? submissionDetail : item)),

        );

        const prioritized = submissionDetail.responses.find(

          (response) => response.applies_to_student && response.review_status === "needs_review",

        );

        const fallback = submissionDetail.responses.find((response) => response.applies_to_student);

        setSelectedResponseId(prioritized?.id ?? fallback?.id ?? null);

      } catch (error) {

        const detailMessage = (

          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||

          (error instanceof Error ? error.message : "获取批改详情失败")

        );

        message.error(detailMessage);

      } finally {

        setDetailLoading(false);

        setLogsLoading(false);

      }

    },

    [],

  );



  useEffect(() => {

    void loadStudents();

  }, [loadStudents]);



  useEffect(() => {

    if (!selectedExamId) {

      setSubmissions([]);

      setDetail(null);

      setSelectedSubmissionId(null);

      return;

    }

    void loadSubmissions();

  }, [selectedExamId, loadSubmissions]);



  useEffect(() => {

    if (!selectedSubmissionId) {

      setDetail(null);

      setLogs([]);

      return;

    }

    void loadSubmissionDetail(selectedSubmissionId);

  }, [selectedSubmissionId, loadSubmissionDetail]);



  const handleSelectSubmission = (submissionId: number) => {

    setSelectedSubmissionId(submissionId);

  };



  const handleSelectResponse = (response: SubmissionResponse) => {

    setSelectedResponseId(response.id);

  };



  const handleSaveResponse = async (next得分: number | null, nextComment: string, advance: boolean) => {

    if (!currentResponse || !detail || !selectedSubmissionId) return;

    if (next得分 === null || Number.isNaN(next得分)) {

      message.warning("请输入有效的分数");

      return;

    }

    try {

      setSavingResponse(true);

      const updated = await updateManualScore({

        response_id: currentResponse.id,

        new_score: next得分,

        new_comment: nextComment.trim() || undefined,

      });

      const nextResponseState: SubmissionResponse = { ...currentResponse, ...updated };

      const updatedStudentResponses = responseList.map((resp) =>

        resp.id === nextResponseState.id ? nextResponseState : resp,

      );

      const stillPending = updatedStudentResponses.some(

        (resp) => resp.review_status !== "confirmed",

      );

      setDetail((prev) => {

        if (!prev) return prev;

        return {

          ...prev,

          responses: prev.responses.map((resp) =>

            resp.id === nextResponseState.id ? nextResponseState : resp,

          ),

          status: stillPending ? "needs_review" : "graded",

        };

      });

      setSubmissions((prev) =>

        prev.map((item) =>

          item.id === selectedSubmissionId

            ? {

                ...item,

                responses: item.responses.map((resp) =>

                  resp.id === nextResponseState.id ? nextResponseState : resp,

                ),

                status: stillPending ? "needs_review" : "graded",

              }

            : item,

        ),

      );

      set得分Draft(nextResponseState.score ?? null);

      setCommentDraft(nextResponseState.teacher_comment ?? "");

      message.success("评分已保存");

      if (advance) {

        const currentIndex = updatedStudentResponses.findIndex(

          (resp) => resp.id === nextResponseState.id,

        );

        const nextCandidate = updatedStudentResponses

          .slice(currentIndex + 1)

          .find((resp) => resp.review_status !== "confirmed");

        if (nextCandidate) {

          handleSelectResponse(nextCandidate);

        }

      }

    } catch (error) {

      const detailMessage = (

        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||

        (error instanceof Error ? error.message : "保存评分失败")

      );

      message.error(detailMessage);

    } finally {

      setSavingResponse(false);

    }

  };



  const handleProceedToCompletion = async () => {

    if (!detail || !selectedExamId) {

      message.warning("请先选择一份学生卷");

      return;

    }

    const pending = detail.responses

      .filter((response) => response.applies_to_student)

      .some((response) => response.review_status !== "confirmed");

    if (pending) {

      message.warning("请先确认全部题目再完成");

      return;

    }

    try {

      await goToStep(5, { examId: selectedExamId });

    } catch (error) {

      const detailMessage = (

        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||

        (error instanceof Error ? error.message : "无法进入下一阶段")

      );

      message.error(detailMessage);

    }

  };



  if (!selectedExamId || !selectedExam) {

    return (

      <Alert

        type="warning"

        showIcon

        message="尚未选择试卷"

        description="请返回试卷配置阶段完成选择后再来确认AI批改结果。"

      />

    );

  }



  return (

    <Space direction="vertical" size={24} style={{ width: "100%" }}>

      <Space direction="vertical" size={6}>

        <Title level={3} style={{ margin: 0 }}>

          AI 批改确认

        </Title>

        <Paragraph type="secondary" style={{ marginBottom: 0 }}>

          左侧选择学生卷，中间浏览Question，右侧调整得分与备注。确认全部Question后即可进入导出与后续流程。

        </Paragraph>

      </Space>



      <div

        style={{

          display: "grid",

          gridTemplateColumns: "320px 1fr 360px",

          gap: 18,

          alignItems: "stretch",

        }}

      >

        <Card

          title="学生提交队列"

          extra={

            <Button

              icon={<ReloadOutlined />}

              size="small"

              loading={submissionLoading}

              onClick={() => loadSubmissions()}

            >

              刷新

            </Button>

          }

          style={{ minHeight: 480 }}

        >

          <Space direction="vertical" size={16} style={{ width: "100%" }}>

            <Segmented

              options={SUBMISSION_FILTERS.map((option) => ({ ...option }))}

              value={submissionFilter}

              onChange={(value) => setSubmissionFilter(value as SubmissionFilterValue)}

              block

            />

            <Spin spinning={submissionLoading || studentsLoading}>

              {filteredSubmissions.length === 0 ? (

                <Empty description="暂无提交" image={Empty.PRESENTED_IMAGE_SIMPLE} />

              ) : (

                <List

                  dataSource={filteredSubmissions}

                  renderItem={(item) => {

                    const isActive = item.id === selectedSubmissionId;

                    const student = studentsMap[item.student_id];

                    const needsReview = item.responses.some(

                      (response) => response.review_status === "needs_review",

                    );

                    return (

                      <List.Item

                        key={item.id}

                        style={{

                          padding: 12,

                          borderRadius: 14,

                          border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",

                          background: isActive ? "rgba(37,99,235,0.08)" : "#fff",

                          cursor: "pointer",

                        }}

                        onClick={() => handleSelectSubmission(item.id)}

                      >

                        <Space direction="vertical" size={6} style={{ width: "100%" }}>

                          <Space align="center" size={8} wrap>

                            <Text strong>{student?.name ?? `学生 #${item.student_id}`}</Text>

                            <Tag color={needsReview ? "orange" : "green"}>

                              {needsReview ? "待复核" : "已完成"}

                            </Tag>

                          </Space>

                          <Space size={8} wrap>

                            <Tag icon={<ClockCircleOutlined />} color="blue">

                              {dayjs(item.submitted_at).format("MM-DD HH:mm")}

                            </Tag>

                            {typeof item.overall_confidence === "number" && (

                              <Tag color="geekblue">置信度 {formatConfidence(item.overall_confidence)}</Tag>

                            )}

                            {item.status_detail && <Tag color="purple">AI 总结</Tag>}

                          </Space>

                        </Space>

                      </List.Item>

                    );

                  }}

                />

              )}

            </Spin>

          </Space>

        </Card>



        <Card title="题目导航" style={{ minHeight: 480 }}>

          {detailLoading ? (

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 360 }}>

              <Spin />

            </div>

          ) : responseList.length === 0 ? (

            <Empty description="暂无作答记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />

          ) : (

            <List

              dataSource={responseList}

              renderItem={(response) => {

                const isActive = response.id === selectedResponseId;

                const question = questionMap.get(response.question_id);

                return (

                  <List.Item

                    key={response.id}

                    onClick={() => handleSelectResponse(response)}

                    style={{

                      borderRadius: 14,

                      border: isActive ? "1.5px solid #2563eb" : "1px solid #e2e8f0",

                      padding: 12,

                      cursor: "pointer",

                      background: isActive ? "rgba(37,99,235,0.06)" : "transparent",

                    }}

                  >

                    <Space direction="vertical" size={8} style={{ width: "100%" }}>

                      <Space align="center" size={8} wrap>

                        <Text strong>{question?.number ?? response.question_id}</Text>

                        <Tag>{QUESTION_TYPE_LABELS[question?.type ?? ""] ?? "未知题型"}</Tag>

                        {response.review_status === "confirmed" ? (

                          <Tag color="green">已确认</Tag>

                        ) : response.review_status === "needs_review" ? (

                          <Tag color="orange">待复核</Tag>

                        ) : (

                          <Tag color="blue">待处理</Tag>

                        )}

                      </Space>

                      <Space size={8} wrap>

                        <Tag color="geekblue">AI 判定：{response.is_correct ? "正确" : "错误"}</Tag>

                        <Tag color="purple">得分 {response.score ?? "--"}</Tag>

                        {typeof response.ai_confidence === "number" && (

                          <Tag color="blue">置信度 {formatConfidence(response.ai_confidence)}</Tag>

                        )}

                      </Space>

                      <Text type="secondary" ellipsis>

                        {response.student_answer || "未识别到学生答案"}

                      </Text>

                    </Space>

                  </List.Item>

                );

              }}

            />

          )}

        </Card>



        <Card

          title="人工复核"

          extra={

            detail && (

              <Button type="primary" onClick={handleProceedToCompletion} icon={<CheckCircleOutlined />}>

                完成并导出

              </Button>

            )

          }

          style={{ minHeight: 480 }}

        >

          {detailLoading || !detail ? (

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 360 }}>

              <Spin />

            </div>

          ) : !currentResponse ? (

            <Empty description="请选择题目" image={Empty.PRESENTED_IMAGE_SIMPLE} />

          ) : (

            <Space direction="vertical" size={18} style={{ width: "100%" }}>

              <Space direction="vertical" size={6}>

                <Text type="secondary">题目</Text>

                <Text strong>{currentQuestion?.number ?? currentResponse.question_id}</Text>

              </Space>

              <Space direction="vertical" size={6}>

                <Text type="secondary">学生答案</Text>

                <Card size="small" bordered style={{ background: "#f8fafc" }}>

                  <Paragraph style={{ marginBottom: 0 }}>

                    {currentResponse.student_answer ?? "未识别到学生答案"}

                  </Paragraph>

                </Card>

              </Space>

              <Space direction="vertical" size={6}>

                <Text type="secondary">标准答案（JSON）</Text>

                <Card size="small" bordered style={{ background: "#f1f5f9" }}>

                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>

                    {JSON.stringify(currentQuestion?.answer_key ?? {}, null, 2)}

                  </pre>

                </Card>

              </Space>

              <Space direction="vertical" size={12}>

                <Text type="secondary">得分</Text>

                <InputNumber

                  min={0}

                  max={currentQuestion?.max_score ?? 10}

                  step={0.5}

                  style={{ width: "100%" }}

                  value={scoreDraft ?? undefined}

                  onChange={(value) => set得分Draft(value === null ? null : Number(value))}

                />

                <Space size={12} wrap>

                  <Button

                    onClick={() => handleSaveResponse(currentQuestion?.max_score ?? 0, commentDraft, true)}

                    icon={<CheckCircleOutlined />}

                    loading={savingResponse}

                  >

                    标记满分

                  </Button>

                  <Button

                    danger

                    onClick={() => handleSaveResponse(0, commentDraft, true)}

                    loading={savingResponse}

                  >

                    标记零分

                  </Button>

                </Space>

              </Space>

              <Space direction="vertical" size={8}>

                <Text type="secondary">教师备注</Text>

                <Input.TextArea

                  autoSize={{ minRows: 3, maxRows: 6 }}

                  value={commentDraft}

                  onChange={(event) => setCommentDraft(event.target.value)}

                  placeholder="填写教师备注或批注"

                />

              </Space>

              <Space size={12}>

                <Button

                  type="primary"

                  icon={<CommentOutlined />}

                  onClick={() =>

                    handleSaveResponse(

                      scoreDraft ?? currentResponse.score ?? 0,

                      commentDraft,

                      true,

                    )

                  }

                  loading={savingResponse}

                >

                  保存并查看下一题

                </Button>

                <Button

                  onClick={() =>

                    handleSaveResponse(

                      scoreDraft ?? currentResponse.score ?? 0,

                      commentDraft,

                      false,

                    )

                  }

                  loading={savingResponse}

                >

                  仅保存

                </Button>

              </Space>

              {detail.status_detail && (

                <Alert type="info" showIcon message="AI 总结" description={detail.status_detail} />

              )}

              <Collapse

                bordered={false}

                items={[

                  {

                    key: "logs",

                    label: "处理日志",

                    children: logsLoading ? (

                      <Spin />

                    ) : logs.length === 0 ? (

                      <Empty description="暂无日志记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />

                    ) : (

                      <List

                        dataSource={logs}

                        renderItem={(log) => (

                          <List.Item key={log.id}>

                            <Space direction="vertical" size={4} style={{ width: "100%" }}>

                              <Space align="center" size={8}>

                                <Badge color="blue" text={log.step} />

                                <Text type="secondary">{dayjs(log.created_at).format("YYYY-MM-DD HH:mm")}</Text>

                              </Space>

                              {log.detail && <Text>{log.detail}</Text>}

                            </Space>

                          </List.Item>

                        )}

                      />

                    ),

                  },

                ]}

              />

            </Space>

          )}

        </Card>

      </div>

    </Space>

  );

};



export default StepReviewConfirm;