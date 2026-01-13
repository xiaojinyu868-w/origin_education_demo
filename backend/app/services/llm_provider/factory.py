"""
LLM Provider 工厂 - 统一的模型获取接口

与 meetmind 的 llm-service.ts 对齐
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

from .base import (
    LLMConfig,
    LLMMessage,
    LLMProvider,
    LLMResponse,
    LLMError,
    LLMNotConfiguredError,
    ModelInfo,
    SUPPORTED_MODELS,
)
from .qwen import QwenProvider, get_qwen_provider
from .gemini import GeminiProvider, get_gemini_provider
from .openai_provider import OpenAIProvider, get_openai_provider


# 模型 ID 到 Provider 的映射
MODEL_PROVIDER_MAP: Dict[str, str] = {
    # Qwen 模型
    "qwen3-vl-plus-2025-01-25": "qwen",
    "qwen3-vl-plus": "qwen",
    "qwen3-max": "qwen",
    "qwen-max": "qwen",
    "qwen-turbo": "qwen",
    "qwen-plus": "qwen",
    # Gemini 模型
    "gemini-2.0-flash": "gemini",
    "gemini-2.0-flash-exp": "gemini",
    "gemini-1.5-pro": "gemini",
    "gemini-1.5-flash": "gemini",
    "gemini-pro": "gemini",
    # OpenAI 模型
    "gpt-4o": "openai",
    "gpt-4o-mini": "openai",
    "gpt-4-turbo": "openai",
    "gpt-4": "openai",
    "gpt-3.5-turbo": "openai",
}


class LLMProviderFactory:
    """LLM Provider 工厂类"""
    
    _providers: Dict[str, LLMProvider] = {}
    _default_provider: Optional[str] = None
    
    @classmethod
    def get_provider(cls, provider_name: str) -> LLMProvider:
        """获取指定的 Provider"""
        if provider_name not in cls._providers:
            if provider_name == "qwen":
                cls._providers["qwen"] = get_qwen_provider()
            elif provider_name == "gemini":
                cls._providers["gemini"] = get_gemini_provider()
            elif provider_name == "openai":
                cls._providers["openai"] = get_openai_provider()
            else:
                raise LLMError(f"Unknown provider: {provider_name}")
        return cls._providers[provider_name]
    
    @classmethod
    def get_provider_for_model(cls, model_id: str) -> LLMProvider:
        """根据模型 ID 获取对应的 Provider"""
        provider_name = MODEL_PROVIDER_MAP.get(model_id)
        if not provider_name:
            # 尝试通过前缀匹配
            if model_id.startswith("qwen"):
                provider_name = "qwen"
            elif model_id.startswith("gemini"):
                provider_name = "gemini"
            elif model_id.startswith("gpt"):
                provider_name = "openai"
            else:
                # 默认使用 Qwen
                provider_name = "qwen"
        return cls.get_provider(provider_name)
    
    @classmethod
    def get_default_provider(cls) -> LLMProvider:
        """获取默认 Provider"""
        # 优先级: Qwen > Gemini > OpenAI
        for provider_name in ["qwen", "gemini", "openai"]:
            provider = cls.get_provider(provider_name)
            if provider.is_available():
                return provider
        raise LLMNotConfiguredError("No LLM provider is configured.")
    
    @classmethod
    def get_available_providers(cls) -> List[str]:
        """获取所有可用的 Provider"""
        available = []
        for provider_name in ["qwen", "gemini", "openai"]:
            provider = cls.get_provider(provider_name)
            if provider.is_available():
                available.append(provider_name)
        return available
    
    @classmethod
    def get_all_models(cls) -> List[ModelInfo]:
        """获取所有支持的模型"""
        return SUPPORTED_MODELS.copy()
    
    @classmethod
    def get_available_models(cls) -> List[ModelInfo]:
        """获取所有可用的模型（已配置 API Key 的）"""
        available = []
        for model in SUPPORTED_MODELS:
            provider = cls.get_provider(model.provider)
            if provider.is_available():
                available.append(model)
        return available
    
    @classmethod
    def chat(
        cls,
        messages: List[LLMMessage],
        model: Optional[str] = None,
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """统一的对话接口"""
        if model:
            provider = cls.get_provider_for_model(model)
            if config is None:
                config = LLMConfig(model=model)
            else:
                config.model = model
        else:
            provider = cls.get_default_provider()
            if config is None:
                config = LLMConfig(model=provider.get_default_model())
        
        return provider.chat(messages, config)
    
    @classmethod
    async def chat_async(
        cls,
        messages: List[LLMMessage],
        model: Optional[str] = None,
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """统一的异步对话接口"""
        if model:
            provider = cls.get_provider_for_model(model)
            if config is None:
                config = LLMConfig(model=model)
            else:
                config.model = model
        else:
            provider = cls.get_default_provider()
            if config is None:
                config = LLMConfig(model=provider.get_default_model())
        
        return await provider.chat_async(messages, config)
    
    @classmethod
    def stream_chat(
        cls,
        messages: List[LLMMessage],
        model: Optional[str] = None,
        config: Optional[LLMConfig] = None,
    ):
        """统一的流式对话接口"""
        if model:
            provider = cls.get_provider_for_model(model)
            if config is None:
                config = LLMConfig(model=model)
            else:
                config.model = model
        else:
            provider = cls.get_default_provider()
            if config is None:
                config = LLMConfig(model=provider.get_default_model())
        
        return provider.stream_chat(messages, config)


# 便捷函数
def get_llm_provider(model_or_provider: Optional[str] = None) -> LLMProvider:
    """获取 LLM Provider
    
    Args:
        model_or_provider: 模型 ID 或 Provider 名称，为空则返回默认 Provider
    """
    if not model_or_provider:
        return LLMProviderFactory.get_default_provider()
    
    # 检查是否是 Provider 名称
    if model_or_provider in ["qwen", "gemini", "openai"]:
        return LLMProviderFactory.get_provider(model_or_provider)
    
    # 否则按模型 ID 处理
    return LLMProviderFactory.get_provider_for_model(model_or_provider)


def get_available_models() -> List[Dict[str, Any]]:
    """获取所有可用模型的信息"""
    models = LLMProviderFactory.get_available_models()
    return [model.to_dict() for model in models]


def chat(
    messages: List[LLMMessage],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> LLMResponse:
    """便捷的对话函数"""
    config = LLMConfig(
        model=model or "",
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return LLMProviderFactory.chat(messages, model, config)


async def chat_async(
    messages: List[LLMMessage],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> LLMResponse:
    """便捷的异步对话函数"""
    config = LLMConfig(
        model=model or "",
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return await LLMProviderFactory.chat_async(messages, model, config)
