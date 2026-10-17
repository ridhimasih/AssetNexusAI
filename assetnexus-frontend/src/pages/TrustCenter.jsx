import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { bump } from '../state/refresh'
import { DEFAULT_THRESHOLDS, gateFromU, resetThresholds, setThresholds, useGate } from '../state/gate'
import { Card, ErrorState, PageHeader, Pagination, Spinner, Stat, TrustBadge } from '../components/ui'
import { TRUST_META } from '../utils/meta'

const PAGE = 8
const PRESETS = [
  ['Conservative', 0.15, 0.4],
  ['Default', 0.25, 0.55],
  ['Permissive', 0.35, 0.7],
]

function TrustLine({ assets, t }) {
  const [hover, setHover] = useState(null)
  const W = 700
  const H = 150
  const x = (u) => 16 + u * (W - 32)
  const sorted = [...assets].sort((a, b) => a.uncertainty - b.uncertainty)
  const h = assets.find((a) => a.id === hover)
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Assets placed on the uncertainty axis">
        <rect x={x(0)} y={20} width={x(t.low) - x(0)} height={90} className="zone zone-ok" />
        <rect x={x(t.low)} y={20} width={x(t.medium) - x(t.low)} height={90} className="zone zone-warn" />
        <rect x={x(t.medium)} y={20} width={x(1) - x(t.medium)} height={90} className="zone zone-bad" />
        <text x={(x(0) + x(t.low)) / 2} y={14} textAnchor="middle" className="axis">high trust</text>
        <text x={(x(t.low) + x(t.medium)) / 2} y={14} textAnchor="middle" className="axis">medium trust</text>
        <text x={(x(t.medium) + x(1)) / 2} y={14} textAnchor="middle" className="axis">low trust</text>
        {[0, 0.25, 0.5, 0.75, 1].map((u) => <text key={u} x={x(u)} y={134} textAnchor="middle" className="axis">{u}</text>)}
        {sorted.map((a, i) => (
          <circle
            key={a.id}
            cx={x(a.uncertainty)}
            cy={36 + (i % 4) * 20}
            r={hover === a.id ? 9 : 7}
            className={`pt pt-${a.status}`}
            onMouseEnter={() => setHover(a.id)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <div className="chart-readout">
        {h ? <><strong>{h.name}</strong> · uncertainty {h.uncertainty.toFixed(2)} · {TRUST_META[gateFromU(h.uncertainty, t)].label}</> : 'Drag the sliders and watch assets cross between zones. Dot colour = health status.'}
      </div>
    </div>
  )
}

export default function TrustCenter() {
  const { data: assets, loading, error } = useAsync(() => api.getAssets(), 'assets')
  const { t, gate } = useGate()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)

  if (loading) return <Spinner label="Loading trust status…" />
  if (error) return <ErrorState error={error} onRetry={bump} />

  const rows = assets.map((a) => ({ ...a, trust: gate(a) }))
  const count = (k) => rows.filter((a) => a.trust === k).length
  const list = rows.filter((a) => filter === 'all' || a.trust === filter).sort((a, b) => b.uncertainty - a.uncertainty)
  const cur = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE) - 1))
  const shown = list.slice(cur * PAGE, cur * PAGE + PAGE)
  const keys = ['recommend', 'confirm', 'withhold']

  const changed = assets.filter((a) => gateFromU(a.uncertainty, DEFAULT_THRESHOLDS) !== gateFromU(a.uncertainty, t))
  const unsafe = rows.filter((a) => a.trust === 'recommend' && a.status === 'critical')
  const autonomy = Math.round((count('recommend') / rows.length) * 100)

  return (
    <div className="page">
      <PageHeader title="Trust Center" subtitle="Monitor AI confidence, uncertainty and decision authority." />

      <div className="stats">
        {keys.map((k) => (
          <Stat key={k} label={TRUST_META[k].label} value={count(k)} sub={TRUST_META[k].autonomy} tone={TRUST_META[k].tone} to={`/assets?trust=${k}`} />
        ))}
      </div>

      <Card title="Trust & Autonomy Rules" subtitle="AI decision authority is determined by confidence and uncertainty.">
        <div className="rule-cards">
          {keys.map((k) => (
            <div key={k} className="rule-card">
              <h4>{TRUST_META[k].label}</h4>
              <span className={`v-${TRUST_META[k].tone}`}>{TRUST_META[k].ruleSub}</span>
              <p>{TRUST_META[k].rule}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Asset Trust Status" subtitle="Current trust level assigned to monitored assets.">
        <div className="tabs">
          {[['all', 'All'], ['recommend', 'High Trust'], ['confirm', 'Medium Trust'], ['withhold', 'Low Trust']].map(([k, label]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => { setFilter(k); setPage(0) }}>{label}</button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Asset</th><th>Confidence</th><th>Uncertainty</th><th>Trust</th><th>Autonomy</th></tr></thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id}>
                  <td><Link to={`/assets/${a.id}`}><strong>{a.name}</strong></Link><span className="cell-sub">{a.id}</span></td>
                  <td><strong>{a.confidence}%</strong></td>
                  <td>{TRUST_META[a.trust].level} <span className="cell-sub inline">({a.uncertainty.toFixed(2)})</span></td>
                  <td><TrustBadge trust={a.trust} /></td>
                  <td>{TRUST_META[a.trust].autonomy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={cur} pageSize={PAGE} total={list.length} onPage={setPage} />
      </Card>

      <Card
        title="Policy simulator"
        subtitle="What-if analysis: change the thresholds and the whole app re-gates assets in your browser. Nothing is sent to the backend."
        action={<button className="btn" onClick={resetThresholds}><RotateCcw size={14} /> Reset</button>}
      >
        <div className="grid-2 even">
          <div>
            <div className="presets">
              {PRESETS.map(([name, lo, mid]) => (
                <button key={name} className={`btn ${t.low === lo && t.medium === mid ? 'btn-primary' : ''}`} onClick={() => setThresholds({ low: lo, medium: mid })}>{name}</button>
              ))}
            </div>
            <label className="slider">
              <span>High Trust if uncertainty &lt; <b>{t.low}</b></span>
              <input type="range" min={0.05} max={0.85} step={0.01} value={t.low} onChange={(e) => setThresholds({ low: +e.target.value })} />
            </label>
            <label className="slider">
              <span>Medium Trust if uncertainty &lt; <b>{t.medium}</b>, otherwise Low Trust</span>
              <input type="range" min={0.1} max={0.95} step={0.01} value={t.medium} onChange={(e) => setThresholds({ medium: +e.target.value })} />
            </label>
          </div>
          <div>
            <ul className="impact">
              {keys.map((k) => {
                const now = rows.filter((a) => gateFromU(a.uncertainty, t) === k).length
                const base = assets.filter((a) => gateFromU(a.uncertainty, DEFAULT_THRESHOLDS) === k).length
                return (
                  <li key={k}>
                    <i className={`tone-bg-${TRUST_META[k].tone}`} />
                    <span>{TRUST_META[k].label}</span>
                    <b>{now}</b>
                    <small className={now > base ? 'up' : now < base ? 'down' : ''}>{now === base ? 'no change' : `${now > base ? '+' : ''}${now - base} vs default`}</small>
                  </li>
                )
              })}
            </ul>
            <p className="muted small">{changed.length} asset{changed.length === 1 ? '' : 's'} change decision vs. the default policy · autonomy rate {autonomy}%.</p>
            {unsafe.length > 0 && <p className="form-error" role="alert">Safety warning: {unsafe.map((u) => u.name).join(', ')} {unsafe.length > 1 ? 'are' : 'is'} critical yet High Trust under this policy.</p>}
          </div>
        </div>
        <TrustLine assets={assets} t={t} />
        <p className="muted small">Thresholds are placeholders — final values should come from validating uncertainty against prediction error.</p>
      </Card>
    </div>
  )
}
