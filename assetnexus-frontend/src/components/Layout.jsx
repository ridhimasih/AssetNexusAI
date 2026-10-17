import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, Brain, ShieldCheck, MessageSquare, History, Database,
  Menu, X, Bell, Sun, Moon, Search, RefreshCw, LogOut,
} from 'lucide-react'
import { api } from '../api/client'
import { useAsync, useDataMode } from '../hooks/useAsync'
import { bump, useUpdated } from '../state/refresh'
import { toggleTheme, useTheme } from '../state/theme'
import { toast } from '../state/toast'
import { logout, useUser } from '../state/auth'
import { useSpotlight } from '../hooks/useSpotlight'
import InteractiveBackground from './InteractiveBackground'
import ToastHost from './ToastHost'
import CommandPalette from './CommandPalette'

const isAI = (p) => p === '/analysis' || p.endsWith('/ai-analysis')

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [bell, setBell] = useState(false)
  const { pathname } = useLocation()
  const user = useUser()
  const nav = useNavigate()
  useSpotlight()
  const mode = useDataMode()
  const theme = useTheme()
  const updated = useUpdated()
  const assets = useAsync(() => api.getAssets(), 'assets').data
  const feedback = useAsync(() => api.getFeedback(), 'feedback').data

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pending = feedback ? feedback.filter((k) => k.validation === 'pending').length : 0
  const critical = assets ? assets.filter((a) => a.status === 'critical') : []

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, active: pathname === '/' },
    { to: '/assets', label: 'Assets', icon: Server, active: pathname.startsWith('/assets') && !isAI(pathname) },
    { to: '/analysis', label: 'AI Analysis', icon: Brain, active: isAI(pathname) },
    { to: '/trust', label: 'Trust Center', icon: ShieldCheck, active: pathname.startsWith('/trust') },
    { to: '/feedback', label: 'Human Feedback', icon: MessageSquare, active: pathname.startsWith('/feedback') },
    { to: '/history', label: 'Feedback History', icon: History, active: pathname.startsWith('/history') },
    { to: '/knowledge', label: 'Knowledge Base', icon: Database, active: pathname.startsWith('/knowledge'), count: pending },
  ]
  const alertCount = critical.length + (pending ? 1 : 0)
  const modeText = mode === 'live' ? 'System operational' : mode === 'demo' ? 'Demo data (simulated)' : 'Connecting…'

  return (
    <div className="shell">
      <InteractiveBackground />
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-logo"><ShieldCheck size={22} /></span>
          <div>
            <strong>AssetNexus</strong>
            <small>AI Intelligence</small>
          </div>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon, active, count }) => (
            <Link key={to} to={to} className={active ? 'active' : ''} onClick={() => setOpen(false)}>
              <Icon size={18} /> {label}
              {count > 0 && <span className="nav-count">{count}</span>}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <p>Decision support only. Not for unsupervised execution of maintenance actions.</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className={`status status-${mode}`}><span className="dot" /> {modeText}</div>
          <button className="search-btn" onClick={() => setPalette(true)}>
            <Search size={15} /> Search assets & pages <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-right">
            <span className="muted updated">Last updated {new Date(updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button className="icon-btn" aria-label="Refresh data" title="Refresh data" onClick={() => { bump(); toast('Data refreshed', 'ok') }}>
              <RefreshCw size={18} />
            </button>
            <div className="bell-wrap">
              <button className="icon-btn" aria-label="Notifications" onClick={() => setBell((b) => !b)}>
                <Bell size={18} />
                {alertCount > 0 && <span className="bell-count">{alertCount}</span>}
              </button>
              {bell && (
                <>
                  <div className="overlay clear" onClick={() => setBell(false)} />
                  <div className="bell-menu">
                    <h4>Notifications</h4>
                    {alertCount === 0 && <p className="muted">All clear.</p>}
                    {critical.map((a) => (
                      <Link key={a.id} to={`/assets/${a.id}`} onClick={() => setBell(false)}>
                        <i className="tone-bg-bad" /> <span><b>{a.name}</b> is critical (health {a.health}%)</span>
                      </Link>
                    ))}
                    {pending > 0 && (
                      <Link to="/knowledge" onClick={() => setBell(false)}>
                        <i className="tone-bg-warn" /> <span><b>{pending}</b> feedback record{pending > 1 ? 's' : ''} awaiting validation</span>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
            <button className="icon-btn" aria-label="Toggle theme" title="Toggle light / dark" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <span className="avatar" title={`${user?.name} · ${user?.role}`}>{user?.initials}</span>
            <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={() => { logout(); toast('Signed out', 'ok'); nav('/login', { replace: true }) }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      {palette && <CommandPalette assets={assets} onClose={() => setPalette(false)} />}
      <ToastHost />
    </div>
  )
}
