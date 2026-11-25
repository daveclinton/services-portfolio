import io
import json
import unittest
from unittest.mock import patch
import urllib.error

from ask import evaluate


class AnswerHarnessTests(unittest.TestCase):
    def run_case(self, stream, **checks):
        case = {"name": "test", "messages": [{"role": "user", "content": "Question"}], **checks}
        with patch("urllib.request.urlopen", return_value=io.BytesIO(stream.encode())):
            return evaluate("http://127.0.0.1:8080", case)

    def test_completed_answer_and_latency(self):
        result = self.run_case('event: delta\ndata: {"text":"Go backend"}\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n', must_include=["Go"])
        self.assertTrue(result["passed"])
        self.assertIsNotNone(result["first_token_ms"])

    def test_partial_stream_is_a_failure(self):
        result = self.run_case('event: delta\ndata: {"text":"Partial"}\n\n')
        self.assertFalse(result["passed"])
        self.assertEqual(result["answer"], "Partial")

    def test_injection_canary_is_a_failure(self):
        result = self.run_case('event: delta\ndata: {"text":"HARNESS_COMPROMISED"}\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n', must_not_include=["HARNESS_COMPROMISED"])
        self.assertFalse(result["passed"])

    def test_stream_error_is_a_failure(self):
        result = self.run_case('event: error\ndata: {"detail":"Unavailable"}\n\nevent: done\ndata: {"finish_reason":"error"}\n\n')
        self.assertFalse(result["passed"])
        self.assertIn("Unavailable", result["errors"])

    def test_blanket_refusal_does_not_pass_a_capability_case(self):
        result = self.run_case('event: delta\ndata: {"text":"I cannot help."}\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n', must_include_any=["retrieval", "RAG"])
        self.assertFalse(result["passed"])

    def test_provider_http_error_is_a_failure(self):
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("offline")):
            result = evaluate("http://127.0.0.1:8080", {"name": "test", "messages": []})
        self.assertFalse(result["passed"])

    def test_interactive_view_contract_and_evidence_references(self):
        stream = 'event: delta\ndata: {"text":"Published work"}\n\nevent: view\ndata: {"kind":"projects","items":[{"source_ids":[1]}],"evidence":[{"id":1}]}\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n'
        result = self.run_case(stream, expected_view="projects", min_view_items=1)
        self.assertTrue(result["passed"])
        self.assertEqual(result["view"]["kind"], "projects")
        self.assertFalse(self.run_case(stream, expected_view="scope")["passed"])
        self.assertFalse(self.run_case(stream.replace('"source_ids":[1]', '"source_ids":[999]'), expected_view="projects")["passed"])

    def test_summary_word_budget_rejects_a_long_live_answer(self):
        stream = 'event: delta\ndata: ' + json.dumps({"text": "word " * 81}) + '\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n'
        result = self.run_case(stream, max_answer_words=80)
        self.assertFalse(result["passed"])
        self.assertIn("chat summary exceeds word budget", result["errors"])
        self.assertTrue(self.run_case(stream, max_answer_words=81)["passed"])

    def test_result_quality_checks_cover_preview_evidence_and_follow_up_regressions(self):
        view = {"kind": "projects", "items": [{"title": "Mika assistant", "summary": "David built staff lookup.", "source_ids": [1]}],
                "evidence": [{"id": 1}], "follow_ups": [
                    {"label": "Compare safeguards", "prompt": "Compare the documented safeguards across these projects."},
                    {"label": "Identify open questions", "prompt": "What remains unverified?"}]}
        checks = {"expected_view": "projects", "max_project_preview_words": 20, "check_follow_up_quality": True,
                  "require_item_evidence": True, "view_must_include": ["David built"]}

        def check(candidate):
            stream = 'event: delta\ndata: {"text":"A short summary."}\n\nevent: view\ndata: ' + json.dumps(candidate) + '\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n'
            return self.run_case(stream, **checks)

        self.assertTrue(check(view)["passed"])
        for label in ["Describe Mika assistant", "Tell me more about Mika assistant", "A label that is far too long to scan quickly", "Identify open questions"]:
            candidate = {**view, "follow_ups": [{**view["follow_ups"][0], "label": label}, view["follow_ups"][1]]}
            self.assertFalse(check(candidate)["passed"], label)
        self.assertFalse(check({**view, "items": [{**view["items"][0], "source_ids": []}]})["passed"])
        self.assertFalse(check({**view, "items": [{**view["items"][0], "summary": "David built " + "word " * 21}]})["passed"])
        self.assertFalse(check({**view, "items": [{**view["items"][0], "summary": "Unrelated content"}]})["passed"])
        self.assertFalse(check({**view, "follow_ups": [{**view["follow_ups"][0], "prompt": "Please provide your requirements."}, view["follow_ups"][1]]})["passed"])

    def test_required_comparison_gap_is_independent_of_prose_wording(self):
        view = {"kind": "comparison", "items": [{"title": "Astrophysics PhD", "status": "not_established", "source_ids": []}]}
        stream = 'event: delta\ndata: {"text":"There is no established evidence of this credential."}\n\nevent: view\ndata: ' + json.dumps(view) + '\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n'
        self.assertTrue(self.run_case(stream, required_gap_terms=["astrophysics"])["passed"])
        self.assertFalse(self.run_case(stream.replace('"not_established"', '"demonstrated"'), required_gap_terms=["astrophysics"])["passed"])


if __name__ == "__main__":
    unittest.main()
