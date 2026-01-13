"""
OpenAI Provider 实现

支持模型:
- gpt-4o: 旗舰多模态模型
- gpt-4o-mini: 轻量快速，性价比高
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


class OpenAIProvider(LLMProvider):
    """OpenAI Provider"""
    
    provider_name = "openai"
    
    # 支持的模型
    MODELS = [
        ModelInfo(
            id="gpt-4o",
            name="GPT-4o",
            provider="openai",
            description="旗舰多模态模型",
            supports_vision=True,
            max_context_length=128000,
        ),
        ModelInfo(
            id="gpt-4o-mini",
            name="GPT-4o Mini",
            provider="openai",
            description="轻量快速，性价比高",
            supports_vision=True,
            max_context_length=128000,
        ),
        ModelInfo(
            id="gpt-4-turbo",
            name="GPT-4 Turbo",
            provider="openai",
            description="强大推理能力",
            supports_vision=True,
            max_context_length=128000,
        ),
        ModelInfo(
            id="gpt-3.5-turbo",
            name="GPT-3.5 Turbo",
            provider="openai",
            description="经济实惠，快速响应",
            supports_vision=False,
            max_context_length=16385,
        ),
    ]
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self._api_key = api_key or _read_env("OPENAI_API_KEY")
        self._base_url = base_url or _read_env("OPENAI_BASE_URL")
        self._client: Optional[OpenAI] = None
        self._default_model = _read_env("OPENAI_MODEL", "gpt-4o-mini")
    
    def _get_client(self) -> OpenAI:
        if not self._api_key:
            raise LLMNotConfiguredError(
                "Missing OPENAI_API_KEY; cannot reach the OpenAI service."
            )
        if self._client is None:
            kwargs: Dict[str, Any] = {"api_key": self._api_key}
            if self._base_url:
                kwargs["base_url"] = self._base_url
            self._client = OpenAI(**kwargs)
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
    
    def chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """同步对话"""
        client = self._get_client()
        model = config.model if config and config.model else self._default_model
        
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
            raise LLMInvocationError("OpenAI returned no choices.")
        
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
        # TODO: 使用 AsyncOpenAI 实现真正的异步
        return self.chat(messages, config)
    
    def stream_chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> Iterator[str]:
        """流式对话"""
        client = self._get_client()
        model = config.model if config and config.model else self._default_model
        
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
def get_openai_provider() -> OpenAIProvider:
    """获取 OpenAI Provider 单例"""
    return OpenAIProvider()
