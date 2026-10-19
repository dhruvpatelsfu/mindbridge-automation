#!/usr/bin/env python3
"""Execute the learner SQL validation query against MindBridge SQLite."""

from __future__ import annotations

import re
import sqlite3
import sys
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
SQL_PATH = LAB_ROOT / "queries" / "user_validation.sql"
DB_PATH = LAB_ROOT / "apps" / "mindbridge" / "backend" / "database" / "mindbridge.db"
EVIDENCE_DIR = LAB_ROOT / "evidence"
EVIDENCE_PATH = EVIDENCE_DIR / "sql_result.txt"

TODO_PATTERN = re.compile(r"\bTODO\b", re.IGNORECASE)


def strip_sql_comments(sql: str) -> str:
    """Remove line and block comments from SQL text."""
    lines: list[str] = []
    for line in sql.splitlines():
        if "--" in line:
            line = line.split("--", 1)[0]
        lines.append(line)
    text = "\n".join(lines)
    while "/*" in text:
        start = text.index("/*")
        end = text.find("*/", start + 2)
        if end == -1:
            text = text[:start]
            break
        text = text[:start] + text[end + 2 :]
    return text


def split_statements(sql: str) -> list[str]:
    parts = [part.strip() for part in sql.split(";") if part.strip()]
    return parts


def main() -> int:
    if not SQL_PATH.is_file():
        print("ERROR: queries/user_validation.sql not found.")
        return 1

    raw = SQL_PATH.read_text(encoding="utf-8")
    if TODO_PATTERN.search(raw):
        print("ERROR: Complete the TODO markers in queries/user_validation.sql before running.")
        return 1

    sql = strip_sql_comments(raw).strip()
    if not sql:
        print("ERROR: Query file is empty after removing comments.")
        return 1

    statements = split_statements(sql)
    if len(statements) != 1:
        print("ERROR: Submit exactly one SQL statement (a single SELECT).")
        return 1

    stmt = statements[0]
    if not re.match(r"^\s*SELECT\b", stmt, re.IGNORECASE):
        print("ERROR: Only SELECT queries are allowed.")
        return 1

    if not re.search(r"\bFROM\s+users\b", stmt, re.IGNORECASE):
        print("ERROR: Query must read from the users table.")
        return 1

    if not re.search(r"\bid\s*=\s*['\"]101['\"]", stmt, re.IGNORECASE):
        print("ERROR: Query must filter for user id = '101'.")
        return 1

    if not DB_PATH.is_file():
        print("ERROR: Database not found. Start the server first, then run prepare_project_user.py.")
        return 1

    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.execute(stmt)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []

        if not rows:
            print("ERROR: Query returned no rows.")
            print("Run: python3 tools/prepare_project_user.py")
            return 1

        id_index = next((i for i, col in enumerate(columns) if col.lower() == "id"), None)
        if id_index is not None and str(rows[0][id_index]) != "101":
            print(f"ERROR: First row id is {rows[0][id_index]!r}, expected '101'.")
            return 1

        EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
        output_lines = ["\t".join(columns)]
        for row in rows:
            output_lines.append("\t".join("" if value is None else str(value) for value in row))
        EVIDENCE_PATH.write_text("\n".join(output_lines) + "\n", encoding="utf-8")

        print("\t".join(columns))
        for row in rows:
            print("\t".join("" if value is None else str(value) for value in row))
        print(f"\nOK: Wrote evidence/sql_result.txt ({len(rows)} row(s)).")
        return 0
    except sqlite3.Error as exc:
        print(f"ERROR: SQL execution failed: {exc}")
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
