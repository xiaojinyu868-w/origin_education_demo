import { message } from "antd";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, loginUser, registerUser } from "../api/services";
import { AUTH_LOGOUT_EVENT, AUTH_TOKEN_KEY } from "../constants/auth";
import type { User } from "../types";
import { safeStorage } from "../utils/storage";

type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  createDemoData?: boolean;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

type AuthProviderProps = { children: ReactNode };

const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => safeStorage.get(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(
    (messageText?: string) => {
      safeStorage.remove(AUTH_TOKEN_KEY);
      setToken(null);
      setUser(null);
      if (messageText) {
        message.info(messageText);
      }
      navigate("/", { replace: true });
    },
    [navigate],
  );

  const refreshUser = useCallback(async () => {
    if (!safeStorage.get(AUTH_TOKEN_KEY)) {
      setUser(null);
      return null;
    }
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
      return profile;
    } catch (error) {
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

  const login = useCallback(
    async (email: string, password: string) => {
      const tokenResponse = await loginUser({ email, password });
      safeStorage.set(AUTH_TOKEN_KEY, tokenResponse.access_token);
      setToken(tokenResponse.access_token);
      const profile = await fetchCurrentUser();
      setUser(profile);
      return profile;
    },
    [],
  );

  const register = useCallback(
    async ({ email, password, name, createDemoData }: RegisterPayload) => {
      await registerUser({
        email,
        password,
        name,
        create_demo_data: createDemoData ?? false,
      });
      message.success("注册成功");
      const profile = await login(email, password);
      return profile;
    },
    [login],
  );

  const logout = useCallback(() => {
    clearAuth("已退出登录");
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthProvider, useAuthContext };
