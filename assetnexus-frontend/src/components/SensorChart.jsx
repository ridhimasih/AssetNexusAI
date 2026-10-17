import { useEffect, useRef, useState } from 'react'
import { toast } from '../state/toast'

// Optionally streams simulated readings (random walk) so the chart feels live.
// `drift` > 0 nudges readings upward (used for degrading assets) so alarms can trigger.
export default function SensorChart({ sensor, live = false, drift = 0 }) {
  const [hover, setHover] = useState(null)
  const [extra, setExtra] = useState([])
  const lastRef = useRef(sensor.data[sensor.data.length - 1])

  useEffect(() => {
    if (!live) return undefined
    const spread = (Math.max(...sensor.data) - Math.min(...sensor.data)) * 0.12 || 1
    const id = setInterval(() => {
      const prev = lastRef.current
      const next = Math.round((prev + (Math.random() - 0.5) * spread + drift * spread) * 100) / 100
      lastRef.current = next
      setExtra((e) => [...e, next].slice(-60))
      if (next > sensor.limit && prev <= sensor.limit) {
        toast(`${sensor.label} crossed its alarm limit (${next} ${sensor.unit})`, 'bad')
      }
    }, 1200)
    return () => clearInterval(id)
  }, [live, sensor, drift])

  const data = live ? [...sensor.data, ...extra].slice(-60) : sensor.data
  const { limit, unit } = sensor
  const W = 640
  const H = 220
  const pad = { l: 44, r: 12, t: 12, b: 24 }
  const max = Math.max(...data, limit) * 1.05
  const min = Math.min(...data) * 0.9
  const x = (i) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r)
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const path = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${path} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min))
  const over = data[data.length - 1] > limit

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }
  const shown = hover !== null && hover < data.length ? hover : null

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`${sensor.label} trend`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 6} y={y(t) + 4} className="axis" textAnchor="end">{t.toFixed(t > 100 ? 0 : 1)}</text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(limit)} y2={y(limit)} className="limit" />
        <text x={W - pad.r} y={y(limit) - 4} className="axis limit-label" textAnchor="end">
          alarm limit {limit.toFixed(limit > 100 ? 0 : 1)}
        </text>
        <path d={area} className="area" />
        <path d={path} className={`line ${over ? 'line-over' : ''}`} />
        <text x={pad.l} y={H - 6} className="axis">oldest</text>
        <text x={W - pad.r} y={H - 6} className="axis" textAnchor="end">latest</text>
        {shown !== null && (
          <g>
            <line x1={x(shown)} x2={x(shown)} y1={pad.t} y2={H - pad.b} className="cursor" />
            <circle cx={x(shown)} cy={y(data[shown])} r="4" className="dot" />
          </g>
        )}
        {live && <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="5" className="pulse" />}
      </svg>
      <div className="chart-readout">
        {shown !== null ? (
          <>Reading #{shown + 1}: <strong>{data[shown]} {unit}</strong></>
        ) : (
          <>
            Latest: <strong>{data[data.length - 1]} {unit}</strong>
            {live ? ' · streaming simulated readings' : ' · hover the chart to inspect readings'}
          </>
        )}
      </div>
    </div>
  )
}
