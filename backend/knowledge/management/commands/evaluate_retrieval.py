"""``manage.py evaluate_retrieval`` — score retrieval against a question set.

Runs every question in ``knowledge/evals/questions.json`` through one or more
retrieval modes and reports hit@k, recall@k and MRR:

    python manage.py evaluate_retrieval
    python manage.py evaluate_retrieval --mode structured --mode hybrid -k 10
    python manage.py evaluate_retrieval --min-hit-rate 0.8   # CI gate
    python manage.py evaluate_retrieval --json
    python manage.py evaluate_retrieval --show-misses

Exit code 1 when any evaluated mode falls below ``--min-hit-rate``, 0
otherwise. Without embeddings or an API key the semantic mode degrades to an
empty result set and is reported as such rather than crashing the run.
"""

from __future__ import annotations

import json as json_module

from django.core.management.base import BaseCommand, CommandError

from knowledge.evals import ModeReport, evaluate, load_questions
from knowledge.retrieval.service import MODES


class Command(BaseCommand):
    help = (
        "Evaluate retrieval quality against the hand-written question set. "
        "Exit code 1 when hit@k is below --min-hit-rate."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--questions",
            dest="questions",
            default=None,
            metavar="PATH",
            help="question set to use (default: knowledge/evals/questions.json)",
        )
        parser.add_argument(
            "--mode",
            dest="modes",
            action="append",
            choices=MODES,
            help="retrieval mode to evaluate; repeat for more than one "
            "(default: hybrid)",
        )
        parser.add_argument(
            "-k",
            dest="k",
            type=int,
            default=5,
            metavar="N",
            help="cut-off for hit@k and recall@k (default: 5)",
        )
        parser.add_argument(
            "--min-hit-rate",
            dest="min_hit_rate",
            type=float,
            default=None,
            metavar="F",
            help="fail (exit code 1) when any mode's hit rate is below F, e.g. 0.8",
        )
        parser.add_argument(
            "--show-misses",
            dest="show_misses",
            action="store_true",
            help="list the questions each mode failed to retrieve for",
        )
        parser.add_argument(
            "--json",
            dest="as_json",
            action="store_true",
            help="emit machine-readable JSON instead of a table",
        )

    def handle(self, *args, **options) -> None:
        if options["k"] < 1:
            raise CommandError("-k must be at least 1")
        min_hit_rate = options["min_hit_rate"]
        if min_hit_rate is not None and not 0.0 <= min_hit_rate <= 1.0:
            raise CommandError("--min-hit-rate must be between 0 and 1")

        questions = load_questions(options["questions"])
        modes = options["modes"] or ["hybrid"]
        reports = [
            evaluate(questions, mode=mode, k=options["k"]) for mode in modes
        ]

        if options["as_json"]:
            self.stdout.write(
                json_module.dumps(
                    {
                        "questions": len(questions),
                        "reports": [report.as_dict() for report in reports],
                    },
                    indent=2,
                )
            )
        else:
            self.stdout.write(self._render(questions, reports, options["show_misses"]))

        if min_hit_rate is not None:
            failing = [
                report
                for report in reports
                if report.hit_rate < min_hit_rate
            ]
            if failing:
                names = ", ".join(
                    f"{report.mode} ({report.hit_rate:.0%})" for report in failing
                )
                raise CommandError(
                    f"hit rate below {min_hit_rate:.0%} for: {names}"
                )

    def _render(
        self, questions: list, reports: list[ModeReport], show_misses: bool
    ) -> str:
        lines = [
            f"Retrieval evaluation — {len(questions)} questions — k={reports[0].k}",
            "",
            f"{'mode':<12}{'hit@k':>9}{'recall@k':>11}{'MRR':>9}{'misses':>9}",
            "-" * 50,
        ]
        for report in reports:
            lines.append(
                f"{report.mode:<12}"
                f"{report.hit_rate:>8.0%}"
                f"{report.recall:>11.0%}"
                f"{report.mrr:>9.3f}"
                f"{len(report.misses):>9}"
            )
        if show_misses:
            for report in reports:
                lines.append("")
                lines.append(f"{report.mode}: misses")
                if not report.misses:
                    lines.append("  (none)")
                    continue
                for outcome in report.misses:
                    missing = ", ".join(outcome.missing[:3]) or "(ranked too low)"
                    lines.append(
                        f"  - {outcome.question.id}: expected {missing}"
                    )
        return "\n".join(lines)
