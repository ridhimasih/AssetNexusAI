import { useEffect, useRef } from 'react'
import { useTheme } from '../state/theme'

/**
 * Animated "asset network" background: drifting nodes joined by lines, which
 * gently follow / light up near the cursor. Purely decorative (aria-hidden).
 */
export default function InteractiveBackground({ density = 1 }) {
  const ref = useRef(null)
  const theme = useTheme()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dark = theme === 'dark'
    const rgb = dark ? '94,234,212' : '14,116,144'
    let w = 0
    let h = 0
    let dpr = 1
    let nodes = []
    let raf = 0
    const mouse = { x: -9999, y: -9999 }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(90, Math.round(((w * h) / 18000) * density))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.8,
      }))
    }

    const LINK = 130
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const n of nodes) {
        if (!reduce) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < 0 || n.x > w) n.vx *= -1
          if (n.y < 0 || n.y > h) n.vy *= -1
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const d = Math.hypot(dx, dy)
          if (d < 160 && d > 1) {
            n.x += (dx / d) * 0.6
            n.y += (dy / d) * 0.6
          }
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${rgb},${(1 - d / LINK) * (dark ? 0.28 : 0.22)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
        const m = Math.hypot(mouse.x - a.x, mouse.y - a.y)
        if (m < 180) {
          ctx.strokeStyle = `rgba(${rgb},${(1 - m / 180) * 0.55})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
        ctx.fillStyle = `rgba(${rgb},${m < 180 ? 0.95 : dark ? 0.6 : 0.5})`
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!reduce) raf = requestAnimationFrame(draw)
    }

    const onMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      if (reduce) draw()
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }
    resize()
    draw()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [theme, density])

  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-aurora" />
      <canvas ref={ref} />
    </div>
  )
}
