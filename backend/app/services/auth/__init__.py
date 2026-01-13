"""
认证服务模块 - 与 meetmind 对齐的 JWT 认证系统

支持功能:
- JWT Token 认证
- 用户角色权限管理
- 刷新令牌
- 登录限流
"""

from .service import (
    AuthService,
    AuthError,
    get_auth_service,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
    get_current_user_optional,
    require_permission,
    require_role,
)
from .types import (
    UserRole,
    Permission,
    ROLE_PERMISSIONS,
    JWTPayload,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
)

__all__ = [
    # Service
    "AuthService",
    "AuthError",
    "get_auth_service",
    # Token functions
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    # Dependencies
    "get_current_user",
    "get_current_user_optional",
    "require_permission",
    "require_role",
    # Types
    "UserRole",
    "Permission",
    "ROLE_PERMISSIONS",
    "JWTPayload",
    "AuthResponse",
    "LoginRequest",
    "RegisterRequest",
]
