import zhCN from "antd/locale/zh_CN";
import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  ConfigProvider,
  Layout,
  Menu,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import AnalyticsCenter from "./pages/AnalyticsCenter";
import Dashboard from "./pages/Dashboard";
import MistakeCenter from "./pages/MistakeCenter";
import PracticeCenter from "./pages/PracticeCenter";
import RosterSetup from "./pages/RosterSetup";
import UploadCenter from "./pages/UploadCenter";
import { NAVIGATE_EVENT } from "./utils/navigation";

const { Header, Sider, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

type NavKey = "dashboard" | "roster" | "upload" | "mistake" | "practice" | "analytics";

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "工作台", icon: <HomeOutlined /> },
  { key: "roster", label: "班级搭建", icon: <ApartmentOutlined /> },
  { key: "upload", label: "上传批改", icon: <CloudUploadOutlined /> },
  { key: "mistake", label: "错题智库", icon: <BookOutlined /> },
  { key: "practice", label: "练习派送", icon: <CheckCircleOutlined /> },
  { key: "analytics", label: "学情洞察", icon: <BarChartOutlined /> },
];

const menuTitleMap: Record<NavKey, string> = {
  dashboard: "全局工作台",
  roster: "搭建教学班级",
  upload: "上传试卷 · 极速批改",
  mistake: "错题诊断与修复",
  practice: "智能练习分发",
  analytics: "班级学情雷达",
};

const menuDescriptionMap: Record<NavKey, string> = {
  dashboard: "一屏掌握批改节奏、错题热点与练习派送，教学决策更从容。",
  roster: "按步骤录入教师、班级、学生与试卷结构，数据一次输入即可长期复用。",
  upload: "拖拽或拍照即可上传纸质试卷，AI 自动识别题号与批注，几分钟完成批改。",
  mistake: "错题自动归档并生成知识点标签，帮助学生随时复盘与巩固。",
  practice: "根据错题记录生成个性化练习卷，实时掌握派送与完成状态。",
  analytics: "知识点热力、分数走势、错误分布全面呈现，为下一堂课提供依据。",
};

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>("dashboard");

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
            siderBg: "#0f172a",
          },
        },
      }}
    >
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={232}
          style={{
            background: "linear-gradient(180deg, #0f172a 0%, #111c3c 100%)",
            borderRight: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Space
            align="center"
            style={{
              height: 96,
              width: "100%",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? 0 : "28px 20px 12px",
            }}
          >
            <Avatar size={collapsed ? 42 : 50} src="/logo.svg" />
            {!collapsed && (
              <div>
                <Title level={5} style={{ color: "#ffffff", marginBottom: 6 }}>
                  智慧批改平台
                </Title>
                <Text style={{ color: "#cbd5f5" }}>AI 赋能 · 无痛上手</Text>
              </div>
            )}
          </Space>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeKey]}
            onClick={({ key }) => setActiveKey(key as NavKey)}
            style={{ background: "transparent", padding: collapsed ? "0 8px" : "0 16px" }}
            items={NAV_ITEMS.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
            }))}
          />
          <div style={{ padding: collapsed ? 12 : 20 }}>
            <Tooltip title="7×24 小时支持，实时响应需求">
              <Button
                block
                type="text"
                icon={<CustomerServiceOutlined />}
                style={{
                  color: "#cbd5f5",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 14,
                }}
              >
                {!collapsed && "联系顾问"}
              </Button>
            </Tooltip>
          </div>
        </Sider>
        <Layout>
          <Header
            style={{
              background: "transparent",
              padding: "28px 32px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <Space direction="vertical" size={4}>
              <Title level={3} style={{ margin: 0 }}>
                {menuTitleMap[activeKey]}
              </Title>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                {menuDescriptionMap[activeKey]}
              </Paragraph>
            </Space>
            <Space size={12}>
              <Button onClick={() => setActiveKey("dashboard")}>回到工作台</Button>
              <Button type="primary" onClick={() => setActiveKey("upload")}>立即批改</Button>
            </Space>
          </Header>
          <Content style={{ margin: "20px 32px 32px" }}>{content}</Content>
          <Footer style={{ textAlign: "center", color: "#64748b" }}>
            © {new Date().getFullYear()} 智慧批改与学情平台 · Designed for effortless teaching
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
