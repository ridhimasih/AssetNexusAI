import {
  BASE_ASSETS,
  buildAnalysis,
  buildSensors,
  makeCustomAsset,
  publicAsset,
  seedFeedback,
} from '../data/mockData'

// Set VITE_API_URL (e.g. http://localhost:8000) in .env to point at the FastAPI backend.
// If the backend can't be reached, the app falls back to clearly-labelled demo data.
const BASE = import.meta.env.VITE_API_URL ?? ''
const FB_KEY = 'assetnexus_demo_feedback_v2'
const ASSET_KEY = 'assetnexus_demo_assets_v2'

// ---- connection mode (live | demo | unknown), observable from React ----
let mode = 'unknown'
const listeners = new Set()
function setMode(next) {
  if (mode !== next) { 
    mode = next
    listeners.forEach((l) => l())
  }
}
export const getMode = () => mode
export function subscribeMode(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch {
      /* ignore */
    }
    const err = new Error(detail)
    err.status = res.status
    err.fromServer = true
    throw err
  }
  return res.json() // throws if the dev server returned index.html -> triggers fallback
}

async function withFallback(path, options, mock) {
  try {
    const data = await request(path, options)
    setMode('live')
    return data
  } catch (e) {
    // A real server rejection (validation error etc.) should surface to the UI, not be hidden by mock data.
    if (e.fromServer && e.status >= 400 && e.status < 500 && e.status !== 404) throw e
    setMode('demo')
    await delay()
    return mock()
  }
}

// ---- demo stores (localStorage) ----
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return fallback()
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
const records = () => load(FB_KEY, seedFeedback)
const allAssets = () => [...BASE_ASSETS, ...load(ASSET_KEY, () => [])]
const findAsset = (id) => {
  const a = allAssets().find((x) => x.id === id)
  if (!a) throw new Error(`Asset ${id} not found`)
  return a
}

export const api = {
  health: () => withFallback('/api/health', undefined, () => ({ status: 'demo' })),

  getAssets: () => withFallback('/api/assets', undefined, () => allAssets().map((a) => publicAsset(a, records()))),

  getAsset: (id) =>
    withFallback(`/api/assets/${id}`, undefined, () => {
      const a = findAsset(id)
      return { ...publicAsset(a, records()), sensors: buildSensors(a) }
    }),

  // Proposed contract: POST /api/assets {name,type,location,health}
  createAsset: (payload) =>
    withFallback('/api/assets', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const extras = load(ASSET_KEY, () => [])
      const asset = makeCustomAsset(payload, BASE_ASSETS.length + extras.length + 1)
      save(ASSET_KEY, [...extras, asset])
      return publicAsset(asset, records())
    }),

  getAnalysis: (id) => withFallback(`/api/assets/${id}/analysis`, undefined, () => buildAnalysis(findAsset(id), records())),

  // Analysis WITHOUT validated feedback, for before/after comparison.
  // Proposed contract: GET /api/assets/{id}/analysis?use_feedback=false
  getAnalysisBaseline: (id) =>
    withFallback(`/api/assets/${id}/analysis?use_feedback=false`, undefined, () => buildAnalysis(findAsset(id), [])),

  // Feedback history and structured knowledge share one record shape (see FRONTEND_NOTES.md)
  getFeedback: () => withFallback('/api/feedback', undefined, () => records()),
  getKnowledge: () => withFallback('/api/knowledge', undefined, () => records()),

  submitFeedback: (id, payload) =>
    withFallback(`/api/assets/${id}/feedback`, { method: 'POST', body: JSON.stringify(payload) }, () => {
      const asset = findAsset(id)
      const list = records()
      const fault = payload.decision === 'corrected' ? payload.correctedFault : asset.topFault
      const entry = {
        id: `FB-${String(list.length + 1).padStart(3, '0')}`,
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        date: new Date().toISOString(),
        aiDecision: payload.aiDecision,
        aiConfidence: payload.aiConfidence,
        uncertaintyAtReview: payload.uncertaintyAtReview,
        decision: payload.decision,
        correctedFault: payload.decision === 'corrected' ? payload.correctedFault : null,
        expertKnowledge:
          payload.decision === 'rejected'
            ? 'AI diagnosis rejected by engineer'
            : fault === 'No fault'
              ? 'Normal operation confirmed'
              : `${fault} confirmed`,
        comments: payload.comments,
        engineer: payload.engineer,
        validation: 'pending',
        incorporated: false,
      }
      save(FB_KEY, [entry, ...list])
      return entry
    }),

  // Proposed contract: PATCH /api/knowledge/{id} {validation: 'validated' | 'declined'}
  validateKnowledge: (id, validation) =>
    withFallback(`/api/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify({ validation }) }, () => {
      const list = records().map((k) => (k.id === id ? { ...k, validation } : k))
      save(FB_KEY, list)
      return list.find((k) => k.id === id)
    }),
}
