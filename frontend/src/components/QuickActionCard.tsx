import { ArrowRightOutlined } from "@ant-design/icons";
import { Card, Space, Typography } from "antd";
import type { ReactNode } from "react";

interface QuickActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onClick?: () => void;
}

const QuickActionCard = ({ icon, title, description, actionLabel = "立即前往", onClick }: QuickActionCardProps) => {
  return (
    <Card
      className="quick-action-card"
      hoverable
      bordered={false}
      onClick={onClick}
      bodyStyle={{ padding: 20 }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div className="quick-action-icon">{icon}</div>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ minHeight: 44 }}>
          {description}
        </Typography.Paragraph>
        <Typography.Link onClick={onClick}>
          {actionLabel} <ArrowRightOutlined />
        </Typography.Link>
      </Space>
    </Card>
  );
};

export default QuickActionCard;
