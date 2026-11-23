import io
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


if __name__ == "__main__":
    unittest.main()
