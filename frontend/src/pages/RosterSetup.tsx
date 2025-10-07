import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import PageLayout from "../components/PageLayout";
import type {
  Classroom,
  Question,
  QuestionType,
  Student,
  Teacher,
} from "../types";
import {
  createClassroom,
  createEnrollment,
  createExam,
  createStudent,
  createTeacher,
  fetchClassrooms,
  fetchExams,
  fetchStudents,
  fetchTeachers,
} from "../api/services";

const { Title, Paragraph, Text } = Typography;

interface QuestionDraft {
  number: string;
  type: QuestionType;
  prompt?: string;
  max_score: number;
  knowledge_tags?: string;
  answer_key?: Record<string, unknown>;
  target_student_ids?: number[];
}

const defaultQuestion: QuestionDraft = {
  number: "1",
  type: "multiple_choice",
  prompt: "",
  max_score: 1,
  knowledge_tags: "",
  answer_key: { correct: "A", options: ["A", "B", "C", "D"] },
  target_student_ids: [],
};

const questionTypeOptions = [
  { label: "选择题", value: "multiple_choice" },
  { label: "填空题", value: "fill_in_blank" },
  { label: "主观题", value: "subjective" },
];

const renderQuestionType = (type: QuestionType) => {
  switch (type) {
    case "multiple_choice":
      return "选择题";
    case "fill_in_blank":
      return "填空题";
    case "subjective":
      return "主观题";
    default:
      return type;
  }
};

const RosterSetup = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [examCount, setExamCount] = useState(0);
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>([defaultQuestion]);
  const [submitting, setSubmitting] = useState(false);

  const studentLookup = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((item) => map.set(item.id, item));
    return map;
  }, [students]);

  const studentOptions = useMemo(() => students.map((student) => ({
    value: student.id,
    label: student.name,
  })), [students]);

  useEffect(() => {
    void refreshAll();
  }, []);

  const refreshAll = async () => {
    const [teacherList, classroomList, studentList, examList] = await Promise.all([
      fetchTeachers(),
      fetchClassrooms(),
      fetchStudents(),
      fetchExams(),
    ]);
    setTeachers(teacherList);
    setClassrooms(classroomList);
    setStudents(studentList);
    setExamCount(examList.length);
  };

  const handleTeacherSubmit = async (values: { name: string; email?: string }) => {
    setSubmitting(true);
    try {
      await createTeacher(values);
      await refreshAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClassroomSubmit = async (values: { name: string; grade_level?: string; teacher_id: number }) => {
    setSubmitting(true);
    try {
      await createClassroom(values);
      await refreshAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentSubmit = async (values: { name: string; email?: string; grade_level?: string; classroom_id?: number }) => {
    setSubmitting(true);
    try {
      const student = await createStudent(values);
      if (values.classroom_id) {
        await createEnrollment({ classroom_id: values.classroom_id, student_id: student.id });
      }
      await refreshAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestionDrafts((prev) => [
      ...prev,
      {
        ...defaultQuestion,
        number: String(prev.length + 1),
      },
    ]);
  };

  const handleQuestionChange = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestionDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestionDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const examPreview = useMemo(() => {
    return questionDrafts.map((item, index) => (
      <List.Item key={`${item.number}-${index}`}>
        <List.Item.Meta
          title={`第 ${item.number} 题 · ${renderQuestionType(item.type)}`}
          description={
            <Space direction="vertical" style={{ width: "100%" }}>
              <Paragraph style={{ marginBottom: 0 }}>{item.prompt || "题干待完善"}</Paragraph>
              <Text type="secondary">知识点：{item.knowledge_tags || "未标注"}</Text>
              <Text type="secondary">满分 {item.max_score} 分</Text>
              <Text type="secondary">适用范围：{(item.target_student_ids && item.target_student_ids.length > 0) ? item.target_student_ids
                .map((id) => studentLookup.get(id)?.name || `学生 #${id}`)
                .join("、") : "默认全班"}</Text>
            </Space>
          }
        />
        <Button type="link" danger onClick={() => handleRemoveQuestion(index)}>
          删除
        </Button>
      </List.Item>
    ));
  }, [questionDrafts]);

  const handleCreateExam = async (values: { title: string; subject?: string; classroom_id?: number; teacher_id: number }) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        questions: questionDrafts.map((item, idx) => ({
          number: item.number || String(idx + 1),
          type: item.type,
          prompt: item.prompt,
          max_score: item.max_score,
          knowledge_tags: item.knowledge_tags,
          answer_key: item.answer_key,
          target_student_ids: item.target_student_ids && item.target_student_ids.length > 0 ? item.target_student_ids : undefined,
        })),
      };
      await createExam(payload);
      await refreshAll();
      Modal.success({
        title: "试卷创建成功",
        content: "接下来可前往“上传批改”体验自动批改流程。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 28 }}>
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            一次搭建，持续复用
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            录入教师、班级、学生与试卷结构后，后续批改与学情分析即可即刻使用。
          </Paragraph>
          <Steps
            responsive
            items={[
              { title: "录入教师", description: "建立授课老师与账号信息" },
              { title: "创建班级", description: "关联教师并添加学生" },
              { title: "配置试卷", description: "补充题目与答案规则" },
            ]}
          />
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={8}>
          <PageLayout
            title="教师信息"
            description="保存授课教师姓名与邮箱，系统将自动同步批改权限。"
          >
            <Form layout="vertical" onFinish={handleTeacherSubmit} autoComplete="off">
              <Form.Item name="name" label="教师姓名" rules={[{ required: true, message: "请输入教师姓名" }]}>
                <Input placeholder="如：李老师" allowClear />
              </Form.Item>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="teacher@example.com" allowClear />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} block icon={<PlusOutlined />}>
                  保存教师
                </Button>
              </Form.Item>
            </Form>
          </PageLayout>
        </Col>
        <Col xs={24} lg={8}>
          <PageLayout
            title="班级信息"
            description="设置班级名称与年级，并指定班主任。"
          >
            <Form layout="vertical" onFinish={handleClassroomSubmit} autoComplete="off">
              <Form.Item name="name" label="班级名称" rules={[{ required: true, message: "请输入班级名称" }]}>
                <Input placeholder="如：九年级一班" allowClear />
              </Form.Item>
              <Form.Item name="grade_level" label="年级">
                <Input placeholder="如：九年级" allowClear />
              </Form.Item>
              <Form.Item name="teacher_id" label="班主任" rules={[{ required: true, message: "请选择班主任" }]}>
                <Select
                  placeholder="请选择教师"
                  options={teachers.map((teacher) => ({ value: teacher.id, label: teacher.name }))}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} block icon={<PlusOutlined />}>
                  创建班级
                </Button>
              </Form.Item>
            </Form>
          </PageLayout>
        </Col>
        <Col xs={24} lg={8}>
          <PageLayout
            title="学生信息"
            description="可随时添加或调整学生，灵活关联班级。"
          >
            <Form layout="vertical" onFinish={handleStudentSubmit} autoComplete="off">
              <Form.Item name="name" label="学生姓名" rules={[{ required: true, message: "请输入学生姓名" }]}>
                <Input placeholder="如：张同学" allowClear />
              </Form.Item>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="student@example.com" allowClear />
              </Form.Item>
              <Form.Item name="grade_level" label="年级">
                <Input placeholder="如：九年级" allowClear />
              </Form.Item>
              <Form.Item name="classroom_id" label="加入班级">
                <Select
                  allowClear
                  placeholder="可选"
                  options={classrooms.map((classroom) => ({ value: classroom.id, label: classroom.name }))}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} block icon={<PlusOutlined />}>
                  保存学生
                </Button>
              </Form.Item>
            </Form>
          </PageLayout>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={8}>
          <Card bordered={false} className="shadow-panel" bodyStyle={{ padding: 24 }}>
            <Space direction="vertical">
              <Text type="secondary">当前数据概览</Text>
              <Statistic title="教师数量" value={teachers.length} suffix="人" />
              <Statistic title="班级数量" value={classrooms.length} suffix="个" />
              <Statistic title="学生数量" value={students.length} suffix="人" />
              <Statistic title="已配置试卷" value={examCount} suffix="份" />
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <PageLayout
            title="试卷结构设计"
            description="记录题目类型、答案与知识点标签，后续自动批改即可生效。"
            extra={
              <Button type="text" icon={<PlusOutlined />} onClick={handleAddQuestion}>
                添加题目
              </Button>
            }
          >
            <Form layout="vertical" onFinish={handleCreateExam} autoComplete="off">
              <Row gutter={[20, 20]}>
                <Col xs={24} md={12}>
                  <Form.Item name="title" label="试卷标题" rules={[{ required: true, message: "请输入试卷标题" }]}>
                    <Input placeholder="如：期中测试" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="subject" label="学科">
                    <Input placeholder="如：数学" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="teacher_id" label="出卷教师" rules={[{ required: true, message: "请选择教师" }]}>
                    <Select
                      placeholder="请选择教师"
                      options={teachers.map((teacher) => ({ value: teacher.id, label: teacher.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="classroom_id" label="适用班级">
                    <Select
                      allowClear
                      placeholder="可选"
                      options={classrooms.map((classroom) => ({ value: classroom.id, label: classroom.name }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">题目列表</Divider>
              <List dataSource={questionDrafts} renderItem={(item, index) => (
                <List.Item key={index}>
                  <Row gutter={16} style={{ width: "100%" }}>
                    <Col xs={12} md={4}>
                      <Input
                        value={item.number}
                        onChange={(event) => handleQuestionChange(index, { number: event.target.value })}
                        addonBefore="题号"
                      />
                    </Col>
                    <Col xs={12} md={5}>
                      <Select
                        value={item.type}
                        onChange={(value) => handleQuestionChange(index, { type: value })}
                        options={questionTypeOptions}
                      />
                    </Col>
                    <Col xs={24} md={7}>
                      <Input.TextArea
                        value={item.prompt}
                        onChange={(event) => handleQuestionChange(index, { prompt: event.target.value })}
                        placeholder="题干描述"
                        autoSize={{ minRows: 2, maxRows: 4 }}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <Input
                        type="number"
                        min={0}
                        value={item.max_score}
                        onChange={(event) =>
                          handleQuestionChange(index, { max_score: Number(event.target.value) || 0 })
                        }
                        addonBefore="满分"
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <Input
                        value={item.knowledge_tags}
                        onChange={(event) => handleQuestionChange(index, { knowledge_tags: event.target.value })}
                        placeholder="知识点标签"
                      />
                    </Col>

                    <Col xs={24} md={6}>
                      <Select
                        mode="multiple"
                        allowClear
                        placeholder="默认全班，如需定向请选择学生"
                        options={studentOptions}
                        value={item.target_student_ids}
                        onChange={(value) => handleQuestionChange(index, { target_student_ids: value })}
                        maxTagCount="responsive"
                      />
                    </Col>
                  </Row>
                </List.Item>
              )} />

              <Space style={{ marginTop: 16 }}>
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddQuestion}>
                  添加题目
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  保存试卷
                </Button>
              </Space>
            </Form>

            <Divider orientation="left">试卷预览</Divider>
            <List bordered dataSource={questionDrafts} renderItem={(_, index) => examPreview[index]} />
          </PageLayout>
        </Col>
      </Row>
    </Space>
  );
};

export default RosterSetup;
