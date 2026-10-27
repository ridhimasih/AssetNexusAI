import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react'
import { TRUST_META, STATUS_META } from '../utils/meta'
import { useThresholds } from '../state/gate'

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function StatusBadge({ status }) {
  const m = STATUS_META[status]
  return <Badge tone={m.tone}>{m.label}</Badge>
}

export function TrustBadge({ trust }) {
  const m = TRUST_META[trust]
  const Icon = trust === 'recommend' ? ShieldCheck : trust === 'confirm' ? UserCheck : ShieldAlert
  return (
    <span className={`badge badge-${m.tone}`}>
      <Icon size={13} /> {m.label}
    </span>
  )
}

export function HealthRing({ value, size = 64 }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const tone = value >= 70 ? 'ok' : value >= 50 ? 'warn' : 'bad'
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={`ring-fg tone-${tone}`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-label">{value}</span>
    </div>
  )
}

export function UncertaintyMeter({ value }) {
  const t = useThresholds()
  return (
    <div className="umeter" aria-label={`Uncertainty ${Math.round(value * 100)}%`}>
      <div className="umeter-track">
        <span className="z z-ok" style={{ width: `${t.low * 100}%` }} />
        <span className="z z-warn" style={{ width: `${(t.medium - t.low) * 100}%` }} />
        <span className="z z-bad" style={{ width: `${(1 - t.medium) * 100}%` }} />
        <span className="umeter-marker" style={{ left: `${Math.min(value, 1) * 100}%` }} />
      </div>
      <div className="umeter-scale">
        <span>0</span>
        <span style={{ marginLeft: `${t.low * 100 - 3}%` }}>{t.low}</span>
        <span style={{ marginLeft: `${(t.medium - t.low) * 100 - 6}%` }}>{t.medium}</span>
        <span style={{ marginLeft: 'auto' }}>1</span>
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="state" role="status">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>Something went wrong: {error?.message || 'unknown error'}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

// Summary card: small label, big value, caption. Pass `to` to make it a link.
export function Stat({ label, value, sub, tone, to }) {
  const body = (
    <>
      <span className="s-label">{label}</span>
      <strong className={tone ? `v-${tone}` : ''}>{value}</strong>
      {sub && <small className="s-sub">{sub}</small>}
    </>
  )
  return to ? (
    <Link to={to} className="stat">{body}</Link>
  ) : (
    <div className="stat">{body}</div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  )
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <div className="pager">
      <span>Showing {from}–{to} of {total}</span>
      <div>
        <button className="btn" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
        <span className="pager-num">Page {page + 1} / {pages}</span>
        <button className="btn" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
      </div>
    </div>
  )
}
