import { jsx as _jsx } from "react/jsx-runtime";
import { message } from "antd";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, loginUser, registerUser } from "../api/services";
import { AUTH_LOGOUT_EVENT, AUTH_TOKEN_KEY } from "../constants/auth";
const AuthContext = createContext(undefined);
const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};
const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const clearAuth = useCallback((messageText) => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        setUser(null);
        if (messageText) {
            message.info(messageText);
        }
        navigate("/", { replace: true });
    }, [navigate]);
    const refreshUser = useCallback(async () => {
        if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
            setUser(null);
            return null;
        }
        try {
            const profile = await fetchCurrentUser();
            setUser(profile);
            return profile;
        }
        catch (error) {
            clearAuth();
            return null;
        }
    }, [clearAuth]);
    useEffect(() => {
        const initialize = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            await refreshUser();
            setLoading(false);
        };
        void initialize();
    }, [token, refreshUser]);
    useEffect(() => {
        const handleUnauthorized = () => {
            clearAuth("登录状态已过期，请重新登录");
        };
        window.addEventListener(AUTH_LOGOUT_EVENT, handleUnauthorized);
        return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleUnauthorized);
    }, [clearAuth]);
    const login = useCallback(async (email, password) => {
        const tokenResponse = await loginUser({ email, password });
        localStorage.setItem(AUTH_TOKEN_KEY, tokenResponse.access_token);
        setToken(tokenResponse.access_token);
        const profile = await fetchCurrentUser();
        setUser(profile);
        return profile;
    }, []);
    const register = useCallback(async ({ email, password, name, createDemoData }) => {
        await registerUser({
            email,
            password,
            name,
            create_demo_data: createDemoData ?? false,
        });
        message.success("注册成功");
        const profile = await login(email, password);
        return profile;
    }, [login]);
    const logout = useCallback(() => {
        clearAuth("已退出登录");
    }, [clearAuth]);
    const value = useMemo(() => ({
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
    }), [user, token, loading, login, register, logout, refreshUser]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export { AuthContext, AuthProvider, useAuthContext };
