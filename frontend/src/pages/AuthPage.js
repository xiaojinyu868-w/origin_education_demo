import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Card, Form, Input, Space, Switch, Tabs, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
const { Title, Paragraph } = Typography;
const AuthPage = ({ redirectPath = "/dashboard" }) => {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [mode, setMode] = useState("login");
    const [submitting, setSubmitting] = useState(false);
    const [loginForm] = Form.useForm();
    const [registerForm] = Form.useForm();
    const handleLogin = async (values) => {
        setSubmitting(true);
        try {
            await login(values.email.trim(), values.password);
            message.success("登录成功");
            const target = redirectPath && redirectPath !== "/" ? redirectPath : "/dashboard";
            navigate(target, { replace: true });
        }
        catch (error) {
            // message handled globally
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleRegister = async (values) => {
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
        }
        catch (error) {
            // message handled globally
        }
        finally {
            setSubmitting(false);
        }
    };
    const tabItems = [
        {
            key: "login",
            label: "账号登录",
            children: (_jsxs(Form, { form: loginForm, layout: "vertical", onFinish: handleLogin, requiredMark: false, children: [_jsx(Form.Item, { name: "email", label: "\u90AE\u7BB1", rules: [{ required: true, message: "请输入邮箱" }, { type: "email", message: "请输入有效邮箱" }], children: _jsx(Input, { placeholder: "teacher@example.com", autoComplete: "email", size: "large" }) }), _jsx(Form.Item, { name: "password", label: "\u5BC6\u7801", rules: [{ required: true, message: "请输入密码" }], children: _jsx(Input.Password, { placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801", autoComplete: "current-password", size: "large" }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", block: true, size: "large", loading: submitting, children: "\u767B\u5F55" }) })] })),
        },
        {
            key: "register",
            label: "注册账号",
            children: (_jsxs(Form, { form: registerForm, layout: "vertical", onFinish: handleRegister, requiredMark: false, children: [_jsx(Form.Item, { name: "name", label: "\u59D3\u540D", rules: [{ required: true, message: "请输入姓名" }], children: _jsx(Input, { placeholder: "\u8BF7\u8F93\u5165\u59D3\u540D", size: "large" }) }), _jsx(Form.Item, { name: "email", label: "\u90AE\u7BB1", rules: [{ required: true, message: "请输入邮箱" }, { type: "email", message: "请输入有效邮箱" }], children: _jsx(Input, { placeholder: "teacher@example.com", autoComplete: "email", size: "large" }) }), _jsx(Form.Item, { name: "password", label: "\u5BC6\u7801", rules: [{ required: true, message: "请输入密码" }, { min: 8, message: "密码不少于 8 位" }], children: _jsx(Input.Password, { placeholder: "\u8BBE\u7F6E\u767B\u5F55\u5BC6\u7801", autoComplete: "new-password", size: "large" }) }), _jsx(Form.Item, { name: "confirmPassword", label: "\u786E\u8BA4\u5BC6\u7801", dependencies: ["password"], rules: [
                            { required: true, message: "请再次输入密码" },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue("password") === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error("两次输入的密码不一致"));
                                },
                            }),
                        ], children: _jsx(Input.Password, { placeholder: "\u518D\u6B21\u8F93\u5165\u5BC6\u7801", autoComplete: "new-password", size: "large" }) }), _jsx(Form.Item, { name: "createDemoData", label: "\u521D\u59CB\u5316\u793A\u4F8B\u6570\u636E", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "\u521B\u5EFA", unCheckedChildren: "\u8DF3\u8FC7" }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", block: true, size: "large", loading: submitting, children: "\u6CE8\u518C\u5E76\u767B\u5F55" }) })] })),
        },
    ];
    return (_jsx("div", { className: "auth-page", children: _jsxs(Card, { className: "auth-card", bordered: false, children: [_jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, align: "center", children: [_jsx(Title, { level: 3, style: { marginBottom: 0 }, children: "\u667A\u6167\u6559\u7814\u5E73\u53F0" }), _jsx(Paragraph, { type: "secondary", style: { marginBottom: 24 }, children: "\u767B\u5F55\u6216\u6CE8\u518C\u540E\u5373\u53EF\u4F53\u9A8C\u667A\u80FD\u6279\u6539\u3001\u9519\u9898\u89C4\u5212\u548C\u6559\u5B66\u8BCA\u65AD\u80FD\u529B" })] }), _jsx(Tabs, { activeKey: mode, onChange: (key) => setMode(key), destroyInactiveTabPane: true, items: tabItems })] }) }));
};
export default AuthPage;
