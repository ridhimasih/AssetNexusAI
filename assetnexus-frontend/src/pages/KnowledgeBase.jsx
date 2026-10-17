import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Search, X } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { bump } from '../state/refresh'
import { toast } from '../state/toast'
import { Badge, Card, ErrorState, PageHeader, Pagination, Spinner, Stat } from '../components/ui'
import { KB_STATUS } from '../utils/meta'

const PAGE = 8
const FLOW = [
  { title: 'AI Prediction', text: 'Model generates an initial diagnosis.', to: '/analysis' },
  { title: 'Human Feedback', text: 'Engineer confirms or corrects the result.', to: '/feedback' },
  { title: 'Structured Knowledge', text: 'Feedback is stored as reusable knowledge.', to: '/knowledge' },
  { title: 'Future Decisions', text: 'Knowledge supports future AI decisions.', to: '/analysis' },
]

export default function KnowledgeBase() {
  const { data, loading, error } = useAsync(() => api.getKnowledge(), 'knowledge')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  if (loading) return <Spinner label="Loading knowledge base…" />
  if (error) return <ErrorState error={error} onRetry={bump} />

  const count = (v) => data.filter((r) => r.validation === v).length
  const sources = new Set(data.map((r) => r.assetId)).size
  const term = q.trim().toLowerCase()
  const list = [...data]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id))
    .filter((r) => filter === 'all' || r.validation === filter)
    .filter((r) => !term || `${r.id} ${r.assetName} ${r.aiDecision} ${r.expertKnowledge}`.toLowerCase().includes(term))
  const cur = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE) - 1))
  const shown = list.slice(cur * PAGE, cur * PAGE + PAGE)

  async function decide(r, validation) {
    setBusyId(r.id)
    setActionError(null)
    try {
      await api.validateKnowledge(r.id, validation)
      bump()
      toast(
        validation === 'validated'
          ? r.decision === 'corrected'
            ? `${r.id} validated — now retrievable for ${r.assetType} assets`
            : `${r.id} validated`
          : `${r.id} declined`,
        validation === 'validated' ? 'ok' : 'info',
      )
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <PageHeader title="Knowledge Base" subtitle="Structured knowledge created from human feedback." />

      <div className="stats">
        <Stat label="Knowledge Records" value={data.length} sub="Stored feedback records" />
        <Stat label="Validated" value={count('validated')} sub="Expert validated records" tone="ok" />
        <Stat label="Pending Review" value={count('pending')} sub="Awaiting expert review" tone={count('pending') ? 'warn' : undefined} />
        <Stat label="Sources" value={sources} sub="Industrial assets contributing knowledge" />
      </div>

      <Card title="Structured Feedback Records" subtitle="Human corrections and confirmations stored as reusable knowledge. Only validated records are retrieved for future analysis.">
        <div className="toolbar">
          <label className="search"><Search size={16} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search ID, asset, AI result, knowledge…" /></label>
        </div>
        <div className="tabs">
          {[['all', 'All'], ['validated', 'Validated'], ['pending', 'Pending review'], ['declined', 'Declined']].map(([k, label]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => { setFilter(k); setPage(0) }}>{label}</button>
          ))}
        </div>
        {actionError && <p className="form-error" role="alert">{actionError}</p>}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Asset</th><th>Feedback</th><th>AI Result</th><th>Expert Knowledge</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="muted">No records match.</td></tr>}
              {shown.map((r) => {
                const s = KB_STATUS[r.validation]
                return (
                  <tr key={r.id}>
                    <td>{r.id.replace('FB', 'KB')}</td>
                    <td><Link to={`/assets/${r.assetId}`}><strong>{r.assetName}</strong></Link></td>
                    <td>{r.decision === 'accepted' ? 'Confirmation' : 'Correction'}</td>
                    <td>{r.aiDecision}</td>
                    <td><strong>{r.expertKnowledge}</strong>{r.comments && <span className="cell-sub">{r.comments}</span>}</td>
                    <td><Badge tone={s.tone}>{s.label}</Badge></td>
                    <td>
                      {r.validation === 'pending' ? (
                        <div className="row-actions">
                          <button className="btn btn-primary" disabled={busyId === r.id} onClick={() => decide(r, 'validated')}><Check size={13} /> Validate</button>
                          <button className="btn" disabled={busyId === r.id} onClick={() => decide(r, 'declined')}><X size={13} /> Decline</button>
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={cur} pageSize={PAGE} total={list.length} onPage={setPage} />
      </Card>

      <Card title="How Knowledge Is Used" subtitle="Human feedback becomes structured knowledge for future asset intelligence.">
        <div className="flow">
          {FLOW.map((s, i) => (
            <span key={s.title} className="flow-wrap">
              <Link to={s.to} className="flow-step"><strong>{s.title}</strong><span>{s.text}</span></Link>
              {i < FLOW.length - 1 && <span className="flow-arrow" aria-hidden>→</span>}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}
