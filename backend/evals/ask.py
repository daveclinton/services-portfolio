"""Local-only answer regression harness; provider/model checks are opt-in."""
import argparse
import json
import sys
import time
import uuid
import urllib.parse
import urllib.request


def evaluate(base, case):
    payload = {"messages": case["messages"], "improvementLogging": True,
               "conversationId": str(uuid.uuid4()), "turnId": str(uuid.uuid4())}
    request = urllib.request.Request(base.rstrip("/") + "/ask-ai/chat", data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
    started = time.monotonic()
    answer, errors, finish, first_token = "", [], None, None
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
                    elif event == "done":
                        finish = data.get("finish_reason")
                        break
    except (OSError, ValueError) as error:
        errors.append(str(error))
    if finish not in ("stop", "conversation", "no_evidence", "guardrail"):
        errors.append("response did not finish successfully")
    if not answer.strip():
        errors.append("empty answer")
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
    return {"name": case["name"], "passed": not errors, "answer": answer, "errors": errors,
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
