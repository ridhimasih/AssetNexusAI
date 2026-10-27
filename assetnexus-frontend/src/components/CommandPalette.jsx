import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

const PAGES = [
  { label: 'Dashboard', hint: 'Page', to: '/' },
  { label: 'Assets', hint: 'Page', to: '/assets' },
  { label: 'AI Analysis', hint: 'Page', to: '/analysis' },
  { label: 'Trust Center', hint: 'Page', to: '/trust' },
  { label: 'Human Feedback', hint: 'Page', to: '/feedback' },
  { label: 'Feedback History', hint: 'Page', to: '/history' },
  { label: 'Knowledge Base', hint: 'Page', to: '/knowledge' },
]

export default function CommandPalette({ assets, onClose }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  const items = [
    ...PAGES,
    ...(assets || []).map((a) => ({ label: a.name, hint: `${a.type} · ${a.location}`, to: `/assets/${a.id}` })),
  ]
  const term = q.trim().toLowerCase()
  const results = items.filter((i) => !term || `${i.label} ${i.hint}`.toLowerCase().includes(term)).slice(0, 9)
  const sel = Math.min(idx, results.length - 1)

  const go = (item) => {
    if (!item) return 
    nav(item.to)
    onClose()
  }
  const onKey = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx(Math.min(sel + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx(Math.max(sel - 1, 0))
    } else if (e.key === 'Enter') go(results[sel])
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="palette" role="dialog" aria-label="Quick search" onClick={(e) => e.stopPropagation()}>
        <label className="palette-input">
          <Search size={17} />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setIdx(0)
            }}
            onKeyDown={onKey}
            placeholder="Jump to a page or asset…"
          />
          <kbd>Esc</kbd>
        </label>
        <ul>
          {results.length === 0 && <li className="palette-empty">No matches</li>}
          {results.map((r, i) => (
            <li key={r.to} className={i === sel ? 'sel' : ''} onMouseEnter={() => setIdx(i)} onClick={() => go(r)}>
              <span>{r.label}</span>
              <small>{r.hint}</small>
            </li>
          ))}
        </ul>
        <footer>↑↓ navigate · Enter open</footer>
      </div>
    </div>
  )
}
