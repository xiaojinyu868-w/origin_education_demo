"""
AI 家教 API - 与 meetmind 的 /api/tutor 对齐

核心功能:
- 困惑点智能解释
- 追问对话
- 引导问题生成
- 多模态支持（图片理解）
"""

from __future__ import annotations

import json
from typing import Any, Dict, Iterator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ...models import User
from ...services.auth import get_current_user, get_current_user_optional
from ...services.llm_provider import (
    LLMProviderFactory,
    LLMMessage,
    LLMConfig,
    LLMError,
    LLMNotConfiguredError,
    get_available_models,
)

router = APIRouter(prefix="/tutor", tags=["AI 家教"])


# ============ 请求/响应模型 - 与 meetmind 对齐 ============

class MessageContent(BaseModel):
    """多模态消息内容"""
    type: str = Field(..., description="内容类型: text | image_url")
    text: Optional[str] = None
    image_url: Optional[Dict[str, str]] = None


class TutorRequest(BaseModel):
    """AI 家教请求 - 与 meetmind 的 ExtendedTutorRequest 对齐"""
    # 困惑点相关
    timestamp: Optional[int] = Field(None, description="困惑点时间戳（毫秒）")
    segments: Optional[List[Dict[str, Any]]] = Field(None, description="转录片段")
    
    # 对话相关
    student_question: Optional[str] = Field(None, alias="studentQuestion", description="学生追问内容")
    message_content: Optional[List[MessageContent]] = Field(None, alias="messageContent", description="多模态消息")
    conversation_history: Optional[List[Dict[str, str]]] = Field(None, alias="conversationHistory", description="对话历史")
    
    # 功能开关
    enable_guidance: bool = Field(False, alias="enableGuidance", description="启用引导问题")
    enable_web: bool = Field(False, alias="enableWeb", description="启用联网检索")
    selected_option_id: Optional[str] = Field(None, alias="selectedOptionId", description="学生选择的引导选项")
    
    # 模型配置
    model: Optional[str] = Field(None, description="模型ID")
    temperature: float = Field(0.7, description="温度参数")
    stream: bool = Field(False, description="是否流式响应")
    
    # 上下文
    context: Optional[str] = Field(None, description="额外上下文")
    subject: Optional[str] = Field(None, description="学科")
    
    class Config:
        populate_by_name = True


class Citation(BaseModel):
    """引用信息"""
    text: str
    time_range: Optional[str] = Field(None, alias="timeRange")
    start_ms: Optional[int] = Field(None, alias="startMs")
    end_ms: Optional[int] = Field(None, alias="endMs")


class Explanation(BaseModel):
    """解释内容"""
    teacher_said: str = Field(..., alias="teacherSaid", description="老师原话")
    citation: Optional[Citation] = None
    possible_stuck_points: List[str] = Field(default_factory=list, alias="possibleStuckPoints")
    follow_up_question: Optional[str] = Field(None, alias="followUpQuestion")


class ActionItem(BaseModel):
    """行动清单项"""
    id: str
    type: str  # replay | exercise | review
    title: str
    description: str
    estimated_minutes: int = Field(..., alias="estimatedMinutes")
    completed: bool = False


class GuidanceQuestion(BaseModel):
    """引导问题"""
    question: str
    options: List[Dict[str, str]] = Field(default_factory=list)


class TutorResponse(BaseModel):
    """AI 家教响应 - 与 meetmind 的 ExtendedTutorResponse 对齐"""
    explanation: Optional[Explanation] = None
    action_items: List[ActionItem] = Field(default_factory=list, alias="actionItems")
    raw_content: str = Field(..., alias="rawContent", description="AI 原始回复")
    model: str
    usage: Optional[Dict[str, int]] = None
    guidance_question: Optional[GuidanceQuestion] = Field(None, alias="guidanceQuestion")
    citations: Optional[List[Dict[str, Any]]] = None
    conversation_id: Optional[str] = Field(None, alias="conversationId")
    
    class Config:
        populate_by_name = True


# ============ AI 家教系统提示词 ============

TUTOR_SYSTEM_PROMPT = """你是一位"课堂对齐"的 AI 家教。你的任务是帮助学生补懂课堂上没听懂的内容。

核心原则：
1. 【证据链】如果有课堂内容，必须引用老师的原话，格式：[引用 mm:ss-mm:ss]
2. 【追问定位】先复述老师讲法，再追问学生具体卡在哪一步
3. 【行动清单】最后给出 ≤3 个今晚可执行的任务（总计约20分钟）

输出格式：
## 老师是这样讲的
[引用 xx:xx-xx:xx] "老师原话..."（如果有课堂内容）

## 你可能卡在这里
- 卡点1：...

## 让我问你一个问题
（追问，帮助定位具体卡点）

## 今晚行动清单（20分钟）
1. ✅ [回放] 再听一遍 xx:xx-xx:xx（3分钟）
2. ✅ [练习] 具体任务描述（10分钟）
3. ✅ [复习] 具体任务描述（7分钟）

如果没有课堂内容，直接根据学生的问题提供帮助。"""

FOLLOWUP_SYSTEM_PROMPT = """你是一位亲切的 AI 家教，正在和学生自然对话。

【重要】你必须像真人一样自然回复，禁止使用任何固定模板！

对话规则：
- 学生说"我懂了"、"明白了"、"OK"等 → 简短鼓励
- 学生提问 → 直接回答问题，不要列清单
- 学生闲聊 → 友好回应

禁止事项：
❌ 禁止使用 ## 标题
❌ 禁止输出固定格式
❌ 禁止每次都列行动清单"""


def _build_tutor_messages(request: TutorRequest) -> List[LLMMessage]:
    """构建 AI 家教消息"""
    messages = []
    
    # 判断是初次解释还是追问
    is_followup = bool(request.conversation_history) or bool(request.student_question)
    
    # 系统提示
    system_prompt = FOLLOWUP_SYSTEM_PROMPT if is_followup else TUTOR_SYSTEM_PROMPT
    messages.append(LLMMessage.system(system_prompt))
    
    # 添加对话历史
    if request.conversation_history:
        for msg in request.conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "assistant":
                messages.append(LLMMessage.assistant(content))
            else:
                messages.append(LLMMessage.user(content))
    
    # 构建当前消息
    if request.message_content:
        # 多模态消息
        content_parts = []
        for item in request.message_content:
            if item.type == "text" and item.text:
                content_parts.append({"type": "text", "text": item.text})
            elif item.type == "image_url" and item.image_url:
                content_parts.append({"type": "image_url", "image_url": item.image_url})
        if content_parts:
            messages.append(LLMMessage.user(content_parts))
    elif request.student_question:
        messages.append(LLMMessage.user(request.student_question))
    elif request.segments:
        # 构建课堂内容上下文
        context_parts = []
        if request.subject:
            context_parts.append(f"学科：{request.subject}")
        
        # 添加转录片段
        transcript_text = "\n".join([
            f"[{seg.get('startMs', 0)//1000//60:02d}:{seg.get('startMs', 0)//1000%60:02d}] {seg.get('text', '')}"
            for seg in request.segments
        ])
        context_parts.append(f"课堂内容：\n{transcript_text}")
        
        if request.timestamp:
            minutes = request.timestamp // 1000 // 60
            seconds = request.timestamp // 1000 % 60
            context_parts.append(f"学生在 {minutes:02d}:{seconds:02d} 处标记了困惑点")
        
        messages.append(LLMMessage.user("\n\n".join(context_parts)))
    elif request.context:
        messages.append(LLMMessage.user(request.context))
    else:
        messages.append(LLMMessage.user("请帮助我理解这个问题"))
    
    return messages


def _parse_tutor_response(content: str, model: str) -> TutorResponse:
    """解析 AI 家教响应"""
    # 简化解析，直接返回原始内容
    return TutorResponse(
        raw_content=content,
        model=model,
        explanation=None,
        action_items=[],
    )


def _format_sse_event(event: str, data: Any) -> str:
    """格式化 SSE 事件"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# ============ API 端点 ============

@router.post("", response_model=TutorResponse)
@router.post("/", response_model=TutorResponse)
async def tutor_chat(
    request: TutorRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    AI 家教对话
    
    与 meetmind 的 POST /api/tutor 对齐
    """
    try:
        messages = _build_tutor_messages(request)
        
        if request.stream:
            # 流式响应
            def generate() -> Iterator[str]:
                try:
                    full_content = ""
                    for chunk in LLMProviderFactory.stream_chat(
                        messages,
                        model=request.model,
                        config=LLMConfig(
                            model=request.model or "",
                            temperature=request.temperature,
                        ),
                    ):
                        full_content += chunk
                        yield _format_sse_event("content", {"text": chunk})
                    
                    yield _format_sse_event("done", {"fullContent": full_content})
                except LLMError as e:
                    yield _format_sse_event("error", {"message": str(e)})
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )
        else:
            # 非流式响应
            response = LLMProviderFactory.chat(
                messages,
                model=request.model,
                config=LLMConfig(
                    model=request.model or "",
                    temperature=request.temperature,
                ),
            )
            
            result = _parse_tutor_response(response.content, response.model)
            if response.usage:
                result.usage = response.usage.to_dict()
            
            return result
            
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


@router.get("/models")
async def get_tutor_models():
    """获取可用的 AI 模型列表"""
    return {
        "models": get_available_models(),
        "defaultModel": "qwen3-vl-plus-2025-01-25",
    }
