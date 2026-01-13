"""
通用 AI 对话 API - 与 meetmind 的 /api/chat 对齐

支持功能:
- 多模型切换
- 流式响应
- 多模态输入
"""

from __future__ import annotations

import json
from typing import Any, Dict, Iterator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ...models import User
from ...services.auth import get_current_user_optional
from ...services.llm_provider import (
    LLMProviderFactory,
    LLMMessage,
    LLMConfig,
    LLMError,
    LLMNotConfiguredError,
    get_available_models,
)

router = APIRouter(prefix="/chat", tags=["AI 对话"])


# ============ 请求/响应模型 ============

class ChatMessage(BaseModel):
    """对话消息"""
    role: str = Field(..., description="角色: system | user | assistant")
    content: Any = Field(..., description="消息内容，可以是字符串或多模态数组")


class ChatRequest(BaseModel):
    """对话请求 - 与 meetmind 对齐"""
    messages: List[ChatMessage] = Field(..., description="消息列表")
    model: Optional[str] = Field(None, description="模型ID")
    stream: bool = Field(False, description="是否流式响应")
    context: Optional[str] = Field(None, description="额外上下文")
    temperature: float = Field(0.7, description="温度参数 0-1")
    max_tokens: Optional[int] = Field(None, alias="maxTokens", description="最大 token 数")
    
    class Config:
        populate_by_name = True


class ChatResponse(BaseModel):
    """对话响应"""
    content: str = Field(..., description="回复内容")
    model: str = Field(..., description="使用的模型")
    usage: Optional[Dict[str, int]] = Field(None, description="Token 使用统计")


class ModelsResponse(BaseModel):
    """模型列表响应"""
    models: List[Dict[str, Any]]
    default_model: str = Field(..., alias="defaultModel")
    
    class Config:
        populate_by_name = True


def _format_sse_event(event: str, data: Any) -> str:
    """格式化 SSE 事件"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# ============ API 端点 ============

@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    通用 AI 对话
    
    与 meetmind 的 POST /api/chat 对齐
    """
    try:
        # 转换消息格式
        messages = []
        for msg in request.messages:
            messages.append(LLMMessage(role=msg.role, content=msg.content))
        
        # 添加上下文
        if request.context and messages:
            # 在第一条用户消息前添加上下文
            for i, msg in enumerate(messages):
                if msg.role == "user":
                    if isinstance(msg.content, str):
                        messages[i] = LLMMessage(
                            role="user",
                            content=f"上下文信息：{request.context}\n\n{msg.content}",
                        )
                    break
        
        config = LLMConfig(
            model=request.model or "",
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        
        if request.stream:
            # 流式响应
            def generate() -> Iterator[str]:
                try:
                    full_content = ""
                    for chunk in LLMProviderFactory.stream_chat(
                        messages,
                        model=request.model,
                        config=config,
                    ):
                        full_content += chunk
                        yield _format_sse_event("content", {"text": chunk})
                    
                    yield _format_sse_event("done", {"fullContent": full_content})
                except LLMError as e:
                    yield _format_sse_event("error", {"message": str(e)})
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )
        else:
            # 非流式响应
            response = LLMProviderFactory.chat(
                messages,
                model=request.model,
                config=config,
            )
            
            result = ChatResponse(
                content=response.content,
                model=response.model,
            )
            if response.usage:
                result.usage = response.usage.to_dict()
            
            return result
            
    except LLMNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM 服务未配置: {str(e)}",
        )
    except LLMError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM 调用失败: {str(e)}",
        )


@router.get("", response_model=ModelsResponse)
@router.get("/", response_model=ModelsResponse)
async def get_models():
    """
    获取可用模型列表
    
    与 meetmind 的 GET /api/chat 对齐
    """
    models = get_available_models()
    default_model = "qwen3-vl-plus-2025-01-25"
    
    # 如果有可用模型，使用第一个作为默认
    if models:
        default_model = models[0].get("id", default_model)
    
    return ModelsResponse(
        models=models,
        default_model=default_model,
    )
