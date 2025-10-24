import pytest

from backend.app.services.question_utils import (
    character_overlap_score,
    normalize_question_label,
)


def test_normalize_question_label_handles_compound_numbers():
    assert normalize_question_label("5(1)") == "5-1"
    assert normalize_question_label(" 3-2 ") == "3-2"
    assert normalize_question_label("第2题") == "2"


def test_normalize_question_label_returns_none_for_empty_input():
    assert normalize_question_label(None) is None
    assert normalize_question_label("") is None
    assert normalize_question_label("   ") is None


def test_character_overlap_score_uses_unique_characters():
    assert character_overlap_score("5-1", None) == 0.0
    assert character_overlap_score("5-1", "7") == 0.0
    assert character_overlap_score("5-1", "5-2") == pytest.approx(2 / 3)
