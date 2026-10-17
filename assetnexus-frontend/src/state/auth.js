import { useSyncExternalStore } from 'react'

/*
 * Prototype authentication.
 * 1. Tries POST /api/auth/login on the backend (contract in docs/api-contracts.md).
 * 2. If the backend is unreachable / not implemented yet, falls back to the local DEMO accounts below.
 * Local demo auth runs entirely in the browser and is NOT real security — the real
 * implementation (hashed passwords, JWT, roles) belongs to the backend module.
 */
const KEY = 'assetnexus_session_v1'

// SHA-256 of the demo password (the password itself is not stored in the code).
export const DEMO_ACCOUNTS = [
  { email: 'ridhi@assetnexus.dev', name: 'Ridhi Masih', role: 'Frontend Lead', initials: 'RM',
    hash: '166cb45f21e33c732c4b1bd793cc3f62771ae11ffd6926ba51c6076dd9e26b90' },
  { email: 'engineer@assetnexus.dev', name: 'R. Verma', role: 'Maintenance Engineer', initials: 'RV',
    hash: '166cb45f21e33c732c4b1bd793cc3f62771ae11ffd6926ba51c6076dd9e26b90' },
]
export const DEMO_PASSWORD = 'Nexus@2026'

const read = () => {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
  }
  return null
}
let session = (() => {
  try {
    return read()
  } catch {
    return null
  }
})()

const listeners = new Set()
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const emit = () => listeners.forEach((l) => l())

export const getUser = () => session?.user ?? null
export const useUser = () => useSyncExternalStore(subscribe, () => session?.user ?? null)

async function sha256(text) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure context required (use localhost or HTTPS).')
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function backendLogin(email, password) {
  const base = import.meta.env.VITE_API_URL || ''
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 2500)
  try {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: ctl.signal,
    })
    if (res.ok) {
      const data = await res.json()
      return { token: data.token, user: data.user, source: 'backend' }
    }
    if (res.status === 401 || res.status === 403 || res.status === 422) return 'invalid'
    return null // 404 / 5xx → not implemented yet, use demo auth
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function login(email, password, remember) {
  const mail = email.trim().toLowerCase()
  let result = await backendLogin(mail, password)
  if (result === 'invalid') throw new Error('Invalid email or password.')
  if (!result) {
    const account = DEMO_ACCOUNTS.find((a) => a.email === mail)
    const hash = await sha256(password)
    if (!account || account.hash !== hash) throw new Error('Invalid email or password.')
    const user = { email: account.email, name: account.name, role: account.role, initials: account.initials }
    result = { token: null, user, source: 'demo' }
  }
  session = { ...result, at: Date.now() }
  const store = remember ? localStorage : sessionStorage
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
    store.setItem(KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
  emit()
  return session.user
}

export function logout() {
  session = null
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  emit()
}
