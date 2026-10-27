import { useEffect, useState, useSyncExternalStore } from 'react'
import { getMode, subscribeMode } from '../api/client'
import { getVersion, subscribeRefresh } from '../state/refresh'

// key identifies the request; changing it shows the loading state.
// A data-version bump (Refresh button, feedback review…) refetches silently and keeps old data on screen.
export function useAsync(fn, key) {
  const version = useSyncExternalStore(subscribeRefresh, getVersion)
  const [state, setState] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    let cancelled = false
    fn()
      .then((data) => !cancelled && setState({ key, data, error: null }))
      .catch((error) => !cancelled && setState({ key, data: null, error }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])

  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
  }
}

export function useDataMode() {
  return useSyncExternalStore(subscribeMode, getMode)
}
