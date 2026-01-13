"""
Gemini Imagen 图片生成服务
用于生成精美的错题笔记图片
"""

from __future__ import annotations

import base64
import os
import asyncio
from typing import Any, Dict, Optional

import httpx


class ImageGenNotConfiguredError(RuntimeError):
    """Raised when Gemini API credentials are missing."""


class ImageGenInvocationError(RuntimeError):
    """Raised when image generation fails."""


def _read_env(var_name: str, fallback: Optional[str] = None) -> Optional[str]:
    value = os.getenv(var_name)
    if value:
        return value
    return fallback


# 笔记图片风格配置
STYLE_CONFIGS = {
    "minimal": {
        "style_description": "Clean academic style, minimalist, professional, white background",
        "color_scheme": "white background, black text, blue accent color"
    },
    "cute": {
        "style_description": "Kawaii hand-drawn journal style, playful, with cute doodles",
        "color_scheme": "pastel colors, pink, mint green, soft yellow"
    },
    "dark": {
        "style_description": "Dark mode, modern tech aesthetic, sleek",
        "color_scheme": "dark gray background (#1a1a2e), white text, cyan accent (#00d4ff)"
    }
}


def _build_note_image_prompt(
    subject: str,
    topic: str,
    question_brief: str,
    key_insight: str,
    error_reason: Optional[str],
    solution_steps: str,
    style: str = "minimal"
) -> str:
    """构建笔记图片生成的Prompt"""
    
    style_config = STYLE_CONFIGS.get(style, STYLE_CONFIGS["minimal"])
    
    error_section = ""
    if error_reason:
        error_section = f"""
### Why I Got It Wrong
❌ {error_reason}
"""
    
    prompt = f"""Create a beautiful, Instagram-worthy study note image for a Chinese student.

## Visual Style
{style_config["style_description"]}
Color palette: {style_config["color_scheme"]}

## Content Layout (Top to Bottom)

### Header Section
📚 Subject: {subject}
📝 Topic: {topic}

### Question Summary (Brief)
{question_brief}

### ⭐ KEY INSIGHT - Make This the Visual Focus! ⭐
💡 "{key_insight}"
(This should be the largest, most prominent text on the image - it's the student's own summary!)
{error_section}
### Solution Steps
{solution_steps}

## Design Requirements
1. Aspect ratio: 9:16 (vertical, mobile phone friendly)
2. The KEY INSIGHT must be visually dominant - use large font, highlight box, or special styling
3. Clean, organized layout with clear visual hierarchy
4. Use icons/emojis sparingly for visual interest
5. Make it look like a beautiful note worth saving to phone
6. All text should be in Chinese where appropriate
7. Include subtle decorative elements but keep it clean and readable
8. Typography: Modern, clean fonts that work well with Chinese characters
9. Add a subtle watermark or logo area at the bottom (small, unobtrusive)

Generate a single, complete study note image following these specifications.
"""
    return prompt


class GeminiImageGenerator:
    """Gemini图片生成客户端"""
    
    def __init__(self) -> None:
        self._api_key = _read_env("GEMINI_API_KEY")
        self._base_url = _read_env(
            "GEMINI_BASE_URL", 
            "https://generativelanguage.googleapis.com/v1beta"
        )
        self._model = _read_env("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-exp")
    
    def is_available(self) -> bool:
        """检查服务是否可用"""
        return bool(self._api_key)
    
    def _get_aspect_ratio(self, width: int, height: int) -> str:
        """计算宽高比"""
        ratio = width / height
        if abs(ratio - 1.0) < 0.1:
            return "1:1"
        if abs(ratio - 4.0 / 3.0) < 0.1:
            return "4:3"
        if abs(ratio - 3.0 / 4.0) < 0.1:
            return "3:4"
        if abs(ratio - 16.0 / 9.0) < 0.1:
            return "16:9"
        if abs(ratio - 9.0 / 16.0) < 0.1:
            return "9:16"
        return "9:16"  # 默认竖屏
    
    async def generate_note_image(
        self,
        subject: str,
        topic: str,
        question_brief: str,
        key_insight: str,
        error_reason: Optional[str],
        solution_steps: str,
        style: str = "minimal",
        size: str = "1080x1920"
    ) -> bytes:
        """
        生成笔记图片
        
        Args:
            subject: 学科
            topic: 知识点
            question_brief: 题目简述
            key_insight: 关键要点（用户自己的总结）
            error_reason: 错因
            solution_steps: 解题步骤
            style: 图片风格 (minimal/cute/dark)
            size: 图片尺寸
            
        Returns:
            图片的bytes数据
        """
        if not self._api_key:
            raise ImageGenNotConfiguredError(
                "Missing GEMINI_API_KEY; cannot generate images."
            )
        
        prompt = _build_note_image_prompt(
            subject=subject,
            topic=topic,
            question_brief=question_brief,
            key_insight=key_insight,
            error_reason=error_reason,
            solution_steps=solution_steps,
            style=style
        )
        
        # 解析尺寸
        width, height = map(int, size.split("x"))
        aspect_ratio = self._get_aspect_ratio(width, height)
        
        # 构建API URL
        normalized_base = self._base_url.rstrip("/")
        if "/v1beta" not in normalized_base:
            normalized_base = f"{normalized_base}/v1beta"
        url = f"{normalized_base}/models/{self._model}:generateContent"
        
        # 构建请求体
        request_body = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
            }
        }
        
        # 发送请求（带重试）
        max_retries = 3
        last_error: Optional[Exception] = None
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            for attempt in range(1, max_retries + 1):
                try:
                    response = await client.post(
                        url,
                        headers={
                            "Content-Type": "application/json",
                            "x-goog-api-key": self._api_key,
                        },
                        json=request_body
                    )
                    
                    if response.status_code == 429 or response.status_code == 503:
                        # 限流，等待后重试
                        backoff = min(8.0, 1.0 * (2 ** (attempt - 1)))
                        await asyncio.sleep(backoff)
                        continue
                    
                    if not response.is_success:
                        error_text = response.text
                        raise ImageGenInvocationError(
                            f"Gemini API error: {response.status_code} - {error_text}"
                        )
                    
                    result = response.json()
                    return self._extract_image_data(result)
                    
                except httpx.TimeoutException as exc:
                    last_error = exc
                    if attempt < max_retries:
                        backoff = min(8.0, 1.0 * (2 ** (attempt - 1)))
                        await asyncio.sleep(backoff)
                        continue
                except ImageGenInvocationError:
                    raise
                except Exception as exc:
                    last_error = exc
                    if attempt < max_retries:
                        backoff = min(8.0, 1.0 * (2 ** (attempt - 1)))
                        await asyncio.sleep(backoff)
                        continue
        
        raise ImageGenInvocationError(
            f"Image generation failed after {max_retries} retries: {last_error}"
        )
    
    def _extract_image_data(self, response: Dict[str, Any]) -> bytes:
        """从API响应中提取图片数据"""
        
        # Gemini API 标准格式
        if "candidates" in response and response["candidates"]:
            candidate = response["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                for part in candidate["content"]["parts"]:
                    if "inlineData" in part and "data" in part["inlineData"]:
                        return base64.b64decode(part["inlineData"]["data"])
        
        # 兼容旧格式
        if "generatedImages" in response and response["generatedImages"]:
            image_data = response["generatedImages"][0]
            if "imageBytes" in image_data:
                return base64.b64decode(image_data["imageBytes"])
        
        raise ImageGenInvocationError(
            "Invalid response format from Gemini Image API - no image data found"
        )


# 全局实例
_generator: Optional[GeminiImageGenerator] = None


def get_image_generator() -> GeminiImageGenerator:
    """获取图片生成器实例"""
    global _generator
    if _generator is None:
        _generator = GeminiImageGenerator()
    return _generator


def image_gen_available() -> bool:
    """检查图片生成服务是否可用"""
    return get_image_generator().is_available()


async def generate_note_image(
    subject: str,
    topic: str,
    question_brief: str,
    key_insight: str,
    error_reason: Optional[str],
    solution_steps: str,
    style: str = "minimal"
) -> bytes:
    """
    生成笔记图片的便捷函数
    
    Returns:
        图片的bytes数据
    """
    generator = get_image_generator()
    return await generator.generate_note_image(
        subject=subject,
        topic=topic,
        question_brief=question_brief,
        key_insight=key_insight,
        error_reason=error_reason,
        solution_steps=solution_steps,
        style=style
    )
