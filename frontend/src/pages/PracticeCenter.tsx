import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useEffect, useState } from "react";
import { Button, DatePicker, Empty, Select, Space, Table, Tag, Typography } from "antd";
import type { PracticeAssignment, Student } from "../types";
import {
  completePractice,
  fetchPracticeAssignments,
  fetchStudents,
} from "../api/services";
import PageLayout from "../components/PageLayout";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Paragraph, Title } = Typography;

const PracticeCenter = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const loadData = async (studentId?: number) => {
    setLoading(true);
    try {
      const [studentList, assignmentList] = await Promise.all([
        students.length ? Promise.resolve(students) : fetchStudents(),
        fetchPracticeAssignments(studentId ? { student_id: studentId } : {}),
      ]);
      if (!students.length) {
        setStudents(studentList);
      }
      setAssignments(assignmentList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleStudentChange = async (studentId?: number) => {
    setSelectedStudent(studentId);
    await loadData(studentId);
  };

  const filteredAssignments = assignments.filter((assignment) => {
    if (!dateRange[0] || !dateRange[1]) return true;
    const scheduled = dayjs(assignment.scheduled_for);
    return scheduled.isSameOrAfter(dateRange[0], "day") && scheduled.isSameOrBefore(dateRange[1], "day");
  });

  const handleComplete = async (assignmentId: number, completed: boolean) => {
    await completePractice({ assignment_id: assignmentId, completed });
    await loadData(selectedStudent);
  };

  return (
    <Space direction="vertical" size={28} style={{ width: "100%" }}>
      <PageLayout
        title="练习派送指挥台"
        description="查看所有学生的练习推送与完成度，按需筛选学生与时间范围。"
        extra={
          <Space>
            <Select
              allowClear
              placeholder="按学生筛选"
              value={selectedStudent}
              onChange={handleStudentChange}
              style={{ width: 220 }}
              options={students.map((student) => ({ value: student.id, label: student.name }))}
            />
            <DatePicker.RangePicker value={dateRange} onChange={(values) => setDateRange(values as typeof dateRange)} />
            <Button onClick={() => void loadData(selectedStudent)}>刷新</Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          rowKey="id"
          dataSource={filteredAssignments}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description="暂无练习任务" /> }}
          columns={[
            { title: "练习编号", dataIndex: "id", width: 100 },
            { title: "学生", dataIndex: "student_id", width: 100 },
            {
              title: "安排日期",
              dataIndex: "scheduled_for",
              render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
            },
            {
              title: "状态",
              dataIndex: "status",
              render: (value: string) => (
                <Tag color={value === "completed" ? "green" : value === "assigned" ? "blue" : "volcano"}>
                  {value === "completed" ? "已完成" : value === "assigned" ? "待完成" : value}
                </Tag>
              ),
            },
            {
              title: "题量",
              dataIndex: "items",
              render: (items) => items?.length ?? 0,
            },
            {
              title: "操作",
              dataIndex: "actions",
              render: (_, record: PracticeAssignment) => (
                <Space>
                  <Button type="link" onClick={() => handleComplete(record.id, record.status !== "completed")}>
                    {record.status === "completed" ? "标记为未完成" : "标记为已完成"}
                  </Button>
                  {record.generated_pdf_path && (
                    <Button type="link" href={`/api/practice/${record.id}/pdf`} target="_blank">
                      下载 PDF
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </PageLayout>
    </Space>
  );
};

export default PracticeCenter;
