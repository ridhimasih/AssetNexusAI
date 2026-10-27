import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CircleCheck, Circle, Loader, MessageSquare, Play } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { bump } from '../state/refresh'
import { useGate } from '../state/gate'
import { Badge, Card, ErrorState, PageHeader, Spinner, Stat, TrustBadge, UncertaintyMeter } from '../components/ui'
import PolicyBanner from '../components/PolicyBanner'
import { TRUST_META, diagnosisLabel } from '../utils/meta'

const STEPS = [
  'Ingest sensor data',
  'Anomaly detection',
  'Fault diagnosis',
  'Retrieve validated engineer feedback',
  'Remaining useful life estimation',
  'Uncertainty estimation',
  'Trust gate decision',
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function AIAnalysis() {
  const { id: paramId } = useParams()
  const nav = useNavigate()
  const [picked, setPicked] = useState('AST-002')
  const id = paramId || picked
  const assets = useAsync(() => api.getAssets(), 'assets')
  const analysis = useAsync(() => api.getAnalysis(id), `an:${id}`)
  const { gate } = useGate()
  const [explain, setExplain] = useState(false)
  const [run, setRun] = useState({ status: 'idle', step: -1, result: null })
  const [view, setView] = useState('after')
  const runRef = useRef(0)

  if (assets.loading || analysis.loading) return <Spinner label="Loading AI analysis…" />
  const err = assets.error || analysis.error
  if (err) return <ErrorState error={err} onRetry={bump} />

  const asset = assets.data.find((a) => a.id === id)
  const an = analysis.data
  const trustKey = gate(an)
  const trust = TRUST_META[trustKey]
  const top = an.diagnoses[0]
  const name = an.assetName || asset?.name || id

  const change = (v) => {
    runRef.current += 1
    setRun({ status: 'idle', step: -1, result: null })
    setExplain(false)
    if (paramId) nav(`/assets/${v}/ai-analysis`)
    else setPicked(v)
  }

  async function start() {
    const my = ++runRef.current
    setRun({ status: 'running', step: 0, result: null })
    try {
      const [after, before] = await Promise.all([api.getAnalysis(id), api.getAnalysisBaseline(id)])
      for (let i = 0; i < STEPS.length; i++) {
        if (runRef.current !== my) return
        setRun((r) => ({ ...r, step: i }))
        await sleep(400)
      }
      if (runRef.current !== my) return
      setView('after')
      setRun({ status: 'done', step: STEPS.length, result: { after, before } })
    } catch (e) {
      setRun({ status: 'error', step: -1, result: null, error: e.message })
    }
  }

  const res = run.result
  const gAfter = res ? gate(res.after) : null
  const gBefore = res ? gate(res.before) : null
  const delta = res ? res.after.uncertainty - res.before.uncertainty : 0
  const shown = res ? (view === 'after' ? res.after : res.before) : null

  return (
    <div className="page">
      <Link to={`/assets/${id}`} className="back"><ArrowLeft size={15} /> Back to Asset Details</Link>
      <PageHeader title="AI Analysis" subtitle={`${name} · ${id}`}>
        <select value={id} onChange={(e) => change(e.target.value)} aria-label="Select asset" className="select">
          {assets.data.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
        </select>
      </PageHeader>
      <PolicyBanner />

      <div className="stats">
        <Stat label="Asset Health" value={`${asset?.health ?? '—'}%`} sub="Current estimated health score" />
        <Stat label="AI Confidence" value={`${an.confidence ?? '—'}%`} sub="Confidence in current prediction" />
        <Stat label="Uncertainty" value={trust.level} sub="Model uncertainty level" tone={trust.tone} />
        <Stat label="RUL Prediction" value={`${an.rul.days} days`} sub="Estimated remaining useful life" />
      </div>

      <Card title="Anomaly Detection" subtitle="Detection result from the asset monitoring model.">
        <div className="tiles two">
          <div className="tile"><span>Current Result</span><strong>{an.anomalyResult ?? (an.anomalyDetected ? 'Anomaly detected' : 'No anomaly detected')}</strong></div>
          <div className="tile"><span>Anomaly Score</span><strong>{Math.round(an.anomalyScore * 100)}%</strong></div>
        </div>
      </Card>

      <Card title="Fault Diagnosis" subtitle="AI-generated interpretation of possible asset faults.">
        <div className="diag-box">
          <h4>{diagnosisLabel(top.fault)}</h4>
          <p>{an.diagnosisNote || 'The diagnosis is generated from current sensor patterns and historical asset behavior.'}</p>
        </div>
      </Card>

      <Card title="Remaining Useful Life" subtitle="Predicted time before maintenance may be required.">
        <div className="big-rul">
          <strong>{an.rul.days} days</strong>
          <span className="muted">Estimated remaining useful life</span>
          <span className="muted small" style={{ marginLeft: 'auto' }}>Range {an.rul.low}–{an.rul.high} days</span>
        </div>
      </Card>

      <Card title="AI Recommendation" subtitle="Recommended action based on current analysis.">
        <div className="reco-box">
          <div>
            <strong>{trustKey === 'withhold' ? 'Automated recommendation withheld' : an.recommendation}</strong>
            <div style={{ marginTop: 6 }}>
              <TrustBadge trust={trustKey} /> <span className="muted small">{trust.autonomy}</span>
            </div>
          </div>
          <button className="link-btn" onClick={() => setExplain((x) => !x)} aria-expanded={explain}>{explain ? 'Hide Explanation' : 'View Explanation'}</button>
        </div>

        {explain && (
          <div className="expl">
            <h4>Why this recommendation</h4>
            <ul className="evidence">{an.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
            <h4>Diagnosis probabilities</h4>
            <ul className="bars diag">
              {an.diagnoses.map((d) => (
                <li key={d.fault}>
                  <span>{diagnosisLabel(d.fault)}</span>
                  <div className="bar"><span className="tone-bg-accent" style={{ width: `${d.probability * 100}%` }} /></div>
                  <b>{Math.round(d.probability * 100)}%</b>
                </li>
              ))}
            </ul>
            <h4>Uncertainty ({an.uncertainty.toFixed(2)})</h4>
            <UncertaintyMeter value={an.uncertainty} />
            <h4>Retrieved engineer knowledge</h4>
            {an.retrievedKnowledge?.length ? (
              <ul className="evidence">
                {an.retrievedKnowledge.map((k) => <li key={k.id}>{k.id} · {k.assetName}: <b>{k.expertKnowledge}</b> ({k.engineer})</li>)}
              </ul>
            ) : <p className="muted small">No validated feedback matches this case.</p>}
          </div>
        )}

        <div className="reco-actions">
          <Link className="btn" to={`/feedback?asset=${id}`}><MessageSquare size={14} /> Give feedback on this analysis</Link>
        </div>
      </Card>

      <Card
        title="Analysis pipeline"
        subtitle="Replay the pipeline and compare the result with and without validated engineer feedback."
        action={<button className="btn btn-primary" onClick={start} disabled={run.status === 'running'}><Play size={14} /> {run.status === 'running' ? 'Running…' : run.status === 'done' ? 'Run again' : 'Run analysis'}</button>}
      >
        {run.status === 'idle' && <p className="muted small" style={{ margin: 0 }}>Stages are replayed for transparency; the results come from the analysis endpoint (or demo data).</p>}
        {run.status === 'error' && <p className="form-error">{run.error}</p>}
        {run.status !== 'idle' && run.status !== 'error' && (
          <ol className="pipeline">
            {STEPS.map((s, i) => {
              const state = run.step > i ? 'done' : run.step === i ? 'active' : 'todo'
              return (
                <li key={s} className={`pl-${state}`}>
                  {state === 'done' ? <CircleCheck size={17} /> : state === 'active' ? <Loader size={17} className="spin" /> : <Circle size={17} />}
                  <span>{s}</span>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      {res && (
        <Card
          title="Effect of engineer feedback"
          subtitle="Baseline model vs. model with validated feedback applied."
          action={
            <div className="tabs" style={{ margin: 0 }}>
              <button className={view === 'before' ? 'active' : ''} onClick={() => setView('before')}>Baseline</button>
              <button className={view === 'after' ? 'active' : ''} onClick={() => setView('after')}>With feedback</button>
            </div>
          }
        >
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th /><th>Baseline</th><th>With feedback</th></tr></thead>
              <tbody>
                <tr><th>Uncertainty</th><td>{res.before.uncertainty.toFixed(2)}</td><td className={delta < 0 ? 'best' : ''}>{res.after.uncertainty.toFixed(2)} <Badge tone={delta < 0 ? 'ok' : 'neutral'}>{delta >= 0 ? '+' : ''}{delta.toFixed(2)}</Badge></td></tr>
                <tr><th>Trust</th><td>{TRUST_META[gBefore].label}</td><td>{TRUST_META[gAfter].label}</td></tr>
                <tr><th>Recommendation</th><td>{res.before.recommendation}</td><td>{res.after.recommendation}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="muted small">Viewing: <b>{view === 'after' ? 'with feedback' : 'baseline'}</b> · uncertainty {shown.uncertainty.toFixed(2)} · {TRUST_META[view === 'after' ? gAfter : gBefore].autonomy}.</p>
          {delta === 0 && (
            <p className="muted small">No feedback validated in this session affects this asset. Submit a correction in <Link className="link" to="/feedback">Human Feedback</Link>, validate it in the <Link className="link" to="/knowledge">Knowledge Base</Link>, then run again <ArrowRight size={12} style={{ verticalAlign: '-2px' }} /></p>
          )}
          <p className="muted small">Demo effect: each newly validated matching correction lowers uncertainty by a fixed amount. A real improvement claim needs the evaluation in the research methodology.</p>
        </Card>
      )}
    </div>
  )
}
