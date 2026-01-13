"""
通义千问 Provider 实现

支持模型:
- qwen3-vl-plus-2025-01-25: 多模态视觉模型
- qwen3-max: 最强推理能力
- qwen-turbo: 快速响应
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional

from openai import OpenAI

from .base import (
    LLMConfig,
    LLMError,
    LLMMessage,
    LLMNotConfiguredError,
    LLMInvocationError,
    LLMProvider,
    LLMResponse,
    LLMUsage,
    ModelInfo,
)


def _read_env(var_name: str, fallback: Optional[str] = None) -> Optional[str]:
    value = os.getenv(var_name)
    return value if value else fallback


class QwenProvider(LLMProvider):
    """通义千问 Provider"""
    
    provider_name = "qwen"
    
    # 支持的模型
    MODELS = [
        ModelInfo(
            id="qwen3-vl-plus-2025-01-25",
            name="通义千问 3 VL Plus",
            provider="qwen",
            description="多模态视觉模型，支持图片理解（推荐）",
            supports_vision=True,
            max_context_length=128000,
        ),
        ModelInfo(
            id="qwen3-max",
            name="通义千问 3 Max",
            provider="qwen",
            description="最强推理能力，适合复杂任务",
            supports_vision=False,
            max_context_length=128000,
        ),
        ModelInfo(
            id="qwen-turbo",
            name="通义千问 Turbo",
            provider="qwen",
            description="快速响应，适合简单任务",
            supports_vision=False,
            max_context_length=128000,
        ),
    ]
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self._api_key = api_key or _read_env("DASHSCOPE_API_KEY") or _read_env("QWEN_API_KEY")
        self._base_url = base_url or _read_env(
            "QWEN_BASE_URL", 
            "https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        self._client: Optional[OpenAI] = None
        self._default_model = _read_env("QWEN_TEXT_MODEL", "qwen3-max")
        self._vision_model = _read_env("QWEN_VL_MODEL", "qwen3-vl-plus-2025-01-25")
    
    def _get_client(self) -> OpenAI:
        if not self._api_key:
            raise LLMNotConfiguredError(
                "Missing DASHSCOPE_API_KEY or QWEN_API_KEY; cannot reach the Qwen service."
            )
        if self._client is None:
            self._client = OpenAI(api_key=self._api_key, base_url=self._base_url)
        return self._client
    
    def _prepare_messages(self, messages: List[LLMMessage]) -> List[Dict[str, Any]]:
        """转换消息格式"""
        result = []
        for msg in messages:
            result.append({
                "role": msg.role,
                "content": msg.content,
            })
        return result
    
    def _has_vision_content(self, messages: List[LLMMessage]) -> bool:
        """检查是否包含图片内容"""
        for msg in messages:
            if isinstance(msg.content, list):
                for item in msg.content:
                    if isinstance(item, dict) and item.get("type") == "image_url":
                        return True
        return False
    
    def _select_model(self, config: Optional[LLMConfig], messages: List[LLMMessage]) -> str:
        """选择合适的模型"""
        if config and config.model:
            return config.model
        # 如果包含图片，使用视觉模型
        if self._has_vision_content(messages):
            return self._vision_model
        return self._default_model
    
    def chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """同步对话"""
        client = self._get_client()
        model = self._select_model(config, messages)
        
        params: Dict[str, Any] = {
            "model": model,
            "messages": self._prepare_messages(messages),
            "temperature": config.temperature if config else 0.7,
        }
        
        if config:
            if config.max_tokens:
                params["max_tokens"] = config.max_tokens
            if config.top_p is not None:
                params["top_p"] = config.top_p
            if config.presence_penalty is not None:
                params["presence_penalty"] = config.presence_penalty
            if config.frequency_penalty is not None:
                params["frequency_penalty"] = config.frequency_penalty
        
        response = client.chat.completions.create(**params)
        
        if not response.choices:
            raise LLMInvocationError("Qwen returned no choices.")
        
        content = response.choices[0].message.content or ""
        usage = None
        if response.usage:
            usage = LLMUsage(
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens,
            )
        
        return LLMResponse(
            content=content,
            model=model,
            usage=usage,
            raw_response=response,
        )
    
    async def chat_async(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """异步对话 - 当前使用同步实现"""
        # TODO: 使用 httpx 实现真正的异步
        return self.chat(messages, config)
    
    def stream_chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> Iterator[str]:
        """流式对话"""
        client = self._get_client()
        model = self._select_model(config, messages)
        
        params: Dict[str, Any] = {
            "model": model,
            "messages": self._prepare_messages(messages),
            "temperature": config.temperature if config else 0.7,
            "stream": True,
        }
        
        if config:
            if config.max_tokens:
                params["max_tokens"] = config.max_tokens
            if config.top_p is not None:
                params["top_p"] = config.top_p
        
        stream = client.chat.completions.create(**params)
        
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    def is_available(self) -> bool:
        """检查是否可用"""
        return bool(self._api_key)
    
    def get_supported_models(self) -> List[ModelInfo]:
        """获取支持的模型列表"""
        return self.MODELS.copy()
    
    def get_default_model(self) -> str:
        return self._default_model


@lru_cache(maxsize=1)
def get_qwen_provider() -> QwenProvider:
    """获取 Qwen Provider 单例"""
    return QwenProvider()
