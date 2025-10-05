import { Card, Space, Typography } from "antd";
import type { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  description?: string;
  extra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const PageLayout = ({ title, subtitle, description, extra, footer, children }: PageLayoutProps) => {
  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card
        bordered={false}
        className="shadow-panel"
        title={
          <div>
            <Typography.Title level={3} style={{ marginBottom: 8 }}>
              {title}
            </Typography.Title>
            {subtitle && (
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                {subtitle}
              </Typography.Text>
            )}
            {description && (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {description}
              </Typography.Paragraph>
            )}
          </div>
        }
        extra={extra}
        headStyle={{ borderBottom: "none" }}
        bodyStyle={{ paddingTop: 0 }}
      >
        {children}
      </Card>
      {footer}
    </Space>
  );
};

export default PageLayout;
