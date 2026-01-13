"""
错题笔记数据模型
使用简单的JSON文件存储（MVP阶段）
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """对话消息"""
    role: str  # "ai" or "user"
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class NoteAnalysis(BaseModel):
    """笔记分析结果"""
    subject: str = "未知"
    topic: str = "未知"
    question_brief: str = ""
    error_reason: Optional[str] = None
    solution_steps: str = ""


class ErrorNote(BaseModel):
    """错题笔记"""
    id: str = Field(default_factory=lambda: f"err_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}")
    
    # 原始输入
    image_path: str = ""
    image_description: str = ""  # AI识别的题目描述
    
    # 对话记录
    chat_history: List[ChatMessage] = Field(default_factory=list)
    
    # AI分析结果
    key_insight: Optional[str] = None  # 用户总结的关键要点
    analysis: Optional[NoteAnalysis] = None
    
    # 生成的笔记
    note_image_path: Optional[str] = None
    note_style: str = "minimal"
    
    # 状态
    status: str = "chatting"  # chatting, completed, generated
    
    # 元数据
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    def add_message(self, role: str, content: str) -> None:
        """添加对话消息"""
        self.chat_history.append(ChatMessage(role=role, content=content))
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "image_path": self.image_path,
            "image_description": self.image_description,
            "chat_history": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in self.chat_history
            ],
            "key_insight": self.key_insight,
            "analysis": self.analysis.model_dump() if self.analysis else None,
            "note_image_path": self.note_image_path,
            "note_style": self.note_style,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ErrorNote":
        """从字典创建"""
        chat_history = [
            ChatMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=datetime.fromisoformat(msg["timestamp"]) if "timestamp" in msg else datetime.now()
            )
            for msg in data.get("chat_history", [])
        ]
        
        analysis = None
        if data.get("analysis"):
            analysis = NoteAnalysis(**data["analysis"])
        
        return cls(
            id=data["id"],
            image_path=data.get("image_path", ""),
            image_description=data.get("image_description", ""),
            chat_history=chat_history,
            key_insight=data.get("key_insight"),
            analysis=analysis,
            note_image_path=data.get("note_image_path"),
            note_style=data.get("note_style", "minimal"),
            status=data.get("status", "chatting"),
            created_at=datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.now(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if "updated_at" in data else datetime.now()
        )


class ErrorNoteStore:
    """错题笔记存储（JSON文件）"""
    
    def __init__(self, data_dir: str = "./data") -> None:
        self.data_dir = Path(data_dir)
        self.db_path = self.data_dir / "error_notes.json"
        self.uploads_dir = self.data_dir / "uploads"
        self.notes_dir = self.data_dir / "notes"
        
        # 确保目录存在
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.notes_dir.mkdir(parents=True, exist_ok=True)
        
        # 初始化数据库文件
        if not self.db_path.exists():
            self._save_all({})
    
    def _load_all(self) -> Dict[str, Dict[str, Any]]:
        """加载所有数据"""
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    def _save_all(self, data: Dict[str, Dict[str, Any]]) -> None:
        """保存所有数据"""
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def create(self, note: ErrorNote) -> ErrorNote:
        """创建新笔记"""
        data = self._load_all()
        data[note.id] = note.to_dict()
        self._save_all(data)
        return note
    
    def get(self, note_id: str) -> Optional[ErrorNote]:
        """获取笔记"""
        data = self._load_all()
        if note_id in data:
            return ErrorNote.from_dict(data[note_id])
        return None
    
    def update(self, note: ErrorNote) -> ErrorNote:
        """更新笔记"""
        note.updated_at = datetime.now()
        data = self._load_all()
        data[note.id] = note.to_dict()
        self._save_all(data)
        return note
    
    def delete(self, note_id: str) -> bool:
        """删除笔记"""
        data = self._load_all()
        if note_id in data:
            del data[note_id]
            self._save_all(data)
            return True
        return False
    
    def list_all(self, page: int = 1, limit: int = 20) -> tuple[List[ErrorNote], int]:
        """列出所有笔记（分页）"""
        data = self._load_all()
        notes = [ErrorNote.from_dict(v) for v in data.values()]
        
        # 按创建时间倒序
        notes.sort(key=lambda x: x.created_at, reverse=True)
        
        total = len(notes)
        start = (page - 1) * limit
        end = start + limit
        
        return notes[start:end], total
    
    def save_upload_image(self, image_bytes: bytes, filename: str) -> str:
        """保存上传的图片"""
        # 生成唯一文件名
        ext = Path(filename).suffix or ".jpg"
        new_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = self.uploads_dir / new_filename
        
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        
        return str(file_path)
    
    def save_note_image(self, note_id: str, image_bytes: bytes) -> str:
        """保存生成的笔记图片"""
        filename = f"{note_id}_note.png"
        file_path = self.notes_dir / filename
        
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        
        return str(file_path)


# 全局存储实例
_store: Optional[ErrorNoteStore] = None


def get_error_note_store() -> ErrorNoteStore:
    """获取存储实例"""
    global _store
    if _store is None:
        data_dir = os.getenv("DATA_DIR", "./data")
        _store = ErrorNoteStore(data_dir)
    return _store
