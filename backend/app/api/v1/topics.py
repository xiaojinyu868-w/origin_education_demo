"""
精选片段 API - 与 meetmind 的 /api/generate-topics 对齐

支持功能:
- 从课堂内容中提取精选片段
- 智能识别重点内容
- 支持主题筛选
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
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

router = APIRouter(prefix="/generate-topics", tags=["精选片段"])


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


class TopicsRequest(BaseModel):
    """精选片段请求 - 与 meetmind 对齐"""
    session_id: str = Field(..., alias="sessionId")
    transcript: List[TranscriptSegment]
    mode: str = Field("smart", description="生成模式: smart | fast")
    max_topics: int = Field(8, alias="maxTopics", description="最大片段数")
    theme: Optional[str] = Field(None, description="主题筛选")
    session_info: Optional[SessionInfo] = Field(None, alias="sessionInfo")
    exclude_topic_keys: Optional[List[str]] = Field(None, alias="excludeTopicKeys")
    include_candidate_pool: bool = Field(False, alias="includeCandidatePool")
    model: Optional[str] = None
    
    class Config:
        populate_by_name = True


class HighlightSegment(BaseModel):
    """精选片段内的转录段"""
    id: str
    text: str
    start_ms: int = Field(..., alias="startMs")
    end_ms: int = Field(..., alias="endMs")
    
    class Config:
        populate_by_name = True


class HighlightQuote(BaseModel):
    """精选引用"""
    timestamp: str
    text: str


class HighlightTopic(BaseModel):
    """精选片段 - 与 meetmind 对齐"""
    id: str
    session_id: str = Field(..., alias="sessionId")
    title: str = Field(..., description="标题（最多10词）")
    description: Optional[str] = None
    importance: str = "medium"  # high | medium | low
    duration: int = Field(..., description="时长（毫秒）")
    segments: List[HighlightSegment] = Field(default_factory=list)
    keywords: Optional[List[str]] = None
    quote: Optional[HighlightQuote] = None
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")
    
    class Config:
        populate_by_name = True


class TopicCandidate(BaseModel):
    """候选片段"""
    key: str
    title: str
    start_ms: int = Field(..., alias="startMs")
    end_ms: int = Field(..., alias="endMs")
    score: float


class TopicsResponse(BaseModel):
    """精选片段响应"""
    success: bool = True
    topics: List[HighlightTopic]
    candidates: Optional[List[TopicCandidate]] = None
    model_used: str = Field(..., alias="modelUsed")
    
    class Config:
        populate_by_name = True


# ============ 精选片段生成提示词 ============

TOPICS_SYSTEM_PROMPT = """你是一位资深教研专家，负责从课堂内容中提取精选片段。

请根据课堂转录内容，识别出最重要的知识点片段，返回以下格式的 JSON：

{
  "topics": [
    {
      "title": "片段标题（简短，最多10个词）",
      "description": "片段描述（1-2句话）",
      "importance": "high/medium/low",
      "startMs": 起始时间毫秒,
      "endMs": 结束时间毫秒,
      "keywords": ["关键词1", "关键词2"],
      "quote": {
        "timestamp": "MM:SS",
        "text": "老师原话引用"
      }
    }
  ]
}

筛选标准：
1. 核心概念讲解
2. 重点公式推导
3. 典型例题分析
4. 易错点提醒
5. 总结归纳

要求：
- 每个片段时长控制在 30 秒到 3 分钟
- 按重要性排序
- 标题简洁明了
- 只返回 JSON，不要其他文字"""


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


def _find_matching_segments(
    transcript: List[TranscriptSegment],
    start_ms: int,
    end_ms: int,
) -> List[HighlightSegment]:
    """查找匹配的转录片段"""
    matching = []
    for seg in transcript:
        # 检查是否有重叠
        if seg.end_ms >= start_ms and seg.start_ms <= end_ms:
            matching.append(HighlightSegment(
                id=seg.id,
                text=seg.text,
                start_ms=seg.start_ms,
                end_ms=seg.end_ms,
            ))
    return matching


# ============ API 端点 ============

@router.post("", response_model=TopicsResponse)
@router.post("/", response_model=TopicsResponse)
async def generate_topics(
    request: TopicsRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    生成精选片段
    
    与 meetmind 的 POST /api/generate-topics 对齐
    """
    try:
        # 构建转录文本
        transcript_text = "\n".join([
            f"[{seg.start_ms//1000//60:02d}:{seg.start_ms//1000%60:02d}-{seg.end_ms//1000//60:02d}:{seg.end_ms//1000%60:02d}] {seg.text}"
            for seg in request.transcript
        ])
        
        # 构建上下文
        context_parts = []
        if request.session_info:
            if request.session_info.subject:
                context_parts.append(f"学科：{request.session_info.subject}")
            if request.session_info.topic:
                context_parts.append(f"主题：{request.session_info.topic}")
        
        if request.theme:
            context_parts.append(f"筛选主题：{request.theme}")
        
        context_parts.append(f"最多提取 {request.max_topics} 个片段")
        
        context = "\n".join(context_parts)
        
        # 构建消息
        messages = [
            LLMMessage.system(TOPICS_SYSTEM_PROMPT),
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
        parsed = _parse_json_response(response.content)
        raw_topics = parsed.get("topics", [])
        
        # 转换为 HighlightTopic
        now = datetime.utcnow().isoformat() + "Z"
        topics = []
        
        for t in raw_topics[:request.max_topics]:
            start_ms = t.get("startMs", 0)
            end_ms = t.get("endMs", start_ms + 60000)
            
            # 查找匹配的转录片段
            segments = _find_matching_segments(request.transcript, start_ms, end_ms)
            
            topic = HighlightTopic(
                id=str(uuid.uuid4()),
                session_id=request.session_id,
                title=t.get("title", "未命名片段"),
                description=t.get("description"),
                importance=t.get("importance", "medium"),
                duration=end_ms - start_ms,
                segments=segments,
                keywords=t.get("keywords"),
                quote=HighlightQuote(**t["quote"]) if t.get("quote") else None,
                created_at=now,
                updated_at=now,
            )
            topics.append(topic)
        
        return TopicsResponse(
            success=True,
            topics=topics,
            model_used=response.model,
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"片段解析失败: {str(e)}",
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
