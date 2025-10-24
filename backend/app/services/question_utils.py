from __future__ import annotations

import re
import unicodedata
from typing import Optional

_CIRCLED_DIGITS = {
    "①": "1",
    "②": "2",
    "③": "3",
    "④": "4",
    "⑤": "5",
    "⑥": "6",
    "⑦": "7",
    "⑧": "8",
    "⑨": "9",
    "⑩": "10",
    "⑪": "11",
    "⑫": "12",
}

_CHINESE_DIGITS = {
    "零": "0",
    "〇": "0",
    "一": "1",
    "二": "2",
    "三": "3",
    "四": "4",
    "五": "5",
    "六": "6",
    "七": "7",
    "八": "8",
    "九": "9",
    "十": "10",
}

_PUNCT_REPLACEMENTS = {
    "（": "(",
    "）": ")",
    "【": "(",
    "】": ")",
    "「": "(",
    "」": ")",
    "《": "(",
    "》": ")",
    "．": ".",
    "·": "-",
    "、": "-",
    "—": "-",
    "－": "-",
}


def normalize_question_label(label: Optional[str]) -> Optional[str]:
    """将题号统一转换为纯文本编号，便于匹配。"""

    if label is None:
        return None

    text = unicodedata.normalize("NFKC", str(label)).strip()
    if not text:
        return None

    for src, dst in _PUNCT_REPLACEMENTS.items():
        text = text.replace(src, dst)

    text = text.replace("第", "").replace("题", "")
    text = "".join(_CIRCLED_DIGITS.get(char, char) for char in text)
    text = "".join(_CHINESE_DIGITS.get(char, char) for char in text)
    text = text.lower()
    text = re.sub(r"\s+", "", text)
    text = text.replace("(", "-").replace(")", "")
    text = text.replace("[", "-").replace("]", "")
    text = text.replace("{", "-").replace("}", "")
    text = text.replace(".", "-").replace("_", "-").replace("/", "-")
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def character_overlap_score(left: Optional[str], right: Optional[str]) -> float:
    """计算两个编号的字符集合重叠度，用于匹配回退。"""

    if not left or not right:
        return 0.0
    left_set = set(left)
    right_set = set(right)
    if not left_set or not right_set:
        return 0.0
    intersection = left_set & right_set
    return len(intersection) / max(len(left_set), len(right_set))
