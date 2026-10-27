import { useEffect } from 'react'

/** Sets --mx/--my on the hovered card so CSS can draw a cursor-following glow. */
export function useSpotlight() {
  useEffect(() => {
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = e.target instanceof Element ? e.target.closest('.card, .stat, .tile, .rule-card, .flow-step, .opt') : null
        if (!el) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])
}
