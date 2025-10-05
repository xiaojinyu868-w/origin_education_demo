from __future__ import annotations

import re
from functools import lru_cache
from io import BytesIO
from typing import Dict, List, Optional

import numpy as np
from PIL import Image


ANNOTATION_TOKENS = {
    "\u2714",  # ✔
    "\u2718",  # ✘
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


@lru_cache(maxsize=1)
def _get_reader():
    try:
        import easyocr
    except ImportError as exc:  # pragma: no cover - import guard
        raise OCRProcessingError(
            "未检测到 EasyOCR，请先根据 requirements.txt 安装依赖",
        ) from exc

    return easyocr.Reader(["ch_sim", "en"], gpu=False)


def _load_image(image_bytes: bytes) -> np.ndarray:
    pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
    return np.array(pil_image)


def extract_question_rows(image_bytes: bytes) -> List[Dict[str, Optional[str]]]:
    """运行 OCR，抽取题号、答案与批注信息的行结构。"""

    image = _load_image(image_bytes)
    reader = _get_reader()

    results = reader.readtext(image)
    if not results:
        raise OCRProcessingError("未在试卷图片中识别到文字，请检查清晰度或题号格式")

    sorted_results = sorted(results, key=lambda x: (x[0][0][1], x[0][0][0]))

    rows: List[Dict[str, Optional[str]]] = []
    current_row: Optional[Dict[str, Optional[str]]] = None

    for _bbox, text, confidence in sorted_results:
        cleaned = text.strip()
        if not cleaned:
            continue

        annotation_hit = cleaned in ANNOTATION_TOKENS or re.fullmatch(r"[\u2714\u2718\u00d7\u221a\u5bf9\u9519]+", cleaned)
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
            current_row["confidence"] = (float(current_row.get("confidence") or 0) + float(confidence)) / 2

    return rows
