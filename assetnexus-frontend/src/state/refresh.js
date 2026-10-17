import { useSyncExternalStore } from 'react'

// Shared "data version": bumping it makes every mounted query refetch (keeping stale data on screen).
let version = 0
let updated = Date.now()
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

export const getVersion = () => version
export const getUpdated = () => updated
export function subscribeRefresh(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function bump() {
  version += 1
  updated = Date.now()
  emit()
}
export const useUpdated = () => useSyncExternalStore(subscribeRefresh, getUpdated)
