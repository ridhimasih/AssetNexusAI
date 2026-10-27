# API contracts (frontend expectations, camelCase JSON)

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/auth/login` | `{email,password}` -> `{token,user:{email,name,role,initials}}`; 401 on bad credentials. Optional: frontend falls back to demo accounts if 404/5xx |
| GET | `/api/health` | availability |
| GET | `/api/assets` | `[{id,name,type,location,health,status,confidence,uncertainty,trust,topFault,rulDays}]` |
| POST | `/api/assets` | `{name,type,location,health}` |
| GET | `/api/assets/{id}` | asset + `sensors` |
| GET | `/api/assets/{id}/analysis[?use_feedback=false]` | `{assetId,assetName,confidence,anomalyScore,anomalyDetected,anomalyResult,diagnoses[{fault,probability}],diagnosisNote,rul{days,low,high},uncertainty,trust,evidence[],recommendation,retrievedKnowledge[],sensors[{key,label,unit,limit,data[]}]}` |
| GET | `/api/feedback`, `/api/knowledge` | `[{id,assetId,assetName,assetType,date,aiDecision,aiConfidence,uncertaintyAtReview,decision,correctedFault,expertKnowledge,comments,engineer,validation,incorporated}]` |
| POST | `/api/assets/{id}/feedback` | `{decision,correctedFault,comments,engineer,aiDecision,aiConfidence,uncertaintyAtReview}` |
| PATCH | `/api/knowledge/{id}` | `{validation:'validated'|'declined'}` |

Trust: uncertainty < 0.25 -> `recommend`, < 0.55 -> `confirm`, else `withhold` (placeholder thresholds).
Status: health >= 70 healthy, >= 50 warning, else critical.
Errors: 404/5xx make the frontend fall back to demo data; other 4xx are shown to the user.
