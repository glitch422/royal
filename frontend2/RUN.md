# ROYAL Frontend (Static SPA)

This package is a deployable frontend (no framework build step). It behaves exactly like the current UI flow, but without mock-only overlays and labels.

## Run locally

Because the app uses JS modules and localStorage, run it via a local web server (do not open `index.html` directly).

### Option A (Python)
```bash
cd frontend
python3 -m http.server 8080
```

Open:
- http://localhost:8080

### Option B (Node)
```bash
cd frontend
npx http-server -p 8080
```

## Backend integration (next step)

Right now the frontend uses an in-browser store to keep the exact behavior you approved.
When your backend is ready, we will replace the store methods with real API calls using the same method signatures, so the UI code stays stable.
