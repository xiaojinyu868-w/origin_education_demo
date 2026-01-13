"""
AI引导对话服务
用于引导学生描述解题过程
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any, Dict, List, Optional, Tuple

from openai import OpenAI

from .llm import _get_client, _parse_json_payload, LLMNotConfiguredError, LLMInvocationError


def _read_env(var_name: str, fallback: Optional[str] = None) -> Optional[str]:
    value = os.getenv(var_name)
    if value:
        return value
    return fallback


# 引导对话的System Prompt
GUIDE_SYSTEM_PROMPT = """你是一个温和、有耐心的学习助手，帮助学生整理错题笔记。

## 你的任务
通过对话引导学生：
1. 回忆做题时的思路
2. 找出错误的原因
3. 总结正确的解法要点
4. 形成自己的记忆点

## 对话风格
- 像朋友一样聊天，不要太正式
- 多用引导性问题，少直接给答案
- 鼓励学生自己思考和总结
- 每次只问一个问题，不要连续追问
- 回复简短，不超过50字

## 引导问题库（根据情况选用）
- "这道题你当时是怎么想的？"
- "在哪一步开始感觉不对了？"
- "现在知道正确答案了吗？关键点在哪？"
- "如果用一句话总结这道题的坑，你会怎么说？"
- "下次遇到类似的题，第一步应该做什么？"

## 对话控制
- 一般进行3-5轮对话
- 当学生能清晰总结出要点时，可以结束对话
- 如果学生说"不知道"或"忘了"，给予鼓励并换个角度提问

## 输出格式
必须返回JSON格式：
{
  "ai_message": "你的回复（简短友好）",
  "is_complete": false,
  "key_insight": null,
  "analysis": null
}

当对话可以结束时（学生总结出了要点）：
{
  "ai_message": "总结得很好！...",
  "is_complete": true,
  "key_insight": "学生总结的关键要点",
  "analysis": {
    "subject": "学科",
    "topic": "知识点",
    "question_brief": "题目简述",
    "error_reason": "错误原因",
    "solution_steps": "解题步骤要点"
  }
}
"""


def _build_data_url(image_bytes: bytes, mime_type: str = "image/png") -> str:
    """构建base64图片URL"""
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{base64_image}"


class GuideChatService:
    """AI引导对话服务"""
    
    def __init__(self) -> None:
        self._client = _get_client()
        self._vision_model = _read_env("QWEN_VL_MODEL", "qwen-vl-max")
        self._text_model = _read_env("QWEN_TEXT_MODEL", "qwen-max")
    
    def _image_payload(self, image_bytes: bytes, mime_type: str = "image/png") -> Dict[str, Any]:
        """构建图片消息payload"""
        return {
            "type": "image_url",
            "image_url": {"url": _build_data_url(image_bytes, mime_type)}
        }
    
    async def start_chat(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        开始对话 - 识别题目并生成第一个引导问题
        
        Args:
            image_bytes: 错题图片的bytes数据
            
        Returns:
            {
                "ai_message": "引导问题",
                "is_complete": false,
                "image_description": "题目描述"
            }
        """
        system_prompt = """你是一个学习助手。请先识别图片中的题目，然后用友好的方式开始对话。

## 任务
1. 识别图片中的题目内容（学科、知识点、题目大意）
2. 用一句简短友好的话开始对话，引导学生说说当时怎么想的

## 输出格式（JSON）
{
  "ai_message": "开场白+第一个引导问题（不超过40字）",
  "is_complete": false,
  "image_description": "题目的简要描述（学科、知识点、题目类型）"
}

示例输出：
{
  "ai_message": "这道函数题看起来有点难度！你当时是怎么想的？",
  "is_complete": false,
  "image_description": "数学-函数求导-求函数最值问题"
}
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    self._image_payload(image_bytes),
                    {"type": "text", "text": "请识别这道题并开始对话"}
                ]
            }
        ]
        
        response = self._client.chat.completions.create(
            model=self._vision_model,
            messages=messages,
            temperature=0.7,
        )
        
        if not response.choices:
            raise LLMInvocationError("LLM returned no response")
        
        content = response.choices[0].message.content or ""
        result = _parse_json_payload(content)
        
        return {
            "ai_message": result.get("ai_message", "这道题你当时是怎么想的？"),
            "is_complete": False,
            "image_description": result.get("image_description", "")
        }
    
    async def continue_chat(
        self,
        image_description: str,
        chat_history: List[Dict[str, str]],
        user_message: str
    ) -> Dict[str, Any]:
        """
        继续对话 - 根据用户回复生成下一个引导问题或总结
        
        Args:
            image_description: 题目描述
            chat_history: 对话历史 [{"role": "ai/user", "content": "..."}]
            user_message: 用户最新回复
            
        Returns:
            {
                "ai_message": "AI回复",
                "is_complete": bool,
                "key_insight": "关键要点（如果完成）",
                "analysis": {...}（如果完成）
            }
        """
        # 构建对话历史文本
        history_text = ""
        for msg in chat_history:
            role = "AI" if msg["role"] == "ai" else "学生"
            history_text += f"{role}: {msg['content']}\n"
        
        user_prompt = f"""## 题目信息
{image_description}

## 对话历史
{history_text}

## 学生最新回复
{user_message}

请根据以上信息，给出下一个引导问题或总结。
- 如果学生已经能清晰总结出要点，设置 is_complete 为 true
- 如果还需要继续引导，设置 is_complete 为 false
- 回复要简短友好，不超过50字
"""
        
        messages = [
            {"role": "system", "content": GUIDE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self._client.chat.completions.create(
            model=self._text_model,
            messages=messages,
            temperature=0.7,
        )
        
        if not response.choices:
            raise LLMInvocationError("LLM returned no response")
        
        content = response.choices[0].message.content or ""
        result = _parse_json_payload(content)
        
        return {
            "ai_message": result.get("ai_message", "能再说说吗？"),
            "is_complete": result.get("is_complete", False),
            "key_insight": result.get("key_insight"),
            "analysis": result.get("analysis")
        }
    
    async def force_complete(
        self,
        image_description: str,
        chat_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        强制结束对话并生成总结
        
        Args:
            image_description: 题目描述
            chat_history: 对话历史
            
        Returns:
            {
                "ai_message": "总结",
                "is_complete": true,
                "key_insight": "关键要点",
                "analysis": {...}
            }
        """
        history_text = ""
        for msg in chat_history:
            role = "AI" if msg["role"] == "ai" else "学生"
            history_text += f"{role}: {msg['content']}\n"
        
        user_prompt = f"""## 题目信息
{image_description}

## 对话历史
{history_text}

请根据以上对话，总结出学生的关键收获。即使学生没有明确总结，也请根据对话内容提炼出要点。

必须返回JSON：
{{
  "ai_message": "总结性的话（简短鼓励）",
  "is_complete": true,
  "key_insight": "从对话中提炼的关键要点（一句话）",
  "analysis": {{
    "subject": "学科",
    "topic": "知识点",
    "question_brief": "题目简述",
    "error_reason": "错误原因（如果提到了）",
    "solution_steps": "解题要点"
  }}
}}
"""
        
        messages = [
            {"role": "system", "content": "你是一个学习助手，帮助总结对话内容。"},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self._client.chat.completions.create(
            model=self._text_model,
            messages=messages,
            temperature=0.3,
        )
        
        if not response.choices:
            raise LLMInvocationError("LLM returned no response")
        
        content = response.choices[0].message.content or ""
        result = _parse_json_payload(content)
        
        # 确保有默认值
        analysis = result.get("analysis", {})
        if not analysis:
            analysis = {
                "subject": "未知",
                "topic": "未知",
                "question_brief": image_description,
                "error_reason": None,
                "solution_steps": "见对话记录"
            }
        
        return {
            "ai_message": result.get("ai_message", "好的，我们来生成笔记吧！"),
            "is_complete": True,
            "key_insight": result.get("key_insight", "认真思考，仔细检查"),
            "analysis": analysis
        }


# 全局实例
_service: Optional[GuideChatService] = None


def get_guide_chat_service() -> GuideChatService:
    """获取引导对话服务实例"""
    global _service
    if _service is None:
        _service = GuideChatService()
    return _service


async def start_guide_chat(image_bytes: bytes) -> Dict[str, Any]:
    """开始引导对话"""
    return await get_guide_chat_service().start_chat(image_bytes)


async def continue_guide_chat(
    image_description: str,
    chat_history: List[Dict[str, str]],
    user_message: str
) -> Dict[str, Any]:
    """继续引导对话"""
    return await get_guide_chat_service().continue_chat(
        image_description, chat_history, user_message
    )


async def force_complete_chat(
    image_description: str,
    chat_history: List[Dict[str, str]]
) -> Dict[str, Any]:
    """强制结束对话并生成总结"""
    return await get_guide_chat_service().force_complete(
        image_description, chat_history
    )
