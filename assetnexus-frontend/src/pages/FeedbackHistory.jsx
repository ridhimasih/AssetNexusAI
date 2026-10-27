import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { bump } from '../state/refresh'
import { toast } from '../state/toast'
import { Badge, Card, ErrorState, PageHeader, Pagination, Spinner, Stat } from '../components/ui'
import { FEEDBACK_STATUS, HUMAN_DECISION, fmtDate, statusOf } from '../utils/meta'

const PAGE = 8

function toCsv(rows) {
  const head = ['ID', 'Asset', 'Date', 'AI Decision', 'Human Decision', 'Confidence', 'Status', 'Comments', 'Engineer']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const body = rows.map((r) => [r.id, r.assetName, fmtDate(r.date), r.aiDecision, HUMAN_DECISION[r.decision], `${r.aiConfidence}%`, FEEDBACK_STATUS[statusOf(r)].label, r.comments, r.engineer].map(esc).join(','))
  return [head.join(','), ...body].join('\n')
}

const FLOW = [
  { title: 'AI Decision', text: 'Initial prediction is generated.', to: '/analysis' },
  { title: 'Human Review', text: 'Engineer validates or corrects it.', to: '/feedback' },
  { title: 'Knowledge Update', text: 'Validated feedback becomes structured knowledge.', to: '/knowledge' },
  { title: 'Future Intelligence', text: 'Knowledge supports later decisions.', to: '/analysis' },
]

export default function FeedbackHistory() {
  const { data, loading, error } = useAsync(() => api.getFeedback(), 'feedback')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  if (loading) return <Spinner label="Loading feedback history…" />
  if (error) return <ErrorState error={error} onRetry={bump} />

  const n = (s) => data.filter((r) => statusOf(r) === s).length
  const negative = n('rejected') + n('declined')
  const term = q.trim().toLowerCase()
  const list = [...data]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id))
    .filter((r) => filter === 'all' || statusOf(r) === filter)
    .filter((r) => !term || `${r.id} ${r.assetName} ${r.aiDecision} ${r.engineer} ${r.comments}`.toLowerCase().includes(term))
  const cur = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE) - 1))
  const shown = list.slice(cur * PAGE, cur * PAGE + PAGE)

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(list)], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'feedback-history.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${list.length} records`, 'ok')
  }

  return (
    <div className="page">
      <PageHeader title="Feedback History" subtitle="Review previous AI decisions and human responses.">
        <button className="btn" onClick={exportCsv} disabled={!list.length}><Download size={14} /> Export CSV</button>
      </PageHeader>

      <div className="stats">
        <Stat label="Total Feedback" value={data.length} sub="Recorded decisions" />
        <Stat label="Accepted" value={n('accepted')} sub="AI decisions confirmed" tone="ok" />
        <Stat label="Corrected" value={n('corrected')} sub="AI decisions corrected" tone="warn" />
        <Stat label="Pending" value={n('pending')} sub="Awaiting review" />
        {negative > 0 && <Stat label="Rejected" value={negative} sub="Rejected or declined" tone="bad" />}
      </div>

      <Card title="Review History" subtitle="Historical record of AI predictions and engineer decisions.">
        <div className="toolbar">
          <label className="search"><Search size={16} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search ID, asset, decision, engineer…" /></label>
        </div>
        <div className="tabs">
          {[['all', 'All'], ['accepted', 'Accepted'], ['corrected', 'Corrected'], ['pending', 'Pending']].map(([k, label]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => { setFilter(k); setPage(0) }}>{label}</button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Asset</th><th>Date</th><th>AI Decision</th><th>Human Decision</th><th>Confidence</th><th>Status</th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="muted">No records match.</td></tr>}
              {shown.map((r) => {
                const s = FEEDBACK_STATUS[statusOf(r)]
                return (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td><Link to={`/assets/${r.assetId}`}><strong>{r.assetName}</strong></Link></td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.aiDecision}</td>
                    <td>{HUMAN_DECISION[r.decision]}</td>
                    <td><strong>{r.aiConfidence}%</strong></td>
                    <td><Badge tone={s.tone}>{s.label}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={cur} pageSize={PAGE} total={list.length} onPage={setPage} />
      </Card>

      <Card title="Feedback Impact" subtitle="Human feedback helps improve future asset intelligence decisions.">
        <FlowRow steps={FLOW} />
      </Card>
    </div>
  )
}

function FlowRow({ steps }) {
  return (
    <div className="flow">
      {steps.map((s, i) => (
        <span key={s.title} className="flow-wrap">
          <Link to={s.to} className="flow-step">
            <strong>{s.title}</strong>
            <span>{s.text}</span>
          </Link>
          {i < steps.length - 1 && <span className="flow-arrow" aria-hidden>→</span>}
        </span>
      ))}
    </div>
  )
}
