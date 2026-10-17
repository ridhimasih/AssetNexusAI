# Architecture
React frontend (`assetnexus-frontend`) -> REST `/api` -> FastAPI backend -> PostgreSQL; intelligence services
(`anomaly`, `diagnosis`, `rul`, `uncertainty`, `trust`, `feedback_knowledge`) are called by the backend.
Frontend: pages (Dashboard, Assets, Asset detail, AI Analysis, Trust Center, Human Feedback, Feedback History,
Knowledge Base, Login), `api/client.js` with demo fallback, external stores in `state/`.
See `assetnexus-frontend/FRONTEND_NOTES.md`.
