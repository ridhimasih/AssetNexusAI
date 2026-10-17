# AssetNexusAI
Feedback-as-Knowledge with Uncertainty-Gated Trust Management for Industrial Asset Intelligence.

| Module | Folder | Owner | Branch |
|---|---|---|---|
| Frontend (React) | `assetnexus-frontend/` | Ridhi Masih | `feature/frontend` |
| Backend (FastAPI) | `assetnexus-backend/` | Ayushi Sharma | `feature/backend` |
| AI / trust / feedback | `assetnexus-backend/app/services/` | Anu Sharma | `feature/ai-trust-feedback` |

## Run the frontend
```bash
cd assetnexus-frontend
npm install
npm run dev        # http://localhost:5173
```
Sign in with `ridhi@assetnexus.dev` / `Nexus@2026` (prototype demo account).
Without a backend the UI runs on clearly labelled **simulated demo data**; once the backend
serves `/api/*` on port 8000 it is used automatically. See `docs/api-contracts.md`.

Decision support only - not for unsupervised execution of maintenance actions.
 