import json
import os
import re
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError

load_dotenv()

app = FastAPI(title="QueueFlow Intake AI", version="1.0.0")

Severity = Literal["low", "moderate", "high"]
Urgency = Literal["routine", "soon", "urgent", "emergency"]


class IntakeRequest(BaseModel):
    chief_complaint: str = Field(default="", max_length=2000)
    natural_language: str = Field(default="", max_length=5000)
    symptoms: list[str] = Field(default_factory=list, max_length=30)
    duration: str = Field(default="", max_length=200)
    history: str = Field(default="", max_length=2000)
    selected_department: str | None = Field(default=None, max_length=120)


class IntakeExtraction(BaseModel):
    symptoms: list[str] = Field(default_factory=list, max_length=30)
    duration: str | None = None
    severity: Severity = "low"
    severity_indicators: list[str] = Field(default_factory=list, max_length=20)
    relevant_history: list[str] = Field(default_factory=list, max_length=20)
    missing_information: list[str] = Field(default_factory=list, max_length=20)
    possible_department: str | None = None
    urgency: Urgency = "routine"
    red_flags: list[str] = Field(default_factory=list, max_length=20)
    confidence: float = Field(default=0.5, ge=0, le=1)
    provider: str = "rules-fallback"
    model: str = "deterministic-v1"
    extraction_version: str = "1.0"


RED_FLAG_PATTERNS = {
    "difficulty breathing": r"difficulty breathing|shortness of breath|cannot breathe",
    "chest pain": r"chest pain|pressure in (my )?chest",
    "neurological emergency": r"stroke|face droop|slurred speech|one-sided weakness|seizure|unconscious",
    "severe bleeding": r"heavy bleeding|vomiting blood|coughing blood",
}

SYMPTOM_TERMS = [
    "fever", "cough", "fatigue", "tired", "headache", "sore throat", "pain",
    "nausea", "vomiting", "diarrhea", "rash", "dizziness", "breathing difficulty",
]


def deterministic_extract(payload: IntakeRequest) -> IntakeExtraction:
    text = " ".join([
        payload.chief_complaint,
        payload.natural_language,
        " ".join(payload.symptoms),
        payload.duration,
        payload.history,
    ]).strip().lower()
    symptoms = list(dict.fromkeys([item.strip() for item in payload.symptoms if item.strip()]))
    for term in SYMPTOM_TERMS:
        if term in text and term not in symptoms:
            symptoms.append(term)

    red_flags = [name for name, pattern in RED_FLAG_PATTERNS.items() if re.search(pattern, text)]
    duration = payload.duration.strip() or None
    duration_match = re.search(r"(?:for|since)\s+([\w\s-]+?)(?:\.|,|$)", text)
    if not duration and duration_match:
        duration = duration_match.group(1).strip()

    severity: Severity = "high" if red_flags else "moderate" if any(term in text for term in ["fever", "vomiting", "severe", "very tired"]) else "low"
    urgency: Urgency = "emergency" if red_flags else "urgent" if severity == "moderate" else "routine"
    department = payload.selected_department or ("Emergency" if red_flags else "General Medicine")
    missing = []
    if not duration:
        missing.append("duration")
    if not payload.history.strip():
        missing.append("relevant medical history and medications")
    if not symptoms:
        missing.append("specific symptoms")

    return IntakeExtraction(
        symptoms=symptoms,
        duration=duration,
        severity=severity,
        severity_indicators=red_flags or (["reported symptoms require review"] if severity == "moderate" else []),
        relevant_history=[payload.history.strip()] if payload.history.strip() else [],
        missing_information=missing,
        possible_department=department,
        urgency=urgency,
        red_flags=red_flags,
        confidence=0.65 if symptoms else 0.35,
    )


async def provider_extract(payload: IntakeRequest) -> IntakeExtraction | None:
    url = os.getenv("AI_PROVIDER_URL")
    api_key = os.getenv("AI_PROVIDER_API_KEY")
    model = os.getenv("AI_PROVIDER_MODEL", "gpt-4o-mini")
    if not url or not api_key:
        return None

    system_prompt = """You perform clinical intake information extraction and routing support, not diagnosis. Return JSON only matching the requested schema. Never invent symptoms, history, medications, diagnoses, urgency, or red flags. Use null or an item in missing_information when the patient did not provide information. Do not provide medical advice."""
    user_prompt = json.dumps(payload.model_dump(), ensure_ascii=True)
    request_body = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
    }
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=request_body)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        extraction = IntakeExtraction.model_validate_json(content)
        extraction.provider = "configured-provider"
        extraction.model = model
        return extraction


@app.get("/health")
def health():
    return {"status": "ONLINE", "service": "intake-ai", "version": "1.0"}


@app.post("/ai/intake", response_model=IntakeExtraction)
async def extract_intake(payload: IntakeRequest):
    try:
        extraction = await provider_extract(payload)
        return extraction or deterministic_extract(payload)
    except (httpx.HTTPError, KeyError, TypeError, ValidationError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=502, detail=f"AI provider response was invalid: {error}") from error
