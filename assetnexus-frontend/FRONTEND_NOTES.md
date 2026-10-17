# AssetNexusAI Frontend (Ridhi Masih)

## Run
    npm install
    cp .env.example .env     # VITE_API_URL=http://localhost:8000 once the FastAPI backend is up
    npm run dev

Without a reachable backend the app falls back to **Demo data (simulated)** (shown in the top bar).
Backend must allow CORS from http://localhost:5173.

## Pages (routes)
- `/` Dashboard: stat cards, Asset Health, Attention Required, AI Trust & Autonomy, Risk map
- `/assets` Assets: summary cards (click to filter), Registered Assets table (search, filter, sort, paginate), + Add Asset
- `/assets/:id` Asset detail: sensors (live simulation), diagnosis, maintenance planner, trust gate
- `/assets/:id/ai-analysis` and `/analysis` AI Analysis: anomaly, fault diagnosis, RUL, recommendation + View Explanation, pipeline replay, before/after feedback
- `/trust` Trust Center: trust cards, rules, Asset Trust Status table, what-if Policy simulator
- `/feedback` Human Feedback: current AI decision, Accept / Reject / Provide Correction, comments
- `/history` Feedback History: stats, Review History table (search, filter, paginate, CSV), Feedback Impact flow
- `/knowledge` Knowledge Base: stats, Structured Feedback Records (Validate / Decline), How Knowledge Is Used flow

## Feedback-as-Knowledge flow in the UI
Human Feedback -> record is Pending -> Knowledge Base "Validate" -> only validated corrections are retrieved
for matching assets (same type, corrected fault among the asset's top-2 diagnoses, asset not Healthy).
In demo mode each newly validated matching correction lowers uncertainty by 0.08 (max 2) — a SIMULATED effect.
Try: Human Feedback -> AST-002 -> Provide Correction -> Cavitation -> Knowledge Base -> Validate -> Dashboard / AI Analysis.

## API contract the UI expects
- GET  /api/assets -> [{id:'AST-001',name,type,location,health,status,confidence,uncertainty,trust,topFault,rulDays}]
- POST /api/assets {name,type,location,health}                      (proposed)
- GET  /api/assets/{id}
- GET  /api/assets/{id}/analysis -> {assetName,confidence,anomalyScore,anomalyResult,diagnoses:[{fault,probability}],
       rul:{days,low,high},uncertainty,trust:'recommend'|'confirm'|'withhold',evidence[],recommendation,
       retrievedKnowledge[],sensors:[{key,label,unit,limit,data[]}]}
- GET  /api/assets/{id}/analysis?use_feedback=false                  (proposed, baseline)
- GET  /api/feedback and GET /api/knowledge -> [{id,assetId,assetName,assetType,date,aiDecision,aiConfidence,
       uncertaintyAtReview,decision:'accepted'|'rejected'|'corrected',correctedFault,expertKnowledge,comments,
       engineer,validation:'pending'|'validated'|'declined'}]
- POST /api/assets/{id}/feedback {decision,correctedFault,comments,engineer,aiDecision,aiConfidence,uncertaintyAtReview}
- PATCH /api/knowledge/{id} {validation}                              (proposed)

## Honesty notes for the thesis
- Demo data, live sensor stream and the demo "validated feedback lowers uncertainty" effect are SIMULATED.
- Trust thresholds (0.25 / 0.55) are placeholders; the Policy simulator only changes them in the browser.

## Login & theme (added)
- `/login` page (email + password, show/hide, Caps Lock warning, 5-try 30s lockout). All other routes are protected by `RequireAuth`.
- Auth tries `POST /api/auth/login`, else demo accounts (`ridhi@assetnexus.dev` / `Nexus@2026`, SHA-256 checked in browser). Prototype only - not real security.
- Interactive background: `components/InteractiveBackground.jsx` (cursor-reactive node network + aurora). Styles/hover effects: `src/theme.css`. Honours `prefers-reduced-motion`.
