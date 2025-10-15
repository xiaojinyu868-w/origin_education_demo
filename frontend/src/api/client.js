import axios from "axios";
import { message } from "antd";
export const apiClient = axios.create({
    baseURL: "/api",
});
apiClient.interceptors.response.use((response) => response, (error) => {
    const msg = error?.response?.data?.detail ||
        error?.message ||
        "请求失败，请检查网络或稍后重试";
    message.error(msg, 3);
    return Promise.reject(error);
});
