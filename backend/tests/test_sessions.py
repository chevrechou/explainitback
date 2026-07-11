import pytest
import os
os.environ["AI_PROVIDER"] = "mock"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_start_session():
    resp = client.post("/sessions/start", json={"topic": "photosynthesis"})
    assert resp.status_code == 200
    data = resp.json()
    assert "first_message" in data
    assert data["topic"] == "photosynthesis"
    assert "photosynthesis" in data["first_message"].lower()

def test_send_message():
    resp = client.post("/sessions/message", json={
        "topic": "photosynthesis",
        "messages": [
            {"role": "assistant", "content": "Hey explain photosynthesis"},
        ],
        "user_message": "Plants use sunlight to make food",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "response" in data
    assert isinstance(data["turn_count"], int)
    assert isinstance(data["is_complete"], bool)

def test_topics_endpoint():
    resp = client.get("/topics")
    assert resp.status_code == 200
    data = resp.json()
    assert "topics" in data
    assert len(data["topics"]) >= 5
    assert data["custom_allowed"] is True

def test_max_turns_enforced():
    messages = []
    for i in range(20):
        messages.append({"role": "user", "content": f"turn {i}"})
        messages.append({"role": "assistant", "content": "okay"})
    resp = client.post("/sessions/message", json={
        "topic": "photosynthesis",
        "messages": messages,
        "user_message": "one more",
    })
    assert resp.status_code == 400
