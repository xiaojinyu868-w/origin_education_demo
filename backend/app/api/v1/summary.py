"""
课堂摘要 API - 与 meetmind 的 /api/generate-summary 对齐

支持功能:
- 课堂内容摘要生成
- 结构化输出
- 家长友好格式
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ...models import User
from ...services.auth import get_current_user_optional
from ...services.llm_provider import (
    LLMProviderFactory,
    LLMMessage,
    LLMConfig,
    LLMError,
    LLMNotConfiguredError,
)

router = APIRouter(prefix="/generate-summary", tags=["课堂摘要"])


# ============ 请求/响应模型 ============

class TranscriptSegment(BaseModel):
    """转录片段"""
    id: str
    text: str
    start_ms: int = Field(..., alias="startMs")
    end_ms: int = Field(..., alias="endMs")
    
    class Config:
        populate_by_name = True


class SessionInfo(BaseModel):
    """课程信息"""
    subject: Optional[str] = None
    topic: Optional[str] = None
    teacher: Optional[str] = None


class SummaryRequest(BaseModel):
    """摘要请求 - 与 meetmind 对齐"""
    session_id: str = Field(..., alias="sessionId")
    transcript: List[TranscriptSegment]
    session_info: Optional[SessionInfo] = Field(None, alias="sessionInfo")
    format: str = Field("structured", description="输出格式: structured | parent")
    model: Optional[str] = None
    
    class Config:
        populate_by_name = True


class SummaryTakeaway(BaseModel):
    """知识点要点"""
    title: str
    description: str
    importance: str = "medium"  # high | medium | low


class ClassSummary(BaseModel):
    """课堂摘要"""
    id: str
    overview: str = Field(..., description="课堂概要")
    takeaways: List[SummaryTakeaway] = Field(default_factory=list, description="主要知识点")
    key_difficulties: List[str] = Field(default_factory=list, alias="keyDifficulties", description="重点难点")
    structure: List[str] = Field(default_factory=list, description="课堂结构")
    
    class Config:
        populate_by_name = True


class SummaryResponse(BaseModel):
    """摘要响应"""
    success: bool = True
    summary: ClassSummary
    model_used: str = Field(..., alias="modelUsed")
    
    class Config:
        populate_by_name = True


# ============ 摘要生成提示词 ============

SUMMARY_SYSTEM_PROMPT = """你是一位资深教研专家，负责为课堂内容生成结构化摘要。

请根据课堂转录内容，生成以下格式的 JSON 摘要：

{
  "overview": "课堂概要（2-3句话）",
  "takeaways": [
    {
      "title": "知识点标题",
      "description": "详细说明",
      "importance": "high/medium/low"
    }
  ],
  "keyDifficulties": ["重点难点1", "重点难点2"],
  "structure": ["课堂环节1", "课堂环节2", "课堂环节3"]
}

要求：
1. overview 简明扼要，突出本节课核心内容
2. takeaways 提取 3-5 个关键知识点
3. keyDifficulties 标注 2-3 个重点难点
4. structure 按时间顺序列出课堂主要环节

只返回 JSON，不要其他文字。"""

PARENT_SUMMARY_PROMPT = """你是一位贴心的班主任，负责向家长汇报孩子的课堂学习情况。

请根据课堂内容，用通俗易懂的语言，生成一份家长友好的课堂小结。

要求：
1. 语言亲切，避免专业术语
2. 突出孩子今天学到了什么
3. 提供 1-2 个家长可以配合的复习建议
4. 控制在 200 字以内"""


def _parse_json_response(content: str) -> Dict[str, Any]:
    """解析 JSON 响应"""
    text = content.strip()
    
    # 移除 markdown 代码块
    if text.startswith("```"):
        import re
        text = re.sub(r"^```(?:json)?", "", text, flags=re.IGNORECASE).strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    
    return json.loads(text)


# ============ API 端点 ============

@router.post("", response_model=SummaryResponse)
@router.post("/", response_model=SummaryResponse)
async def generate_summary(
    request: SummaryRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    生成课堂摘要
    
    与 meetmind 的 POST /api/generate-summary 对齐
    """
    try:
        # 构建转录文本
        transcript_text = "\n".join([
            f"[{seg.start_ms//1000//60:02d}:{seg.start_ms//1000%60:02d}] {seg.text}"
            for seg in request.transcript
        ])
        
        # 构建上下文
        context_parts = []
        if request.session_info:
            if request.session_info.subject:
                context_parts.append(f"学科：{request.session_info.subject}")
            if request.session_info.topic:
                context_parts.append(f"主题：{request.session_info.topic}")
            if request.session_info.teacher:
                context_parts.append(f"教师：{request.session_info.teacher}")
        
        context = "\n".join(context_parts) if context_parts else ""
        
        # 选择提示词
        if request.format == "parent":
            system_prompt = PARENT_SUMMARY_PROMPT
        else:
            system_prompt = SUMMARY_SYSTEM_PROMPT
        
        # 构建消息
        messages = [
            LLMMessage.system(system_prompt),
            LLMMessage.user(f"{context}\n\n课堂内容：\n{transcript_text}"),
        ]
        
        # 调用 LLM
        response = LLMProviderFactory.chat(
            messages,
            model=request.model,
            config=LLMConfig(
                model=request.model or "",
                temperature=0.3,
            ),
        )
        
        # 解析响应
        if request.format == "parent":
            # 家长格式直接返回文本
            summary = ClassSummary(
                id=request.session_id,
                overview=response.content,
                takeaways=[],
                key_difficulties=[],
                structure=[],
            )
        else:
            # 结构化格式解析 JSON
            parsed = _parse_json_response(response.content)
            summary = ClassSummary(
                id=request.session_id,
                overview=parsed.get("overview", ""),
                takeaways=[
                    SummaryTakeaway(**t) for t in parsed.get("takeaways", [])
                ],
                key_difficulties=parsed.get("keyDifficulties", []),
                structure=parsed.get("structure", []),
            )
        
        return SummaryResponse(
            success=True,
            summary=summary,
            model_used=response.model,
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"摘要解析失败: {str(e)}",
        )
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
