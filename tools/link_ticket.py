#!/usr/bin/env python3
"""Link local PR URL to the seeded Jira-style ticket record."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
TICKET_PATH = LAB_ROOT / "supporting-files" / "local_ticket.json"
EVIDENCE_DIR = LAB_ROOT / "evidence"
PR_PATH = EVIDENCE_DIR / "pull_request.md"
TICKET_EVIDENCE = EVIDENCE_DIR / "jira_ticket.md"

PR_URL_PATTERN = re.compile(r"local://mindbridge-automation/pull/\d+")


def extract_pr_url(text: str) -> str | None:
    match = PR_URL_PATTERN.search(text)
    return match.group(0) if match else None


def load_pr_url(explicit: str | None) -> str | None:
    if explicit:
        return explicit if PR_URL_PATTERN.fullmatch(explicit) else None
    if PR_PATH.is_file():
        return extract_pr_url(PR_PATH.read_text(encoding="utf-8"))
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Link local PR to ticket MB-142")
    parser.add_argument(
        "--pr-url",
        help="Override PR URL (default: read from evidence/pull_request.md)",
    )
    args = parser.parse_args()

    pr_url = load_pr_url(args.pr_url)
    if not pr_url:
        print("ERROR: PR URL not found. Run create_pr_record.py first or pass --pr-url.")
        return 1

    if not TICKET_PATH.is_file():
        print("ERROR: supporting-files/local_ticket.json not found.")
        return 1

    ticket = json.loads(TICKET_PATH.read_text(encoding="utf-8"))
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    comment = {
        "author": ticket.get("assignee", "Jordan Lee"),
        "posted_at": timestamp,
        "body": f"Test scripts complete. Pull request ready for review: {pr_url}",
    }
    ticket["status"] = "In Review"
    ticket.setdefault("comments", []).append(comment)
    ticket["linked_pr"] = pr_url

    TICKET_PATH.write_text(json.dumps(ticket, indent=2) + "\n", encoding="utf-8")

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Local Ticket Record (Jira-style)",
        "",
        f"**Key:** {ticket.get('key', 'MB-142')}",
        f"**Title:** {ticket.get('title', '')}",
        f"**Status:** {ticket['status']}",
        f"**Assignee:** {ticket.get('assignee', '')}",
        "",
        "## Description",
        "",
        ticket.get("description", ""),
        "",
        "## Comments",
        "",
    ]
    for item in ticket["comments"]:
        lines.extend(
            [
                f"**{item['author']}** ({item['posted_at']}):",
                "",
                item["body"],
                "",
            ]
        )

    TICKET_EVIDENCE.write_text("\n".join(lines), encoding="utf-8")

    print(f"OK: Ticket {ticket.get('key')} moved to In Review.")
    print(f"Linked PR: {pr_url}")
    print("Evidence: evidence/jira_ticket.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
