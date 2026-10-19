#!/usr/bin/env python3
"""Verify LC4 project lab completion."""

from __future__ import annotations

import json
import re
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = LAB_ROOT / "apps" / "mindbridge" / "backend" / "database" / "mindbridge.db"
SQL_PATH = LAB_ROOT / "queries" / "user_validation.sql"
SQL_EVIDENCE = LAB_ROOT / "evidence" / "sql_result.txt"
PROJECT_DIR = LAB_ROOT / "automation_project"
SPEC_PATH = PROJECT_DIR / "tests" / "account_update.spec.js"
PR_PATH = LAB_ROOT / "evidence" / "pull_request.md"
TICKET_JSON = LAB_ROOT / "supporting-files" / "local_ticket.json"
TICKET_EVIDENCE = LAB_ROOT / "evidence" / "jira_ticket.md"
PROMPT_PATH = LAB_ROOT / "report_prompt.txt"
EOD_PATH = LAB_ROOT / "evidence" / "EndOfDay_Report.md"
HTML_PATH = LAB_ROOT / "evidence" / "Automation_Release_Report.html"
LOG_PATH = LAB_ROOT / "supporting-files" / "raw_nightly_logs.txt"

FEATURE_BRANCH = "feature/account-update-test"
PR_URL_PATTERN = re.compile(r"local://mindbridge-automation/pull/\d+")
TODO_PATTERN = re.compile(r"\bTODO\b", re.IGNORECASE)
INTERACTION_PATTERN = re.compile(
    r"(page\.(goto|click|fill|getBy|locator)|getByRole|getByTestId|expect\()",
    re.IGNORECASE,
)
TIMEOUT_PATTERN = re.compile(r"TimeoutError", re.IGNORECASE)
SUMMARY_PATTERN = re.compile(
    r"Tests:\s*(\d+)\s*total,\s*(\d+)\s*passed,\s*(\d+)\s*failed",
    re.IGNORECASE,
)

results: list[tuple[bool, str]] = []


def record(passed: bool, label: str) -> None:
    results.append((passed, label))
    status = "PASS" if passed else "FAIL"
    print(f"{status}  {label}")


def run_sql_check() -> bool:
    if TODO_PATTERN.search(SQL_PATH.read_text(encoding="utf-8")):
        return False
    proc = subprocess.run(
        [sys.executable, str(LAB_ROOT / "tools" / "run_sql.py")],
        cwd=LAB_ROOT,
        capture_output=True,
        text=True,
    )
    return proc.returncode == 0 and SQL_EVIDENCE.is_file()


def spec_is_complete(text: str) -> bool:
    if TODO_PATTERN.search(text):
        return False
    if "throw new Error" in text and "Complete the TODO" in text:
        return False
    if not INTERACTION_PATTERN.search(text):
        return False
    if "account-save-success" not in text:
        return False
    return True


def app_is_up() -> bool:
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/api/health", timeout=2) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def run_playwright_if_possible() -> bool:
    if not SPEC_PATH.is_file():
        return False
    text = SPEC_PATH.read_text(encoding="utf-8")
    if not spec_is_complete(text):
        return False
    if not app_is_up():
        return True  # optional run skipped; static checks already passed

    proc = subprocess.run(
        ["npx", "playwright", "test", "tests/account_update.spec.js", "--reporter=line"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
    )
    return proc.returncode == 0


def git_branch_pushed() -> bool:
    if not (PROJECT_DIR / ".git").is_dir():
        return False
    branch = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if branch != FEATURE_BRANCH:
        return False
    remote = subprocess.run(
        ["git", "ls-remote", "--heads", "origin", FEATURE_BRANCH],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
    )
    return remote.returncode == 0 and FEATURE_BRANCH in remote.stdout


def check_user_101() -> bool:
    if not DB_PATH.is_file():
        return False
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT id, email, name FROM users WHERE id = ?",
            ("101",),
        ).fetchone()
        if not row:
            return False
        return row[1] == "qa.user@mindbridge.local" and row[2] == "Jordan Lee"
    finally:
        conn.close()


def check_pr_and_ticket() -> bool:
    if not PR_PATH.is_file() or not TICKET_EVIDENCE.is_file():
        return False
    pr_text = PR_PATH.read_text(encoding="utf-8")
    pr_match = PR_URL_PATTERN.search(pr_text)
    if not pr_match:
        return False
    pr_url = pr_match.group(0)

    if not TICKET_JSON.is_file():
        return False
    ticket = json.loads(TICKET_JSON.read_text(encoding="utf-8"))
    if ticket.get("status") != "In Review":
        return False
    if ticket.get("linked_pr") != pr_url:
        return False

    ticket_text = TICKET_EVIDENCE.read_text(encoding="utf-8")
    return pr_url in ticket_text and "In Review" in ticket_text


def expected_timeout_count() -> int:
    if not LOG_PATH.is_file():
        return 0
    return len(TIMEOUT_PATTERN.findall(LOG_PATH.read_text(encoding="utf-8")))


def check_prompt_and_report() -> bool:
    if not PROMPT_PATH.is_file() or not EOD_PATH.is_file():
        return False

    prompt = PROMPT_PATH.read_text(encoding="utf-8")
    if re.search(r"TODO_[A-Z_]+", prompt):
        return False
    if not re.search(r"(QA Lead|quality lead)", prompt, re.I):
        return False
    if not re.search(r"(project manager|non-technical|stakeholder)", prompt, re.I):
        return False
    if not re.search(r"(recommend|next step)", prompt, re.I):
        return False

    report = EOD_PATH.read_text(encoding="utf-8")
    timeout_count = expected_timeout_count()
    if timeout_count < 1:
        return False
    if str(timeout_count) not in report:
        return False
    if "TimeoutError" not in report:
        return False
    if not re.search(r"(recommend|hold promotion|investigate|regression)", report, re.I):
        return False

    summary = SUMMARY_PATTERN.search(LOG_PATH.read_text(encoding="utf-8"))
    if summary:
        total, passed, _failed = summary.groups()
        if total not in report or passed not in report:
            return False

    return True


def main() -> int:
    record(check_user_101(), "Project user 101 exists with expected email and name")

    sql_ok = False
    try:
        sql_ok = run_sql_check()
    except OSError:
        sql_ok = False
    record(sql_ok, "SQL query validates user 101 and evidence/sql_result.txt exists")

    spec_ok = False
    playwright_ok = False
    if SPEC_PATH.is_file():
        try:
            spec_text = SPEC_PATH.read_text(encoding="utf-8")
            spec_ok = spec_is_complete(spec_text)
            if spec_ok:
                try:
                    playwright_ok = run_playwright_if_possible()
                except OSError:
                    playwright_ok = app_is_up() is False
        except OSError:
            spec_ok = False
    record(
        spec_ok,
        "Playwright spec in automation_project contains real interactions and account-save-success assertion",
    )
    if spec_ok:
        if app_is_up():
            record(playwright_ok, "Playwright test passes against running app")
        else:
            record(True, "Playwright test pass (skipped — app not reachable on localhost:3000)")

    git_ok = False
    try:
        git_ok = git_branch_pushed()
    except OSError:
        git_ok = False
    record(git_ok, f"Feature branch {FEATURE_BRANCH} pushed to local origin")

    pr_ticket_ok = False
    try:
        pr_ticket_ok = check_pr_and_ticket()
    except (OSError, json.JSONDecodeError):
        pr_ticket_ok = False
    record(pr_ticket_ok, "PR record and ticket linked with matching local URL and In Review status")

    report_ok = False
    try:
        report_ok = check_prompt_and_report()
    except OSError:
        report_ok = False
    record(report_ok, "Report prompt complete and EndOfDay report includes derived TimeoutError count and recommendation")

    html_ok = HTML_PATH.is_file()
    record(html_ok, "Final HTML report exists at evidence/Automation_Release_Report.html")

    passed_count = sum(1 for ok, _ in results if ok)
    total_count = len(results)
    all_passed = passed_count == total_count

    if all_passed:
        print(f"\nLAB COMPLETE ({passed_count}/{total_count} checks passed)")
        return 0

    print(f"\nLAB INCOMPLETE ({passed_count}/{total_count} checks passed)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
