import zhCN from "antd/locale/zh_CN";
import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  ConfigProvider,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Space,
  Switch,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsCenter from "./pages/AnalyticsCenter";
import Dashboard from "./pages/Dashboard";
import MistakeCenter from "./pages/MistakeCenter";
import PracticeCenter from "./pages/PracticeCenter";
import RosterSetup from "./pages/RosterSetup";
import TeacherAssistant from "./pages/TeacherAssistant";
import UploadCenter from "./pages/UploadCenter";
import { submitTeacherFeedback } from "./api/services";
import { NAVIGATE_EVENT } from "./utils/navigation";

const { Header, Sider, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

type NavKey = "dashboard" | "roster" | "upload" | "mistake" | "practice" | "analytics" | "assistant";

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "工作台", icon: <HomeOutlined /> },
  { key: "roster", label: "班级搭建", icon: <ApartmentOutlined /> },
  { key: "upload", label: "上传批改", icon: <CloudUploadOutlined /> },
  { key: "mistake", label: "错题智库", icon: <BookOutlined /> },
  { key: "practice", label: "练习派送", icon: <CheckCircleOutlined /> },
  { key: "assistant", label: "AI教研助手", icon: <CustomerServiceOutlined /> },
  { key: "analytics", label: "学情洞察", icon: <BarChartOutlined /> },
];

const menuTitleMap: Record<NavKey, string> = {
  dashboard: "全局工作台",
  roster: "搭建教学班级",
  upload: "上传试卷 · 极速批改",
  mistake: "错题诊断与修复",
  practice: "智能练习分发",
  assistant: "AI 教研助手",
  analytics: "班级学情雷达",
};

const menuDescriptionMap: Record<NavKey, string> = {
  dashboard: "一屏掌握批改节奏、错题热点与练习派送，教学决策更从容。",
  roster: "按步骤录入教师、班级、学生与试卷结构，数据一次输入即可长期复用。",
  upload: "拖拽或拍照即可上传纸质试卷，AI 自动识别题号与批注，几分钟完成批改。",
  mistake: "错题自动归档并生成知识点标签，帮助学生随时复盘与巩固。",
  practice: "根据错题记录生成个性化练习卷，实时掌握派送与完成状态。",
  assistant: "即时获得讲评提纲、作业建议、家校沟通话术等AI助教能力。",
  analytics: "知识点热力、分数走势、错误分布全面呈现，为下一堂课提供依据。",
};

type FeedbackFormValues = {
  content: string;
  teacher_name?: string;
  teacher_email?: string;
  is_anonymous?: boolean;
};

const ALLOWED_FEEDBACK_TYPES: string[] = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FEEDBACK_FILE_SIZE = 3 * 1024 * 1024;


const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>("dashboard");

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackFiles, setFeedbackFiles] = useState<UploadFile[]>([]);
  const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);
  const [feedbackForm] = Form.useForm<FeedbackFormValues>();

  const applyStoredFeedbackProfile = useCallback(() => {
    try {
      const stored = localStorage.getItem("teacherFeedbackProfile");
      const baseValues: FeedbackFormValues = {
        content: "",
        is_anonymous: false,
      };
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<FeedbackFormValues> | null;
        if (parsed?.teacher_name) {
          baseValues.teacher_name = parsed.teacher_name;
        }
        if (parsed?.teacher_email) {
          baseValues.teacher_email = parsed.teacher_email;
        }
      }
      feedbackForm.setFieldsValue(baseValues);
      setFeedbackAnonymous(false);
    } catch (_error) {
      feedbackForm.setFieldsValue({ content: "", is_anonymous: false });
      setFeedbackAnonymous(false);
    }
  }, [feedbackForm]);

  useEffect(() => {
    applyStoredFeedbackProfile();
  }, [applyStoredFeedbackProfile]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<NavKey>;
      if (custom.detail && NAV_ITEMS.some((item) => item.key === custom.detail)) {
        setActiveKey(custom.detail);
      }
    };

    window.addEventListener(NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(NAVIGATE_EVENT, handler);
  }, []);


const feedbackUploadProps: UploadProps = useMemo(
  () => ({
    multiple: true,
    maxCount: 3,
    accept: ".png,.jpg,.jpeg,.webp",
    fileList: feedbackFiles,
    beforeUpload: (file) => {
      if (!ALLOWED_FEEDBACK_TYPES.includes(file.type)) {
        message.error("仅支持上传 JPG/PNG/WebP 图片");
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_FEEDBACK_FILE_SIZE) {
        message.error("单张图片需小于 3MB");
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: ({ fileList: newFileList }) => {
      setFeedbackFiles(newFileList);
    },
    onRemove: (file) => {
      setFeedbackFiles((prev) => prev.filter((item) => item.uid !== file.uid));
      return true;
    },
  }),
  [feedbackFiles],
);

const handleFeedbackOpen = () => {
  applyStoredFeedbackProfile();
  setFeedbackFiles([]);
  setFeedbackVisible(true);
};

const handleFeedbackCancel = () => {
  setFeedbackVisible(false);
};

const handleFeedbackValuesChange = (_: FeedbackFormValues, allValues: FeedbackFormValues) => {
  setFeedbackAnonymous(Boolean(allValues.is_anonymous));
};

const handleFeedbackFinish = async (values: FeedbackFormValues) => {
  const trimmedContent = values.content?.trim() ?? "";
  if (!trimmedContent) {
    message.warning("请填写问题描述");
    return;
  }
  const isAnonymous = Boolean(values.is_anonymous);
  const formData = new FormData();
  formData.append("content", trimmedContent);
  formData.append("is_anonymous", String(isAnonymous));

  const trimmedName = values.teacher_name?.trim();
  const trimmedEmail = values.teacher_email?.trim();
  if (!isAnonymous) {
    if (trimmedName) {
      formData.append("teacher_name", trimmedName);
    }
    if (trimmedEmail) {
      formData.append("teacher_email", trimmedEmail);
    }
  }

  feedbackFiles.forEach((file) => {
    if (file.originFileObj) {
      formData.append("attachments", file.originFileObj);
    }
  });

  setFeedbackSubmitting(true);
  try {
    const response = await submitTeacherFeedback(formData);
    if (!isAnonymous) {
      localStorage.setItem(
        "teacherFeedbackProfile",
        JSON.stringify({ teacher_name: trimmedName ?? "", teacher_email: trimmedEmail ?? "" }),
      );
    }
    message.success(`反馈已提交，编号 #${response.id}`);
    setFeedbackVisible(false);
    setFeedbackFiles([]);
    applyStoredFeedbackProfile();
  } catch (error) {
    const detail = (
      (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
      (error instanceof Error ? error.message : "提交失败，请稍后重试")
    );
    message.error(detail);
  } finally {
    setFeedbackSubmitting(false);
  }
};

  const content = useMemo(() => {
    switch (activeKey) {
      case "dashboard":
        return <Dashboard />;
      case "roster":
        return <RosterSetup />;
      case "upload":
        return <UploadCenter />;
      case "mistake":
        return <MistakeCenter />;
      case "practice":
        return <PracticeCenter />;
      case "assistant":
        return <TeacherAssistant />;
      case "analytics":
        return <AnalyticsCenter />;
      default:
        return <Dashboard />;
    }
  }, [activeKey]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#2563eb",
          borderRadiusLG: 18,
          fontFamily: '"SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Layout: {
            headerBg: "transparent",
            siderBg: "transparent",
            bodyBg: "transparent",
          },
          Menu: {
            colorItemBg: "transparent",
            itemSelectedColor: "#1d4ed8",
            itemSelectedBg: "rgba(37,99,235,0.12)",
            itemHoverBg: "rgba(37,99,235,0.08)",
            radiusItem: 12,
          },
          Button: {
            borderRadius: 12,
          },
        },
      }}
    >
      <Layout className="app-shell">
        <Sider
          className="app-sider"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={232}
          theme="light"
        >
          <Space
            align="center"
            style={{
              height: 108,
              width: "100%",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "12px" : "28px 20px 16px",
            }}
          >
            <Avatar size={collapsed ? 44 : 52} src="/logo.svg" />
            {!collapsed && (
              <Space direction="vertical" size={4}>
                <Title level={5} style={{ color: "#0f172a", margin: 0 }}>
                  智慧批改平台
                </Title>
                <Text type="secondary">AI 赋能 · 无痛上手</Text>
              </Space>
            )}
          </Space>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[activeKey]}
            onClick={({ key }) => setActiveKey(key as NavKey)}
            style={{
              background: "transparent",
              padding: collapsed ? "0 12px" : "0 18px",
              border: "none",
            }}
            items={NAV_ITEMS.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
            }))}
          />
          <div className="app-sider-footer">
            <Tooltip title="随时反馈教学痛点，助力产品优化">
              <Button
                block
                type="text"
                icon={<CustomerServiceOutlined />}
                style={{
                  color: "#334155",
                  background: "rgba(15, 23, 42, 0.06)",
                  borderRadius: 14,
                }}
                onClick={handleFeedbackOpen}
              >
                {!collapsed && "反馈痛点"}
              </Button>
            </Tooltip>
          </div>
        </Sider>
        <Layout className="app-main">
          <Header className="app-header">
            <Space direction="vertical" size={6}>
              <Text type="secondary" style={{ letterSpacing: 1 }}>WELCOME</Text>
              <Title level={3} style={{ margin: 0 }}>
                {menuTitleMap[activeKey]}
              </Title>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                {menuDescriptionMap[activeKey]}
              </Paragraph>
            </Space>
            <Space size={12}>
              <Button type="text" onClick={() => setActiveKey("dashboard")}>回到工作台</Button>
              <Button type="primary" shape="round" onClick={() => setActiveKey("upload")}>立即批改</Button>
            </Space>
          </Header>
          <Content className="app-content">
            <div className="app-content-wrapper fade-in">{content}</div>
          </Content>
          <Footer className="app-footer">
            <Text type="secondary">
              © {new Date().getFullYear()} 智慧批改与学情平台 · Crafted for delightful teaching
            </Text>
          </Footer>
        </Layout>
      </Layout>
      <Modal
        title="反馈教学痛点"
        open={feedbackVisible}
        onCancel={handleFeedbackCancel}
        onOk={() => feedbackForm.submit()}
        okText="提交反馈"
        cancelText="取消"
        confirmLoading={feedbackSubmitting}
        destroyOnClose
      >
        <Form
          form={feedbackForm}
          layout="vertical"
          initialValues={{ is_anonymous: false }}
          onValuesChange={handleFeedbackValuesChange}
          onFinish={handleFeedbackFinish}
        >
          <Form.Item
            name="content"
            label="问题描述"
            rules={[{ required: true, message: "请填写问题描述" }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 6 }}
              placeholder="描述教学过程中遇到的痛点、影响以及期待的支持"
              maxLength={2000}
              showCount
            />
          </Form.Item>
          <Form.Item label="上传截图">
            <Upload {...feedbackUploadProps}>
              <Button icon={<UploadOutlined />}>添加图片</Button>
            </Upload>
            <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              支持 jpg/png/webp，最多 3 张，每张不超过 3MB。
            </Text>
          </Form.Item>
          <Form.Item name="is_anonymous" label="匿名提交" valuePropName="checked">
            <Switch checkedChildren="匿名" unCheckedChildren="实名" />
          </Form.Item>
          <Form.Item
            name="teacher_name"
            label="姓名"
            rules={[{ required: !feedbackAnonymous, message: "请输入姓名" }]}
          >
            <Input placeholder="请输入姓名" disabled={feedbackAnonymous} />
          </Form.Item>
          <Form.Item
            name="teacher_email"
            label="邮箱"
            rules={feedbackAnonymous ? [] : [{ type: "email", message: "请输入有效的邮箱地址" }]}
          >
            <Input placeholder="teacher@example.com" disabled={feedbackAnonymous} />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default App;

