import { Button, Result } from "antd";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  extra?: ReactNode;
}

const EmptyState = ({ title, description, actionLabel = "立即创建", onAction, extra }: EmptyStateProps) => {
  return (
    <Result
      icon={extra ?? undefined}
      title={title}
      subTitle={description}
      extra={
        onAction && (
          <Button type="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      }
    />
  );
};

export default EmptyState;
