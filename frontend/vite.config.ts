import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 错题笔记 API - 保持 /api/v1/error 路径
      "/api/v1/error": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      // 其他 API - 移除 /api 前缀
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setupTests.ts",
    globals: true,
    clearMocks: true,
  },
});
