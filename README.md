# LC4 Project — Automation and Release

Starter files for the MindBridge Account Update automation workflow.

Dependencies (Node, Python 3, Playwright) are preloaded in the lab VM. No
installs, downloads, or external accounts are required.

## Before you begin

1. **Terminal 1:** start the app with the package instructions (`bash start.sh`).
2. **Terminal 2:** `cd /app/lab` and follow `Lab_Walkthrough.md`.

Reference material lives in `supporting-files/` (selectors, log file, local
ticket seed). Edit files under `automation_project/` for version control work.

## Quick commands

```bash
cd /app/lab
python3 tools/prepare_project_user.py
python3 tools/run_sql.py
python3 tools/setup_local_workflow.py
python3 tools/verify_lab.py
```

Screenshots (`sql_validation.png`, `playwright_pass.png`, `jira_link.png`) are
captured inside the VM using the desktop screenshot tool or VS Code.
