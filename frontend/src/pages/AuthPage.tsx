/**
 * AuthPage - 登录/注册页面
 * 
 * 玻璃态设计，现代化认证体验
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { GlassCard } from '../design-system/components/GlassCard';
import { Button } from '../design-system/components/Button';
import { Input, PasswordInput } from '../design-system/components/Input';
import useAuth from '../hooks/useAuth';

// ============================================
// 动画配置
// ============================================

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] }
  },
};

const formVariants = {
  login: { x: 0, opacity: 1 },
  register: { x: 0, opacity: 1 },
};

// ============================================
// 组件实现
// ============================================

interface AuthPageProps {
  redirectPath?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({ redirectPath = '/dashboard' }) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    createDemoData: true,
  });

  // 处理输入变化
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  // 处理登录
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      message.warning('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      await login(formData.email, formData.password);
      message.success('登录成功');
      navigate(redirectPath);
    } catch (error: any) {
      message.error(error.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      message.warning('请填写完整信息');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      message.warning('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.username,
        email: formData.email,
        password: formData.password,
        createDemoData: formData.createDemoData,
      });
      message.success('注册成功');
      navigate(redirectPath);
    } catch (error: any) {
      message.error(error.response?.data?.detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 特性列表
  const features = [
    { icon: '🎯', title: 'AI 智能批改', desc: '秒级完成作业批改' },
    { icon: '📊', title: '学情分析', desc: '多维度数据洞察' },
    { icon: '💡', title: '智能助教', desc: 'AI 辅助教学决策' },
    { icon: '📝', title: '错题管理', desc: '自动归纳整理' },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: '#EEF2FF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(at 20% 30%, rgba(79, 70, 229, 0.15) 0px, transparent 50%),
          radial-gradient(at 80% 20%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
          radial-gradient(at 40% 80%, rgba(249, 115, 22, 0.08) 0px, transparent 50%),
          radial-gradient(at 90% 70%, rgba(129, 140, 248, 0.1) 0px, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      {/* 浮动装饰元素 */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 100 + i * 50,
            height: 100 + i * 50,
            borderRadius: '50%',
            background: `rgba(79, 70, 229, ${0.03 + i * 0.01})`,
            left: `${10 + i * 20}%`,
            top: `${20 + (i % 3) * 30}%`,
          }}
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* 主卡片 */}
      <motion.div
        variants={cardVariants}
        style={{
          display: 'flex',
          maxWidth: '1000px',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <GlassCard
          intensity="strong"
          padding="none"
          radius="2xl"
          style={{
            display: 'flex',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* 左侧品牌区 */}
          <div style={{
            flex: '0 0 45%',
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)',
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 装饰图案 */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)
              `,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Logo */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '48px',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '24px',
                  fontWeight: 700,
                }}>
                  智
                </div>
                <div>
                  <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 700 }}>
                    智慧教研平台
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    AI-Powered Teaching
                  </div>
                </div>
              </div>

              {/* 标语 */}
              <h1 style={{
                color: '#FFFFFF',
                fontSize: '32px',
                fontWeight: 700,
                lineHeight: 1.3,
                marginBottom: '16px',
              }}>
                让教学更智慧<br />
                让成长更高效
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '15px',
                lineHeight: 1.6,
                marginBottom: '40px',
              }}>
                融合 AI 技术，为教师提供智能批改、学情分析、个性化教学辅助，让每一位学生都能获得最适合的学习路径。
              </p>
            </div>

            {/* 特性列表 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              position: 'relative',
              zIndex: 1,
            }}>
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {feature.icon}
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    {feature.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    {feature.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 右侧表单区 */}
          <div style={{
            flex: '0 0 55%',
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            {/* 切换标签 */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '32px',
              padding: '4px',
              background: 'rgba(0, 0, 0, 0.04)',
              borderRadius: '12px',
            }}>
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: mode === m ? '#FFFFFF' : 'transparent',
                    color: mode === m ? '#0F172A' : '#64748B',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {m === 'login' ? '登录' : '注册'}
                </button>
              ))}
            </div>

            {/* 表单标题 */}
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '8px',
            }}>
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#64748B',
              marginBottom: '32px',
            }}>
              {mode === 'login' ? '请输入您的账号信息' : '填写以下信息完成注册'}
            </p>

            {/* 表单 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                variants={formVariants}
                initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {mode === 'register' && (
                  <Input
                    label="用户名"
                    placeholder="请输入用户名"
                    leftIcon={<UserOutlined />}
                    value={formData.username}
                    onChange={handleChange('username')}
                    fullWidth
                  />
                )}

                <Input
                  label="邮箱"
                  placeholder="请输入邮箱地址"
                  leftIcon={<MailOutlined />}
                  value={formData.email}
                  onChange={handleChange('email')}
                  fullWidth
                />

                <PasswordInput
                  label="密码"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleChange('password')}
                  fullWidth
                />

                {mode === 'register' && (
                  <>
                    <PasswordInput
                      label="确认密码"
                      placeholder="请再次输入密码"
                      value={formData.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      fullWidth
                    />

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#475569',
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.createDemoData}
                        onChange={(e) => setFormData(prev => ({ ...prev, createDemoData: e.target.checked }))}
                        style={{ 
                          width: '18px', 
                          height: '18px',
                          accentColor: '#4F46E5',
                        }}
                      />
                      创建演示数据（推荐新用户勾选）
                    </label>
                  </>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  rightIcon={<ArrowRightOutlined />}
                  onClick={mode === 'login' ? handleLogin : handleRegister}
                  style={{ marginTop: '8px' }}
                >
                  {mode === 'login' ? '登录' : '注册'}
                </Button>
              </motion.div>
            </AnimatePresence>

            {/* 底部提示 */}
            <p style={{
              marginTop: '32px',
              textAlign: 'center',
              fontSize: '13px',
              color: '#94A3B8',
            }}>
              {mode === 'login' ? (
                <>还没有账号？<span style={{ color: '#4F46E5', cursor: 'pointer', fontWeight: 500 }} onClick={() => setMode('register')}>立即注册</span></>
              ) : (
                <>已有账号？<span style={{ color: '#4F46E5', cursor: 'pointer', fontWeight: 500 }} onClick={() => setMode('login')}>立即登录</span></>
              )}
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default AuthPage;
