import { Button, Card, Form, Input, Space, Switch, Tabs, Typography, message } from "antd";
import type { TabsProps } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const { Title, Paragraph } = Typography;

interface AuthPageProps {
  redirectPath?: string;
}

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  createDemoData?: boolean;
}

const AuthPage: React.FC<AuthPageProps> = ({ redirectPath = "/dashboard" }) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [loginForm] = Form.useForm<LoginFormValues>();
  const [registerForm] = Form.useForm<RegisterFormValues>();

  const handleLogin = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      message.success("登录成功");
      const target = redirectPath && redirectPath !== "/" ? redirectPath : "/dashboard";
      navigate(target, { replace: true });
    } catch (error) {
      // message handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    setSubmitting(true);
    try {
      await register({
        email: values.email.trim(),
        password: values.password,
        name: values.name.trim(),
        createDemoData: values.createDemoData,
      });
      const target = redirectPath && redirectPath !== "/" ? redirectPath : "/dashboard";
      navigate(target, { replace: true });
    } catch (error) {
      // message handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems: TabsProps["items"] = [
    {
      key: "login",
      label: "账号登录",
      children: (
        <Form<LoginFormValues>
          form={loginForm}
          layout="vertical"
          onFinish={handleLogin}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "请输入有效邮箱" }]}
          >
            <Input placeholder="teacher@example.com" autoComplete="email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="请输入密码" autoComplete="current-password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "register",
      label: "注册账号",
      children: (
        <Form<RegisterFormValues>
          form={registerForm}
          layout="vertical"
          onFinish={handleRegister}
          requiredMark={false}
        >
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}> 
            <Input placeholder="请输入姓名" size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "请输入有效邮箱" }]}
          >
            <Input placeholder="teacher@example.com" autoComplete="email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }, { min: 8, message: "密码不少于 8 位" }]}
          >
            <Input.Password placeholder="设置登录密码" autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请再次输入密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入密码" autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item
            name="createDemoData"
            label="初始化示例数据"
            valuePropName="checked"
          >
            <Switch checkedChildren="创建" unCheckedChildren="跳过" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              注册并登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div className="auth-page">
      <Card className="auth-card" bordered={false}>
        <Space direction="vertical" size={12} style={{ width: "100%" }} align="center">
          <Title level={3} style={{ marginBottom: 0 }}>
            智慧教研平台
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            登录或注册后即可体验智能批改、错题规划和教学诊断能力
          </Paragraph>
        </Space>
        <Tabs
          activeKey={mode}
          onChange={(key) => setMode(key as "login" | "register")}
          destroyInactiveTabPane
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default AuthPage;
