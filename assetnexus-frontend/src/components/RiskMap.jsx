import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Interactive scatter: x = health, y = uncertainty, coloured bands = trust-gate zones.
export default function RiskMap({ assets, thresholds }) {
  const nav = useNavigate()
  const [hover, setHover] = useState(null)
  const W = 640
  const H = 300
  const p = { l: 46, r: 14, t: 12, b: 36 }
  const x = (h) => p.l + (h / 100) * (W - p.l - p.r)
  const y = (u) => p.t + (1 - u) * (H - p.t - p.b)
  const { low, medium } = thresholds
  const h = assets.find((a) => a.id === hover)

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Risk map of asset health versus uncertainty">
        <rect x={p.l} y={y(1)} width={W - p.l - p.r} height={y(medium) - y(1)} className="zone zone-bad" />
        <rect x={p.l} y={y(medium)} width={W - p.l - p.r} height={y(low) - y(medium)} className="zone zone-warn" />
        <rect x={p.l} y={y(low)} width={W - p.l - p.r} height={y(0) - y(low)} className="zone zone-ok" />
        {[0, 0.25, 0.5, 0.75, 1].map((u) => (
          <text key={u} x={p.l - 6} y={y(u) + 4} className="axis" textAnchor="end">{u}</text>
        ))}
        {[0, 25, 50, 75, 100].map((v) => (
          <text key={v} x={x(v)} y={H - 18} className="axis" textAnchor="middle">{v}</text>
        ))}
        <text x={(W + p.l) / 2} y={H - 3} className="axis" textAnchor="middle">Health score →</text>
        <text x={12} y={H / 2} className="axis" textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`}>Uncertainty →</text>
        <text x={W - p.r - 4} y={y(medium) - 4} className="axis" textAnchor="end">withhold ↑ {medium}</text>
        <text x={W - p.r - 4} y={y(low) - 4} className="axis" textAnchor="end">confirm ↑ {low}</text>
        {assets.map((a) => (
          <circle
            key={a.id}
            cx={x(a.health)}
            cy={y(a.uncertainty)}
            r={hover === a.id ? 10 : 7}
            className={`pt pt-${a.status}`}
            tabIndex={0}
            role="link"
            aria-label={`${a.name}, health ${a.health}, uncertainty ${a.uncertainty}`}
            onMouseEnter={() => setHover(a.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(a.id)}
            onBlur={() => setHover(null)}
            onClick={() => nav(`/assets/${a.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && nav(`/assets/${a.id}`)}
          />
        ))}
      </svg>
      <div className="chart-readout">
        {h ? (
          <>
            <strong>{h.name}</strong> · health {h.health} · uncertainty {h.uncertainty.toFixed(2)} · click to open
          </>
        ) : (
          <>Each dot is an asset. Top-left = unhealthy and uncertain → needs a human. Hover or click a dot.</>
        )}
      </div>
    </div>
  )
}
