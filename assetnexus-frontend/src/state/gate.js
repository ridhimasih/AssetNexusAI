import { useSyncExternalStore } from 'react'

// What-if trust policy. When thresholds differ from the default, the UI re-gates every
// asset client-side from its uncertainty; otherwise it shows the backend's own trust decision.
export const DEFAULT_THRESHOLDS = { low: 0.25, medium: 0.55 }
const KEY = 'assetnexus_thresholds'
const r = (x) => Math.round(x * 100) / 100
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    if (v && typeof v.low === 'number' && typeof v.medium === 'number') return v
  } catch {
    /* ignore */
  }
  return DEFAULT_THRESHOLDS
}
let state = read()
const listeners = new Set()
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function gateFromU(u, t) {
  if (u < t.low) return 'recommend'
  if (u < t.medium) return 'confirm'
  return 'withhold'
}

export function setThresholds(partial) {
  let low = partial.low ?? state.low
  let medium = partial.medium ?? state.medium
  low = clamp(low, 0.05, 0.85)
  medium = clamp(medium, low + 0.05, 0.95)
  low = r(low)
  medium = r(medium)
  if (low === state.low && medium === state.medium) return
  state = { low, medium }
  save()
  listeners.forEach((l) => l())
}
export const resetThresholds = () => setThresholds(DEFAULT_THRESHOLDS)

export function useThresholds() {
  return useSyncExternalStore(subscribe, () => state)
}

export function useGate() {
  const t = useThresholds()
  const modified = t.low !== DEFAULT_THRESHOLDS.low || t.medium !== DEFAULT_THRESHOLDS.medium
  const gate = (x) => (modified ? gateFromU(x.uncertainty, t) : x.trust)
  return { t, modified, gate }
}
