/**
 * Sidebar - 侧边导航组件
 * 
 * 智慧教研平台主导航
 * 玻璃态设计，支持折叠展开
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeOutlined,
  TeamOutlined,
  BookOutlined,
  ToolOutlined,
  BarChartOutlined,
  FileTextOutlined,
  BulbOutlined,
  RobotOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  FormOutlined,
  VideoCameraOutlined,
  ScissorOutlined,
} from '@ant-design/icons';

// ============================================
// 类型定义
// ============================================

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
}

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

// ============================================
// 导航配置
// ============================================

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: <HomeOutlined />,
    path: '/dashboard',
  },
  {
    key: 'class',
    label: '班级管理',
    icon: <TeamOutlined />,
    children: [
      { key: 'roster', label: '花名册', icon: <TeamOutlined />, path: '/class/roster' },
      { key: 'analytics', label: '学情分析', icon: <BarChartOutlined />, path: '/class/analytics' },
    ],
  },
  {
    key: 'library',
    label: '智慧题库',
    icon: <BookOutlined />,
    children: [
      { key: 'upload', label: '试卷上传', icon: <CloudUploadOutlined />, path: '/library/upload' },
      { key: 'mistake', label: '错题本', icon: <ExclamationCircleOutlined />, path: '/library/mistake' },
      { key: 'note', label: '错题笔记', icon: <FormOutlined />, path: '/library/note' },
    ],
  },
  {
    key: 'toolkit',
    label: '工具箱',
    icon: <ToolOutlined />,
    children: [
      { key: 'practice', label: '练习生成', icon: <FileTextOutlined />, path: '/toolkit/practice' },
      { key: 'assistant', label: '智能助教', icon: <BulbOutlined />, path: '/toolkit/assistant' },
      { key: 'tutor', label: 'AI 家教', icon: <RobotOutlined />, path: '/toolkit/tutor' },
      { key: 'models', label: '模型设置', icon: <SettingOutlined />, path: '/toolkit/models' },
      { key: 'summary', label: '课堂摘要', icon: <VideoCameraOutlined />, path: '/toolkit/summary' },
      { key: 'clips', label: '精选片段', icon: <ScissorOutlined />, path: '/toolkit/clips' },
    ],
  },
];

// ============================================
// 动画配置
// ============================================

const sidebarVariants = {
  expanded: { width: 256 },
  collapsed: { width: 72 },
};

const textVariants = {
  visible: { opacity: 1, x: 0, display: 'block' },
  hidden: { opacity: 0, x: -10, transitionEnd: { display: 'none' } },
};

const submenuVariants = {
  open: { 
    height: 'auto', 
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  closed: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' }
  },
};

// ============================================
// 组件实现
// ============================================

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onCollapse,
}) => {
  const location = useLocation();
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['class', 'library', 'toolkit']);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = (item: NavItem) => {
    if (item.path) return isActive(item.path);
    return item.children?.some(child => isActive(child.path));
  };

  // 样式
  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRight: '1px solid rgba(0, 0, 0, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflow: 'hidden',
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: collapsed ? '20px 16px' : '20px 20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
  };

  const logoIconStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '20px',
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
    flexShrink: 0,
  };

  const navStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 8px',
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  const navItemStyle = (active: boolean, isChild: boolean = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: collapsed ? '12px 16px' : isChild ? '10px 12px 10px 44px' : '12px 16px',
    marginBottom: '4px',
    borderRadius: '10px',
    color: active ? '#4F46E5' : '#475569',
    background: active ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
    fontWeight: active ? 600 : 500,
    fontSize: isChild ? '13px' : '14px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  });

  const iconStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '18px',
    color: active ? '#4F46E5' : '#64748B',
    flexShrink: 0,
    transition: 'color 0.15s ease',
  });

  const collapseButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.04)',
    cursor: 'pointer',
    color: '#64748B',
    transition: 'all 0.15s ease',
  };

  return (
    <motion.aside
      style={sidebarStyle}
      variants={sidebarVariants}
      animate={collapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div style={logoStyle}>
        <div style={logoIconStyle}>智</div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.15 }}
            >
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#0F172A', whiteSpace: 'nowrap' }}>
                智慧教研
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                AI-Powered Teaching
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav style={navStyle}>
        {navItems.map(item => (
          <div key={item.key}>
            {item.path ? (
              // 单个导航项
              <NavLink
                to={item.path}
                style={({ isActive }) => navItemStyle(isActive)}
              >
                <span style={iconStyle(isActive(item.path))}>{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      variants={textVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ) : (
              // 带子菜单的导航项
              <>
                <div
                  style={navItemStyle(isGroupActive(item))}
                  onClick={() => !collapsed && toggleExpand(item.key)}
                  onMouseEnter={(e) => {
                    if (!isGroupActive(item)) {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGroupActive(item)) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={iconStyle(isGroupActive(item))}>{item.icon}</span>
                  <AnimatePresence>
                    {!collapsed && (
                      <>
                        <motion.span
                          variants={textVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          style={{ flex: 1, whiteSpace: 'nowrap' }}
                        >
                          {item.label}
                        </motion.span>
                        <motion.span
                          variants={textVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          style={{
                            fontSize: '10px',
                            color: '#94A3B8',
                            transform: expandedKeys.includes(item.key) ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          ▶
                        </motion.span>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* 子菜单 */}
                <AnimatePresence>
                  {!collapsed && expandedKeys.includes(item.key) && item.children && (
                    <motion.div
                      variants={submenuVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                      style={{ overflow: 'hidden' }}
                    >
                      {item.children.map(child => (
                        <NavLink
                          key={child.key}
                          to={child.path!}
                          style={({ isActive }) => navItemStyle(isActive, true)}
                        >
                          <span style={{ ...iconStyle(isActive(child.path)), fontSize: '14px' }}>
                            {child.icon}
                          </span>
                          <span style={{ whiteSpace: 'nowrap' }}>{child.label}</span>
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse Button */}
      <motion.div
        style={collapseButtonStyle}
        onClick={() => onCollapse?.(!collapsed)}
        whileHover={{ background: 'rgba(0, 0, 0, 0.04)' }}
        whileTap={{ scale: 0.98 }}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ marginLeft: '12px', fontSize: '13px' }}
            >
              收起菜单
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.aside>
  );
};

export default Sidebar;
