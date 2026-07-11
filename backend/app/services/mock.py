_MOCK_TURNS = [
    "Hey! So I keep hearing about {topic} but I honestly don't really get it. Can you explain it to me like I'm starting from zero?",
    "Okay so... I think I'm following. But WHY does that happen exactly?",
    "Can you give me a concrete example of that? I learn way better with examples.",
    "Hmm wait — so if I'm understanding right, {topic} is basically just that one thing you mentioned?",
    "I think I get parts of it. But what would happen if you changed one of those factors? Like what breaks?",
    "Okay but I read somewhere there's another side to this. How does that fit with what you're saying?",
    "So you're saying... the main point is what causes the effect, not the effect itself? Did I get that right?",
    "That's starting to make more sense. Can you connect it back to the first part you explained?",
    "Hmm, one more thing — what happens in an edge case, like when conditions aren't normal?",
    (
        "Okay I think I actually get {topic} now. Thanks for explaining!\n"
        "<assessment>\n"
        '{{\n'
        '  "topic": "{topic}",\n'
        '  "sub_concepts": [\n'
        '    {{"name": "Core mechanism", "status": "UNDERSTOOD", "evidence": "User described the process clearly"}},\n'
        '    {{"name": "Cause and effect", "status": "SURFACE", "evidence": "Mentioned but not fully explained"}}\n'
        '  ],\n'
        '  "overall_score": 68,\n'
        '  "biggest_gap": "Edge cases and exceptions not addressed",\n'
        '  "strongest_point": "Good use of concrete examples",\n'
        '  "misconceptions": []\n'
        "}}\n"
        "</assessment>"
    ),
]


async def mock_chat(topic: str, messages: list[dict]) -> str:
    user_turns = sum(1 for m in messages if m.get("role") == "user")
    idx = min(user_turns, len(_MOCK_TURNS) - 1)
    return _MOCK_TURNS[idx].replace("{topic}", topic)
