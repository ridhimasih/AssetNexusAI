import { useState } from 'react'
import { CalendarClock } from 'lucide-react'

// Slide a planned service date against the RUL uncertainty band.
export default function MaintenancePlanner({ rul }) {
  const max = Math.ceil((rul.high * 1.25) / 10) * 10
  const [day, setDay] = useState(() => Math.max(1, Math.round(rul.low * 0.6)))
  const pct = (d) => `${(d / max) * 100}%`

  let verdict
  if (day <= rul.low) verdict = { tone: 'ok', text: 'Safe window — service lands before the pessimistic RUL estimate.' }
  else if (day <= rul.days) verdict = { tone: 'warn', text: 'Inside the uncertainty band — failure before service is possible in the pessimistic case.' }
  else verdict = { tone: 'bad', text: 'Beyond the expected RUL — failure before service is likely. Bring the date forward.' }

  return (
    <div className="planner">
      <div className="planner-bar">
        <span className="band" style={{ left: pct(rul.low), width: `${((rul.high - rul.low) / max) * 100}%` }} title="RUL range" />
        <span className="exp" style={{ left: pct(rul.days) }} title="Expected RUL" />
        <span className="plan" style={{ left: pct(day) }} />
      </div>
      <input type="range" min={1} max={max} value={day} onChange={(e) => setDay(+e.target.value)} aria-label="Planned maintenance day" />
      <div className="planner-legend">
        <span><i className="lg-band" /> RUL range {rul.low}–{rul.high} d</span>
        <span><i className="lg-exp" /> expected {rul.days} d</span>
        <span><i className="lg-plan" /> your plan: day {day}</span>
      </div>
      <div className={`planner-verdict tone-${verdict.tone}`}>
        <CalendarClock size={16} /> {verdict.text}
      </div>
    </div>
  )
}
