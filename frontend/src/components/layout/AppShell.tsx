/**
 * AppShell - 应用外壳组件
 * 
 * 整合 Sidebar 和 Header，提供统一的布局结构
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// ============================================
// 类型定义
// ============================================

interface AppShellProps {
  children?: React.ReactNode;
}

// ============================================
// 组件实现
// ============================================

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 响应式处理：小屏幕自动折叠
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 样式
  const shellStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#EEF2FF',
    position: 'relative',
  };

  const mainStyle: React.CSSProperties = {
    marginLeft: sidebarCollapsed ? 72 : 256,
    paddingTop: 64,
    minHeight: '100vh',
    transition: 'margin-left 0.25s cubic-bezier(0, 0, 0.2, 1)',
  };

  const contentStyle: React.CSSProperties = {
    padding: 'clamp(16px, 3vw, 32px)',
    maxWidth: '1400px',
    margin: '0 auto',
  };

  // 背景装饰
  const backgroundStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: `
      radial-gradient(at 40% 20%, rgba(79, 70, 229, 0.08) 0px, transparent 50%),
      radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.06) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(249, 115, 22, 0.04) 0px, transparent 50%),
      radial-gradient(at 80% 50%, rgba(129, 140, 248, 0.05) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(79, 70, 229, 0.06) 0px, transparent 50%)
    `,
    pointerEvents: 'none',
    zIndex: 0,
  };

  return (
    <div style={shellStyle}>
      {/* 背景装饰 */}
      <div style={backgroundStyle} />

      {/* 侧边栏 */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      {/* 顶部导航 */}
      <Header sidebarCollapsed={sidebarCollapsed} />

      {/* 主内容区 */}
      <motion.main
        style={mainStyle}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      >
        <div style={contentStyle}>
          {children || <Outlet />}
        </div>
      </motion.main>
    </div>
  );
};

export default AppShell;
