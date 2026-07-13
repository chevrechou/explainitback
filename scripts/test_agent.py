#!/usr/bin/env python3
"""
Explainitback test agent.

Simulates a student session end-to-end against the production backend:
  start → chat loop → detect completion → evaluate → print scorecard

Usage:
    python3 scripts/test_agent.py [topic]

Supported topics: photosynthesis, pythagorean_theorem
"""

import asyncio
import json
import sys
import httpx

BASE = "https://explainitback.onrender.com"

STUDENT_SCRIPTS: dict[str, list[str]] = {
    "photosynthesis": [
        "Photosynthesis is how plants make their own food from sunlight. "
        "They use chlorophyll in their leaves to absorb the light energy.",
        "There are two main stages. The light-dependent reactions need direct sunlight "
        "and the Calvin cycle can happen without light.",
        "In the light reactions, water molecules get split apart. That releases oxygen "
        "as a byproduct and produces ATP and NADPH that store the energy.",
        "The Calvin cycle uses the ATP and NADPH to take CO2 from the air "
        "and build it into glucose. It happens in the stroma of the chloroplast.",
        "So the overall equation is: sunlight + CO2 + water gives glucose and oxygen. "
        "Chlorophyll in the thylakoid membranes absorbs red and blue light and "
        "reflects green, which is why plants look green.",
        "got it, that makes sense now. thanks",
    ],
    "pythagorean_theorem": [
        "The Pythagorean theorem says that in a right triangle, a squared plus b squared "
        "equals c squared, where c is the hypotenuse.",
        "The hypotenuse is the longest side and it's always opposite the right angle. "
        "The other two sides are called legs.",
        "You can use it to find a missing side. Like if a equals 3 and b equals 4, "
        "then c squared is 9 plus 16 which is 25, so c is 5.",
        "It only works for right triangles, not other triangles. And it works in reverse "
        "too — if a squared plus b squared equals c squared, you know it's a right triangle.",
        "You can use it in real life to find straight-line distances. "
        "Like if you go 3 miles east and 4 miles north you're 5 miles from where you started.",
        "got it, that makes sense now. thanks",
    ],
}


def status_icon(status: str) -> str:
    return {"UNDERSTOOD": "✓", "SURFACE": "~", "NOT_ADDRESSED": "✗"}.get(status, "?")


async def run_session(topic: str) -> bool:
    normalized = topic.lower().replace(" ", "_")
    script = STUDENT_SCRIPTS.get(normalized) or STUDENT_SCRIPTS["photosynthesis"]

    print(f"\n{'='*64}")
    print(f"  Explainitback Test Agent")
    print(f"  Topic: {topic}   Backend: {BASE}")
    print(f"{'='*64}\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        print("Checking backend health...", end=" ", flush=True)
        h = await client.get(f"{BASE}/health")
        h.raise_for_status()
        print("ok\n")

        # ── Start session ────────────────────────────────────────────
        print("Starting session...", end=" ", flush=True)
        resp = await client.post(f"{BASE}/sessions/start", json={"topic": topic})
        resp.raise_for_status()
        session = resp.json()

        actual_topic = session.get("topic", topic)
        sub_concepts = session.get("sub_concept_names", [])
        print(f"ok ({len(sub_concepts)} sub-concepts)\n")

        print(f"Koda: {session['first_message']}\n")

        # ── Conversation loop ────────────────────────────────────────
        history: list[dict] = []
        assessment = None
        turn_count = 0

        for i, reply in enumerate(script, 1):
            print(f"Student [{i}]: {reply}\n")

            if i > 1:
                await asyncio.sleep(5)  # stay well within Gemini free-tier RPM

            async with httpx.AsyncClient(timeout=90.0) as msg_client:
                r = await msg_client.post(f"{BASE}/sessions/message", json={
                    "topic": actual_topic,
                    "messages": history,
                    "user_message": reply,
                })
                r.raise_for_status()
                result = r.json()

            turn_count = result["turn_count"]
            koda_reply = result["response"]
            is_complete = result.get("is_complete", False)

            print(f"Koda: {koda_reply}\n")

            history.append({"role": "user", "content": reply})
            history.append({"role": "assistant", "content": koda_reply})

            if result.get("assessment"):
                assessment = result["assessment"]
                print(f"[Inline assessment received at turn {turn_count}]\n")
                break

            if is_complete:
                print(f"[Session complete at turn {turn_count} — waiting 30s for rate limit, then evaluating...]\n")
                await asyncio.sleep(30)

                async with httpx.AsyncClient(timeout=150.0) as eval_client:
                    er = await eval_client.post(f"{BASE}/sessions/evaluate", json={
                        "topic": actual_topic,
                        "messages": history,
                        "user_message": "",
                    })
                    er.raise_for_status()
                    assessment = er.json().get("assessment")
                break

        # ── Scorecard ────────────────────────────────────────────────
        print("=" * 64)
        print("  SCORECARD")
        print("=" * 64)

        if not assessment:
            print("\nFAIL — evaluator returned null (rate limit or parse error).")
            print("Wait ~60 seconds for the Gemini quota to reset and retry.\n")
            return False

        print(f"\nTopic:  {assessment['topic']}")
        print(f"Score:  {assessment['overall_score']}/100\n")
        print(f"Strongest:  {assessment['strongest_point']}")
        print(f"Biggest gap: {assessment['biggest_gap']}")

        miscs = assessment.get("misconceptions", [])
        if miscs:
            print("\nMisconceptions:")
            for m in miscs:
                print(f"  • {m}")

        print("\nSub-concepts:")
        for sc in assessment.get("sub_concepts", []):
            icon = status_icon(sc["status"])
            print(f"  {icon} [{sc['status']:<14}] {sc['name']}")
            ev = sc.get("evidence", "")
            if ev and sc["status"] != "NOT_ADDRESSED":
                print(f"       Evidence: {ev[:100]}")

        print(f"\n{'='*64}")
        print("  PASS — full session completed with scorecard.")
        print(f"{'='*64}\n")
        return True


if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "photosynthesis"
    ok = asyncio.run(run_session(topic))
    sys.exit(0 if ok else 1)
