import { useSyncExternalStore } from 'react'

let toasts = []
let nextId = 0
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const snapshot = () => toasts

export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}
export function toast(message, tone = 'info') {
  const t = { id: ++nextId, message, tone }
  toasts = [...toasts, t]
  emit()
  setTimeout(() => dismiss(t.id), 4500)
}
export const useToasts = () => useSyncExternalStore(subscribe, snapshot)
