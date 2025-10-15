import zhCN from "antd/locale/zh_CN";
import { ApiOutlined, MenuOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Button,
  ConfigProvider,
  Form,
  Input,
  Layout,
  Modal,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LlmConfigModal from "./components/LlmConfigModal";
import { fetchAssistantStatus, submitTeacherFeedback } from "./api/services";
import { NAVIGATE_EVENT } from "./utils/navigation";
import { WizardProvider } from "./grading-wizard/WizardProvider";
import DesktopNav from "./components/DesktopNav";
import MobileNav from "./components/MobileNav";
import useResponsive from "./hooks/useResponsive";
import type { NavItem, NavKey, NavComponent } from "./types/navigation";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const RosterSetup = lazy(() => import("./pages/RosterSetup"));
const UploadCenter = lazy(() => import("./pages/UploadCenter"));
const MistakeCenter = lazy(() => import("./pages/MistakeCenter"));
const PracticeCenter = lazy(() => import("./pages/PracticeCenter"));
const TeacherAssistant = lazy(() => import("./pages/TeacherAssistant"));
const AnalyticsCenter = lazy(() => import("./pages/AnalyticsCenter"));
const GradingWizard = lazy(() => import("./grading-wizard/GradingWizard"));

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "总览",
    subtitle: "班级动态与重点提醒",
    headerTitle: "教学总览",
    headerDescription: "快速了解班级进度、作业状态与核心提醒，掌握教学节奏。",
    path: "/dashboard",
  },
  {
    key: "roster",
    label: "班级管理",
    subtitle: "维护教师与学生档案",
    headerTitle: "班级与学生管理",
    headerDescription: "维护班级结构、学生信息与教师配置，保障教学顺畅运行。",
    path: "/roster",
  },
  {
    key: "upload",
    label: "试卷上传",
    subtitle: "拍照或导入试卷",
    headerTitle: "试卷上传与整理",
    headerDescription: "上传纸质试卷或扫描件，系统自动完成识别、切割与预处理。",
    path: "/upload",
  },
  {
    key: "mistake",
    label: "错题诊断",
    subtitle: "复盘薄弱知识点",
    headerTitle: "错题诊断中心",
    headerDescription: "查看错题归档、知识点标签与复盘建议，帮助学生及时巩固。",
    path: "/mistake",
  },
  {
    key: "practice",
    label: "练习中心",
    subtitle: "生成针对性练习",
    headerTitle: "练习任务中心",
    headerDescription: "基于错题与薄弱知识点自动生成练习，并追踪完成情况。",
    path: "/practice",
  },
  {
    key: "assistant",
    label: "智能助手",
    subtitle: "问答与批改建议",
    headerTitle: "智能教师助手",
    headerDescription: "即时沟通教学问题，获取批改建议与高质量沟通模版。",
    path: "/assistant",
  },
  {
    key: "analytics",
    label: "学习分析",
    subtitle: "班级画像与趋势",
    headerTitle: "学习数据分析",
    headerDescription: "掌握班级知识掌握度、成绩趋势与能力分布，为教学决策提供依据。",
    path: "/analytics",
  },
];


const ROUTE_COMPONENTS: Record<NavKey, NavComponent> = {
  dashboard: Dashboard,
  roster: RosterSetup,
  upload: UploadCenter,
  mistake: MistakeCenter,
  practice: PracticeCenter,
  assistant: TeacherAssistant,
  analytics: AnalyticsCenter,
};

const ROUTE_BY_KEY: Record<NavKey, string> = NAV_ITEMS.reduce((acc, item) => {
  acc[item.key] = item.path;
  return acc;
}, {} as Record<NavKey, string>);

const deriveActiveKey = (pathname: string): NavKey => {
  const matched = NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return matched?.key ?? "dashboard";
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
  const responsive = useResponsive();
  const isMobile = responsive.isMobile;
  const isTablet = responsive.isTablet;
  const isCompactLayout = isMobile || isTablet;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackFiles, setFeedbackFiles] = useState<UploadFile[]>([]);
  const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);
  const [feedbackForm] = Form.useForm<FeedbackFormValues>();
  const [llmConfigVisible, setLlmConfigVisible] = useState(false);
  const [llmStatus, setLlmStatus] = useState<"unknown" | "available" | "unavailable">("unknown");

  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = useMemo(() => deriveActiveKey(location.pathname), [location.pathname]);
  const activeNavItem = useMemo(
    () => NAV_ITEMS.find((item) => item.key === activeKey) ?? NAV_ITEMS[0],
    [activeKey],
  );
  const isWizardRoute = location.pathname.startsWith("/grading/wizard");
  const lastCompactRef = useRef(isCompactLayout);
  const suspenseFallback = useMemo(
    () => (
      <div className="app-suspense" role="status" aria-live="polite">
        <Spin size="large" tip="Loading..." />
      </div>
    ),
    [],
  );

  useEffect(() => {
    const wasCompact = lastCompactRef.current;
    if (isCompactLayout && !wasCompact) {
      setCollapsed(true);
    }
    if (!isCompactLayout && wasCompact) {
      setCollapsed(false);
    }
    lastCompactRef.current = isCompactLayout;
  }, [isCompactLayout]);

  const handleNavigate = useCallback(
    (key: NavKey) => {
      const target = ROUTE_BY_KEY[key];
      if (!target) {
        return;
      }
      if (location.pathname !== target) {
        navigate(target);
      }
    },
    [navigate, location.pathname],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<NavKey>;
      if (custom.detail) {
        handleNavigate(custom.detail);
      }
    };
    window.addEventListener(NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(NAVIGATE_EVENT, handler);
  }, [handleNavigate]);

  useEffect(() => {
    if (mobileNavOpen && !isCompactLayout) {
      setMobileNavOpen(false);
    }
  }, [mobileNavOpen, isCompactLayout]);

  useEffect(() => {
    if (mobileNavOpen) {
      setMobileNavOpen(false);
    }
  }, [location.pathname]);

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
    } catch {
      feedbackForm.setFieldsValue({ content: "", is_anonymous: false });
      setFeedbackAnonymous(false);
    }
  }, [feedbackForm]);

  useEffect(() => {
    applyStoredFeedbackProfile();
  }, [applyStoredFeedbackProfile]);

  useEffect(() => {
    const loadAssistantStatus = async () => {
      try {
        const { available } = await fetchAssistantStatus();
        setLlmStatus(available ? "available" : "unavailable");
      } catch (error) {
        console.error(error);
        setLlmStatus("unavailable");
      }
    };
    void loadAssistantStatus();
  }, []);

  const feedbackUploadProps: UploadProps = useMemo(
    () => ({
      multiple: true,
      maxCount: 3,
      accept: ".png,.jpg,.jpeg,.webp",
      fileList: feedbackFiles,
      beforeUpload: (file) => {
        if (!ALLOWED_FEEDBACK_TYPES.includes(file.type)) {
          message.error("Only JPG/PNG/WebP images are supported");
          return Upload.LIST_IGNORE;
        }
        if (file.size > MAX_FEEDBACK_FILE_SIZE) {
          message.error("Each image must be smaller than 3MB");
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
      message.warning("请填写反馈内容");
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
      message.success(`感谢反馈，我们已收到编号 #${response.id}`);
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

  if (isWizardRoute) {
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
        <Suspense fallback={suspenseFallback}>
          <WizardProvider>
            <GradingWizard />
          </WizardProvider>
        </Suspense>
      </ConfigProvider>
    );
  }

  const layoutClassName = isMobile
    ? "app-shell app-shell--mobile"
    : isTablet
      ? "app-shell app-shell--tablet"
      : "app-shell app-shell--desktop";
  const mainClassName = isCompactLayout ? "app-main app-main--compact" : "app-main";
  const headerClassName = isCompactLayout ? "app-header app-header--compact" : "app-header";
  const contentClassName = isCompactLayout ? "app-content app-content--compact" : "app-content";
  const footerClassName = isCompactLayout ? "app-footer app-footer--compact" : "app-footer";

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
          Button: {
            borderRadius: 12,
          },
        },
      }}
    >
      <Layout className={layoutClassName}>
        {!isCompactLayout && (
          <DesktopNav
            collapsed={collapsed}
            onCollapse={setCollapsed}
            activeKey={activeKey}
            navItems={NAV_ITEMS}
            onNavigate={handleNavigate}
            onFeedbackClick={handleFeedbackOpen}
          />
        )}
        <Layout className={mainClassName}>
          <Header className={headerClassName}>
            <div className="app-header-leading">
              {isCompactLayout && (
                <Button
                  className="app-header-trigger"
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation menu"
                />
              )}
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ letterSpacing: isCompactLayout ? 0 : 1 }}>
                  {isCompactLayout ? "Welcome back" : "WELCOME"}
                </Text>
                <Title level={isCompactLayout ? 4 : 3} style={{ margin: 0 }}>
                  {activeNavItem.headerTitle}
                </Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  {activeNavItem.headerDescription}
                </Paragraph>
              </Space>
            </div>
            <Space size={isCompactLayout ? 8 : 12} align="center">
              {llmStatus !== "unknown" && (
                <Tag color={llmStatus === "available" ? "success" : "warning"}>
                  {llmStatus === "available" ? "接口可用" : "待配置接口"}
                </Tag>
              )}
              <Button
                icon={<ApiOutlined />}
                onClick={() => setLlmConfigVisible(true)}
                type={isCompactLayout ? "text" : "default"}
                shape={isCompactLayout ? "circle" : undefined}
                size={isCompactLayout ? "large" : "middle"}
                aria-label="Configure API"
              >
                {!isCompactLayout && "Configure API"}
              </Button>
              {!isCompactLayout && (
                <Button type="text" onClick={() => handleNavigate("dashboard")}>
                  返回总览
                </Button>
              )}
              <Button
                type="primary"
                shape="round"
                size={isCompactLayout ? "middle" : "large"}
                onClick={() => handleNavigate("upload")}
              >
                {isCompactLayout ? "上传试卷" : "开始上传"}
              </Button>
            </Space>
          </Header>
          <Content className={contentClassName}>
            <div className="app-content-wrapper fade-in">
              <Suspense fallback={suspenseFallback}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  {NAV_ITEMS.map((item) => {
                    const Component = ROUTE_COMPONENTS[item.key];
                    return <Route key={item.key} path={item.path} element={<Component />} />;
                  })}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </div>
          </Content>
          <Footer className={footerClassName}>
            <Text type="secondary">(c) {new Date().getFullYear()} 智慧教研平台 · 专为愉悦教学打造</Text>
          </Footer>
        </Layout>
        {isCompactLayout && (
          <MobileNav
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            activeKey={activeKey}
            navItems={NAV_ITEMS}
            onNavigate={handleNavigate}
            onFeedbackClick={handleFeedbackOpen}
          />
        )}
      </Layout>

      <LlmConfigModal
        open={llmConfigVisible}
        onClose={() => setLlmConfigVisible(false)}
        onUpdated={(status) => {
          setLlmStatus(status.available ? "available" : "unavailable");
        }}
      />

      <Modal
        title="教师使用反馈"
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
          <Form.Item name="content" label="反馈内容" rules={[{ required: true, message: "请填写反馈内容" }]}>
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 6 }}
              placeholder="请描述课堂使用体验、需求或遇到的问题"
              maxLength={2000}
              showCount
            />
          </Form.Item>
          <Form.Item label="上传截图">
            <Upload {...feedbackUploadProps}>
              <Button icon={<UploadOutlined />}>添加图片</Button>
            </Upload>
            <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              支持 jpg/png/webp 格式，最多 3 张图片，每张不超过 3MB。
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


