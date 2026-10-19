#!/usr/bin/env python3
"""Create a local pull-request record after branch commit and push."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
PROJECT_DIR = LAB_ROOT / "automation_project"
EVIDENCE_DIR = LAB_ROOT / "evidence"
PR_PATH = EVIDENCE_DIR / "pull_request.md"
SPEC_REL = "tests/account_update.spec.js"
FEATURE_BRANCH = "feature/account-update-test"
PR_NUMBER = 1
PR_URL = f"local://mindbridge-automation/pull/{PR_NUMBER}"

TODO_PATTERN = re.compile(r"\bTODO\b", re.IGNORECASE)
INTERACTION_PATTERN = re.compile(
    r"(page\.(goto|click|fill|getBy|locator)|getByRole|getByTestId|expect\()",
    re.IGNORECASE,
)


def run(cmd: list[str], *, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)


def branch_exists_on_origin(branch: str) -> bool:
    result = run(["git", "ls-remote", "--heads", "origin", branch], cwd=PROJECT_DIR)
    return result.returncode == 0 and branch in result.stdout


def spec_has_real_automation(spec_path: Path) -> bool:
    if not spec_path.is_file():
        return False
    text = spec_path.read_text(encoding="utf-8")
    if TODO_PATTERN.search(text):
        return False
    if "throw new Error" in text and "Complete the TODO" in text:
        return False
    if not INTERACTION_PATTERN.search(text):
        return False
    if "account-save-success" not in text:
        return False
    return True


def main() -> int:
    if not PROJECT_DIR.is_dir() or not (PROJECT_DIR / ".git").is_dir():
        print("ERROR: automation_project not initialized. Run: python3 tools/setup_local_workflow.py")
        return 1

    current = run(["git", "branch", "--show-current"], cwd=PROJECT_DIR)
    branch = current.stdout.strip()
    if branch != FEATURE_BRANCH:
        print(f"ERROR: Check out {FEATURE_BRANCH} before creating a PR record (current: {branch or 'detached'}).")
        return 1

    spec_path = PROJECT_DIR / SPEC_REL
    if not spec_has_real_automation(spec_path):
        print("ERROR: Complete automation_project/tests/account_update.spec.js before opening a PR.")
        return 1

    status = run(["git", "status", "--porcelain"], cwd=PROJECT_DIR)
    if status.stdout.strip():
        print("ERROR: Uncommitted changes remain. Stage and commit your spec first.")
        return 1

    log = run(["git", "log", "main..HEAD", "--oneline"], cwd=PROJECT_DIR)
    if log.returncode != 0 or not log.stdout.strip():
        print("ERROR: Make at least one commit on the feature branch ahead of main.")
        return 1

    push = run(["git", "push", "-u", "origin", FEATURE_BRANCH], cwd=PROJECT_DIR)
    if push.returncode != 0:
        print(f"ERROR: git push failed: {push.stderr.strip() or push.stdout.strip()}")
        return 1

    if not branch_exists_on_origin(FEATURE_BRANCH):
        print("ERROR: Feature branch not found on origin after push.")
        return 1

    head = run(["git", "rev-parse", "--short", "HEAD"], cwd=PROJECT_DIR).stdout.strip()
    commits = [line for line in log.stdout.strip().splitlines() if line.strip()]

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        [
            "# Local Pull Request Record",
            "",
            f"**URL:** {PR_URL}",
            f"**Number:** {PR_NUMBER}",
            f"**Title:** feat: automate account update happy path",
            f"**Source branch:** {FEATURE_BRANCH}",
            "**Target branch:** main",
            f"**Head commit:** {head}",
            "",
            "## Commits",
            "",
            *[f"- {line}" for line in commits],
            "",
            "## Note",
            "",
            "This PR record simulates a GitHub pull request inside the lab VM.",
            "The URL uses the local:// scheme for traceability checks only.",
            "",
        ]
    )
    PR_PATH.write_text(body, encoding="utf-8")

    print(f"OK: PR record written to evidence/pull_request.md")
    print(f"PR URL: {PR_URL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
