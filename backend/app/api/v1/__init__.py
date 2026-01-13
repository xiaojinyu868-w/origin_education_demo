"""
API v1 路由模块

与 meetmind 对齐的 API 接口:
- /api/v1/auth/* - 认证相关
- /api/v1/tutor - AI 家教
- /api/v1/chat - 通用对话
- /api/v1/generate-summary - 课堂摘要
- /api/v1/generate-topics - 精选片段
- /api/v1/error/* - 错题笔记
"""

from fastapi import APIRouter

from .auth_routes import router as auth_router
from .tutor import router as tutor_router
from .chat import router as chat_router
from .summary import router as summary_router
from .topics import router as topics_router
from .error_note import router as error_note_router

# 创建 v1 路由
api_router = APIRouter(prefix="/api/v1")

# 注册子路由
api_router.include_router(auth_router)
api_router.include_router(tutor_router)
api_router.include_router(chat_router)
api_router.include_router(summary_router)
api_router.include_router(topics_router)
api_router.include_router(error_note_router)

__all__ = ["api_router"]
