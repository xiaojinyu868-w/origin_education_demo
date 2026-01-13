"""
认证 API - 与 meetmind 的 /api/auth/* 对齐

支持功能:
- 用户登录
- 用户注册
- Token 刷新
- 用户信息获取/更新
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlmodel import Session

from ...database import get_session
from ...models import User
from ...services.auth import (
    AuthService,
    get_auth_service,
    get_current_user,
    get_current_user_optional,
    AuthError,
    UserRole,
)

router = APIRouter(prefix="/auth", tags=["认证"])


# ============ 请求/响应模型 ============

class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")
    remember_me: bool = Field(False, alias="rememberMe", description="记住我")
    
    class Config:
        populate_by_name = True


class RegisterRequest(BaseModel):
    """注册请求"""
    username: str = Field(..., description="用户名")
    email: str = Field(..., description="邮箱")
    password: str = Field(..., description="密码")
    nickname: Optional[str] = Field(None, description="昵称")
    role: str = Field("teacher", description="角色")


class AuthResponse(BaseModel):
    """认证响应"""
    access_token: str = Field(..., alias="accessToken")
    refresh_token: Optional[str] = Field(None, alias="refreshToken")
    token_type: str = Field("Bearer", alias="tokenType")
    expires_in: int = Field(..., alias="expiresIn")
    user: Dict[str, Any]
    
    class Config:
        populate_by_name = True


class RefreshRequest(BaseModel):
    """刷新请求"""
    refresh_token: str = Field(..., alias="refreshToken")
    
    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    """用户信息响应"""
    id: str
    username: str
    email: Optional[str]
    nickname: str
    role: str
    permissions: list
    created_at: str = Field(..., alias="createdAt")
    
    class Config:
        populate_by_name = True


class UpdateProfileRequest(BaseModel):
    """更新用户资料请求"""
    nickname: Optional[str] = None
    avatar: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., alias="oldPassword")
    new_password: str = Field(..., alias="newPassword")
    
    class Config:
        populate_by_name = True


# ============ API 端点 ============

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    session: Session = Depends(get_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    用户登录
    
    与 meetmind 的 POST /api/auth/login 对齐
    """
    try:
        from ...services.auth.types import LoginRequest as AuthLoginRequest
        
        auth_request = AuthLoginRequest(
            username=request.username,
            password=request.password,
            remember_me=request.remember_me,
        )
        
        result = auth_service.login(session, auth_request)
        
        return AuthResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            token_type=result.token_type,
            expires_in=result.expires_in,
            user=result.user or {},
        )
        
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    session: Session = Depends(get_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    用户注册
    
    与 meetmind 的 POST /api/auth/register 对齐
    """
    try:
        from ...services.auth.types import RegisterRequest as AuthRegisterRequest
        
        auth_request = AuthRegisterRequest(
            username=request.username,
            email=request.email,
            password=request.password,
            nickname=request.nickname,
            role=UserRole(request.role) if request.role else UserRole.TEACHER,
        )
        
        result = auth_service.register(session, auth_request)
        
        return AuthResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            token_type=result.token_type,
            expires_in=result.expires_in,
            user=result.user or {},
        )
        
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    request: RefreshRequest,
    session: Session = Depends(get_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    刷新访问令牌
    
    与 meetmind 的 POST /api/auth/refresh 对齐
    """
    try:
        result = auth_service.refresh_access_token(session, request.refresh_token)
        
        return AuthResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            token_type=result.token_type,
            expires_in=result.expires_in,
            user=result.user or {},
        )
        
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    获取当前用户信息
    
    与 meetmind 的 GET /api/auth/me 对齐
    """
    role = auth_service.get_user_role(current_user)
    permissions = auth_service.get_user_permissions(current_user)
    
    return UserResponse(
        id=str(current_user.id),
        username=current_user.name,
        email=current_user.email,
        nickname=current_user.name,
        role=role.value,
        permissions=permissions,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )


@router.patch("/me", response_model=UserResponse)
async def update_me(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    更新当前用户资料
    
    与 meetmind 的 PATCH /api/auth/me 对齐
    """
    if request.nickname:
        current_user.name = request.nickname
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    role = auth_service.get_user_role(current_user)
    permissions = auth_service.get_user_permissions(current_user)
    
    return UserResponse(
        id=str(current_user.id),
        username=current_user.name,
        email=current_user.email,
        nickname=current_user.name,
        role=role.value,
        permissions=permissions,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )


@router.post("/password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    修改密码
    
    与 meetmind 的 POST /api/auth/password 对齐
    """
    # 验证旧密码
    if not auth_service.verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码错误",
        )
    
    # 验证新密码强度
    valid, message = auth_service.validate_password(request.new_password)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    
    # 更新密码
    current_user.hashed_password = auth_service.hash_password(request.new_password)
    session.add(current_user)
    session.commit()
    
    return {"message": "密码修改成功"}


@router.post("/logout")
async def logout(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    用户登出
    
    与 meetmind 的 POST /api/auth/logout 对齐
    """
    # 客户端需要清除 token
    return {"message": "登出成功"}
