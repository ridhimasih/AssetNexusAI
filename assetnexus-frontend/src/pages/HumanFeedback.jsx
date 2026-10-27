import { getUser } from '../state/auth'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleCheck, Send } from 'lucide-react'
import { api } from '../api/client'
import { FAULT_TYPES } from '../data/mockData'
import { useAsync } from '../hooks/useAsync'
import { bump } from '../state/refresh'
import { toast } from '../state/toast'
import { useGate } from '../state/gate'
import { Card, ErrorState, PageHeader, Spinner } from '../components/ui'
import PolicyBanner from '../components/PolicyBanner'
import { TRUST_META, diagnosisLabel } from '../utils/meta'

const OPTIONS = [
  { key: 'accepted', title: 'Accept AI Decision', text: 'The diagnosis is correct.', tone: 'ok' },
  { key: 'rejected', title: 'Reject AI Decision', text: 'The diagnosis is incorrect.', tone: 'bad' },
  { key: 'corrected', title: 'Provide Correction', text: 'The AI result needs expert correction.', tone: 'warn' },
]

export default function HumanFeedback() {
  const [params] = useSearchParams()
  const [assetId, setAssetId] = useState(params.get('asset') || 'AST-002')
  const assets = useAsync(() => api.getAssets(), 'assets')
  const analysis = useAsync(() => api.getAnalysis(assetId), `an:${assetId}`)
  const { gate } = useGate()
  const [decision, setDecision] = useState(null)
  const [fault, setFault] = useState(() => getUser()?.name ?? '')
  const [comments, setComments] = useState('')
  const [engineer, setEngineer] = useState(() => getUser()?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  if (assets.loading || analysis.loading) return <Spinner label="Loading current AI decision…" />
  const err = assets.error || analysis.error
  if (err) return <ErrorState error={err} onRetry={bump} />

  const an = analysis.data
  const asset = assets.data.find((a) => a.id === assetId)
  const top = an.diagnoses[0].fault
  const trust = TRUST_META[gate(an)]
  const alt = FAULT_TYPES.find((f) => f !== top)
  const correctedFault = fault || alt

  const reset = () => {
    setDecision(null)
    setFault('')
    setComments('')
    setError(null)
  }
  const changeAsset = (v) => {
    setAssetId(v)
    setDone(null)
    reset()
  }

  async function submit(e) {
    e.preventDefault()
    if (!decision) return setError('Choose Accept, Reject or Provide Correction.')
    if (comments.trim().length < 10) return setError('Please add engineer comments (at least 10 characters).')
    setBusy(true)
    setError(null)
    try {
      const rec = await api.submitFeedback(assetId, {
        decision,
        correctedFault: decision === 'corrected' ? correctedFault : null,
        comments: comments.trim(),
        engineer: engineer.trim() || 'Engineer',
        aiDecision: diagnosisLabel(top),
        aiConfidence: an.confidence,
        uncertaintyAtReview: an.uncertainty,
      })
      setDone(rec)
      reset()
      bump()
      toast('Feedback submitted', 'ok')
    } catch (e2) {
      setError(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader title="Human Feedback" subtitle="Review AI decisions and provide expert feedback." />
      <PolicyBanner />

      <Card
        title="Current AI Decision"
        subtitle={`${asset?.name || an.assetName} · ${assetId}`}
        action={
          <select className="select" value={assetId} onChange={(e) => changeAsset(e.target.value)} aria-label="Select asset">
            {assets.data.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
          </select>
        }
      >
        <div className="tiles">
          <div className="tile"><span>AI Diagnosis</span><strong>{diagnosisLabel(top)}</strong></div>
          <div className="tile"><span>AI Confidence</span><strong>{an.confidence}%</strong></div>
          <div className="tile"><span>Trust Level</span><strong>{trust.label}</strong></div>
        </div>
      </Card>

      {done && (
        <div className="success-box" role="status">
          <CircleCheck size={22} />
          <div>
            <strong>Feedback {done.id} recorded.</strong>
            <p>It is awaiting validation in the <Link className="link" to="/knowledge">Knowledge Base</Link> before it can influence future analysis. You can follow it in <Link className="link" to="/history">Feedback History</Link>.</p>
          </div>
        </div>
      )}

      <form onSubmit={submit}>
        <Card title="Engineer Review" subtitle="Confirm whether the AI decision is correct.">
          <div className="opt-grid">
            {OPTIONS.map((o) => (
              <button key={o.key} type="button" className={`opt ${decision === o.key ? `sel sel-${o.tone}` : ''}`} onClick={() => { setDecision(o.key); setError(null) }} aria-pressed={decision === o.key}>
                <strong>{o.title}</strong>
                <span>{o.text}</span>
              </button>
            ))}
          </div>

          {decision === 'corrected' && (
            <label className="field narrow">
              Corrected fault
              <select value={correctedFault} onChange={(e) => setFault(e.target.value)}>
                {FAULT_TYPES.map((f) => <option key={f} value={f}>{f === 'No fault' ? 'Normal operating condition' : f}</option>)}
              </select>
            </label>
          )}
          {decision === 'rejected' && <p className="muted small">Rejecting without a correction records that the AI diagnosis was wrong; it will not be reused as a corrected diagnosis.</p>}

          <label className="field">
            Engineer Comments
            <textarea rows={4} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Explain why you accepted, rejected, or corrected the AI decision..." />
          </label>
          <label className="field narrow">
            Reviewed by <span className="opt-label">optional</span>
            <input value={engineer} onChange={(e) => setEngineer(e.target.value)} placeholder="e.g. R. Verma" />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div>
            <button className="btn btn-primary" disabled={busy}><Send size={15} /> {busy ? 'Submitting…' : 'Submit Feedback'}</button>
          </div>
        </Card>
      </form>
    </div>
  )
}
