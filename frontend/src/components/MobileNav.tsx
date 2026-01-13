import {
  CustomerServiceOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Badge, Button, Drawer, FloatButton, Space, Typography, Collapse } from "antd";
import type { NavKey, NavModule } from "../types/navigation";

const ICON_STYLE = { fontSize: 20 };

export type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  activeKey: NavKey;
  modules: NavModule[];
  onNavigate: (key: NavKey) => void;
  onFeedbackClick: () => void;
};

const MobileNav = ({ open, onClose, activeKey, modules, onNavigate, onFeedbackClick }: MobileNavProps) => {
  // Use Dashboard module's items for quick access if available
  const dashboardModule = modules.find(m => m.key === "dashboard");
  const quickItems = dashboardModule ? dashboardModule.items : [];

  const handleNavigate = (key: NavKey) => {
    onNavigate(key);
    onClose();
  };

  return (
    <>
      <FloatButton.Group shape="circle" style={{ right: 20, bottom: 20 }} icon={<HomeOutlined />} aria-label="快捷导航">
        {quickItems.map((item) => (
          <FloatButton
            key={item.key}
            tooltip={item.label}
            // Need to map icons somehow if they are not in item definition or fallback
            // In new structure, items don't have icons explicitly in the definition in ModuleLayout unless added?
            // Wait, in ModuleLayout.tsx I didn't add icons to sub-items, only to modules.
            // Let's just use the module icon or a default.
            // Actually, for mobile float button, maybe just showing "Feedback" and "Dashboard" is enough?
            // Or let's just show the first item of each module?
            // Let's stick to Feedback for now to keep it simple as quickItems might not have icons.
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
        bodyStyle={{ padding: "0" }}
        headerStyle={{ borderBottom: "none", padding: "24px 16px 12px" }}
        title={
          <Space direction="vertical" size={4}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              智慧教研平台
            </Typography.Title>
            <Typography.Text type="secondary">触手可及的课堂助手</Typography.Text>
          </Space>
        }
      >
        <div style={{ padding: "0 16px 24px" }}>
          <Collapse
            ghost
            accordion
            defaultActiveKey={modules.find(m => m.items.some(i => i.key === activeKey))?.key}
            items={modules.map(module => ({
              key: module.key,
              label: (
                <Space>
                  {module.icon}
                  <Typography.Text strong>{module.label}</Typography.Text>
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                   {module.items.map(item => (
                     <Button
                       key={item.key}
                       type={activeKey === item.key ? "primary" : "text"}
                       block
                       style={{ justifyContent: 'flex-start', paddingLeft: 32 }}
                       onClick={() => handleNavigate(item.key)}
                     >
                       <Space direction="vertical" size={0} align="start">
                         <Typography.Text style={{ color: activeKey === item.key ? 'inherit' : undefined }}>{item.label}</Typography.Text>
                         <Typography.Text type="secondary" style={{ fontSize: 11, color: activeKey === item.key ? 'rgba(255,255,255,0.8)' : undefined }}>{item.subtitle}</Typography.Text>
                       </Space>
                     </Button>
                   ))}
                </Space>
              )
            }))}
          />
        </div>

        <div style={{ padding: "0 16px 24px" }}>
          <Button block type="default" size="large" onClick={onFeedbackClick} icon={<CustomerServiceOutlined />}>
            提交反馈
          </Button>
        </div>
      </Drawer>
    </>
  );
};

export default MobileNav;
