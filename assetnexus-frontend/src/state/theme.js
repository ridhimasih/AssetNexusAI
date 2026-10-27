import { useSyncExternalStore } from 'react'

const KEY = 'assetnexus_theme'
function read() {
  try {
    return localStorage.getItem(KEY) || 'light'
  } catch {
    return 'light'
  }
}
let theme = read()
document.documentElement.dataset.theme = theme

const listeners = new Set()
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}
export const useTheme = () => useSyncExternalStore(subscribe, () => theme)
