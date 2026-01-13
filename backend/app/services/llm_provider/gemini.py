"""
Google Gemini Provider 实现

支持模型:
- gemini-2.0-flash: 快速响应，支持多模态
- gemini-1.5-pro: 100万上下文，强大推理能力
"""

from __future__ import annotations

import base64
import json
import os
import re
from functools import lru_cache
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional

import httpx

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


class GeminiProvider(LLMProvider):
    """Google Gemini Provider"""
    
    provider_name = "gemini"
    
    # 支持的模型
    MODELS = [
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
        ModelInfo(
            id="gemini-1.5-flash",
            name="Gemini 1.5 Flash",
            provider="gemini",
            description="轻量快速，性价比高",
            supports_vision=True,
            max_context_length=1000000,
        ),
    ]
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self._api_key = api_key or _read_env("GEMINI_API_KEY") or _read_env("GOOGLE_API_KEY")
        self._base_url = base_url or _read_env(
            "GEMINI_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta"
        )
        self._default_model = _read_env("GEMINI_MODEL", "gemini-2.0-flash")
    
    def _convert_message_to_gemini(self, msg: LLMMessage) -> Dict[str, Any]:
        """转换消息格式为 Gemini 格式"""
        parts = []
        
        if isinstance(msg.content, str):
            parts.append({"text": msg.content})
        elif isinstance(msg.content, list):
            for item in msg.content:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        parts.append({"text": item.get("text", "")})
                    elif item.get("type") == "image_url":
                        image_url = item.get("image_url", {}).get("url", "")
                        # 处理 base64 图片
                        if image_url.startswith("data:"):
                            match = re.match(r"data:([^;]+);base64,(.+)", image_url)
                            if match:
                                mime_type = match.group(1)
                                base64_data = match.group(2)
                                parts.append({
                                    "inline_data": {
                                        "mime_type": mime_type,
                                        "data": base64_data,
                                    }
                                })
                        else:
                            # URL 图片
                            parts.append({
                                "file_data": {
                                    "file_uri": image_url,
                                }
                            })
                else:
                    parts.append({"text": str(item)})
        
        # Gemini 使用 "user" 和 "model" 作为角色
        role = "user" if msg.role in ("user", "system") else "model"
        
        return {
            "role": role,
            "parts": parts,
        }
    
    def _prepare_messages(self, messages: List[LLMMessage]) -> tuple[Optional[str], List[Dict[str, Any]]]:
        """准备消息，分离 system prompt"""
        system_instruction = None
        contents = []
        
        for msg in messages:
            if msg.role == "system":
                # Gemini 使用单独的 system_instruction
                if isinstance(msg.content, str):
                    system_instruction = msg.content
                continue
            contents.append(self._convert_message_to_gemini(msg))
        
        return system_instruction, contents
    
    def chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """同步对话"""
        if not self._api_key:
            raise LLMNotConfiguredError(
                "Missing GEMINI_API_KEY or GOOGLE_API_KEY; cannot reach the Gemini service."
            )
        
        model = config.model if config and config.model else self._default_model
        system_instruction, contents = self._prepare_messages(messages)
        
        url = f"{self._base_url}/models/{model}:generateContent?key={self._api_key}"
        
        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": config.temperature if config else 0.7,
            },
        }
        
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
        if config:
            if config.max_tokens:
                payload["generationConfig"]["maxOutputTokens"] = config.max_tokens
            if config.top_p is not None:
                payload["generationConfig"]["topP"] = config.top_p
        
        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        
        if "candidates" not in data or not data["candidates"]:
            raise LLMInvocationError("Gemini returned no candidates.")
        
        candidate = data["candidates"][0]
        content_parts = candidate.get("content", {}).get("parts", [])
        content = "".join(part.get("text", "") for part in content_parts)
        
        usage = None
        if "usageMetadata" in data:
            metadata = data["usageMetadata"]
            usage = LLMUsage(
                prompt_tokens=metadata.get("promptTokenCount", 0),
                completion_tokens=metadata.get("candidatesTokenCount", 0),
                total_tokens=metadata.get("totalTokenCount", 0),
            )
        
        return LLMResponse(
            content=content,
            model=model,
            usage=usage,
            raw_response=data,
        )
    
    async def chat_async(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """异步对话"""
        if not self._api_key:
            raise LLMNotConfiguredError(
                "Missing GEMINI_API_KEY or GOOGLE_API_KEY; cannot reach the Gemini service."
            )
        
        model = config.model if config and config.model else self._default_model
        system_instruction, contents = self._prepare_messages(messages)
        
        url = f"{self._base_url}/models/{model}:generateContent?key={self._api_key}"
        
        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": config.temperature if config else 0.7,
            },
        }
        
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
        if config:
            if config.max_tokens:
                payload["generationConfig"]["maxOutputTokens"] = config.max_tokens
            if config.top_p is not None:
                payload["generationConfig"]["topP"] = config.top_p
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        
        if "candidates" not in data or not data["candidates"]:
            raise LLMInvocationError("Gemini returned no candidates.")
        
        candidate = data["candidates"][0]
        content_parts = candidate.get("content", {}).get("parts", [])
        content = "".join(part.get("text", "") for part in content_parts)
        
        usage = None
        if "usageMetadata" in data:
            metadata = data["usageMetadata"]
            usage = LLMUsage(
                prompt_tokens=metadata.get("promptTokenCount", 0),
                completion_tokens=metadata.get("candidatesTokenCount", 0),
                total_tokens=metadata.get("totalTokenCount", 0),
            )
        
        return LLMResponse(
            content=content,
            model=model,
            usage=usage,
            raw_response=data,
        )
    
    def stream_chat(
        self,
        messages: List[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> Iterator[str]:
        """流式对话"""
        if not self._api_key:
            raise LLMNotConfiguredError(
                "Missing GEMINI_API_KEY or GOOGLE_API_KEY; cannot reach the Gemini service."
            )
        
        model = config.model if config and config.model else self._default_model
        system_instruction, contents = self._prepare_messages(messages)
        
        url = f"{self._base_url}/models/{model}:streamGenerateContent?key={self._api_key}&alt=sse"
        
        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": config.temperature if config else 0.7,
            },
        }
        
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
        if config:
            if config.max_tokens:
                payload["generationConfig"]["maxOutputTokens"] = config.max_tokens
            if config.top_p is not None:
                payload["generationConfig"]["topP"] = config.top_p
        
        with httpx.Client(timeout=120.0) as client:
            with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data = json.loads(line[6:])
                        if "candidates" in data and data["candidates"]:
                            candidate = data["candidates"][0]
                            content_parts = candidate.get("content", {}).get("parts", [])
                            for part in content_parts:
                                if "text" in part:
                                    yield part["text"]
    
    def is_available(self) -> bool:
        """检查是否可用"""
        return bool(self._api_key)
    
    def get_supported_models(self) -> List[ModelInfo]:
        """获取支持的模型列表"""
        return self.MODELS.copy()
    
    def get_default_model(self) -> str:
        return self._default_model


@lru_cache(maxsize=1)
def get_gemini_provider() -> GeminiProvider:
    """获取 Gemini Provider 单例"""
    return GeminiProvider()
