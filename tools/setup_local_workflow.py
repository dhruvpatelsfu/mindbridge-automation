#!/usr/bin/env python3
"""Initialize local Git workflow workspace for the LC4 automation project."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
PROJECT_DIR = LAB_ROOT / "automation_project"
ORIGIN_DIR = LAB_ROOT / ".local-git-origin"
STARTER_SPEC = LAB_ROOT / "tests" / "account_update.spec.js"
FEATURE_BRANCH = "feature/account-update-test"

GIT_NAME = "Jordan Lee"
GIT_EMAIL = "jordan.lee@mindbridge.local"

# Local Playwright config so `npx playwright test` resolves correctly when run
# from inside automation_project/ (the config in the current directory wins
# over the package-root config, whose testDir points at the root starter).
PLAYWRIGHT_CONFIG = """\
// Playwright config for the automation project. Run tests from this folder:
//   npx playwright test tests/account_update.spec.js
// The MindBridge app must already be running at http://localhost:3000.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
"""


def write_playwright_config() -> None:
    config_path = PROJECT_DIR / "playwright.config.js"
    if not config_path.is_file():
        config_path.write_text(PLAYWRIGHT_CONFIG, encoding="utf-8")


def run(cmd: list[str], *, cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        check=check,
        text=True,
        capture_output=True,
    )


def main() -> int:
    if not STARTER_SPEC.is_file():
        print("ERROR: Starter spec not found at tests/account_update.spec.js")
        return 1

    if PROJECT_DIR.exists() and (PROJECT_DIR / ".git").is_dir():
        write_playwright_config()
        print("OK: automation_project already initialized.")
        print(f"Work in {PROJECT_DIR.relative_to(LAB_ROOT)} on branch {FEATURE_BRANCH}.")
        return 0

    if PROJECT_DIR.exists():
        shutil.rmtree(PROJECT_DIR)

    ORIGIN_DIR.mkdir(parents=True, exist_ok=True)
    bare_init = run(["git", "init", "--bare"], cwd=ORIGIN_DIR)
    if bare_init.returncode != 0:
        print(f"ERROR: Could not create bare origin: {bare_init.stderr.strip()}")
        return 1

    PROJECT_DIR.mkdir(parents=True)
    tests_dir = PROJECT_DIR / "tests"
    tests_dir.mkdir()

    init = run(["git", "init"], cwd=PROJECT_DIR)
    if init.returncode != 0:
        print(f"ERROR: git init failed: {init.stderr.strip()}")
        return 1

    run(["git", "config", "user.name", GIT_NAME], cwd=PROJECT_DIR)
    run(["git", "config", "user.email", GIT_EMAIL], cwd=PROJECT_DIR)

    gitignore = PROJECT_DIR / ".gitignore"
    gitignore.write_text(
        "\n".join(
            [
                ".local-git-origin/",
                "../.local-git-origin/",
                "node_modules/",
                "test-results/",
                "playwright-report/",
                "",
            ]
        ),
        encoding="utf-8",
    )

    shutil.copy2(STARTER_SPEC, tests_dir / "account_update.spec.js")
    write_playwright_config()

    run(["git", "add", "."], cwd=PROJECT_DIR)
    commit = run(
        ["git", "commit", "-m", "chore: add account update Playwright starter"],
        cwd=PROJECT_DIR,
    )
    if commit.returncode != 0:
        print(f"ERROR: Initial commit failed: {commit.stderr.strip()}")
        return 1

    run(["git", "branch", "-M", "main"], cwd=PROJECT_DIR)
    run(["git", "remote", "add", "origin", str(ORIGIN_DIR)], cwd=PROJECT_DIR)
    push = run(["git", "push", "-u", "origin", "main"], cwd=PROJECT_DIR)
    if push.returncode != 0:
        print(f"ERROR: Push to local origin failed: {push.stderr.strip()}")
        return 1

    checkout = run(["git", "checkout", "-b", FEATURE_BRANCH], cwd=PROJECT_DIR)
    if checkout.returncode != 0:
        print(f"ERROR: Could not create feature branch: {checkout.stderr.strip()}")
        return 1

    print("OK: Local workflow ready.")
    print(f"  Project:  {PROJECT_DIR.relative_to(LAB_ROOT)}/")
    print(f"  Origin:   {ORIGIN_DIR.relative_to(LAB_ROOT)}/ (local bare repo, not a cloud remote)")
    print(f"  Branch:   {FEATURE_BRANCH}")
    print("Next: complete tests/account_update.spec.js, commit, push, then run create_pr_record.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
