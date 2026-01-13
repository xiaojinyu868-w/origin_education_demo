/**
 * Header - 顶部导航组件
 * 
 * 玻璃态设计，包含面包屑、搜索、通知、用户信息
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SearchOutlined,
  BellOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Badge, Dropdown, Avatar, Input } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../context/AuthContext';

// ============================================
// 类型定义
// ============================================

interface HeaderProps {
  sidebarCollapsed?: boolean;
}

// ============================================
// 面包屑配置
// ============================================

const breadcrumbMap: Record<string, { title: string; parent?: string }> = {
  '/dashboard': { title: '工作台' },
  '/class/roster': { title: '花名册', parent: '班级管理' },
  '/class/analytics': { title: '学情分析', parent: '班级管理' },
  '/library/upload': { title: '试卷上传', parent: '智慧题库' },
  '/library/mistake': { title: '错题本', parent: '智慧题库' },
  '/library/note': { title: '错题笔记', parent: '智慧题库' },
  '/toolkit/practice': { title: '练习生成', parent: '工具箱' },
  '/toolkit/assistant': { title: '智能助教', parent: '工具箱' },
  '/toolkit/tutor': { title: 'AI 家教', parent: '工具箱' },
  '/toolkit/models': { title: '模型设置', parent: '工具箱' },
  '/toolkit/summary': { title: '课堂摘要', parent: '工具箱' },
  '/toolkit/clips': { title: '精选片段', parent: '工具箱' },
};

// ============================================
// 组件实现
// ============================================

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  // 获取当前页面信息
  const currentPage = breadcrumbMap[location.pathname] || { title: '页面' };

  // 用户菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: '帮助中心',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/auth');
    }
  };

  // 样式
  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: sidebarCollapsed ? 72 : 256,
    height: '64px',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 99,
    transition: 'left 0.25s cubic-bezier(0, 0, 0.2, 1)',
  };

  const breadcrumbStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const searchContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: searchFocused ? '320px' : '240px',
    transition: 'width 0.2s ease',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const iconButtonStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748B',
    fontSize: '18px',
    transition: 'all 0.15s ease',
  };

  return (
    <header style={headerStyle}>
      {/* 左侧：面包屑 */}
      <div style={breadcrumbStyle}>
        {currentPage.parent && (
          <>
            <span style={{ color: '#94A3B8', fontSize: '14px' }}>
              {currentPage.parent}
            </span>
            <span style={{ color: '#CBD5E1', fontSize: '12px' }}>/</span>
          </>
        )}
        <span style={{ color: '#0F172A', fontSize: '15px', fontWeight: 600 }}>
          {currentPage.title}
        </span>
      </div>

      {/* 中间：搜索框 */}
      <motion.div
        style={searchContainerStyle}
        animate={{ width: searchFocused ? 320 : 240 }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          placeholder="搜索功能、学生、题目..."
          style={{
            height: '40px',
            borderRadius: '10px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            background: searchFocused ? '#FFFFFF' : 'rgba(0, 0, 0, 0.02)',
            boxShadow: searchFocused ? '0 0 0 3px rgba(79, 70, 229, 0.1)' : 'none',
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </motion.div>

      {/* 右侧：操作区 */}
      <div style={actionsStyle}>
        {/* 通知按钮 */}
        <motion.div
          style={iconButtonStyle}
          whileHover={{ background: 'rgba(0, 0, 0, 0.04)' }}
          whileTap={{ scale: 0.95 }}
        >
          <Badge count={3} size="small" offset={[2, -2]}>
            <BellOutlined style={{ fontSize: '18px', color: '#64748B' }} />
          </Badge>
        </motion.div>

        {/* 设置按钮 */}
        <motion.div
          style={iconButtonStyle}
          whileHover={{ background: 'rgba(0, 0, 0, 0.04)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/toolkit/models')}
        >
          <SettingOutlined />
        </motion.div>

        {/* 分隔线 */}
        <div style={{ 
          width: '1px', 
          height: '24px', 
          background: 'rgba(0, 0, 0, 0.08)',
          margin: '0 8px',
        }} />

        {/* 用户头像 */}
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          trigger={['click']}
          placement="bottomRight"
        >
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px 6px 6px',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
            whileHover={{ background: 'rgba(0, 0, 0, 0.04)' }}
          >
            <Avatar
              size={36}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                fontWeight: 600,
              }}
            >
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: '#0F172A',
                lineHeight: 1.3,
              }}>
                {user?.username || '用户'}
              </span>
              <span style={{ 
                fontSize: '11px', 
                color: '#94A3B8',
                lineHeight: 1.3,
              }}>
                教师
              </span>
            </div>
          </motion.div>
        </Dropdown>
      </div>
    </header>
  );
};

export default Header;
