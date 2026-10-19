# MindBridge

A learning-catalogue application: browse courses, add to cart, mock checkout,
admin console, authenticated learner dashboard.

This app is one of potentially many in the labs platform. It is self-contained:
backend (Express + better-sqlite3), frontend (React + Vite + Tailwind), its own
`lab-configs.json` catalogue, and its own `defects/` directory.

## Running locally

From the repo root:

```bash
bash init/lab-baseline.sh
```

The backend builds and serves both the API and the built frontend at
`http://localhost:3000`.

## Layout

```
apps/mindbridge/
├── backend/         # Express + better-sqlite3 + TypeScript
├── frontend/        # React 18 + Vite + TypeScript + Tailwind
├── lab-configs.json # Catalogue of supported labs, keyed by LAB_ID
└── defects/         # Per-defect modules (D-REG-DUPLICATE, D-WCAG-*, …)
```

## Dev mode

```bash
npm run dev:backend    # API on http://localhost:3000
npm run dev:frontend   # Vite on http://localhost:5173 (proxies /api → 3000)
```

## Useful endpoints

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/api/lab-info
```

`/api/lab-info` returns the active `labId`, its `description`, and the
`defects` map from `lab-configs.json`. The legacy `/api/config/flags`
path returns the same body and sets a `Deprecation` header.
