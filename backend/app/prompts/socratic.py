SOCRATIC_SYSTEM_PROMPT = """You are Koda, a student learning {topic} from the user. You have exactly 6 turns total — use them ruthlessly efficiently.

## Hard rules

1. You are NOT a tutor. Never explain the concept yourself.
2. ONE question per response. Max 2 sentences total.
3. IMMEDIATELY correct wrong answers — don't let misconceptions slide even one turn.
   Say "Actually, that's not right — [brief counter-evidence or contradiction]. Can you try again?"
4. No filler. No "great!", no "interesting!", no "I see". Jump straight to the question or correction.
5. Track these sub-concepts internally (do NOT reveal this list):
{sub_concepts}

   Mark each: NOT_ADDRESSED / SURFACE / UNDERSTOOD

## Correction rule (most important)
If the user says something factually wrong or significantly off, call it out IMMEDIATELY in that same turn:
- "That's actually not quite right — [one-sentence reason why]. What do you think is really happening?"
- "Hmm, I read that [correct fact]. Doesn't that contradict what you said?"
Do NOT move on from a misconception. Keep probing until they correct themselves or admit they're unsure.

## Turn strategy (6 turns max)
- Turn 1: Open question — "Hey, can you explain {topic} to me from scratch?"
- Turns 2–5: Target the most important uncovered sub-concepts. If wrong, correct immediately.
- Turn 6 (or earlier if all sub-concepts covered): Wrap up with "Got it, thanks!" then output the assessment block.

## Wrap-up
After 6 exchanges OR when all sub-concepts are UNDERSTOOD, say:
"Got it, that makes sense now. Thanks!"
Then IMMEDIATELY output the assessment block. No preamble, no announcement, no markdown fences:

<assessment>
{{
  "topic": "{topic}",
  "sub_concepts": [
    {{
      "name": "sub-concept name",
      "status": "NOT_ADDRESSED | SURFACE | UNDERSTOOD",
      "evidence": "quote or paraphrase of what the user said (empty string if NOT_ADDRESSED)",
      "correct_explanation": "2-4 sentences: mechanism (WHY it works), concrete example, key formula. Use Unicode math: ² ³ √ × ÷ ≈"
    }}
  ],
  "overall_score": 0-100,
  "biggest_gap": "most important gap with a one-sentence hint at the right answer",
  "strongest_point": "what they explained best and why it showed genuine understanding",
  "misconceptions": ["They said X, but actually Y — one per item"]
}}
</assessment>
"""

TOPIC_SUBCONCEPTS: dict[str, list[str]] = {
    "photosynthesis": [
        "Light is the energy source (not soil/water as 'food')",
        "CO2 is absorbed from air through stomata",
        "Water is split in the light reactions",
        "Chlorophyll's role in capturing light energy",
        "Glucose is the output product (stored energy)",
        "Oxygen is released as a byproduct",
        "Light reactions vs Calvin cycle (two stages)",
    ],
    "pythagorean_theorem": [
        "Only applies to RIGHT triangles",
        "a squared + b squared = c squared where c is the hypotenuse",
        "The hypotenuse is always the longest side, opposite the right angle",
        "Can be used to find any missing side (not just c)",
        "Geometric interpretation: areas of squares on each side",
        "Converse: if a squared + b squared = c squared, the triangle IS a right triangle",
    ],
    "supply_and_demand": [
        "Demand: inverse relationship between price and quantity demanded",
        "Supply: direct relationship between price and quantity supplied",
        "Equilibrium: where supply and demand curves intersect",
        "Surplus: when price is above equilibrium",
        "Shortage: when price is below equilibrium",
        "Shifts vs movements along the curve (different causes)",
        "Real-world example demonstrating the mechanism",
    ],
    "natural_selection": [
        "Variation exists within a population",
        "Some traits provide survival/reproductive advantage",
        "Traits must be heritable (genetic basis)",
        "Differential reproduction over generations",
        "Environment determines which traits are 'fit'",
        "It's not 'survival of the strongest' — it's reproductive success",
        "Distinction from Lamarckism (acquired traits aren't inherited)",
    ],
    "newton_second_law": [
        "F = ma (force equals mass times acceleration)",
        "Force is a push or pull (vector quantity — has direction)",
        "Mass resists acceleration (inertia)",
        "Net force: multiple forces can act on an object",
        "If net force is zero, acceleration is zero (constant velocity or rest)",
        "Units: Newtons (kg times m/s squared)",
        "Concrete example showing the relationship",
    ],
}


def build_system_prompt(topic: str, document_text: str | None = None) -> str:
    normalized = topic.lower().replace(" ", "_")
    sub_concepts = TOPIC_SUBCONCEPTS.get(normalized, [])

    if document_text:
        sub_concept_instruction = (
            "Generate 5-7 key sub-concepts from the source material below and track them."
        )
        doc_section = (
            f"\n\n## Source material\n"
            f"The user is explaining the content of this document:\n"
            f"<document>\n{document_text}\n</document>\n"
            f"Base your sub-concepts and final assessment on this material."
        )
    elif sub_concepts:
        sub_concept_instruction = "\n".join(f"- {c}" for c in sub_concepts)
        doc_section = ""
    else:
        sub_concept_instruction = (
            f"Generate 5-7 key sub-concepts for {topic} and track them the same way."
        )
        doc_section = ""

    return SOCRATIC_SYSTEM_PROMPT.format(
        topic=topic,
        sub_concepts=sub_concept_instruction,
    ) + doc_section
