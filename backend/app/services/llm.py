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
    """Clear cached LLM clients so new credentials take effect immediately."""
    _get_client.cache_clear()  # type: ignore[attr-defined]
    get_qwen_client.cache_clear()  # type: ignore[attr-defined]


def set_llm_credentials(
    *,
    api_key: str,
    base_url: Optional[str] = None,
    text_model: Optional[str] = None,
    vision_model: Optional[str] = None,
) -> None:
    if not api_key:
        raise ValueError("API key must not be empty.")
    os.environ["DASHSCOPE_API_KEY"] = api_key
    os.environ["QWEN_API_KEY"] = api_key
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
            "Missing DASHSCOPE_API_KEY (or QWEN_API_KEY); cannot reach the Qwen service.",
        )

    base_url = _read_env("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return OpenAI(api_key=api_key, base_url=base_url)


def _parse_json_payload(content: str) -> Dict[str, Any]:
    text = content.strip()
    if not text:
        raise LLMInvocationError("大模型返回内容为空，无法解析。")

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text, flags=re.IGNORECASE).strip()
        if text.endswith("```"):
            text = text[: -3].strip()

    def _try_load(candidate: str) -> Optional[Dict[str, Any]]:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            return None

    parsed = _try_load(text)
    if parsed is not None:
        return parsed

    for opening, closing in (("{", "}"), ("[", "]")):
        depth = 0
        start_index: Optional[int] = None
        for index, char in enumerate(text):
            if char == opening:
                if depth == 0:
                    start_index = index
                depth += 1
            elif char == closing and depth > 0:
                depth -= 1
                if depth == 0 and start_index is not None:
                    candidate = text[start_index : index + 1]
                    parsed = _try_load(candidate)
                    if parsed is not None:
                        return parsed

    raise LLMInvocationError("大模型返回内容无法解析为 JSON：{snippet}".format(snippet=text[:200]))



def _build_data_url(image_bytes: bytes, *, mime_type: str = "image/png") -> str:
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{base64_image}"


class QwenClient:
    """Wrapper around the qwen3-vl-plus multimodal API for JSON outputs."""

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
                    raise LLMInvocationError("LLM returned no choices.")
                content = response.choices[0].message.content or ""
                return _parse_json_payload(content)
            except Exception as exc:  # noqa: BLE001 - propagate after retries
                last_error = exc
        raise LLMInvocationError(
            "LLM response failed after {retries} retries: {error}".format(
                retries=max_retries,
                error=last_error,
            ),
        ) from last_error

    def parse_exam_outline(self, image_bytes: bytes, *, locale: str = "zh-CN") -> Dict[str, Any]:
        system_prompt = (
            "You are an experienced curriculum specialist who extracts structured data from exam scans."
            "Always respond with JSON using camelCase field names."
        )
        user_instruction = (
            "Review the uploaded exam image carefully and return only JSON.\n"
            "Schema: {\"title\": str, \"subject\": str, \"questions\": ["
            "{\"number\": str, \"type\": \"multiple_choice|fill_in_blank|subjective\", "
            "\"prompt\": str, \"maxScore\": number, \"answerKey\": object, \"options\": list | null}]}\n"
            "The answerKey must contain everything needed for grading. For example, multiple choice questions can use {\"correct\": \"A\", \"options\": [\"A\", \"B\", ...]}."
            "For fill-in-the-blank questions, use {\"acceptableAnswers\": [...], \"numeric\": bool, \"numericTolerance\": number}.\n"
            "Do not include any text outside of the JSON payload."
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
            raise LLMInvocationError("LLM payload is missing the questions field.")
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
            "You are an experienced exam grader. Use the answer key and the student's scanned responses to assign scores."
            "Always return JSON and avoid any extra commentary."
        )
        user_prompt = (
            f"Here is the exam outline and answer key in JSON format:\n```json\n{exam_json}\n```\n"
            "Review the student's complete exam image carefully and grade each question according to the answer key.\n"
            "Return JSON shaped as {\"matchingScore\": number, \"responses\": ["
            "{\"questionNumber\": str, \"studentAnswer\": str | null, \"normalizedAnswer\": str | null, "
            "\"score\": number | null, \"isCorrect\": bool | null, \"aiConfidence\": number, "
            "\"comments\": str | null, \"needsReview\": bool }], \"mistakes\": ["
            "{\"questionNumber\": str, \"knowledgeTags\": str | null, \"explanation\": str | null}], "
            "\"processingSteps\": [{\"name\": str, \"status\": \"success|warning|error\", \"detail\": str | null}], \"summary\": str }.\n"
            "If an answer cannot be verified, set needsReview=true for that question and explain the reason in comments."
        )
        if extra_instructions:
            user_prompt += f"\nAdditional instructions: {extra_instructions}"

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
            raise LLMInvocationError("LLM payload is missing the responses field.")
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
            "content": (
                "You are an OCR assistant for Chinese exams. Extract every question number, the student's answer text, "
                "and any teacher annotations. Return JSON only."
            ),
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
                        "Read every question in the image and return the results using this JSON structure:\n"
                        "{\"rows\": [{\"question_number\": \"Question number\", \"raw_text\": \"Student answer\", "
                        "\"annotation\": \"Teacher annotation (null if none)\", \"confidence\": value_between_0_and_1 }]}\n"
                        "Use Arabic numerals for question numbers. If an annotation or answer is missing, use null or an empty string."
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
        raise LLMInvocationError("LLM returned no results.")

    content = response.choices[0].message.content or ""
    payload = _parse_json_payload(content)
    if isinstance(payload, list):
        rows_payload = payload
    else:
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
        raise LLMInvocationError("LLM did not produce any valid question metadata.")

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

    rubric_text = json.dumps(rubric, ensure_ascii=False, indent=2) if rubric else "N/A"
    reference_text = json.dumps(reference_answer, ensure_ascii=False, indent=2) if reference_answer else "N/A"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a meticulous grader. Using the prompt, reference answer, and rubric, "
                f"assign a score between 0 and {max_score} inclusive and provide one sentence of feedback. "
                "Return JSON with fields score (number) and explanation (string)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Question: {question_prompt}\n\n"
                f"Reference answer: {reference_text}\n\n"
                f"Rubric: {rubric_text}\n\n"
                f"Student answer: {student_answer}\n\n"
                "Return a JSON object like {\"score\": 3, \"explanation\": \"Short feedback\"}."
            ),
        },
    ]

    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0.0,
    )

    if not response.choices:
        raise LLMInvocationError("LLM did not return a scoring result.")

    payload = _parse_json_payload(response.choices[0].message.content or "")
    score = payload.get("score")
    explanation = payload.get("explanation") or payload.get("feedback") or ""

    try:
        numeric_score = float(score)
    except (TypeError, ValueError):
        raise LLMInvocationError("澶фā鍨嬭繑鍥炵殑寰楀垎鏃犳晥锛歿}".format(score))

    bounded_score = max(0.0, min(numeric_score, max_score))
    return {
        "score": round(bounded_score, 2),
        "explanation": str(explanation).strip() or "AI grading succeeded but no explanation was provided.",
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
        "Below are the grading results for the student. Summarize the overall performance in at most two sentences and provide a next-step suggestion:\n"
        + json.dumps(compact_rows, ensure_ascii=False)
    )

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": "You are a homeroom teacher who writes concise, actionable feedback for other teachers."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )

    if not response.choices:
        raise LLMInvocationError("LLM did not return a summary.")

    return (response.choices[0].message.content or "").strip()


def analyze_student_profile(context: Dict[str, Any]) -> Dict[str, Any]:
    """Use Qwen to analyze a student profile and mistake context."""

    client = _get_client()
    model_name = _read_env("QWEN_TEXT_MODEL", "qwen-max")

    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior curriculum specialist. Based on the student profile and mistake list, provide a diagnosis."
                "Return strictly in JSON with overall_summary (string), knowledge_focus (array), teaching_advice (array), and root_causes (array)."
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
        raise LLMInvocationError("LLM did not return any content.")

    payload = _parse_json_payload(response.choices[0].message.content or "")
    return {
        "overall_summary": str(payload.get("overall_summary") or "").strip(),
        "knowledge_focus": payload.get("knowledge_focus") or [],
        "teaching_advice": payload.get("teaching_advice") or [],
        "root_causes": payload.get("root_causes") or [],
    }



TEACHER_ASSISTANT_PROMPT = (
    "You are an instructional coach who translates large-model insights into teaching plans, review strategies, and home-school communication."
    "When talking to teachers, keep the advice grounded in the provided context and make it practical."
    "Format the reply exactly as:\n"
    "<answer>\n"
    "Primary response focused on executable teaching suggestions.\n"
    "</answer>\n"
    "<suggestions>\n"
    "- Follow-up questions or next-step prompts, one per line.\n"
    "</suggestions>\n"
    "Respond in Simplified Chinese."
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
        raise LLMInvocationError("No valid content provided; cannot build a reply.")

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
        yield _format_sse_event("error", {"message": "LLM did not return a usable answer."})
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
        raise LLMInvocationError("LLM did not return an answer.")

    content = response.choices[0].message.content or ""
    answer, suggestions = _extract_answer_and_suggestions(content)
    if not answer:
        raise LLMInvocationError("LLM did not return a valid answer.")

    return answer, suggestions

def llm_available() -> bool:
    try:
        _get_client()
        return True
    except LLMNotConfiguredError:
        return False



