import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, ArrowUp, ArrowDown } from 'lucide-react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { bump } from '../state/refresh'
import { useGate } from '../state/gate'
import { Card, Spinner, ErrorState, StatusBadge, PageHeader, Pagination } from '../components/ui'
import AddAssetModal from '../components/AddAssetModal'
import PolicyBanner from '../components/PolicyBanner'

const PAGE = 8
const ORDER = { critical: 0, warning: 1, healthy: 2 }
const SORTERS = {
  id: (a, b) => a.id.localeCompare(b.id),
  name: (a, b) => a.name.localeCompare(b.name),
  health: (a, b) => a.health - b.health,
  status: (a, b) => ORDER[a.status] - ORDER[b.status],
}

export default function Assets() {
  const [params] = useSearchParams()
  const { data: assets, loading, error } = useAsync(() => api.getAssets(), 'assets')
  const { gate } = useGate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(params.get('status') || 'all')
  const [trust, setTrust] = useState(params.get('trust') || 'all')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState({ key: 'id', dir: 1 })
  const [page, setPage] = useState(0)
  const [adding, setAdding] = useState(false)

  if (loading) return <Spinner label="Loading assets…" />
  if (error) return <ErrorState error={error} onRetry={bump} />

  const rows = assets.map((a) => ({ ...a, trust: gate(a) }))
  const count = (s) => rows.filter((a) => a.status === s).length
  const types = [...new Set(rows.map((a) => a.type))].sort()
  const term = q.trim().toLowerCase()
  const list = rows
    .filter((a) => (status === 'all' || a.status === status) && (type === 'all' || a.type === type))
    .filter((a) => trust === 'all' || a.trust === trust)
    .filter((a) => !term || `${a.name} ${a.id} ${a.type} ${a.location}`.toLowerCase().includes(term))
    .sort((a, b) => SORTERS[sort.key](a, b) * sort.dir)
  const cur = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE) - 1))
  const shown = list.slice(cur * PAGE, cur * PAGE + PAGE)

  const th = (key, label) => (
    <th>
      <button className="th-sort" onClick={() => { setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 })); setPage(0) }}>
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  )
  const filt = (setter) => (e) => { setter(e.target.value); setPage(0) }
  const toggleStatus = (s) => { setStatus((cur2) => (cur2 === s ? 'all' : s)); setPage(0) }

  return (
    <div className="page">
      <PageHeader title="Assets" subtitle="Monitor industrial assets and their current health status.">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={15} /> Add Asset</button>
      </PageHeader>
      <PolicyBanner />

      <div className="stats">
        <button className="stat stat-btn" onClick={() => toggleStatus('all')}><span className="s-label">Total Assets</span><strong>{rows.length}</strong></button>
        <button className={`stat stat-btn ${status === 'healthy' ? 'on' : ''}`} onClick={() => toggleStatus('healthy')}><span className="s-label">Healthy</span><strong className="v-ok">{count('healthy')}</strong></button>
        <button className={`stat stat-btn ${status === 'warning' ? 'on' : ''}`} onClick={() => toggleStatus('warning')}><span className="s-label">Warning</span><strong className="v-warn">{count('warning')}</strong></button>
        <button className={`stat stat-btn ${status === 'critical' ? 'on' : ''}`} onClick={() => toggleStatus('critical')}><span className="s-label">Critical</span><strong className="v-bad">{count('critical')}</strong></button>
      </div>

      <Card title="Registered Assets" subtitle="Industrial equipment currently monitored by AssetNexus AI.">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input value={q} onChange={filt(setQ)} placeholder="Search name, ID, type, location…" />
          </label>
          <select value={type} onChange={filt(setType)} aria-label="Filter by type">
            <option value="all">All types</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={trust} onChange={filt(setTrust)} aria-label="Filter by trust">
            <option value="all">All trust levels</option>
            <option value="recommend">High Trust</option>
            <option value="confirm">Medium Trust</option>
            <option value="withhold">Low Trust</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>{th('name', 'Asset')}<th>Type</th><th>Location</th>{th('health', 'Health')}{th('status', 'Status')}<th>Action</th></tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={6} className="muted">No assets match your filters.</td></tr>}
              {shown.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.name}</strong><span className="cell-sub">{a.id}</span></td>
                  <td>{a.type}</td>
                  <td>{a.location}</td>
                  <td><strong>{a.health}%</strong></td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><Link className="btn" to={`/assets/${a.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={cur} pageSize={PAGE} total={list.length} onPage={setPage} />
      </Card>
      {adding && <AddAssetModal onClose={() => setAdding(false)} />}
    </div>
  )
}
