import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Badge, Button, Drawer, FloatButton, Space, Typography } from "antd";
import type { ReactNode } from "react";
import type { NavKey, NavItem } from "../types/navigation";

const ICON_STYLE = { fontSize: 20 };

const iconMap: Record<NavKey, ReactNode> = {
  dashboard: <HomeOutlined style={ICON_STYLE} />,
  roster: <ApartmentOutlined style={ICON_STYLE} />,
  upload: <CloudUploadOutlined style={ICON_STYLE} />,
  mistake: <BookOutlined style={ICON_STYLE} />,
  practice: <CheckCircleOutlined style={ICON_STYLE} />,
  analytics: <BarChartOutlined style={ICON_STYLE} />,
  assistant: <CustomerServiceOutlined style={ICON_STYLE} />,
};

export type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  activeKey: NavKey;
  navItems: NavItem[];
  onNavigate: (key: NavKey) => void;
  onFeedbackClick: () => void;
};

const MobileNav = ({ open, onClose, activeKey, navItems, onNavigate, onFeedbackClick }: MobileNavProps) => {
  const primaryItems = navItems.slice(0, 4);

  const handleNavigate = (key: NavKey) => {
    onNavigate(key);
    onClose();
  };

  return (
    <>
      <FloatButton.Group shape="circle" style={{ right: 20, bottom: 20 }} icon={<HomeOutlined />} aria-label="快捷导航">
        {primaryItems.map((item) => (
          <FloatButton
            key={item.key}
            tooltip={item.label}
            icon={iconMap[item.key]}
            type={activeKey === item.key ? "primary" : "default"}
            onClick={() => handleNavigate(item.key)}
            aria-label={item.label}
          />
        ))}
        <FloatButton
          tooltip="提交反馈"
          icon={<CustomerServiceOutlined style={ICON_STYLE} />}
          onClick={onFeedbackClick}
          aria-label="提交反馈"
        />
      </FloatButton.Group>

      <Drawer
        open={open}
        placement="left"
        onClose={onClose}
        width="80%"
        bodyStyle={{ padding: "24px 16px 32px" }}
        headerStyle={{ borderBottom: "none" }}
        title={
          <Space direction="vertical" size={4}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              智慧教研平台
            </Typography.Title>
            <Typography.Text type="secondary">触手可及的课堂助手</Typography.Text>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {navItems.map((item) => {
            const selected = activeKey === item.key;
            const isPrimary = primaryItems.some((primary) => primary.key === item.key);
            return (
              <Button
                key={item.key}
                type={selected ? "primary" : "text"}
                onClick={() => handleNavigate(item.key)}
                block
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                }}
                icon={
                  isPrimary ? (
                    iconMap[item.key]
                  ) : (
                    <Badge dot={item.key === "assistant"}>{iconMap[item.key]}</Badge>
                  )
                }
              >
                <Space direction="vertical" size={2} style={{ alignItems: "flex-start" }}>
                  <Typography.Text strong>{item.label}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.subtitle}
                  </Typography.Text>
                </Space>
              </Button>
            );
          })}
        </Space>

        <div style={{ marginTop: 24 }}>
          <Button block type="default" size="large" onClick={onFeedbackClick}>
            提交反馈
          </Button>
        </div>
      </Drawer>
    </>
  );
};

export default MobileNav;
