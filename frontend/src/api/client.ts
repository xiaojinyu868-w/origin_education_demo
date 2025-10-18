import axios from "axios";
import { message } from "antd";
import { AUTH_LOGOUT_EVENT, AUTH_TOKEN_KEY } from "../constants/auth";
import { safeStorage } from "../utils/storage";

export const apiClient = axios.create({
  baseURL: "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = safeStorage.get(AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error?.response?.data?.detail ||
      error?.message ||
      "请求失败，请检查网络或稍后重试";
    message.error(msg, 3);
    if (error?.response?.status === 401) {
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    }
    return Promise.reject(error);
  },
);
