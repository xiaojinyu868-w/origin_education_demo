"""
LLM Provider 抽象层 - 与 meetmind 对齐的多模型支持

支持的模型提供商:
- 通义千问 (Qwen): qwen3-vl-plus, qwen3-max
- Google Gemini: gemini-3-pro, gemini-3-flash
- OpenAI: gpt-5.2, gpt-5-mini
"""

from .base import (
    LLMProvider,
    LLMConfig,
    LLMMessage,
    LLMResponse,
    LLMError,
    LLMNotConfiguredError,
)
from .factory import LLMProviderFactory, get_llm_provider, get_available_models
from .qwen import QwenProvider
from .gemini import GeminiProvider
from .openai_provider import OpenAIProvider

__all__ = [
    # Base classes
    "LLMProvider",
    "LLMConfig",
    "LLMMessage",
    "LLMResponse",
    "LLMError",
    "LLMNotConfiguredError",
    # Providers
    "QwenProvider",
    "GeminiProvider",
    "OpenAIProvider",
    # Factory
    "LLMProviderFactory",
    "get_llm_provider",
    "get_available_models",
]
