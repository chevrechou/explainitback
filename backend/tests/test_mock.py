import pytest
import asyncio
from app.services.mock import mock_chat

def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)

def test_first_response_is_opener():
    result = run(mock_chat("photosynthesis", []))
    assert "photosynthesis" in result
    assert "explain" in result.lower()

def test_later_response_is_different():
    messages = [
        {"role": "assistant", "content": "Hey explain photosynthesis"},
        {"role": "user", "content": "It is when plants make food"},
        {"role": "assistant", "content": "Okay but WHY?"},
        {"role": "user", "content": "Because of sunlight"},
    ]
    result = run(mock_chat("photosynthesis", messages))
    assert isinstance(result, str)
    assert len(result) > 0

def test_final_response_contains_assessment():
    # Build 9 user turns to trigger end-of-session response
    messages = []
    for i in range(9):
        messages.append({"role": "user", "content": f"turn {i}"})
        messages.append({"role": "assistant", "content": "okay"})
    result = run(mock_chat("photosynthesis", messages))
    assert "<assessment>" in result
