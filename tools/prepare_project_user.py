#!/usr/bin/env python3
"""Prepare project test user 101 in the MindBridge SQLite database."""

from __future__ import annotations

import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = LAB_ROOT / "apps" / "mindbridge" / "backend" / "database" / "mindbridge.db"

USER_ID = "101"
EMAIL = "qa.user@mindbridge.local"
NAME = "Jordan Lee"
ROLE = "user"
ADMIN_EMAIL = "admin@mindbridge.local"


def main() -> int:
    if not DB_PATH.is_file():
        print("ERROR: Database not found at apps/mindbridge/backend/database/mindbridge.db")
        print("Start the MindBridge server first (bash start.sh) so the database is created.")
        return 1

    conn = sqlite3.connect(DB_PATH)
    try:
        admin = conn.execute(
            "SELECT password_hash FROM users WHERE email = ?",
            (ADMIN_EMAIL,),
        ).fetchone()
        if not admin:
            print(f"ERROR: Seeded admin account ({ADMIN_EMAIL}) not found.")
            return 1

        password_hash = admin[0]
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        existing = conn.execute("SELECT id FROM users WHERE id = ?", (USER_ID,)).fetchone()

        if existing:
            conn.execute(
                """
                UPDATE users
                SET email = ?, password_hash = ?, name = ?, role = ?, is_instructor = 0
                WHERE id = ?
                """,
                (EMAIL, password_hash, NAME, ROLE, USER_ID),
            )
            action = "updated"
        else:
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, name, role, is_instructor, created_at)
                VALUES (?, ?, ?, ?, ?, 0, ?)
                """,
                (USER_ID, EMAIL, password_hash, NAME, ROLE, now),
            )
            action = "inserted"

        profile = conn.execute(
            "SELECT 1 FROM profiles WHERE user_id = ?",
            (USER_ID,),
        ).fetchone()
        if profile:
            conn.execute(
                "UPDATE profiles SET updated_at = ? WHERE user_id = ?",
                (now, USER_ID),
            )
        else:
            conn.execute(
                """
                INSERT INTO profiles (user_id, date_of_birth, region, subscription_tier, updated_at)
                VALUES (?, NULL, 'EMEA', 'free', ?)
                """,
                (USER_ID, now),
            )

        conn.commit()
        print(f"OK: User {USER_ID} ({EMAIL}, {NAME}) {action}.")
        print("Password matches seeded admin (admin12345).")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
