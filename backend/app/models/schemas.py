from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal, Optional


class Message(BaseModel):
    role: Literal['user', 'assistant']
    content: str


class SubConcept(BaseModel):
    name: str
    status: str  # "NOT_ADDRESSED" | "SURFACE" | "UNDERSTOOD"
    evidence: str


class Assessment(BaseModel):
    topic: str
    overall_score: int = Field(ge=0, le=100)
    sub_concepts: list[SubConcept]
    biggest_gap: str
    strongest_point: str
    misconceptions: list[str]


class SessionStartRequest(BaseModel):
    topic: str
    document_text: Optional[str] = None
    document_url: Optional[str] = None


class SessionStartResponse(BaseModel):
    first_message: str
    topic: str
    sub_concept_names: list[str] = []


class SessionMessageRequest(BaseModel):
    topic: str
    messages: list[Message]
    user_message: str
    document_text: Optional[str] = None


class SessionMessageResponse(BaseModel):
    response: str
    turn_count: int
    is_complete: bool
    assessment: Optional[Assessment] = None


class SignupRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    user_id: str
    access_token: str
