/**
 * 桌面端侧边导航 - 世界顶级设计 v3.0
 * 
 * 设计灵感:
 * - Linear: 精致的品牌标识与层级结构
 * - Notion: 优雅的折叠动画与交互反馈
 * - Vercel: 极简的视觉语言
 * - Shape of AI: 模块化与功能主义
 */

import { useState } from "react";
import {
  BulbOutlined,
  CustomerServiceOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Space, Typography, Tooltip, Input } from "antd";
import type { MenuProps } from "antd";
import type { NavModule, NavKey } from "../types/navigation";
import { colors, shadows, radii, transitions, typography } from "../styles/theme";

const { Sider } = Layout;
const { Text } = Typography;

export type DesktopNavProps = {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeKey: NavKey;
  modules: NavModule[];
  onNavigate: (key: NavKey) => void;
  onFeedbackClick: () => void;
};

const DesktopNav = ({ 
  collapsed, 
  onCollapse, 
  activeKey, 
  modules, 
  onNavigate, 
  onFeedbackClick 
}: DesktopNavProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // 确定当前激活的模块
  const activeModuleKey = modules.find(m => 
    m.items.some(item => item.key === activeKey)
  )?.key || modules[0].key;

  const menuItems: MenuProps["items"] = modules.map((module) => ({
    key: module.key,
    icon: module.icon,
    label: module.label,
  }));

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const module = modules.find(m => m.key === key);
    if (module && module.items.length > 0) {
      onNavigate(module.items[0].key);
    }
  };

  return (
    <Sider
      className={`app-sider ${collapsed ? 'collapsed' : ''}`}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      width={260}
      collapsedWidth={72}
      theme="light"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        background: colors.background.elevated,
        borderRight: `1px solid ${colors.border.subtle}`,
        transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
        overflow: 'hidden',
      }}
    >
      {/* 品牌区域 */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: `1px solid ${colors.border.subtle}`,
          transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          overflow: 'hidden',
        }}>
          {/* Logo - 带有呼吸光效 */}
          <div 
            className="animate-breathe"
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: radii.lg,
              background: colors.gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 16px ${colors.primaryGlow}`,
              transition: `transform ${transitions.duration.normal} ${transitions.easing.bounce}`,
            }}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          
          {/* 品牌名称 - 带有渐变文字效果 */}
          {!collapsed && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              opacity: collapsed ? 0 : 1,
              transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
              transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
            }}>
              <Text style={{ 
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                letterSpacing: typography.letterSpacing.tight,
                lineHeight: typography.lineHeight.tight,
                whiteSpace: 'nowrap',
              }}>
                智慧教研
              </Text>
              <Text style={{ 
                fontSize: typography.fontSize.xs, 
                color: colors.text.tertiary,
                letterSpacing: typography.letterSpacing.wide,
                textTransform: 'uppercase',
                fontWeight: typography.fontWeight.medium,
                whiteSpace: 'nowrap',
              }}>
                EduTech Platform
              </Text>
            </div>
          )}
        </div>

        {/* 折叠按钮 - 带有悬停效果 */}
        {!collapsed && (
          <Tooltip title="收起侧边栏" placement="right">
            <Button
              type="text"
              size="small"
              icon={<DoubleLeftOutlined style={{ fontSize: 12 }} />}
              onClick={() => onCollapse(true)}
              style={{
                width: 28,
                height: 28,
                color: colors.text.tertiary,
                borderRadius: radii.sm,
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateX(0)' : 'translateX(8px)',
                transition: `all ${transitions.duration.fast} ${transitions.easing.out}`,
              }}
            />
          </Tooltip>
        )}
      </div>

      {/* 搜索框 - 仅在展开时显示 */}
      {!collapsed && (
        <div style={{ 
          padding: '12px 16px',
          opacity: collapsed ? 0 : 1,
          transition: `opacity ${transitions.duration.normal} ${transitions.easing.out}`,
        }}>
          <Input
            placeholder="搜索功能..."
            prefix={<SearchOutlined style={{ color: colors.text.tertiary }} />}
            style={{
              background: colors.background.muted,
              border: 'none',
              borderRadius: radii.md,
              height: 36,
            }}
          />
        </div>
      )}

      {/* 导航菜单 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: '8px 0',
      }}>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[activeModuleKey]}
          onClick={handleMenuClick}
          style={{
            background: "transparent",
            border: "none",
            padding: collapsed ? "0 12px" : "0 12px",
          }}
          items={menuItems}
        />
      </div>

      {/* 底部区域 */}
      <div style={{ 
        padding: collapsed ? '16px 12px' : '16px',
        borderTop: `1px solid ${colors.border.subtle}`,
      }}>
        {!collapsed ? (
          <div 
            className="card-glow"
            style={{ 
              padding: 16,
              background: `linear-gradient(135deg, ${colors.primarySoft} 0%, ${colors.infoSoft} 100%)`,
              borderRadius: radii.xl,
              border: `1px solid ${colors.border.subtle}`,
              transition: `all ${transitions.duration.normal} ${transitions.easing.out}`,
            }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space size={10}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.lg,
                  background: colors.gradients.warm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                }}>
                  <BulbOutlined style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <div>
                  <Text strong style={{ 
                    fontSize: typography.fontSize.sm, 
                    color: colors.text.primary,
                    display: 'block',
                    lineHeight: typography.lineHeight.tight,
                  }}>
                    需要帮助？
                  </Text>
                  <Text style={{ 
                    fontSize: typography.fontSize.xs, 
                    color: colors.text.secondary,
                  }}>
                    我们随时为您服务
                  </Text>
                </div>
              </Space>
              <Button 
                type="primary" 
                block 
                size="small"
                onClick={onFeedbackClick}
                className="btn-ripple"
                style={{ 
                  height: 36,
                  borderRadius: radii.md,
                  fontWeight: typography.fontWeight.medium,
                  background: colors.gradients.primary,
                  border: 'none',
                  boxShadow: `0 4px 12px ${colors.primaryGlow}`,
                }}
              >
                提交反馈
              </Button>
            </Space>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 8,
          }}>
            <Tooltip title="提交反馈" placement="right">
              <Button 
                type="text" 
                icon={<CustomerServiceOutlined />} 
                onClick={onFeedbackClick}
                style={{ 
                  color: colors.text.secondary,
                  width: 40,
                  height: 40,
                  borderRadius: radii.lg,
                  transition: `all ${transitions.duration.fast} ${transitions.easing.out}`,
                }}
              />
            </Tooltip>
            <Tooltip title="展开侧边栏" placement="right">
              <Button 
                type="text" 
                icon={<DoubleRightOutlined style={{ fontSize: 12 }} />} 
                onClick={() => onCollapse(false)}
                style={{ 
                  color: colors.text.tertiary,
                  width: 40,
                  height: 40,
                  borderRadius: radii.lg,
                  transition: `all ${transitions.duration.fast} ${transitions.easing.out}`,
                }}
              />
            </Tooltip>
          </div>
        )}
      </div>
    </Sider>
  );
};

export default DesktopNav;
