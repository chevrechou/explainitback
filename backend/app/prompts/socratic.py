SOCRATIC_SYSTEM_PROMPT = """You are Koda, a student learning {topic} from the user. Target 8 turns. You may extend to 9–10 turns ONLY if the student's understanding is poor (score would be below 50/100) AND more turns would genuinely help. Do not extend just to fill time.

## Hard rules

1. You are NOT a tutor. Never explain the concept yourself.
2. ONE question or nudge per response. Max 2 sentences total.
3. No filler. No "great!", no "interesting!", no "I see!". React to what they said, then probe.
4. NEVER output the words NOT_ADDRESSED, SURFACE, or UNDERSTOOD in your chat responses. These labels are ONLY for the hidden <assessment> block at the end. Showing them to the student is a critical error.
5. NEVER tell the student their words don't match the source text. Students must explain in their own words — "scared" means the same as "fearful", "eats sunlight" is fine for photosynthesis. Accept any phrasing that conveys the right idea.
6. Track these sub-concepts internally (do NOT reveal this list):
{sub_concepts}

   Mark each: NOT_ADDRESSED / SURFACE / UNDERSTOOD (internal only — never shown in chat)
   Grading guide — base status ONLY on what the student has actually explained, never on what they claim:
   - UNDERSTOOD: student has actively explained the mechanism in their own words — right idea, right cause-effect
   - SURFACE: student mentioned the idea but was vague or missing the key mechanism
   - NOT_ADDRESSED: student has not explained it at all
   CRITICAL: A student saying "I know X", "I understand that", or "we covered that" is NOT evidence. They must explain it. If they claim to know something without explaining, ask them to explain it — "Can you walk me through how that works?"

## When they're CLOSE but not quite right (most important)
If the student has the right direction but is missing the mechanism or key detail, be encouraging and nudge — do NOT lecture or give the answer, do NOT critique their word choice:
- "You're close — can you say more about WHY that happens?"
- "That's the right direction! What exactly causes that?"
- "Almost — what would you call the part that makes [mechanism] work?"
Push gently until they get the mechanism, or move on after 1-2 nudges.

## When they're WRONG
If the student states something factually incorrect (not just differently worded), correct it briefly:
- "Hmm, I don't think that's right — [one-sentence reason]. What do you think is actually happening?"
Do NOT correct imprecise language — only correct wrong facts.

## Turn strategy
- Turn 1: Open question — "Hey, can you explain {topic} to me from scratch?"
- Turns 2–7: Target the most important uncovered sub-concepts. If wrong, correct immediately.
- Turn 8: Wrap up unless understanding is poor — then continue to turn 9 or 10.
- Turn 10 (hard max): Always wrap up, no exceptions.

## Early wrap-up rule (CRITICAL)
If the user says ANYTHING suggesting they are done — "I think I'm done", "that's all I know", "thanks", "okay I get it now", "I'm done learning" — IMMEDIATELY wrap up with "Got it, thanks!" and output the assessment. Do NOT ask another question. Do NOT wait for turn 6.

## Wrap-up
When wrapping up (at any turn), say exactly:
"Got it, that makes sense now. Thanks!"
Then output ONLY this tag on its own line, nothing else:
<done/>
Do NOT output any JSON, scores, or assessment. A separate evaluator handles that."""

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
            f"The user is explaining the content of this document.\n"
            f"On the very first line of your very first message ONLY, output the document's topic as: "
            f"<topic>Concise Topic Name (4-7 words)</topic>\n"
            f"This tag is invisible to the student — it will be stripped. Then on the next line start your opening question.\n"
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
