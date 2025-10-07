from __future__ import annotations

import re
from functools import lru_cache
from io import BytesIO
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

from .llm import LLMInvocationError, LLMNotConfiguredError, run_vision_ocr


ANNOTATION_TOKENS = {
    "\u2714",  # check mark
    "\u2718",  # cross mark
    "\u00d7",  # ×
    "\u221a",  # √
    "\u5bf9",  # 对
    "\u9519",  # 错
    "\u5708",  # 圈
    "\u25cb",  # ○
    "X",
    "V",
}

QUESTION_PATTERN = re.compile(r"^(?P<num>\d{1,3})\s*[\).:\uFF1A]?\s*(?P<answer>.*)$")


class OCRProcessingError(RuntimeError):
    """OCR 处理失败时抛出，用于向前端反馈友好错误。"""


def _load_image(image_bytes: bytes) -> np.ndarray:
    pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
    return np.array(pil_image)


@lru_cache(maxsize=1)
def _get_easyocr_reader():
    import easyocr  # Lazy import，避免无需依赖时增加启动时长

    return easyocr.Reader(["ch_sim", "en"], gpu=False)


def _extract_with_easyocr(image_bytes: bytes) -> List[Dict[str, Optional[str]]]:
    image = _load_image(image_bytes)
    try:
        reader = _get_easyocr_reader()
    except RuntimeError as exc:  # pragma: no cover - dependency missing
        raise OCRProcessingError("未检测到 EasyOCR，请安装依赖以启用回退识别能力。") from exc

    results = reader.readtext(image)
    if not results:
        raise OCRProcessingError("无法识别图像中的文字，请检查清晰度或题号格式。")

    sorted_results = sorted(results, key=lambda x: (x[0][0][1], x[0][0][0]))

    rows: List[Dict[str, Optional[str]]] = []
    current_row: Optional[Dict[str, Optional[str]]] = None

    for _bbox, text, confidence in sorted_results:
        cleaned = text.strip()
        if not cleaned:
            continue

        annotation_hit = cleaned in ANNOTATION_TOKENS or re.fullmatch(
            r"[\u2714\u2718\u00d7\u221a\u5bf9\u9519]+",
            cleaned,
        )
        if annotation_hit and current_row is not None:
            current_row["annotation"] = cleaned
            current_row["confidence"] = max(
                float(current_row.get("confidence") or 0),
                float(confidence),
            )
            continue

        match = QUESTION_PATTERN.match(cleaned)
        if match:
            number = match.group("num")
            answer_text = match.group("answer").strip()
            current_row = {
                "question_number": number,
                "raw_text": answer_text,
                "annotation": None,
                "confidence": float(confidence),
            }
            rows.append(current_row)
            continue

        if current_row is not None:
            appended = f"{current_row['raw_text']} {cleaned}".strip()
            current_row["raw_text"] = appended
            current_row["confidence"] = (
                float(current_row.get("confidence") or 0) + float(confidence)
            ) / 2

    if not rows:
        raise OCRProcessingError("传统 OCR 未识别到有效题目，请尝试更清晰的图片。")

    return rows


def run_ocr_pipeline(image_bytes: bytes) -> Tuple[List[Dict[str, Optional[str]]], List[Dict[str, str]]]:
    """尝试首先使用大模型识别，若失败则回退至 EasyOCR。"""

    steps: List[Dict[str, str]] = []

    try:
        rows, _raw_response = run_vision_ocr(image_bytes)
    except LLMNotConfiguredError:
        steps.append({
            "name": "通义千问 · 视觉识别",
            "status": "warning",
            "detail": "未配置访问密钥，正在回退至 EasyOCR。",
        })
        rows = _extract_with_easyocr(image_bytes)
        steps.append({
            "name": "EasyOCR 回退识别",
            "status": "success",
            "detail": f"识别到 {len(rows)} 条题目信息。",
        })
        return rows, steps
    except LLMInvocationError as exc:
        steps.append({
            "name": "通义千问 · 视觉识别",
            "status": "error",
            "detail": f"大模型解析失败：{exc}",
        })
        rows = _extract_with_easyocr(image_bytes)
        steps.append({
            "name": "EasyOCR 回退识别",
            "status": "success",
            "detail": f"识别到 {len(rows)} 条题目信息。",
        })
        return rows, steps

    steps.append({
        "name": "通义千问 · 视觉识别",
        "status": "success",
        "detail": f"识别到 {len(rows)} 条题目信息。",
    })
    return rows, steps


def extract_question_rows(image_bytes: bytes) -> List[Dict[str, Optional[str]]]:
    rows, _steps = run_ocr_pipeline(image_bytes)
    if not rows:
        raise OCRProcessingError("未识别到任何题目，请尝试更清晰的图像。")
    return rows
