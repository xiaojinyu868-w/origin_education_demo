from __future__ import annotations

import base64
import json
import os
import re
from functools import lru_cache
from typing import Any, Dict, Iterator, List, Optional, Tuple

from openai import OpenAI

from .question_utils import normalize_question_label


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




def _sanitize_exam_outline_payload(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise LLMInvocationError("LLM 返回的试卷结构不是 JSON 对象。")
    title_raw = payload.get("title")
    title = str(title_raw).strip() if title_raw not in (None, "") else "未命名试卷"
    subject_raw = payload.get("subject")
    result: Dict[str, Any] = {"title": title or "未命名试卷"}
    if subject_raw not in (None, ""):
        result["subject"] = str(subject_raw).strip()
    questions_raw = payload.get("questions")
    if not isinstance(questions_raw, list) or not questions_raw:
        raise LLMInvocationError("LLM 未识别出任何题目。")
    sanitized_questions: List[Dict[str, Any]] = []
    for index, item in enumerate(questions_raw):
        if not isinstance(item, dict):
            raise LLMInvocationError(f"题目 {index + 1} 的结构不是 JSON 对象。")
        number_raw = item.get("number") or item.get("questionNumber") or item.get("label")
        number = str(number_raw).strip() if number_raw not in (None, "") else ""
        if not number:
            raise LLMInvocationError(f"题目 {index + 1} 缺少题号。")
        question_type = _normalize_question_type(item.get("type"))
        prompt_raw = item.get("prompt") or item.get("question") or item.get("text")
        prompt = str(prompt_raw).strip() if prompt_raw not in (None, "") else ""
        max_score_raw = item.get("maxScore") or item.get("max_score") or item.get("points")
        try:
            max_score = float(max_score_raw) if max_score_raw is not None else 1.0
        except (TypeError, ValueError):
            max_score = 1.0
        max_score = max(0.0, round(max_score, 2))
        answer_key = item.get("answerKey") or item.get("answer_key") or {}
        if not isinstance(answer_key, dict):
            answer_key = {}
        sub_questions = _sanitize_sub_questions(
            answer_key.get("subQuestions") or answer_key.get("sub_questions"),
            number,
        )
        if sub_questions:
            answer_key["subQuestions"] = sub_questions
        else:
            answer_key.pop("subQuestions", None)
        sanitized: Dict[str, Any] = {
            "number": number,
            "type": question_type,
            "prompt": prompt,
            "maxScore": max_score,
            "answerKey": answer_key,
        }
        knowledge = item.get("knowledgeTags") or item.get("knowledge_tags")
        if knowledge not in (None, ""):
            sanitized["knowledgeTags"] = str(knowledge).strip()
        rubric = item.get("rubric")
        if isinstance(rubric, dict):
            sanitized["rubric"] = rubric
        options = item.get("options")
        if isinstance(options, list):
            sanitized["options"] = options
        sanitized_questions.append(sanitized)
    result["questions"] = sanitized_questions
    return result


def _sanitize_sub_question_scores(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []
    results: List[Dict[str, Any]] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            continue
        label_raw = item.get("label") or item.get("number") or item.get("questionNumber")
        label = str(label_raw).strip() if label_raw not in (None, "") else f"子问{index + 1}"
        normalized = item.get("normalizedLabel") or item.get("normalized_label")
        normalized = normalize_question_label(normalized or label) or normalize_question_label(f"{label}-{index + 1}")
        score_raw = item.get("score")
        try:
            score = float(score_raw) if score_raw is not None else None
        except (TypeError, ValueError):
            score = None
        max_score_raw = item.get("maxScore") or item.get("max_score")
        try:
            max_score = float(max_score_raw) if max_score_raw is not None else None
        except (TypeError, ValueError):
            max_score = None
        is_correct_raw = item.get("isCorrect")
        if isinstance(is_correct_raw, str):
            lowered = is_correct_raw.lower()
            if lowered in {"true", "yes", "correct"}:
                is_correct = True
            elif lowered in {"false", "no", "incorrect"}:
                is_correct = False
            else:
                is_correct = None
        else:
            is_correct = bool(is_correct_raw) if is_correct_raw is not None else None
        entry: Dict[str, Any] = {"label": label, "normalizedLabel": normalized}
        if score is not None:
            entry["score"] = round(score, 2)
        if max_score is not None:
            entry["maxScore"] = round(max_score, 2)
        if is_correct is not None:
            entry["isCorrect"] = is_correct
        results.append(entry)
    return results


def _sanitize_exam_grading_payload(payload: Any, *, mode: str) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise LLMInvocationError("LLM 返回的批改结果不是 JSON 对象。")
    responses_raw = payload.get("responses")
    if not isinstance(responses_raw, list) or not responses_raw:
        raise LLMInvocationError("LLM 返回的批改结果缺少 responses 列表。")
    sanitized_responses: List[Dict[str, Any]] = []
    for index, item in enumerate(responses_raw):
        if not isinstance(item, dict):
            raise LLMInvocationError(f"responses[{index}] 不是 JSON 对象。")
        number_raw = item.get("questionNumber") or item.get("number")
        number = str(number_raw).strip() if number_raw not in (None, "") else ""
        if not number:
            raise LLMInvocationError(f"responses[{index}] 缺少题号。")
        normalized_raw = item.get("normalizedNumber") or item.get("normalized_number") or item.get("normalizedLabel")
        normalized_number = normalize_question_label(normalized_raw or number) or number
        student_answer = item.get("studentAnswer") or item.get("student_answer")
        student_answer_value = None if student_answer in (None, "") else str(student_answer)
        normalized_answer = item.get("normalizedAnswer") or item.get("normalized_answer")
        normalized_answer_value = None if normalized_answer in (None, "") else str(normalized_answer).strip()
        score_raw = item.get("score")
        try:
            score_value = float(score_raw) if score_raw is not None else None
        except (TypeError, ValueError):
            score_value = None
        if score_value is not None:
            score_value = round(score_value, 2)
        is_correct_raw = item.get("isCorrect") or item.get("correct")
        if isinstance(is_correct_raw, str):
            lowered = is_correct_raw.lower()
            if lowered in {"true", "yes", "correct"}:
                is_correct = True
            elif lowered in {"false", "no", "incorrect"}:
                is_correct = False
            else:
                is_correct = None
        elif is_correct_raw is None:
            is_correct = None
        else:
            is_correct = bool(is_correct_raw)
        comments_raw = item.get("comments") or item.get("explanation")
        comments = str(comments_raw).strip() if comments_raw not in (None, "") else None
        needs_review_raw = item.get("needsReview")
        if needs_review_raw is None:
            needs_review_raw = item.get("needs_review")
        needs_review = bool(needs_review_raw) if needs_review_raw is not None else False
        blocked_raw = item.get("blockedSupplement") or item.get("blocked_supplement")
        blocked = str(blocked_raw).strip() if blocked_raw not in (None, "") else None
        if blocked and mode == "strict" and not _contains_chinese(blocked):
            raise LLMInvocationError("严格模式下 blockedSupplement 必须使用中文说明。")
        suspicious = _sanitize_suspicious_matches(
            item.get("suspiciousMatches") or item.get("suspicious_matches") or [],
        )
        ai_confidence_raw = item.get("aiConfidence") or item.get("confidence")
        ai_confidence = None
        if ai_confidence_raw is not None:
            ai_confidence = _ensure_confidence(ai_confidence_raw)
        sub_scores = _sanitize_sub_question_scores(
            item.get("subQuestionScores") or item.get("sub_questions") or [],
        )
        response_payload: Dict[str, Any] = {
            "questionNumber": number,
            "normalizedNumber": normalized_number,
            "studentAnswer": student_answer_value,
            "normalizedAnswer": normalized_answer_value,
            "score": score_value,
            "isCorrect": is_correct,
            "needsReview": needs_review,
        }
        if ai_confidence is not None:
            response_payload["aiConfidence"] = ai_confidence
        if comments:
            response_payload["comments"] = comments
        if blocked:
            response_payload["blockedSupplement"] = blocked
        if suspicious:
            response_payload["suspiciousMatches"] = suspicious
        if sub_scores:
            response_payload["subQuestionScores"] = sub_scores
        sanitized_responses.append(response_payload)
    matching_raw = payload.get("matchingScore") or payload.get("matching_score")
    matching_score = None
    if matching_raw is not None:
        try:
            matching_score = float(matching_raw)
        except (TypeError, ValueError):
            matching_score = None
        else:
            matching_score = max(0.0, min(matching_score, 1.0))
    mistakes_raw = payload.get("mistakes") or []
    mistakes: List[Dict[str, Optional[str]]] = []
    if isinstance(mistakes_raw, list):
        for item in mistakes_raw:
            if not isinstance(item, dict):
                continue
            number_raw = item.get("questionNumber") or item.get("number")
            number = str(number_raw).strip() if number_raw not in (None, "") else ""
            if not number:
                continue
            knowledge = item.get("knowledgeTags") or item.get("knowledge_tags")
            explanation = item.get("explanation") or item.get("reason")
            mistakes.append(
                {
                    "questionNumber": number,
                    "knowledgeTags": str(knowledge).strip() if knowledge not in (None, "") else None,
                    "explanation": str(explanation).strip() if explanation not in (None, "") else None,
                },
            )
    processing_steps = _sanitize_processing_steps(
        payload.get("processingSteps") or payload.get("processing_steps"),
    )
    summary_raw = payload.get("summary")
    summary = str(summary_raw).strip() if summary_raw not in (None, "") else None
    result: Dict[str, Any] = {"responses": sanitized_responses}
    if matching_score is not None:
        result["matchingScore"] = matching_score
    if mistakes:
        result["mistakes"] = mistakes
    if processing_steps:
        result["processingSteps"] = processing_steps
    if summary:
        result["summary"] = summary
    return result


def _sanitize_subjective_scoring_payload(payload: Any, *, max_score: float, mode: str) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise LLMInvocationError("LLM 返回的主观题评分不是 JSON 对象。")
    score_raw = payload.get("score")
    try:
        score_value = float(score_raw)
    except (TypeError, ValueError):
        raise LLMInvocationError(f"LLM 返回的主观题得分无效：{score_raw}")
    score_value = max(0.0, min(score_value, max_score))
    explanation_raw = payload.get("explanation") or payload.get("feedback")
    explanation = str(explanation_raw).strip() if explanation_raw not in (None, "") else "AI 已给出评分结果，请教师确认。"
    needs_review_raw = payload.get("needsReview")
    if needs_review_raw is None:
        needs_review_raw = payload.get("needs_review")
    blocked_raw = payload.get("blockedSupplement") or payload.get("blocked_supplement")
    blocked = str(blocked_raw).strip() if blocked_raw not in (None, "") else None
    if blocked and mode == "strict" and not _contains_chinese(blocked):
        raise LLMInvocationError("严格模式下 blockedSupplement 必须使用中文说明。")
    suspicious = _sanitize_suspicious_matches(
        payload.get("suspiciousMatches") or payload.get("suspicious_matches") or [],
    )
    result: Dict[str, Any] = {
        "score": round(score_value, 2),
        "explanation": explanation,
    }
    if needs_review_raw is not None:
        result["needs_review"] = bool(needs_review_raw)
    if blocked:
        result["blockedSupplement"] = blocked
    if suspicious:
        result["suspiciousMatches"] = suspicious
    return result

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


def _contains_chinese(text: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in text)


def _normalize_question_type(value: Any) -> str:
    text = str(value or "").lower()
    if "fill" in text or "blank" in text:
        return "fill_in_blank"
    if "subject" in text or "essay" in text or "open" in text:
        return "subjective"
    return "multiple_choice"


def _sanitize_suspicious_matches(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []
    sanitized: List[Dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        answer = str(item.get("answer") or item.get("candidate") or "").strip()
        reason = str(item.get("reason") or item.get("explanation") or "").strip()
        if not answer or not reason:
            continue
        confidence = _ensure_confidence(item.get("confidence"))
        sanitized.append(
            {
                "answer": answer,
                "reason": reason,
                "confidence": confidence,
            },
        )
    return sanitized


def _sanitize_processing_steps(value: Any) -> List[Dict[str, Optional[str]]]:
    if not isinstance(value, list):
        return []
    normalized: List[Dict[str, Optional[str]]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("step") or "处理步骤").strip()
        status = str(item.get("status") or "success").lower()
        if status not in {"success", "warning", "error"}:
            status = "success"
        detail_raw = item.get("detail") or item.get("message")
        detail = str(detail_raw).strip() if detail_raw not in (None, "") else None
        normalized.append(
            {
                "name": name,
                "status": status,
                "detail": detail,
            },
        )
    return normalized


def _sanitize_sub_questions(value: Any, parent_label: str) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result: List[Dict[str, Any]] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            continue
        label = str(
            item.get("label")
            or item.get("number")
            or item.get("subNumber")
            or item.get("questionNumber")
            or f"{parent_label}({index + 1})"
        ).strip()
        normalized_label = item.get("normalizedLabel") or item.get("normalized_label")
        normalized_label = normalize_question_label(normalized_label or label) or normalize_question_label(
            f"{parent_label}-{index + 1}",
        )
        sub_answer_key = item.get("answerKey") or item.get("answer_key") or {}
        if not isinstance(sub_answer_key, dict):
            sub_answer_key = {}
        sub_result: Dict[str, Any] = {"label": label, "normalizedLabel": normalized_label}
        if sub_answer_key:
            sub_result["answerKey"] = sub_answer_key
        acceptable = item.get("acceptableAnswers") or item.get("acceptable_answers")
        if isinstance(acceptable, list) and acceptable:
            sub_result["acceptableAnswers"] = acceptable
        max_score = item.get("maxScore") or item.get("max_score")
        try:
            if max_score is not None:
                sub_result["maxScore"] = float(max_score)
        except (TypeError, ValueError):
            pass
        result.append(sub_result)
    return result


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
            "你是一名资深教研员，负责从试卷扫描件中提取结构化数据。"
            "必须使用 camelCase 的 JSON 字段，并确保所有说明为简体中文。"
        )
        instructions = [
            "请仔细阅读图片，仅返回 JSON。",
            (
                "数据结构示例：{\"title\": str, \"subject\": str, \"questions\": [{"
                "\"number\": str, \"type\": \"multiple_choice|fill_in_blank|subjective\", "
                "\"prompt\": str, \"maxScore\": number, \"knowledgeTags\": str?, \"answerKey\": object}]}"
            ),
            "当题目包含子问（如 5(1)、5(2)），请在 answerKey.subQuestions 中返回数组，每个子项需要提供 label、normalizedLabel（使用半角或连字符规范化），以及可选的 answerKey。",
            "不得输出 JSON 以外的任何文字。",
        ]
        if not locale.lower().startswith("zh"):
            instructions.append("If locale is not Chinese,仍需使用简体中文说明。")
        user_instruction = "\n".join(instructions)
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
        return _sanitize_exam_outline_payload(payload)


    def grade_exam_submission(
        self,
        *,
        exam_outline: Dict[str, Any],
        student_image: bytes,
        locale: str = "zh-CN",
        answer_mode: str = "strict",
        extra_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        exam_json = json.dumps(exam_outline, ensure_ascii=False)
        mode = answer_mode if answer_mode in {"strict", "smart"} else "strict"

        system_prompt = (
            "你是一名严谨的阅卷老师。请根据教师提供的答案和学生作答给出评分，"
            "必须返回 JSON 且所有提示使用简体中文。"
        )
        common_guidance = [
            "逐题按照题号输出评分结果，字段使用 camelCase。",
            "studentAnswer 保留学生原文，normalizedAnswer 仅可做格式清理，禁止虚构答案。",
            "若缺乏判分依据或答案存疑，需将 needsReview 设为 true 并说明原因。",
        ]
        if mode == "strict":
            mode_guidance = [
                "严格匹配模式：只能依据教师提供的标准答案判分，不得生成新的参考答案。",
                "如需提示教师补充答案，请保持得分不变，在 blockedSupplement 中给出中文原因，并设置 needsReview 为 true。",
            ]
        else:
            mode_guidance = [
                "智能参考模式：可以识别语义相近的答案，但需在 comments 或 suspiciousMatches 中说明依据。",
                "当判断存在不确定性或模型提供参考扩展时，必须 needsReview=true，并在 suspiciousMatches 中列出中文理由与置信度。",
            ]
        format_line = (
            '{"matchingScore": number?, "responses": [{'
            '"questionNumber": str, "normalizedNumber": str?, "studentAnswer": str | null, '
            '"normalizedAnswer": str | null, "score": number | null, "isCorrect": bool | null, '
            '"aiConfidence": number?, "comments": str | null, "needsReview": bool, '
            '"blockedSupplement": str | null, '
            '"suspiciousMatches": [{"answer": str, "reason": str, "confidence": float}]?, '
            '"subQuestionScores": [{"label": str, "normalizedLabel": str, "score": number?, '
            '"maxScore": number?, "isCorrect": bool?}]? }], '
            '"mistakes": [{"questionNumber": str, "knowledgeTags": str | null, "explanation": str | null}]?, '
            '"processingSteps": [{"name": str, "status": "success|warning|error", "detail": str | null}]?, '
            '"summary": str? }'
        )
        instruction_lines = [
            "评分要求：",
            *common_guidance,
            *mode_guidance,
            "返回格式：",
            format_line,
            "所有描述字段必须使用简体中文。如遇子问题号，请同步给出 subQuestionScores 并规范 normalizedLabel。",
            "以下为试卷结构与答案 JSON：",
            "```json",
            exam_json,
            "```",
            "请结合学生整份试卷图片完成评分，并返回符合上述规范的 JSON。",
        ]
        if extra_instructions:
            instruction_lines.append(f"教师额外说明：{extra_instructions}")
        user_prompt = "\n".join(instruction_lines)
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
        return _sanitize_exam_grading_payload(payload, mode=mode)



def grade_exam_submission_with_ai(
    *,
    exam_outline: Dict[str, Any],
    student_image: bytes,
    locale: str = "zh-CN",
    answer_mode: str = "strict",
    extra_instructions: Optional[str] = None,
) -> Dict[str, Any]:
    return get_qwen_client().grade_exam_submission(
        exam_outline=exam_outline,
        student_image=student_image,
        locale=locale,
        answer_mode=answer_mode,
        extra_instructions=extra_instructions,
    )


@lru_cache(maxsize=1)
def get_qwen_client() -> QwenClient:
    return QwenClient()


def parse_exam_outline(image_bytes: bytes, *, locale: str = "zh-CN") -> Dict[str, Any]:
    return get_qwen_client().parse_exam_outline(image_bytes, locale=locale)



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
    answer_mode: str = "strict",
) -> Dict[str, Any]:
    """Use Qwen to score a subjective question with Chinese guidance."""

    mode = answer_mode if answer_mode in {"strict", "smart"} else "strict"

    client = _get_client()
    model_name = _read_env("QWEN_TEXT_MODEL", "qwen-max")

    rubric_text = json.dumps(rubric, ensure_ascii=False, indent=2) if rubric else "{}"
    reference_text = (
        json.dumps(reference_answer, ensure_ascii=False, indent=2) if reference_answer else "{}"
    )

    system_prompt = (
        "你是一名严谨的阅卷老师。请结合题干、评分细则与参考答案，为学生作答给出得分和中文说明。"
        "必须只输出 JSON。"
    )

    guidance = [
        f"本题满分 {max_score} 分，请返回 0 到 {max_score} 的得分，保留两位小数。",
        "所有说明字段须使用简体中文，不得加入与评分无关的内容。",
        "若信息不足以判分，请保持原得分不变，将 needs_review 设为 true，并在 blockedSupplement 中说明原因。",
        "如发现可能的参考答案或可疑匹配，请在 suspiciousMatches 中列出 {\"answer\", \"reason\", \"confidence\"}。",
    ]
    if mode == "strict":
        guidance.extend(
            [
                "严格匹配模式：仅能依据教师提供的答案判分，禁止扩写新的参考答案。",
                "如需提醒教师补充答案，应保持当前得分，在 blockedSupplement 中给出中文原因，并将 needs_review 设为 true。",
            ]
        )
    else:
        guidance.append(
            "智能参考模式：可参考语义接近的答案，但需说明依据并在不确定时将 needs_review 设为 true。",
        )

    instruction_lines = guidance + [
        "请返回形如 {\"score\": number, \"explanation\": str, \"needs_review\": bool?, \"blockedSupplement\": str?,"
        "请返回形如 {\"score\": number, \"explanation\": str, \"needs_review\": bool?, \"blockedSupplement\": str?,"
        " \"suspiciousMatches\": [{\"answer\": str, \"reason\": str, \"confidence\": float}]?} 的 JSON。",
        question_prompt or "（题干缺失）",
        "评分细则 JSON：",
        rubric_text,
        "参考答案 JSON：",
        reference_text,
        "学生作答：",
        student_answer or "（未作答）",
    ]
    user_prompt = "\n".join(instruction_lines)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0.1,
    )

    if not response.choices:
        raise LLMInvocationError("LLM 未返回评分结果。")

    payload = _parse_json_payload(response.choices[0].message.content or "")
    return _sanitize_subjective_scoring_payload(payload, max_score=max_score, mode=mode)



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
    "When talking to teachers, keep the advice grounded in the provided mistake context that the user may supply in previous messages."
    "Always read the mistake context carefully, then respond in Simplified Chinese."
    "Format every reply exactly as:\n"
    "<answer>\n"
    "【共性诊断】简述3条以内的共性问题与典型错误，引用错题上下文中的细节。\n"
    "【课堂策略】给出可执行的课堂讲评或分层教学动作，突出时间安排与互动方式。\n"
    "【家校建议】提供家校沟通与课后巩固建议，指明家长或学生接下来要做的事情。\n"
    "</answer>\n"
    "<suggestions>\n"
    "- Follow-up questions or next-step prompts, one per line. Keep them concise and actionable.\n"
    "</suggestions>\n"
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



