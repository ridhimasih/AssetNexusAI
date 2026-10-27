import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Lightbulb, BookOpen, ShieldAlert, Radio, Brain, MessageSquare } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { bump } from '../state/refresh'
import { useGate } from '../state/gate'
import { Card, Spinner, ErrorState, StatusBadge, HealthRing, UncertaintyMeter, Badge, Stat } from '../components/ui'
import SensorChart from '../components/SensorChart'
import MaintenancePlanner from '../components/MaintenancePlanner'
import PolicyBanner from '../components/PolicyBanner'
import { TRUST_META, fmtDate } from '../utils/meta'

export default function AssetDetail() {
  const { id } = useParams()
  const [sensorKey, setSensorKey] = useState(null)
  const [live, setLive] = useState(false)
  const { gate } = useGate()
  const asset = useAsync(() => api.getAsset(id), `a:${id}`)
  const analysis = useAsync(() => api.getAnalysis(id), `an:${id}`)

  if (asset.loading || analysis.loading) return <Spinner label="Loading asset…" />
  const err = asset.error || analysis.error
  if (err) return (
    <div className="page">
      <Link to="/assets" className="back"><ArrowLeft size={15} /> Back to Assets</Link>
      <ErrorState error={err} onRetry={bump} />
    </div>
  )

  const a = asset.data
  const an = { ...analysis.data, trust: gate(analysis.data) }
  const trust = TRUST_META[an.trust]
  const sensors = an.sensors?.length ? an.sensors : a.sensors || []
  const activeSensor = sensors.find((s) => s.key === sensorKey) || sensors[0]
  const withheld = an.trust === 'withhold'

  return (
    <div className="page">
      <Link to="/assets" className="back"><ArrowLeft size={15} /> Back to Assets</Link>

      <div className="detail-head">
        <HealthRing value={a.health} size={76} />
        <div>
          <h1>{a.name}</h1>
          <p className="muted">{a.type} · {a.id} · {a.location}</p>
        </div>
        <StatusBadge status={a.status} />
        <Link to={`/assets/${a.id}/ai-analysis`} className="btn btn-primary"><Brain size={15} /> AI Analysis</Link>
        <Link to={`/feedback?asset=${a.id}`} className="btn"><MessageSquare size={15} /> Give Feedback</Link>
      </div>

      <PolicyBanner />

      <div className="stats">
        <Stat label="Asset Health" value={`${a.health}%`} sub="Current estimated health score" />
        <Stat label="AI Confidence" value={`${an.confidence ?? '—'}%`} sub="Confidence in current prediction" />
        <Stat label="Uncertainty" value={trust.level} sub={`Model uncertainty level · ${an.uncertainty.toFixed(2)}`} tone={trust.tone} />
        <Stat label="RUL Prediction" value={`${an.rul.days} days`} sub={`Range ${an.rul.low}–${an.rul.high} days`} />
      </div>

      <div className={`trust-banner tone-${trust.tone}`}>
        <ShieldAlert size={22} />
        <div>
          <strong>{trust.label} — {trust.autonomy}</strong>
          <p>{trust.rule}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <Card
            title="Sensor trends"
            action={
              <button className={`btn ${live ? 'btn-live' : ''}`} onClick={() => setLive((l) => !l)} aria-pressed={live}>
                <Radio size={14} /> {live ? 'Stop live simulation' : 'Live simulation'}
              </button>
            }
          >
            <div className="tabs">
              {sensors.map((s) => (
                <button key={s.key} className={s.key === activeSensor?.key ? 'active' : ''} onClick={() => setSensorKey(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
            {activeSensor && (
              <SensorChart key={`${activeSensor.key}-${live}`} sensor={activeSensor} live={live} drift={a.status === 'healthy' ? 0 : a.status === 'warning' ? 0.1 : 0.25} />
            )}
          </Card>

          <Card title="Fault diagnosis">
            <ul className="bars diag">
              {an.diagnoses.map((d, i) => (
                <li key={d.fault}>
                  <span>{d.fault}{i === 0 && <Badge tone="neutral">most likely</Badge>}</span>
                  <div className="bar"><span className="tone-bg-accent" style={{ width: `${d.probability * 100}%` }} /></div>
                  <b>{Math.round(d.probability * 100)}%</b>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Maintenance planner" subtitle="Drag to choose a service day and compare it with the RUL uncertainty band.">
            <MaintenancePlanner rul={an.rul} />
          </Card>
        </div>

        <div className="stack">
          <Card title="Uncertainty & trust gate">
            <UncertaintyMeter value={an.uncertainty} />
            <p className="muted small">Thresholds are placeholders pending validation (change them in the Trust Center). Uncertainty alone does not guarantee correctness.</p>
          </Card>

          <Card title="Maintenance recommendation" action={<Link className="link" to={`/assets/${a.id}/ai-analysis`}>Full analysis</Link>}>
            {withheld ? (
              <div className="withheld">
                <ShieldAlert size={18} />
                <p>Automated recommendation withheld due to high uncertainty. Human review required — record your assessment in Human Feedback.</p>
              </div>
            ) : (
              <>
                {an.trust === 'confirm' && <Badge tone="warn">Pending engineer approval</Badge>}
                <p className="reco"><Lightbulb size={16} /> {an.recommendation}</p>
              </>
            )}
            <h4>Supporting evidence</h4>
            <ul className="evidence">
              {an.evidence.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </Card>

          <Card title="Retrieved engineer knowledge" action={<Link className="link" to="/knowledge">Knowledge Base</Link>}>
            {an.retrievedKnowledge?.length ? (
              <ul className="knowledge-mini">
                {an.retrievedKnowledge.map((k) => (
                  <li key={k.id}>
                    <BookOpen size={15} />
                    <div>
                      <strong>{k.aiDecision} → {k.correctedFault}</strong>
                      <p>{k.comments}</p>
                      <small>{k.engineer} · {fmtDate(k.date)} · from {k.assetName}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No validated feedback matches this case.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
