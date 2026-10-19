# End-of-Day Report Requirements

Your QA Lead needs a **non-technical End-of-Day Status Update** derived from
`raw_nightly_logs.txt`. In this lab you author a structured prompt in
`report_prompt.txt` and run the local **report-generation sandbox** — it
mirrors how teams use generative tools in production, but runs entirely on
your VM with no external account or network call.

## Prompt must specify

1. **Role** — who is writing the update (for example, QA Lead).
2. **Audience** — who will read it (for example, non-technical project managers).
3. **Format** — End-of-Day Status Update (or equivalent heading).
4. **Required findings** — overall pass/fail picture, top error hotspot, and a
   actionable recommendation.

## Report must include (verified automatically)

- Total tests executed and pass count derived from the log summary line (`Tests: 14 total, 5 passed, 9 failed`).
- Pass rate percentage computed from those counts.
- **TimeoutError** identified as the top hotspot with the exact occurrence
  count found in the raw log (seven in this dataset).
- Plain-language recommendation suitable for a project manager (no raw stack
  traces in the final report body).

## Output location

The sandbox writes `evidence/EndOfDay_Report.md`. You may also export a PDF
from the assembled HTML report (see Activity 4 in the walkthrough).

## Quality check

Before submitting, read the report as if you were the project manager. Would
you know whether last night's build is safe to promote without reading the
raw log file?
