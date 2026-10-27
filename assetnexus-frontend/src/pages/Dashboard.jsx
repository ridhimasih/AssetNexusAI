import { Link } from 'react-router-dom'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { bump, useUpdated } from '../state/refresh'
import { toast } from '../state/toast'
import { useGate } from '../state/gate'
import { Card, Spinner, ErrorState, StatusBadge, Stat, PageHeader } from '../components/ui'
import RiskMap from '../components/RiskMap'
import PolicyBanner from '../components/PolicyBanner'
import { TRUST_META } from '../utils/meta'

export default function Dashboard() {
  const { data: assets, loading, error } = useAsync(() => api.getAssets(), 'assets')
  const { t, gate } = useGate()
  const updated = useUpdated()
  if (loading) return <Spinner label="Loading dashboard…" />
  if (error) return <ErrorState error={error} onRetry={bump} />

  const rows = assets.map((a) => ({ ...a, trust: gate(a) }))
  const n = rows.length
  const by = (s) => rows.filter((a) => a.status === s)
  const pct = (x) => Math.round((x / n) * 100)
  const trustN = (k) => rows.filter((a) => a.trust === k).length
  const atRisk = by('warning').length + by('critical').length
  const attention = [...by('warning'), ...by('critical')].sort((a, b) => a.health - b.health).slice(0, 5)
  const dist = [['healthy', 'Healthy', 'ok'], ['warning', 'Warning', 'warn'], ['critical', 'Critical', 'bad']]

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle={`Industrial asset intelligence overview · updated ${new Date(updated).toLocaleTimeString()}`}>
        <button className="btn" onClick={() => { bump(); toast('Data refreshed', 'ok') }}><RefreshCw size={14} /> Refresh data</button>
      </PageHeader>
      <PolicyBanner />

      <div className="stats">
        <Stat label="Total Assets" value={n} sub="Registered assets" to="/assets" />
        <Stat label="Healthy" value={by('healthy').length} sub={`${pct(by('healthy').length)}% of assets`} to="/assets?status=healthy" />
        <Stat label="At Risk" value={atRisk} sub="Requires attention" tone={atRisk ? 'warn' : undefined} to="/assets?status=warning" />
        <Stat label="Human Review" value={trustN('withhold')} sub="Human review required" tone={trustN('withhold') ? 'bad' : undefined} to="/assets?trust=withhold" />
      </div>

      <div className="grid-2 even">
        <Card title="Asset Health" subtitle="Current health distribution">
          <ul className="bars dist">
            {dist.map(([s, label, tone]) => (
              <li key={s}>
                <Link to={`/assets?status=${s}`}>{label}</Link>
                <div className="bar"><span className={`tone-bg-${tone}`} style={{ width: `${pct(by(s).length)}%` }} /></div>
                <b>{pct(by(s).length)}%</b>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Attention Required" subtitle="Assets requiring review" action={<Link to="/assets" className="link">All assets <ArrowRight size={14} /></Link>}>
          {attention.length === 0 ? (
            <p className="muted">No assets need attention.</p>
          ) : (
            <ul className="attn">
              {attention.map((a) => (
                <li key={a.id}>
                  <Link to={`/assets/${a.id}`}>
                    <div>
                      <strong>{a.name}</strong>
                      <span className="cell-sub">{a.type} · {a.id}</span>
                    </div>
                    <b>{a.health}%</b>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="AI Trust & Autonomy" subtitle="Current distribution of AI decision authority" action={<Link to="/trust" className="link">Trust Center <ArrowRight size={14} /></Link>}>
        <div className="tiles">
          {['recommend', 'confirm', 'withhold'].map((k) => (
            <Link key={k} to={`/assets?trust=${k}`} className="tile">
              <span>{TRUST_META[k].label}</span>
              <strong>{trustN(k)} assets</strong>
            </Link>
          ))}
        </div>
      </Card>

      <Card title="Risk map" subtitle="Health vs. uncertainty — each dot is an asset (hover or click)">
        <RiskMap assets={rows} thresholds={t} />
      </Card>
    </div>
  )
}
