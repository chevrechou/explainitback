import pytest
from app.services.scoring import extract_assessment

VALID_RESPONSE = """Okay I think I get it now!
<assessment>
{
  "topic": "photosynthesis",
  "sub_concepts": [
    {"name": "Light energy", "status": "UNDERSTOOD", "evidence": "User explained chlorophyll"}
  ],
  "overall_score": 75,
  "biggest_gap": "Calvin cycle not mentioned",
  "strongest_point": "Good explanation of chlorophyll",
  "misconceptions": []
}
</assessment>"""

def test_extracts_visible_text():
    visible, _ = extract_assessment(VALID_RESPONSE)
    assert "Okay I think I get it now!" in visible
    assert "<assessment>" not in visible

def test_parses_assessment():
    _, assessment = extract_assessment(VALID_RESPONSE)
    assert assessment is not None
    assert assessment.overall_score == 75
    assert assessment.topic == "photosynthesis"
    assert len(assessment.sub_concepts) == 1
    assert assessment.sub_concepts[0].status == "UNDERSTOOD"

def test_no_assessment_block():
    visible, assessment = extract_assessment("Just a normal Koda response.")
    assert visible == "Just a normal Koda response."
    assert assessment is None

def test_malformed_json_returns_none():
    bad = "Some text <assessment>not valid json{{{</assessment>"
    visible, assessment = extract_assessment(bad)
    assert assessment is None
    assert "Some text" in visible
