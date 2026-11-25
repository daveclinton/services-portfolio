"""Local-only answer regression harness; provider/model checks are opt-in."""
import argparse
import json
import re
import sys
import time
import uuid
import urllib.parse
import urllib.request


def evaluate(base, case):
    payload = {"messages": case["messages"], "improvementLogging": True,
               "workflow": case.get("workflow", "chat"),
               "interactive": case.get("interactive", False),
               "interactionContext": case.get("interaction_context", ""),
               "conversationId": str(uuid.uuid4()), "turnId": str(uuid.uuid4())}
    request = urllib.request.Request(base.rstrip("/") + "/ask-ai/chat", data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
    started = time.monotonic()
    answer, errors, finish, first_token = "", [], None, None
    view = None
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            event = ""
            for raw in response:
                line = raw.decode().strip()
                if line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:"):
                    data = json.loads(line[5:].strip())
                    if event == "delta":
                        if first_token is None:
                            first_token = round((time.monotonic() - started) * 1000)
                        answer += data.get("text", "")
                    elif event == "error":
                        errors.append(data.get("detail", "stream error"))
                    elif event == "view":
                        view = data
                    elif event == "done":
                        finish = data.get("finish_reason")
                        break
    except (OSError, ValueError) as error:
        errors.append(str(error))
    if finish not in ("stop", "conversation", "no_evidence", "guardrail"):
        errors.append("response did not finish successfully")
    if not answer.strip():
        errors.append("empty answer")
    if case.get("max_answer_words") and len(answer.split()) > case["max_answer_words"]:
        errors.append("chat summary exceeds word budget")
    if finish == "guardrail" and case.get("allow_guardrail") is False:
        errors.append("an ordinary visitor question was incorrectly rejected")
    for forbidden in case.get("must_not_include", []):
        if forbidden.casefold() in answer.casefold():
            errors.append("forbidden output: " + forbidden)
    for required in case.get("must_include", []):
        if required.casefold() not in answer.casefold():
            errors.append("missing expected evidence: " + required)
    alternatives = case.get("must_include_any", [])
    if alternatives and not any(value.casefold() in answer.casefold() for value in alternatives):
        errors.append("missing expected evidence: one of " + ", ".join(alternatives))
    if case.get("expected_view") and (not isinstance(view, dict) or view.get("kind") != case["expected_view"]):
        errors.append("missing expected interactive view: " + case["expected_view"])
    if case.get("min_view_items") and (not isinstance(view, dict) or len(view.get("items", [])) < case["min_view_items"]):
        errors.append("interactive view has too few items")
    if isinstance(view, dict):
        evidence_ids = {source.get("id") for source in view.get("evidence", [])}
        for item in view.get("items", []) + view.get("connections", []):
            if any(source_id not in evidence_ids for source_id in item.get("source_ids", [])):
                errors.append("interactive view references unknown evidence")
        for required in case.get("view_must_include", []):
            item_text = " ".join(" ".join(str(item.get(key, "")) for key in ("title", "summary", "detail")) for item in view.get("items", []))
            if required.casefold() not in item_text.casefold():
                errors.append("missing expected result content: " + required)
        if case.get("require_item_evidence") and any(not item.get("source_ids") for item in view.get("items", [])):
            errors.append("result item lacks supporting evidence")
        for term in case.get("required_gap_terms", []):
            if not any(term.casefold() in item.get("title", "").casefold() and item.get("status") == "not_established" for item in view.get("items", [])):
                errors.append("missing explicit comparison gap: " + term)
        if view.get("kind") == "projects" and case.get("max_project_preview_words"):
            if any(len(item.get("summary", "").split()) > case["max_project_preview_words"] for item in view.get("items", [])):
                errors.append("project preview exceeds word budget")
        if case.get("check_follow_up_quality"):
            follow_ups = view.get("follow_ups", [])
            labels = [follow.get("label", "").strip().casefold() for follow in follow_ups]
            prompts = [follow.get("prompt", "").strip().casefold() for follow in follow_ups]
            if len(follow_ups) != 2 or any(not label or len(label) > 32 for label in labels) or any(not prompt for prompt in prompts):
                errors.append("follow-ups must have two short labels and editable prompts")
            if len(set(labels)) != len(labels) or len(set(prompts)) != len(prompts):
                errors.append("follow-ups repeat the same question")
            if any(re.match(r"^(?:please\s+)?(?:provide|share|paste|describe|tell me)\s+(?:your|the role|the job|specific requirements|more about existing)", prompt) for prompt in prompts):
                errors.append("follow-up asks the visitor for data instead of addressing the assistant")
            titles = {re.sub(r"[^\w]+", " ", item.get("title", "").casefold()).strip() for item in view.get("items", [])}
            for label in labels:
                subject = re.sub(r"^(?:tell me more about|learn more about|describe|explore|explain|review|show)\s+", "", label)
                if re.sub(r"[^\w]+", " ", subject).strip() in titles:
                    errors.append("follow-up repeats a result choice")
    return {"name": case["name"], "passed": not errors, "answer": answer, "errors": errors,
            "view": view,
            "finish_reason": finish, "first_token_ms": first_token,
            "duration_ms": round((time.monotonic() - started) * 1000)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    parser.add_argument("cases")
    parser.add_argument("--json", action="store_true", help="print machine-readable results")
    args = parser.parse_args()
    if urllib.parse.urlparse(args.base_url).hostname not in ("localhost", "127.0.0.1", "::1"):
        parser.error("use a local API with alert emails disabled; production conversations must not be used for evals")
    with open(args.cases, encoding="utf-8") as source:
        if args.cases.endswith(".json"):
            cases = json.load(source)
        else:
            cases = [{"name": question, "messages": [{"role": "user", "content": question}], "allow_guardrail": False}
                     for line in source if (question := line.strip())]
    if not cases:
        parser.error("at least one evaluation case is required")
    results = [evaluate(args.base_url, case) for case in cases]
    if args.json:
        print(json.dumps({"passed": all(result["passed"] for result in results), "results": results}, indent=2))
    else:
        for result in results:
            print(f"--- [{'PASS' if result['passed'] else 'FAIL'}] {result['name']} ({result['duration_ms']} ms)")
            print(result["answer"])
            for error in result["errors"]:
                print("  " + error)
    return 0 if all(result["passed"] for result in results) else 1


if __name__ == "__main__":
    sys.exit(main())
