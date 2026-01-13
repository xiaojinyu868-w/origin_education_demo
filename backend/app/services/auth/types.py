"""
认证相关类型定义 - 与 meetmind 的 user.ts 对齐
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class UserRole(str, Enum):
    """用户角色"""
    STUDENT = "student"
    PARENT = "parent"
    TEACHER = "teacher"
    ADMIN = "admin"


class Permission(str, Enum):
    """权限定义"""
    # Session 权限
    SESSION_READ = "session:read"
    SESSION_WRITE = "session:write"
    SESSION_DELETE = "session:delete"
    # Anchor 权限
    ANCHOR_READ = "anchor:read"
    ANCHOR_WRITE = "anchor:write"
    # Note 权限
    NOTE_READ = "note:read"
    NOTE_WRITE = "note:write"
    # Report 权限
    REPORT_READ = "report:read"
    REPORT_GENERATE = "report:generate"
    # User 权限
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    # Admin 权限
    ADMIN_ACCESS = "admin:access"
    # Exam 权限
    EXAM_READ = "exam:read"
    EXAM_WRITE = "exam:write"
    EXAM_DELETE = "exam:delete"
    # Mistake 权限
    MISTAKE_READ = "mistake:read"
    MISTAKE_WRITE = "mistake:write"
    # Practice 权限
    PRACTICE_READ = "practice:read"
    PRACTICE_WRITE = "practice:write"


# 角色权限映射 - 与 meetmind 对齐
ROLE_PERMISSIONS: Dict[UserRole, List[Permission]] = {
    UserRole.STUDENT: [
        Permission.SESSION_READ,
        Permission.SESSION_WRITE,
        Permission.ANCHOR_READ,
        Permission.ANCHOR_WRITE,
        Permission.NOTE_READ,
        Permission.NOTE_WRITE,
        Permission.REPORT_READ,
        Permission.MISTAKE_READ,
        Permission.PRACTICE_READ,
        Permission.PRACTICE_WRITE,
    ],
    UserRole.PARENT: [
        Permission.SESSION_READ,
        Permission.ANCHOR_READ,
        Permission.NOTE_READ,
        Permission.REPORT_READ,
        Permission.MISTAKE_READ,
    ],
    UserRole.TEACHER: [
        Permission.SESSION_READ,
        Permission.SESSION_WRITE,
        Permission.ANCHOR_READ,
        Permission.NOTE_READ,
        Permission.REPORT_READ,
        Permission.REPORT_GENERATE,
        Permission.USER_READ,
        Permission.EXAM_READ,
        Permission.EXAM_WRITE,
        Permission.MISTAKE_READ,
        Permission.MISTAKE_WRITE,
        Permission.PRACTICE_READ,
        Permission.PRACTICE_WRITE,
    ],
    UserRole.ADMIN: [
        Permission.SESSION_READ,
        Permission.SESSION_WRITE,
        Permission.SESSION_DELETE,
        Permission.ANCHOR_READ,
        Permission.ANCHOR_WRITE,
        Permission.NOTE_READ,
        Permission.NOTE_WRITE,
        Permission.REPORT_READ,
        Permission.REPORT_GENERATE,
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.ADMIN_ACCESS,
        Permission.EXAM_READ,
        Permission.EXAM_WRITE,
        Permission.EXAM_DELETE,
        Permission.MISTAKE_READ,
        Permission.MISTAKE_WRITE,
        Permission.PRACTICE_READ,
        Permission.PRACTICE_WRITE,
    ],
}


@dataclass
class JWTPayload:
    """JWT Payload - 与 meetmind 对齐"""
    sub: str  # 用户 ID
    username: str
    role: UserRole
    permissions: List[str]
    iat: int  # 签发时间
    exp: int  # 过期时间
    jti: Optional[str] = None  # JWT ID
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "sub": self.sub,
            "username": self.username,
            "role": self.role.value,
            "permissions": self.permissions,
            "iat": self.iat,
            "exp": self.exp,
            "jti": self.jti,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "JWTPayload":
        return cls(
            sub=data.get("sub", ""),
            username=data.get("username", ""),
            role=UserRole(data.get("role", "student")),
            permissions=data.get("permissions", []),
            iat=data.get("iat", 0),
            exp=data.get("exp", 0),
            jti=data.get("jti"),
        )


@dataclass
class LoginRequest:
    """登录请求"""
    username: str
    password: str
    remember_me: bool = False


@dataclass
class RegisterRequest:
    """注册请求"""
    username: str
    email: str
    password: str
    nickname: Optional[str] = None
    role: UserRole = UserRole.TEACHER


@dataclass
class AuthResponse:
    """认证响应"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int = 7200  # 秒
    user: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "accessToken": self.access_token,
            "tokenType": self.token_type,
            "expiresIn": self.expires_in,
        }
        if self.refresh_token:
            result["refreshToken"] = self.refresh_token
        if self.user:
            result["user"] = self.user
        return result


@dataclass
class UserInfo:
    """用户信息"""
    id: str
    username: str
    email: Optional[str]
    nickname: str
    avatar: Optional[str]
    role: UserRole
    status: str  # active, inactive, suspended, pending
    permissions: List[str]
    created_at: str
    updated_at: str
    last_login_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "nickname": self.nickname,
            "avatar": self.avatar,
            "role": self.role.value,
            "status": self.status,
            "permissions": self.permissions,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "lastLoginAt": self.last_login_at,
        }
