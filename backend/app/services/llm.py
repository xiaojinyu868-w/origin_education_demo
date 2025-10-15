from __future__ import annotations

import base64
import json
import os
import re
from functools import lru_cache
from typing import Any, Dict, Iterator, List, Optional, Tuple

from openai import OpenAI


class LLMNotConfiguredError(RuntimeError):
    """Raised when large model credentials are missing."""


class LLMInvocationError(RuntimeError):
    """Raised when the large model returns an unexpected payload."""


def _read_env(var_name: str, fallback: Optional[str] = None) -> Optional[str]:
    value = os.getenv(var_name)
    if value:
        return value
    return fallback


def reset_llm_client_cache() -> None:
    """Clear cached OpenAI client so that updated配置马上生效。"""
    _get_client.cache_clear()  # type: ignore[attr-defined]\n    get_qwen_client.cache_clear()  # type: ignore[attr-defined]


def set_llm_credentials(
    *,
    api_key: str,
    base_url: Optional[str] = None,
    text_model: Optional[str] = None,
    vision_model: Optional[str] = None,
) -> None:
    if not api_key:
        raise ValueError("API Key 不能为空")

    os.environ["DASHSCOPE_API_KEY"] = api_key
    if base_url:
        os.environ["QWEN_BASE_URL"] = base_url
    if text_model:
        os.environ["QWEN_TEXT_MODEL"] = text_model
    if vision_model:
        os.environ["QWEN_VL_MODEL"] = vision_model

    reset_llm_client_cache()


@lru_cache(maxsize=1)
def _get_client() -> OpenAI:
    api_key = _read_env("DASHSCOPE_API_KEY") or _read_env("QWEN_API_KEY")
    if not api_key:
        raise LLMNotConfiguredError(
            "未检测到 DASHSCOPE_API_KEY（或 QWEN_API_KEY）环境变量，无法调用大模型服务。",
        )

    base_url = _read_env("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return OpenAI(api_key=api_key, base_url=base_url)


def _parse_json_payload(content: str) -> Dict[str, Any]:
    text = content.strip()
    if not text:
        raise LLMInvocationError("大模型返回内容为空，无法解析。")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise LLMInvocationError("大模型返回内容无法解析为 JSON：{}".format(text[:200]))



def _build_data_url(image_bytes: bytes, *, mime_type: str = "image/png") -> str:
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{base64_image}"


class QwenClient:
    """封装通义千问 qwen3-vl-plus 多模态 JSON 调用。"""

    def __init__(self) -> None:
        self._client = _get_client()
        self._vision_model = _read_env("QWEN_VL_MODEL", "qwen3-vl-plus")

    def _image_payload(self, image_bytes: bytes, *, mime_type: str = "image/png") -> Dict[str, Any]:
        return {
            "type": "image_url",
            "image_url": {"url": _build_data_url(image_bytes, mime_type=mime_type)},
        }

    def _request_json(
        self,
        messages: List[Dict[str, Any]],
        *,
        temperature: float = 0.0,
        max_retries: int = 2,
    ) -> Dict[str, Any]:
        last_error: Optional[Exception] = None
        for _ in range(max_retries):
            try:
                response = self._client.chat.completions.create(
                    model=self._vision_model,
                    messages=messages,
                    temperature=temperature,
                )
                if not response.choices:
                    raise LLMInvocationError("大模型未返回任何结果。")
                content = response.choices[0].message.content or ""
                return _parse_json_payload(content)
            except Exception as exc:  # noqa: BLE001 - propagate after retries
                last_error = exc
        raise LLMInvocationError(
            "大模型返回异常，已重试 {retries} 次：{error}".format(
                retries=max_retries,
                error=last_error,
            ),
        ) from last_error

    def parse_exam_outline(self, image_bytes: bytes, *, locale: str = "zh-CN") -> Dict[str, Any]:
        system_prompt = (
            "你是一名资深教研员，需要从试卷扫描件中提取结构化信息。"
            "任何时候都必须输出 JSON，且字段命名需使用驼峰式英文。"
        )
        user_instruction = (
            "请阅读上传的整张试卷扫描件，并输出 JSON。\n"
            "JSON 结构：{\"title\": str, \"subject\": str, \"questions\": ["
            "{\"number\": str, \"type\": \"multiple_choice|fill_in_blank|subjective\", "
            "\"prompt\": str, \"maxScore\": number, \"answerKey\": object, \"options\": list 或 null}]。\n"
            "\"answerKey\" 字段需要包含批改所需的全部标准答案信息，例如多选题使用 {\"correct\": \"A\", \"options\": [\"A\", \"B\", ...]}，"
            "填空题可使用 {\"acceptableAnswers\": [...], \"numeric\": bool, \"numericTolerance\": number}。\n"
            "请勿输出除 JSON 外的任何文本。"
        )
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    self._image_payload(image_bytes),
                    {"type": "text", "text": user_instruction},
                ],
            },
        ]
        payload = self._request_json(messages)
        if "questions" not in payload:
            raise LLMInvocationError("大模型返回数据缺少 questions 字段。")
        return payload

    def grade_exam_submission(
        self,
        *,
        exam_outline: Dict[str, Any],
        student_image: bytes,
        locale: str = "zh-CN",
        extra_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        exam_json = json.dumps(exam_outline, ensure_ascii=False)
        system_prompt = (
            "你是一名经验丰富的阅卷老师，需要根据标准答案和学生的作答图像给出评分。"
            "始终返回 JSON，不要输出多余文本。"
        )
        user_prompt = (
            f"以下是试卷的结构与标准答案 JSON：\n```json\n{exam_json}\n```\n"
            "请认真阅读学生的完整试卷图片，根据标准答案逐题给分。\n"
            "输出 JSON：{\"matchingScore\": number, \"responses\": ["
            "{\"questionNumber\": str, \"studentAnswer\": str 或 null, \"normalizedAnswer\": str 或 null, "
            "\"score\": number 或 null, \"isCorrect\": bool 或 null, \"aiConfidence\": number, "
            "\"comments\": str 或 null, \"needsReview\": bool }], \"mistakes\": ["
            "{\"questionNumber\": str, \"knowledgeTags\": str 或 null, \"explanation\": str 或 null}],"
            " \"processingSteps\": [{\"name\": str, \"status\": \"success|warning|error\", \"detail\": str 或 null}],"
            " \"summary\": str }。\n"
            "若无法确认某题答案，请将该题标记 needsReview=true，并在 comments 中说明原因。"
        )
        if extra_instructions:
            user_prompt += f"\n额外说明：{extra_instructions}"

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    self._image_payload(student_image),
                    {"type": "text", "text": user_prompt},
                ],
            },
        ]
        payload = self._request_json(messages, temperature=0.1)
        if "responses" not in payload:
            raise LLMInvocationError("大模型返回数据缺少 responses 字段。")
        return payload


@lru_cache(maxsize=1)
def get_qwen_client() -> QwenClient:
    return QwenClient()


def parse_exam_outline(image_bytes: bytes, *, locale: str = "zh-CN") -> Dict[str, Any]:
    return get_qwen_client().parse_exam_outline(image_bytes, locale=locale)


def grade_exam_submission_with_ai(
    *,
    exam_outline: Dict[str, Any],
    student_image: bytes,
    locale: str = "zh-CN",
    extra_instructions: Optional[str] = None,
) -> Dict[str, Any]:
    return get_qwen_client().grade_exam_submission(
        exam_outline=exam_outline,
        student_image=student_image,
        locale=locale,
        extra_instructions=extra_instructions,
    )



def _ensure_confidence(value: Any) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        confidence = 0.0
    return max(0.0, min(confidence, 1.0))


def run_vision_ocr(image_bytes: bytes) -> Tuple[List[Dict[str, Optional[str]]], str]:
    """Use Qwen-VL to extract question rows from an exam image."""

    client = _get_client()
    model_name = _read_env("QWEN_VL_MODEL", "qwen3-vl-plus")
    image_url = _build_data_url(image_bytes)

    messages = [
        {
            "role": "system",
            "content": "你是一名中文试卷智能批改助手，需要从图像中准确提取每一道题目的题号、学生答案文本以及教师批注。请输出 JSON。",
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": image_url},
                },
                {
                    "type": "text",
                    "text": (
                        "请识别图中的所有题目，严格按照如下 JSON 结构返回结果：\n"
                        "{\"rows\": [{\"question_number\": \"题号\", \"raw_text\": \"学生原始答案\", "
                        "\"annotation\": \"教师批注（若无则为 null）\", \"confidence\": 介于0-1的置信度 }]}。\n"
                        "题号请使用阿拉伯数字，不要添加多余的文字。若识别不到批注或答案，使用 null 或空字符串。"
                    ),
                },
            ],
        },
    ]

    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0.1,
    )

    if not response.choices:
        raise LLMInvocationError("大模型未返回任何结果。")

    content = response.choices[0].message.content or ""
    payload = _parse_json_payload(content)
    rows_payload = payload.get("rows") or payload.get("questions") or []

    rows: List[Dict[str, Optional[str]]] = []
    for item in rows_payload:
        if not isinstance(item, dict):
            continue
        number = item.get("question_number") or item.get("number")
        if number is None:
            continue
        raw_text = item.get("raw_text") or item.get("answer") or ""
        annotation = item.get("annotation")
        confidence = _ensure_confidence(item.get("confidence"))
        rows.append(
            {
                "question_number": str(number),
                "raw_text": str(raw_text).strip(),
                "annotation": annotation if annotation not in ("", None) else None,
                "confidence": confidence,
            },
        )

    if not rows:
        raise LLMInvocationError("大模型未识别到有效的题目信息。")

    return rows, content


def score_subjective_answer(
    *,
    question_prompt: str,
    student_answer: str,
    max_score: float,
    rubric: Optional[Dict[str, Any]] = None,
    reference_answer: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Let Qwen generate a score and feedback for a subjective (short-answer) question."""

    client = _get_client()
    model_name = _read_env("QWEN_TEXT_MODEL", "qwen-max")

    rubric_text = json.dumps(rubric, ensure_ascii=False, indent=2) if rubric else "无"
    reference_text = json.dumps(reference_answer, ensure_ascii=False, indent=2) if reference_answer else "无"

    messages = [
        {
            "role": "system",
            "content": (
                "你是一名严谨的阅卷老师，请根据题目、参考答案与评分标准，对学生的简答题作答给出得分（0-"
                + str(max_score)
                + "）并提供一句中文点评。评分务必遵循评分标准，输出 JSON，字段包含 score(数字)、explanation(字符串)。"
            ),
        },
        {
            "role": "user",
            "content": (
                f"题目：{question_prompt}\n\n"
                f"参考答案：{reference_text}\n\n"
                f"评分标准：{rubric_text}\n\n"
                f"学生作答：{student_answer}\n\n"
                "请输出 JSON 对象，例如 {\"score\": 3, \"explanation\": \"评价\"}。"
            ),
        },
    ]

    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0.0,
    )

    if not response.choices:
        raise LLMInvocationError("大模型未返回评分结果。")

    payload = _parse_json_payload(response.choices[0].message.content or "")
    score = payload.get("score")
    explanation = payload.get("explanation") or payload.get("feedback") or ""

    try:
        numeric_score = float(score)
    except (TypeError, ValueError):
        raise LLMInvocationError("大模型返回的得分无效：{}".format(score))

    bounded_score = max(0.0, min(numeric_score, max_score))
    return {
        "score": round(bounded_score, 2),
        "explanation": str(explanation).strip() or "AI 评分成功，但未提供详细说明。",
    }


def summarize_submission(responses: List[Dict[str, Any]]) -> str:
    """Generate a concise Chinese summary for the submission result."""

    if not responses:
        return ""

    client = _get_client()
    model_name = _read_env("QWEN_TEXT_MODEL", "qwen-max")

    compact_rows = []
    for item in responses:
        compact_rows.append(
            {
                "question_id": item.get("question_id"),
                "is_correct": item.get("is_correct"),
                "score": item.get("score"),
                "max_score": item.get("max_score"),
                "feedback": item.get("comments") or item.get("explanation"),
            },
        )

    prompt = (
        "以下是学生作答的批改结果，请用 2 句话总结整体表现，并给出下一步建议：\n"
        + json.dumps(compact_rows, ensure_ascii=False)
    )

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": "你是一名班主任，需要给教师生成简洁可执行的点评。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )

    if not response.choices:
        raise LLMInvocationError("大模型未返回总结。")

    return (response.choices[0].message.content or "").strip()


def analyze_student_profile(context: Dict[str, Any]) -> Dict[str, Any]:
    """调用通义千问对学生档案与错题上下文进行分析。"""

    client = _get_client()
    model_name = _read_env("QWEN_TEXT_MODEL", "qwen-max")

    messages = [
        {
            "role": "system",
            "content": (
                "你是一名资深教研员，需要基于学生档案与错题列表给出诊断。"
                "请严格输出 JSON，对象需包含 overall_summary（字符串）、knowledge_focus（数组）、"
                "teaching_advice（数组）以及 root_causes（数组）。"
            ),
        },
        {
            "role": "user",
            "content": json.dumps(context, ensure_ascii=False),
        },
    ]

    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0.4,
    )

    if not response.choices:
        raise LLMInvocationError("大模型未返回任何内容。")

    payload = _parse_json_payload(response.choices[0].message.content or "")
    return {
        "overall_summary": str(payload.get("overall_summary") or "").strip(),
        "knowledge_focus": payload.get("knowledge_focus") or [],
        "teaching_advice": payload.get("teaching_advice") or [],
        "root_causes": payload.get("root_causes") or [],
    }



TEACHER_ASSISTANT_PROMPT = (
    "你是一名资深教研顾问，擅长将大模型能力转化为教学计划、讲评策略和家校沟通脚本。"
    "与教师对话时，请基于提供的上下文给出务实、可执行的建议。"
    "回答时必须严格使用以下格式：\n"
    "<answer>\n"
    "主要回复内容，聚焦可执行的教学建议。\n"
    "</answer>\n"
    "<suggestions>\n"
    "- 后续追问或跟进的灵感要点，每行一个。\n"
    "</suggestions>\n"
    "所有输出均需使用简体中文。"
)


def _extract_answer_and_suggestions(content: str) -> Tuple[str, List[str]]:
    answer = ""
    suggestions: List[str] = []
    lower = content.lower()

    answer_start = lower.find("<answer>")
    answer_end = lower.find("</answer>", answer_start + len("<answer>"))
    if answer_start != -1 and answer_end != -1:
        answer = content[answer_start + len("<answer>"):answer_end].strip()
    else:
        answer = content.strip()

    sugg_start = lower.find("<suggestions>")
    sugg_end = lower.find("</suggestions>", sugg_start + len("<suggestions>"))
    if sugg_start != -1 and sugg_end != -1:
        block = content[sugg_start + len("<suggestions>"):sugg_end]
        for line in block.splitlines():
            candidate = line.strip()
            if candidate.startswith(("-", "?")):
                candidate = candidate[1:].strip()
            if candidate:
                suggestions.append(candidate)

    return answer, suggestions


def _prepare_assistant_messages(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    cleaned: List[Dict[str, str]] = []
    for item in messages:
        role = item.get("role", "user")
        if role not in {"user", "assistant"}:
            role = "user"
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        cleaned.append({"role": role, "content": content})

    if not cleaned:
        raise LLMInvocationError("缺少有效内容，无法生成答案。")

    chat_messages: List[Dict[str, str]] = [
        {"role": "system", "content": TEACHER_ASSISTANT_PROMPT},
    ]
    chat_messages.extend(cleaned)
    return chat_messages


def _format_sse_event(event: str, payload: Dict[str, Any]) -> str:
    return "event: {event}\ndata: {data}\n\n".format(
        event=event,
        data=json.dumps(payload, ensure_ascii=False),
    )

def stream_teacher_assistant(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    top_p: Optional[float] = None,
    presence_penalty: Optional[float] = None,
    frequency_penalty: Optional[float] = None,
) -> Iterator[str]:
    try:
        chat_messages = _prepare_assistant_messages(messages)
    except LLMInvocationError as exc:
        yield _format_sse_event("error", {"message": str(exc)})
        yield _format_sse_event("done", {})
        return

    try:
        client = _get_client()
    except LLMNotConfiguredError as exc:
        yield _format_sse_event("error", {"message": str(exc)})
        yield _format_sse_event("done", {})
        return

    model_name = _read_env("QWEN_TEXT_MODEL", "qwen-max")
    params: Dict[str, Any] = {
        "model": model_name,
        "messages": chat_messages,
        "temperature": temperature,
        "stream": True,
    }
    if top_p is not None:
        params["top_p"] = top_p
    if presence_penalty is not None:
        params["presence_penalty"] = presence_penalty
    if frequency_penalty is not None:
        params["frequency_penalty"] = frequency_penalty

    try:
        stream = client.chat.completions.create(**params)
    except Exception as exc:  # pragma: no cover - network errors mapped to runtime errors
        yield _format_sse_event("error", {"message": str(exc)})
        yield _format_sse_event("done", {})
        return

    tags = {
        "<answer>": ("answer", True),
        "</answer>": ("answer", False),
        "<suggestions>": ("suggestions", True),
        "</suggestions>": ("suggestions", False),
    }

    buffer = ""
    raw_content = ""
    answer_buffer: List[str] = []
    inside_answer = False

    def flush_answer() -> Optional[str]:
        if not answer_buffer:
            return None
        chunk_text = "".join(answer_buffer)
        answer_buffer.clear()
        return chunk_text

    for chunk in stream:
        if not getattr(chunk, "choices", None):
            continue
        delta = chunk.choices[0].delta.content or ""
        if not delta:
            continue
        raw_content += delta
        buffer += delta

        while buffer:
            full_tag = next((tag for tag in tags if buffer.startswith(tag)), None)
            if full_tag:
                scope, flag = tags[full_tag]
                if scope == "answer":
                    if not flag:
                        chunk_text = flush_answer()
                        if chunk_text:
                            yield _format_sse_event("answer_delta", {"text": chunk_text})
                    inside_answer = flag
                buffer = buffer[len(full_tag):]
                continue

            if any(tag.startswith(buffer) for tag in tags):
                break

            char = buffer[0]
            buffer = buffer[1:]
            if inside_answer:
                answer_buffer.append(char)
                if len(answer_buffer) >= 80:
                    chunk_text = flush_answer()
                    if chunk_text:
                        yield _format_sse_event("answer_delta", {"text": chunk_text})

    chunk_text = flush_answer()
    if chunk_text:
        yield _format_sse_event("answer_delta", {"text": chunk_text})

    answer, suggestions = _extract_answer_and_suggestions(raw_content)
    if not answer:
        yield _format_sse_event("error", {"message": "大模型未返回有效回答。"})
        yield _format_sse_event("done", {})
        return

    yield _format_sse_event("answer_complete", {"text": answer})
    yield _format_sse_event("suggestions", {"items": suggestions})
    yield _format_sse_event("done", {})


def run_teacher_assistant(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    top_p: Optional[float] = None,
    presence_penalty: Optional[float] = None,
    frequency_penalty: Optional[float] = None,
) -> Tuple[str, List[str]]:
    """Use Qwen to answer teachers' planning or analysis questions."""

    chat_messages = _prepare_assistant_messages(messages)

    client = _get_client()
    model_name = _read_env("QWEN_TEXT_MODEL", "qwen-max")

    params: Dict[str, Any] = {
        "model": model_name,
        "messages": chat_messages,
        "temperature": temperature,
    }
    if top_p is not None:
        params["top_p"] = top_p
    if presence_penalty is not None:
        params["presence_penalty"] = presence_penalty
    if frequency_penalty is not None:
        params["frequency_penalty"] = frequency_penalty

    response = client.chat.completions.create(**params)

    if not response.choices:
        raise LLMInvocationError("大模型未返回回答。")

    content = response.choices[0].message.content or ""
    answer, suggestions = _extract_answer_and_suggestions(content)
    if not answer:
        raise LLMInvocationError("大模型未返回有效回答。")

    return answer, suggestions

def llm_available() -> bool:
    try:
        _get_client()
        return True
    except LLMNotConfiguredError:
        return False


