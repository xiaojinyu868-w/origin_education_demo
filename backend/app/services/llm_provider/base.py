"""
LLM Provider 基类定义 - 统一的多模型调用接口

与 meetmind 项目的 llm-service.ts 对齐
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional, Union


class LLMError(Exception):
    """LLM 调用基础异常"""
    pass


class LLMNotConfiguredError(LLMError):
    """API Key 未配置异常"""
    pass


class LLMInvocationError(LLMError):
    """LLM 调用失败异常"""
    pass


class MessageRole(str, Enum):
    """消息角色"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class LLMMessage:
    """统一的消息格式 - 支持多模态"""
    role: str  # system, user, assistant
    content: Union[str, List[Dict[str, Any]]]  # 文本或多模态内容
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LLMMessage":
        return cls(
            role=data.get("role", "user"),
            content=data.get("content", ""),
        )
    
    @classmethod
    def system(cls, content: str) -> "LLMMessage":
        return cls(role="system", content=content)
    
    @classmethod
    def user(cls, content: Union[str, List[Dict[str, Any]]]) -> "LLMMessage":
        return cls(role="user", content=content)
    
    @classmethod
    def assistant(cls, content: str) -> "LLMMessage":
        return cls(role="assistant", content=content)
    
    @classmethod
    def user_with_image(cls, text: str, image_url: str) -> "LLMMessage":
        """创建包含图片的用户消息"""
        return cls(
            role="user",
            content=[
                {"type": "image_url", "image_url": {"url": image_url}},
                {"type": "text", "text": text},
            ],
        )


@dataclass
class LLMUsage:
    """Token 使用统计"""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    
    def to_dict(self) -> Dict[str, int]:
        return {
            "promptTokens": self.prompt_tokens,
            "completionTokens": self.completion_tokens,
            "totalTokens": self.total_tokens,
        }


@dataclass
class LLMResponse:
    """统一的 LLM 响应格式"""
    content: str
    model: str
    usage: Optional[LLMUsage] = None
    raw_response: Optional[Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "content": self.content,
            "model": self.model,
        }
        if self.usage:
            result["usage"] = self.usage.to_dict()
        return result


@dataclass
class LLMConfig:
    """LLM 配置"""
    model: str
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    presence_penalty: Optional[float] = None
    frequency_penalty: Optional[float] = None
    stream: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "model": self.model,
            "temperature": self.temperature,
        }
        if self.max_tokens is not None:
            result["maxTokens"] = self.max_tokens
        if self.top_p is not None:
            result["topP"] = self.top_p
        if self.presence_penalty is not None:
            result["presencePenalty"] = self.presence_penalty
        if self.frequency_penalty is not None:
            result["frequencyPenalty"] = self.frequency_penalty
        return result


@dataclass
class ModelInfo:
    """模型信息"""
    id: str
    name: str
    provider: str  # qwen, gemini, openai
    description: str
    supports_vision: bool = False
    supports_streaming: bool = True
    max_context_length: int = 128000
    default_temperature: float = 0.7
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "provider": self.provider,
            "description": self.description,
            "supportsVision": self.supports_vision,
            "supportsStreaming": self.supports_streaming,
            "maxContextLength": self.max_context_length,
            "defaultTemperature": self.default_temperature,
        }


# 支持的模型列表 - 与 meetmind 对齐
SUPPORTED_MODELS: List[ModelInfo] = [
    # 通义千问模型
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
    # Google Gemini 模型
    ModelInfo(
        id="gemini-2.0-flash",
        name="Gemini 2.0 Flash",
        provider="gemini",
        description="快速响应，支持多模态",
        supports_vision=True,
        max_context_length=1000000,
    ),
    ModelInfo(
        id="gemini-1.5-pro",
        name="Gemini 1.5 Pro",
        provider="gemini",
        description="100万上下文，强大推理能力",
        supports_vision=True,
        max_context_length=1000000,
    ),
    # OpenAI 模型
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
]


class LLMProvider(ABC):
    """LLM Provider 抽象基类"""
    
    provider_name: str = "base"
    
    @abstractmethod
    def chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """同步对话"""
        pass
    
    @abstractmethod
    async def chat_async(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """异步对话"""
        pass
    
    @abstractmethod
    def stream_chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> AsyncIterator[str]:
        """流式对话"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """检查是否可用"""
        pass
    
    @abstractmethod
    def get_supported_models(self) -> List[ModelInfo]:
        """获取支持的模型列表"""
        pass
    
    def get_default_model(self) -> str:
        """获取默认模型"""
        models = self.get_supported_models()
        return models[0].id if models else ""
