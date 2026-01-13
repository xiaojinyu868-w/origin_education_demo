/**
 * 模块布局组件 - 世界顶级设计 v3.0
 * 
 * 设计灵感:
 * - Shape of AI: 结构化导航与模块化布局
 * - Linear: 优雅的标签页与内容过渡
 * - Stripe: 精致的页面头部设计
 */

import {
  ApartmentOutlined,
  BookOutlined,
  HomeOutlined,
  ToolOutlined,
  RobotOutlined,
  FileTextOutlined,
  StarOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Layout, Tabs, Typography, Breadcrumb } from "antd";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import type { NavModule } from "../types/navigation";
import { colors, radii, typography, shadows, transitions } from "../styles/theme";

const { Content } = Layout;
const { Title, Text } = Typography;

export const MODULES: NavModule[] = [
  {
    key: "dashboard",
    label: "工作台",
    icon: <HomeOutlined />,
    path: "/dashboard",
    items: [
      {
        key: "dashboard",
        label: "总览",
        subtitle: "班级动态与重点提醒",
        headerTitle: "教学总览",
        headerDescription: "快速了解班级进度、作业状态与核心提醒。",
        path: "/dashboard",
      },
    ],
  },
  {
    key: "class",
    label: "班级管理",
    icon: <ApartmentOutlined />,
    path: "/class",
    items: [
      {
        key: "roster",
        label: "花名册",
        subtitle: "维护教师与学生档案",
        headerTitle: "班级与学生管理",
        headerDescription: "维护班级结构、学生信息与教师配置。",
        path: "/class/roster",
      },
      {
        key: "analytics",
        label: "学情分析",
        subtitle: "班级画像与趋势",
        headerTitle: "学习数据分析",
        headerDescription: "掌握班级知识掌握度、成绩趋势与能力分布。",
        path: "/class/analytics",
      },
    ],
  },
  {
    key: "library",
    label: "智慧题库",
    icon: <BookOutlined />,
    path: "/library",
    items: [
      {
        key: "upload",
        label: "试卷上传",
        subtitle: "拍照或导入试卷",
        headerTitle: "试卷上传与整理",
        headerDescription: "上传纸质试卷或扫描件，系统自动完成识别。",
        path: "/library/upload",
      },
      {
        key: "mistake",
        label: "错题本",
        subtitle: "复盘薄弱知识点",
        headerTitle: "错题诊断中心",
        headerDescription: "查看错题归档、知识点标签与复盘建议。",
        path: "/library/mistake",
      },
      {
        key: "note",
        label: "错题笔记",
        subtitle: "AI引导解题思路",
        headerTitle: "错题笔记",
        headerDescription: "上传错题，AI引导你梳理解题思路。",
        path: "/library/note",
      },
    ],
  },
  {
    key: "toolkit",
    label: "工具箱",
    icon: <ToolOutlined />,
    path: "/toolkit",
    items: [
      {
        key: "practice",
        label: "练习生成",
        subtitle: "生成针对性练习",
        headerTitle: "练习任务中心",
        headerDescription: "基于错题与薄弱知识点自动生成练习。",
        path: "/toolkit/practice",
      },
      {
        key: "assistant",
        label: "智能助教",
        subtitle: "问答与批改建议",
        headerTitle: "智能教师助手",
        headerDescription: "即时沟通教学问题，获取批改建议。",
        path: "/toolkit/assistant",
      },
      {
        key: "tutor",
        label: "AI 家教",
        subtitle: "智能对话辅导",
        headerTitle: "AI 家教",
        headerDescription: "智能对话助手，帮助解答学习困惑。",
        path: "/toolkit/tutor",
      },
      {
        key: "models",
        label: "模型设置",
        subtitle: "配置 AI 模型",
        headerTitle: "模型设置",
        headerDescription: "选择和配置 AI 模型，支持多模型切换。",
        path: "/toolkit/models",
      },
      {
        key: "summary",
        label: "课堂摘要",
        subtitle: "自动生成摘要",
        headerTitle: "课堂摘要",
        headerDescription: "自动生成课堂内容摘要和关键知识点。",
        path: "/toolkit/summary",
      },
      {
        key: "clips",
        label: "精选片段",
        subtitle: "课堂精华内容",
        headerTitle: "精选片段",
        headerDescription: "课堂精华内容，随时回顾学习。",
        path: "/toolkit/clips",
      },
    ],
  },
];

const ModuleLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 查找当前模块
  const currentModule = MODULES.find(
    (m) => location.pathname === m.path || location.pathname.startsWith(`${m.path}/`)
  ) || MODULES[0];

  // 查找当前激活项
  const currentItem = currentModule.items.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  ) || currentModule.items[0];

  const handleTabChange = (key: string) => {
    const targetItem = currentModule.items.find((item) => item.key === key);
    if (targetItem) {
      navigate(targetItem.path);
    }
  };

  // Dashboard 有自己的 Hero Section
  const isDashboard = currentModule.key === "dashboard";
  const showTabs = currentModule.items.length > 1;

  return (
    <Layout style={{ height: "100%", background: "transparent" }}>
      {/* 页面头部 - 面包屑 + 标题 */}
      {!isDashboard && (
        <div 
          className="page-header animate-fade-in-up"
          style={{ marginBottom: 24 }}
        >
          {/* 面包屑导航 */}
          <Breadcrumb
            separator={<RightOutlined style={{ fontSize: 10, color: colors.text.muted }} />}
            style={{ marginBottom: 12 }}
            items={[
              {
                title: (
                  <Link 
                    to="/dashboard" 
                    style={{ 
                      color: colors.text.tertiary,
                      fontSize: typography.fontSize.sm,
                      transition: `color ${transitions.duration.fast} ${transitions.easing.out}`,
                    }}
                  >
                    首页
                  </Link>
                ),
              },
              {
                title: (
                  <span style={{ 
                    color: colors.text.tertiary,
                    fontSize: typography.fontSize.sm,
                  }}>
                    {currentModule.label}
                  </span>
                ),
              },
              {
                title: (
                  <span style={{ 
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    {currentItem.label}
                  </span>
                ),
              },
            ]}
          />
          
          {/* 页面标题 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <Title 
                level={3} 
                style={{ 
                  margin: 0, 
                  marginBottom: 6,
                  fontWeight: typography.fontWeight.bold,
                  letterSpacing: typography.letterSpacing.tight,
                  color: colors.text.primary,
                  fontSize: typography.fontSize["3xl"],
                }}
              >
                {currentItem.headerTitle}
              </Title>
              <Text style={{ 
                color: colors.text.secondary,
                fontSize: typography.fontSize.md,
                lineHeight: typography.lineHeight.relaxed,
              }}>
                {currentItem.headerDescription}
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* 标签页导航 - 仅在有多个子项时显示 */}
      {showTabs && (
        <div 
          className="animate-fade-in stagger-1"
          style={{ marginBottom: 24 }}
        >
          <Tabs
            activeKey={currentItem.key}
            onChange={handleTabChange}
            items={currentModule.items.map((item, index) => ({
              key: item.key,
              label: (
                <span 
                  className={`stagger-${index + 1}`}
                  style={{ 
                    fontWeight: typography.fontWeight.medium,
                    fontSize: typography.fontSize.base,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {item.label}
                  {item.key === 'tutor' && (
                    <span style={{
                      padding: '2px 6px',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.semibold,
                      background: colors.gradients.primary,
                      color: colors.text.inverse,
                      borderRadius: radii.sm,
                      lineHeight: 1,
                    }}>
                      AI
                    </span>
                  )}
                </span>
              ),
            }))}
            style={{
              marginBottom: 0,
            }}
            tabBarStyle={{
              marginBottom: 0,
              borderBottom: `1px solid ${colors.border.subtle}`,
              paddingLeft: 0,
            }}
          />
        </div>
      )}
      
      {/* 内容区域 */}
      <Content
        className="animate-fade-in-up stagger-2"
        style={{
          background: colors.background.elevated,
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.card,
          padding: 28,
          minHeight: 400,
          overflow: "auto",
          transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
        }}
      >
        {/* 子路由出口 */}
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};

export default ModuleLayout;
