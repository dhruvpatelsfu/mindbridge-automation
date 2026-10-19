#!/usr/bin/env python3
"""Deterministic local report-generation sandbox for End-of-Day status updates."""

from __future__ import annotations

import re
import sys
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
LOG_PATH = LAB_ROOT / "supporting-files" / "raw_nightly_logs.txt"
PROMPT_PATH = LAB_ROOT / "report_prompt.txt"
EVIDENCE_DIR = LAB_ROOT / "evidence"
REPORT_PATH = EVIDENCE_DIR / "EndOfDay_Report.md"

SUMMARY_PATTERN = re.compile(
    r"Tests:\s*(\d+)\s*total,\s*(\d+)\s*passed,\s*(\d+)\s*failed",
    re.IGNORECASE,
)
TIMEOUT_PATTERN = re.compile(r"TimeoutError", re.IGNORECASE)

PROMPT_TODO = re.compile(r"TODO_[A-Z_]+")
REQUIRED_PROMPT_CHECKS: list[tuple[str, re.Pattern[str], str]] = [
    ("role", re.compile(r"\b(QA Lead|quality lead|test lead|automation lead)\b", re.I), "Specify your role (e.g., QA Lead)."),
    (
        "audience",
        re.compile(r"\b(non-technical|project manager|stakeholder|management)\b", re.I),
        "Name a non-technical audience (e.g., project managers).",
    ),
    (
        "status update",
        re.compile(r"(end-of-day|end of day|status update)", re.I),
        "Request an End-of-Day Status Update format.",
    ),
    (
        "hotspot",
        re.compile(r"(hotspot|top failing|most frequent|error type|failing test)", re.I),
        "Ask for the top failing hotspot or error type.",
    ),
    (
        "recommendation",
        re.compile(r"(recommend|next step|action item|follow-up|follow up)", re.I),
        "Include a recommendation or next step requirement.",
    ),
]


def parse_log_stats(log_text: str) -> dict[str, int | float | str]:
    summary = SUMMARY_PATTERN.search(log_text)
    if not summary:
        raise ValueError("Log summary line not found (Tests: N total, P passed, F failed).")

    total = int(summary.group(1))
    passed = int(summary.group(2))
    failed = int(summary.group(3))
    timeout_count = len(TIMEOUT_PATTERN.findall(log_text))
    pass_rate = round((passed / total) * 100, 1) if total else 0.0

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": pass_rate,
        "timeout_count": timeout_count,
        "top_hotspot": "TimeoutError",
        "top_spec": "tests/checkout_payment.spec.js",
    }


def validate_prompt(prompt_text: str) -> list[str]:
    errors: list[str] = []
    if PROMPT_TODO.search(prompt_text):
        errors.append("Replace all TODO_ placeholders in report_prompt.txt.")

    for label, pattern, hint in REQUIRED_PROMPT_CHECKS:
        if not pattern.search(prompt_text):
            errors.append(f"Prompt missing {label}: {hint}")

    if "--- LOG DATA ---" not in prompt_text and "raw_nightly_logs" not in prompt_text.lower():
        errors.append("Prompt should reference the nightly log input.")

    return errors


def build_report_body(stats: dict[str, int | float | str]) -> str:
    total = int(stats["total"])
    passed = int(stats["passed"])
    failed = int(stats["failed"])
    pass_rate = stats["pass_rate"]
    timeout_count = int(stats["timeout_count"])
    top_spec = str(stats["top_spec"])

    recommendation = (
        "Hold promotion of the nightly build until the checkout payment flow is stable. "
        "Assign an engineer to investigate why the submit control never becomes enabled "
        "and add a focused regression test once the timeout root cause is fixed."
    )

    return "\n".join(
        [
            "# End-of-Day Status Update",
            "",
            "**To:** Project Management",
            "**From:** QA Automation",
            "**Subject:** Nightly regression results — MindBridge build gh-88421",
            "",
            "## Summary",
            "",
            f"Last night's automated suite ran **{total}** tests. "
            f"**{passed}** passed and **{failed}** failed, for a pass rate of **{pass_rate}%**. "
            "Overall stability is **below release threshold** and needs attention before promotion.",
            "",
            "## Top hotspot",
            "",
            f"The dominant failure is **TimeoutError**, occurring **{timeout_count}** times in the log. "
            f"All timeout instances trace to `{top_spec}` while waiting for the checkout submit control. "
            "Secondary failures include assertion and network errors on enrollment, practice, and cart flows.",
            "",
            "## Recommendation",
            "",
            recommendation,
            "",
            "## Notes",
            "",
            "Figures above were derived automatically from `raw_nightly_logs.txt` by the lab "
            "report-generation sandbox.",
            "",
        ]
    )


def main() -> int:
    if not LOG_PATH.is_file():
        print("ERROR: supporting-files/raw_nightly_logs.txt not found.")
        return 1

    if not PROMPT_PATH.is_file():
        print("ERROR: report_prompt.txt not found.")
        return 1

    prompt_text = PROMPT_PATH.read_text(encoding="utf-8")
    prompt_errors = validate_prompt(prompt_text)
    if prompt_errors:
        print("ERROR: report_prompt.txt is incomplete:")
        for item in prompt_errors:
            print(f"  - {item}")
        return 1

    log_text = LOG_PATH.read_text(encoding="utf-8")
    try:
        stats = parse_log_stats(log_text)
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    if int(stats["timeout_count"]) < 1:
        print("ERROR: Expected TimeoutError entries in the nightly log.")
        return 1

    body = build_report_body(stats)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(body, encoding="utf-8")

    print("OK: End-of-Day report generated.")
    print(f"Output: evidence/EndOfDay_Report.md")
    print(
        f"Derived: {stats['total']} tests, {stats['passed']} passed, "
        f"{stats['failed']} failed, TimeoutError x{stats['timeout_count']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
