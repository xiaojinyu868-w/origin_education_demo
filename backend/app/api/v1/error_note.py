"""
错题笔记 API 路由
"""

from __future__ import annotations

import base64
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ...error_note_models import (
    ErrorNote,
    NoteAnalysis,
    get_error_note_store,
)
from ...services.guide_chat import (
    start_guide_chat,
    continue_guide_chat,
    force_complete_chat,
)
from ...services.image_gen import (
    generate_note_image,
    image_gen_available,
    ImageGenNotConfiguredError,
    ImageGenInvocationError,
)
from ...services.llm import LLMNotConfiguredError, LLMInvocationError


router = APIRouter(prefix="/api/v1/error", tags=["error-note"])


# ============ Request/Response Models ============

class UploadResponse(BaseModel):
    error_id: str
    image_url: str


class ChatRequest(BaseModel):
    error_id: str
    message: str = ""
    is_start: bool = False


class ChatResponse(BaseModel):
    error_id: str
    ai_message: str
    is_complete: bool
    suggested_actions: List[str] = []


class GenerateRequest(BaseModel):
    error_id: str
    style: str = "minimal"


class GenerateResponse(BaseModel):
    error_id: str
    note_image_base64: str
    note_image_url: str
    summary: Dict[str, Any]


class ErrorNoteResponse(BaseModel):
    error_id: str
    image_url: str
    chat_history: List[Dict[str, str]]
    note_image_url: Optional[str]
    summary: Optional[Dict[str, Any]]
    status: str
    created_at: str


class ErrorNoteListResponse(BaseModel):
    items: List[ErrorNoteResponse]
    total: int
    page: int
    limit: int


# ============ API Endpoints ============
# 注意：具体路由必须在通配路由 /{error_id} 之前定义

@router.post("/upload", response_model=UploadResponse)
async def upload_error_image(
    image: UploadFile = File(..., description="错题图片")
):
    """
    上传错题图片
    """
    # 验证文件类型
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="只支持图片文件")
    
    # 读取图片
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB限制
        raise HTTPException(status_code=400, detail="图片大小不能超过10MB")
    
    # 保存图片
    store = get_error_note_store()
    image_path = store.save_upload_image(image_bytes, image.filename or "upload.jpg")
    
    # 创建笔记记录
    note = ErrorNote(image_path=image_path)
    store.create(note)
    
    return UploadResponse(
        error_id=note.id,
        image_url=f"/api/v1/error/image/{note.id}"
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    AI引导对话
    - is_start=true: 开始对话（AI识别题目并提问）
    - is_start=false: 继续对话（用户回答后AI追问）
    """
    store = get_error_note_store()
    note = store.get(request.error_id)
    
    if not note:
        raise HTTPException(status_code=404, detail="错题记录不存在")
    
    try:
        if request.is_start:
            # 开始对话 - 读取图片并识别
            with open(note.image_path, "rb") as f:
                image_bytes = f.read()
            
            result = await start_guide_chat(image_bytes)
            
            # 保存AI的第一条消息
            note.image_description = result.get("image_description", "")
            note.add_message("ai", result["ai_message"])
            store.update(note)
            
            return ChatResponse(
                error_id=note.id,
                ai_message=result["ai_message"],
                is_complete=False,
                suggested_actions=["回答问题"]
            )
        else:
            # 继续对话
            if not request.message.strip():
                raise HTTPException(status_code=400, detail="请输入回答")
            
            # 保存用户消息
            note.add_message("user", request.message)
            
            # 构建对话历史
            chat_history = [
                {"role": msg.role, "content": msg.content}
                for msg in note.chat_history
            ]
            
            # 获取AI回复
            result = await continue_guide_chat(
                note.image_description,
                chat_history[:-1],  # 不包含刚添加的用户消息
                request.message
            )
            
            # 保存AI回复
            note.add_message("ai", result["ai_message"])
            
            # 如果对话完成，保存分析结果
            if result.get("is_complete"):
                note.status = "completed"
                note.key_insight = result.get("key_insight")
                if result.get("analysis"):
                    note.analysis = NoteAnalysis(**result["analysis"])
            
            store.update(note)
            
            suggested_actions = ["继续回答"]
            if result.get("is_complete"):
                suggested_actions = ["生成笔记"]
            elif len(note.chat_history) >= 6:  # 3轮对话后可以生成
                suggested_actions = ["继续回答", "生成笔记"]
            
            return ChatResponse(
                error_id=note.id,
                ai_message=result["ai_message"],
                is_complete=result.get("is_complete", False),
                suggested_actions=suggested_actions
            )
            
    except LLMNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=f"AI服务未配置: {e}")
    except LLMInvocationError as e:
        raise HTTPException(status_code=500, detail=f"AI服务调用失败: {e}")


@router.post("/generate", response_model=GenerateResponse)
async def generate_note(request: GenerateRequest):
    """
    生成笔记图片
    """
    store = get_error_note_store()
    note = store.get(request.error_id)
    
    if not note:
        raise HTTPException(status_code=404, detail="错题记录不存在")
    
    # 如果还没有分析结果，强制生成
    if not note.analysis or not note.key_insight:
        try:
            chat_history = [
                {"role": msg.role, "content": msg.content}
                for msg in note.chat_history
            ]
            result = await force_complete_chat(note.image_description, chat_history)
            note.key_insight = result.get("key_insight", "认真思考，仔细检查")
            if result.get("analysis"):
                note.analysis = NoteAnalysis(**result["analysis"])
            else:
                note.analysis = NoteAnalysis(
                    subject="未知",
                    topic="未知",
                    question_brief=note.image_description,
                    solution_steps="见对话记录"
                )
        except Exception as e:
            # 使用默认值
            note.key_insight = "认真思考，仔细检查"
            note.analysis = NoteAnalysis(
                subject="未知",
                topic="未知",
                question_brief=note.image_description or "错题",
                solution_steps="见对话记录"
            )
    
    # 检查图片生成服务
    if not image_gen_available():
        raise HTTPException(status_code=503, detail="图片生成服务未配置，请设置GEMINI_API_KEY")
    
    try:
        # 生成笔记图片
        image_bytes = await generate_note_image(
            subject=note.analysis.subject,
            topic=note.analysis.topic,
            question_brief=note.analysis.question_brief,
            key_insight=note.key_insight,
            error_reason=note.analysis.error_reason,
            solution_steps=note.analysis.solution_steps,
            style=request.style
        )
        
        # 保存图片
        note_image_path = store.save_note_image(note.id, image_bytes)
        note.note_image_path = note_image_path
        note.note_style = request.style
        note.status = "generated"
        store.update(note)
        
        # 返回结果
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        
        return GenerateResponse(
            error_id=note.id,
            note_image_base64=image_base64,
            note_image_url=f"/api/v1/error/note-image/{note.id}",
            summary={
                "subject": note.analysis.subject,
                "topic": note.analysis.topic,
                "key_insight": note.key_insight,
                "error_reason": note.analysis.error_reason
            }
        )
        
    except ImageGenNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=f"图片生成服务未配置: {e}")
    except ImageGenInvocationError as e:
        raise HTTPException(status_code=500, detail=f"图片生成失败: {e}")


# ============ 列表和健康检查（具体路由，必须在 /{error_id} 之前） ============

@router.get("/list", response_model=ErrorNoteListResponse)
async def list_error_notes(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    获取错题列表
    """
    store = get_error_note_store()
    notes, total = store.list_all(page=page, limit=limit)
    
    items = [
        ErrorNoteResponse(
            error_id=note.id,
            image_url=f"/api/v1/error/image/{note.id}",
            chat_history=[
                {"role": msg.role, "content": msg.content}
                for msg in note.chat_history
            ],
            note_image_url=f"/api/v1/error/note-image/{note.id}" if note.note_image_path else None,
            summary={
                "subject": note.analysis.subject if note.analysis else None,
                "topic": note.analysis.topic if note.analysis else None,
                "key_insight": note.key_insight,
                "error_reason": note.analysis.error_reason if note.analysis else None
            } if note.analysis else None,
            status=note.status,
            created_at=note.created_at.isoformat()
        )
        for note in notes
    ]
    
    return ErrorNoteListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/health/status")
async def health_check():
    """
    检查服务状态
    """
    from ...services.llm import llm_available
    
    return {
        "status": "ok",
        "llm_available": llm_available(),
        "image_gen_available": image_gen_available()
    }


# ============ 图片资源路由（具体路径，必须在 /{error_id} 之前） ============

@router.get("/image/{error_id}")
async def get_error_image(error_id: str):
    """
    获取错题图片
    """
    store = get_error_note_store()
    note = store.get(error_id)
    
    if not note or not note.image_path:
        raise HTTPException(status_code=404, detail="图片不存在")
    
    return FileResponse(note.image_path, media_type="image/jpeg")


@router.get("/note-image/{error_id}")
async def get_note_image(error_id: str):
    """
    获取笔记图片
    """
    store = get_error_note_store()
    note = store.get(error_id)
    
    if not note or not note.note_image_path:
        raise HTTPException(status_code=404, detail="笔记图片不存在")
    
    return FileResponse(note.note_image_path, media_type="image/png")


# ============ 通配路由（必须放在最后） ============

@router.get("/{error_id}", response_model=ErrorNoteResponse)
async def get_error_note(error_id: str):
    """
    获取错题详情
    """
    store = get_error_note_store()
    note = store.get(error_id)
    
    if not note:
        raise HTTPException(status_code=404, detail="错题记录不存在")
    
    return ErrorNoteResponse(
        error_id=note.id,
        image_url=f"/api/v1/error/image/{note.id}",
        chat_history=[
            {"role": msg.role, "content": msg.content}
            for msg in note.chat_history
        ],
        note_image_url=f"/api/v1/error/note-image/{note.id}" if note.note_image_path else None,
        summary={
            "subject": note.analysis.subject if note.analysis else None,
            "topic": note.analysis.topic if note.analysis else None,
            "key_insight": note.key_insight,
            "error_reason": note.analysis.error_reason if note.analysis else None
        } if note.analysis else None,
        status=note.status,
        created_at=note.created_at.isoformat()
    )


@router.delete("/{error_id}")
async def delete_error_note(error_id: str):
    """
    删除错题记录
    """
    store = get_error_note_store()
    
    if not store.delete(error_id):
        raise HTTPException(status_code=404, detail="错题记录不存在")
    
    return {"message": "删除成功"}
