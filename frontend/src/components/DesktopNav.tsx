import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Space, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import type { ReactNode } from "react";
import type { NavItem, NavKey } from "../types/navigation";

const { Sider } = Layout;
const { Title, Text } = Typography;

export type DesktopNavProps = {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeKey: NavKey;
  navItems: NavItem[];
  onNavigate: (key: NavKey) => void;
  onFeedbackClick: () => void;
};

const iconMap: Record<NavKey, ReactNode> = {
  dashboard: <HomeOutlined />,
  roster: <ApartmentOutlined />,
  upload: <CloudUploadOutlined />,
  mistake: <BookOutlined />,
  practice: <CheckCircleOutlined />,
  analytics: <BarChartOutlined />,
  assistant: <CustomerServiceOutlined />,
};

const DesktopNav = ({ collapsed, onCollapse, activeKey, navItems, onNavigate, onFeedbackClick }: DesktopNavProps) => {
  const menuItems: MenuProps["items"] = navItems.map((item) => ({
    key: item.key,
    icon: iconMap[item.key],
    label: item.label,
  }));

  return (
    <Sider
      className="app-sider"
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={232}
      collapsedWidth={72}
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
        <img src="/logo.svg" alt="智慧教研平台 Logo" style={{ width: collapsed ? 44 : 52, height: collapsed ? 44 : 52 }} />
        {!collapsed && (
          <Space direction="vertical" size={4}>
            <Title level={5} style={{ color: "#0f172a", margin: 0 }}>
              智慧教研平台
            </Title>
            <Text type="secondary">智能批改 · 诊断提升</Text>
          </Space>
        )}
      </Space>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[activeKey]}
        onClick={({ key }) => onNavigate(key as NavKey)}
        style={{
          background: "transparent",
          padding: collapsed ? "0 12px" : "0 18px",
          border: "none",
        }}
        items={menuItems}
      />
      <div className="app-sider-footer">
        <Tooltip title="随时反馈教学场景，帮助我们持续优化产品体验">
          <Button
            block
            type="text"
            icon={<CustomerServiceOutlined />}
            style={{
              color: "#334155",
              background: "rgba(15, 23, 42, 0.06)",
              borderRadius: 14,
            }}
            onClick={onFeedbackClick}
          >
            {!collapsed && "提交反馈"}
          </Button>
        </Tooltip>
      </div>
    </Sider>
  );
};

export default DesktopNav;
