"""
认证服务实现 - 与 meetmind 的 auth-service.ts 对齐
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any, Callable, Dict, List, Optional, Tuple

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from ...database import get_session
from ...models import User
from .types import (
    AuthResponse,
    JWTPayload,
    LoginRequest,
    Permission,
    RegisterRequest,
    ROLE_PERMISSIONS,
    UserInfo,
    UserRole,
)


# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 配置
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# JWT 配置
SECRET_KEY = os.getenv("JWT_SECRET", os.getenv("AUTH_SECRET_KEY", "meetmind-jwt-secret-change-in-production"))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # 2 小时
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 天
REMEMBER_ME_EXPIRE_DAYS = int(os.getenv("REMEMBER_ME_EXPIRE_DAYS", "30"))  # 30 天

# 登录限流配置
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15
LOGIN_WINDOW_MINUTES = 10


class AuthError(Exception):
    """认证错误"""
    pass


class AuthService:
    """认证服务"""
    
    def __init__(self):
        self._login_attempts: Dict[str, List[datetime]] = {}
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def hash_password(self, password: str) -> str:
        """加密密码"""
        return pwd_context.hash(password)
    
    def validate_password(self, password: str) -> Tuple[bool, str]:
        """验证密码强度"""
        if len(password) < 8:
            return False, "密码长度至少8个字符"
        if not any(c.isupper() for c in password):
            return False, "密码需要包含大写字母"
        if not any(c.islower() for c in password):
            return False, "密码需要包含小写字母"
        if not any(c.isdigit() for c in password):
            return False, "密码需要包含数字"
        return True, ""
    
    def _check_login_rate_limit(self, identifier: str) -> Tuple[bool, int]:
        """检查登录限流"""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=LOGIN_WINDOW_MINUTES)
        
        # 清理过期记录
        if identifier in self._login_attempts:
            self._login_attempts[identifier] = [
                t for t in self._login_attempts[identifier]
                if t > window_start
            ]
        
        attempts = self._login_attempts.get(identifier, [])
        
        if len(attempts) >= MAX_LOGIN_ATTEMPTS:
            # 检查是否在锁定期内
            last_attempt = max(attempts) if attempts else now
            lockout_end = last_attempt + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
            if now < lockout_end:
                remaining = int((lockout_end - now).total_seconds())
                return False, remaining
        
        return True, 0
    
    def _record_login_attempt(self, identifier: str):
        """记录登录尝试"""
        if identifier not in self._login_attempts:
            self._login_attempts[identifier] = []
        self._login_attempts[identifier].append(datetime.utcnow())
    
    def _clear_login_attempts(self, identifier: str):
        """清除登录尝试记录"""
        if identifier in self._login_attempts:
            del self._login_attempts[identifier]
    
    def authenticate(
        self,
        session: Session,
        username: str,
        password: str,
    ) -> Optional[User]:
        """验证用户"""
        # 检查限流
        allowed, remaining = self._check_login_rate_limit(username)
        if not allowed:
            raise AuthError(f"登录尝试次数过多，请在 {remaining} 秒后重试")
        
        # 查找用户
        normalized = username.strip().lower()
        statement = select(User).where(
            (User.email == normalized) | (User.name == normalized)
        )
        user = session.exec(statement).first()
        
        if not user or not self.verify_password(password, user.hashed_password):
            self._record_login_attempt(username)
            return None
        
        # 登录成功，清除尝试记录
        self._clear_login_attempts(username)
        return user
    
    def get_user_role(self, user: User) -> UserRole:
        """获取用户角色"""
        # 从用户模型获取角色，默认为 TEACHER
        role_str = getattr(user, "role", None)
        if role_str:
            try:
                return UserRole(role_str)
            except ValueError:
                pass
        return UserRole.TEACHER
    
    def get_user_permissions(self, user: User) -> List[str]:
        """获取用户权限"""
        role = self.get_user_role(user)
        permissions = ROLE_PERMISSIONS.get(role, [])
        return [p.value for p in permissions]
    
    def create_tokens(
        self,
        user: User,
        remember_me: bool = False,
    ) -> AuthResponse:
        """创建访问令牌和刷新令牌"""
        role = self.get_user_role(user)
        permissions = self.get_user_permissions(user)
        
        # 创建访问令牌
        access_token = create_access_token(
            user_id=str(user.id),
            username=user.name,
            role=role,
            permissions=permissions,
        )
        
        # 创建刷新令牌
        refresh_expire_days = REMEMBER_ME_EXPIRE_DAYS if remember_me else REFRESH_TOKEN_EXPIRE_DAYS
        refresh_token = create_refresh_token(
            user_id=str(user.id),
            expire_days=refresh_expire_days,
        )
        
        # 构建用户信息
        user_info = {
            "id": str(user.id),
            "username": user.name,
            "email": user.email,
            "nickname": user.name,
            "role": role.value,
            "permissions": permissions,
        }
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_info,
        )
    
    def login(
        self,
        session: Session,
        request: LoginRequest,
    ) -> AuthResponse:
        """登录"""
        user = self.authenticate(session, request.username, request.password)
        if not user:
            raise AuthError("用户名或密码错误")
        
        return self.create_tokens(user, request.remember_me)
    
    def register(
        self,
        session: Session,
        request: RegisterRequest,
    ) -> AuthResponse:
        """注册"""
        # 验证密码强度
        valid, message = self.validate_password(request.password)
        if not valid:
            raise AuthError(message)
        
        # 检查用户名是否已存在
        normalized_email = request.email.strip().lower()
        normalized_username = request.username.strip().lower()
        
        existing = session.exec(
            select(User).where(
                (User.email == normalized_email) | (User.name == normalized_username)
            )
        ).first()
        
        if existing:
            raise AuthError("用户名或邮箱已存在")
        
        # 创建用户
        user = User(
            email=normalized_email,
            name=request.nickname or request.username,
            hashed_password=self.hash_password(request.password),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        return self.create_tokens(user)
    
    def refresh_access_token(
        self,
        session: Session,
        refresh_token: str,
    ) -> AuthResponse:
        """刷新访问令牌"""
        payload = verify_token(refresh_token)
        if not payload:
            raise AuthError("无效的刷新令牌")
        
        user_id = payload.get("sub")
        if not user_id:
            raise AuthError("无效的刷新令牌")
        
        user = session.get(User, int(user_id))
        if not user:
            raise AuthError("用户不存在")
        
        return self.create_tokens(user)


def create_access_token(
    user_id: str,
    username: str,
    role: UserRole,
    permissions: List[str],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """创建访问令牌"""
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    
    payload = JWTPayload(
        sub=user_id,
        username=username,
        role=role,
        permissions=permissions,
        iat=int(now.timestamp()),
        exp=int(expire.timestamp()),
        jti=str(uuid.uuid4()),
    )
    
    return jwt.encode(payload.to_dict(), SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    user_id: str,
    expire_days: int = REFRESH_TOKEN_EXPIRE_DAYS,
) -> str:
    """创建刷新令牌"""
    now = datetime.utcnow()
    expire = now + timedelta(days=expire_days)
    
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """验证令牌"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
) -> User:
    """获取当前用户（必须登录）"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    with get_session() as session:
        user = session.get(User, int(user_id))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[User]:
    """获取当前用户（可选）"""
    if not token:
        return None
    
    payload = verify_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    with get_session() as session:
        return session.get(User, int(user_id))


def require_permission(permission: Permission) -> Callable:
    """权限检查装饰器"""
    def dependency(token: str = Depends(oauth2_scheme)) -> User:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="未提供认证令牌",
            )
        
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证令牌",
            )
        
        permissions = payload.get("permissions", [])
        if permission.value not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"缺少权限: {permission.value}",
            )
        
        user_id = payload.get("sub")
        with get_session() as session:
            user = session.get(User, int(user_id))
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="用户不存在",
                )
            return user
    
    return dependency


def require_role(role: UserRole) -> Callable:
    """角色检查装饰器"""
    def dependency(token: str = Depends(oauth2_scheme)) -> User:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="未提供认证令牌",
            )
        
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证令牌",
            )
        
        user_role = payload.get("role")
        if user_role != role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要角色: {role.value}",
            )
        
        user_id = payload.get("sub")
        with get_session() as session:
            user = session.get(User, int(user_id))
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="用户不存在",
                )
            return user
    
    return dependency


@lru_cache(maxsize=1)
def get_auth_service() -> AuthService:
    """获取认证服务单例"""
    return AuthService()
