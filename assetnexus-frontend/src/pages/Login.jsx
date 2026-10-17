import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Mail, Lock, Eye, EyeOff, LogIn, Loader2, AlertTriangle, Moon, Sun,
  Activity, Gauge, Database,
} from 'lucide-react'
import InteractiveBackground from '../components/InteractiveBackground'
import { DEMO_PASSWORD, login, useUser } from '../state/auth'
import { toggleTheme, useTheme } from '../state/theme'
import { useSpotlight } from '../hooks/useSpotlight'

const MAX_TRIES = 5
const LOCK_SECONDS = 30

export default function Login() {
  const user = useUser()
  const theme = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [caps, setCaps] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tries, setTries] = useState(0)
  const [lockLeft, setLockLeft] = useState(0)
  const [shake, setShake] = useState(0)
  const timer = useRef(0)
  useSpotlight()

  useEffect(() => () => clearInterval(timer.current), [])

  if (user) return <Navigate to={loc.state?.from || '/'} replace />

  const startLock = () => {
    setLockLeft(LOCK_SECONDS)
    timer.current = setInterval(() => {
      setLockLeft((s) => {
        if (s <= 1) {
          clearInterval(timer.current)
          setTries(0)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy || lockLeft > 0) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setError('')
    setBusy(true)
    try {
      await login(email, password, remember)
      nav(loc.state?.from || '/', { replace: true })
    } catch (err) {
      const n = tries + 1
      setTries(n)
      setShake((s) => s + 1)
      setPassword('')
      if (n >= MAX_TRIES) {
        setError(`Too many failed attempts. Try again in ${LOCK_SECONDS}s.`)
        startLock()
      } else {
        setError(`${err.message} ${MAX_TRIES - n} attempt${MAX_TRIES - n > 1 ? 's' : ''} left.`)
      }
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = () => {
    setEmail('ridhi@assetnexus.dev')
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  return (
    <div className="login-page">
      <InteractiveBackground />
      <button className="icon-btn login-theme" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <section className="login-hero">
        <div className="login-brand">
          <span className="brand-logo"><ShieldCheck size={24} /></span>
          <strong>AssetNexusAI</strong>
        </div>
        <h1>Industrial asset intelligence you can trust.</h1>
        <p className="muted">
          Feedback-as-Knowledge with Uncertainty-Gated Trust Management — engineers stay in control of every maintenance decision.
        </p>
        <ul className="login-points">
          <li><Activity size={18} /><span><b>Monitor</b> health, anomalies and Remaining Useful Life</span></li>
          <li><Gauge size={18} /><span><b>Gate</b> autonomy by prediction uncertainty</span></li>
          <li><Database size={18} /><span><b>Reuse</b> validated engineer corrections as knowledge</span></li>
        </ul>
      </section>

      <form className={`login-card card ${shake ? 'shake' : ''}`} key={shake} onSubmit={submit} noValidate>
        <h2>Sign in</h2>
        <p className="muted">Use your engineer account to open the dashboard.</p>

        <label className="field">
          Email
          <span className="input-icon">
            <Mail size={16} />
            <input type="email" autoComplete="username" autoFocus value={email} placeholder="you@company.com"
              onChange={(e) => setEmail(e.target.value)} disabled={lockLeft > 0} />
          </span>
        </label>

        <label className="field">
          Password
          <span className="input-icon">
            <Lock size={16} />
            <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password}
              placeholder="••••••••" onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)} disabled={lockLeft > 0} />
            <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
          {caps && <span className="field-warn"><AlertTriangle size={13} /> Caps Lock is on</span>}
        </label>

        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in on this device
        </label>

        {error && <div className="form-error" role="alert"><AlertTriangle size={15} /> {error}</div>}

        <button className="btn btn-primary login-submit" disabled={busy || lockLeft > 0}>
          {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
          {lockLeft > 0 ? `Locked (${lockLeft}s)` : busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="demo-box">
          <div>
            <b>Demo access</b>
            <p>ridhi@assetnexus.dev · <code>{DEMO_PASSWORD}</code></p>
          </div>
          <button type="button" className="btn" onClick={fillDemo}>Fill</button>
        </div>
        <p className="muted tiny">
          Prototype sign-in: when the backend <code>/api/auth/login</code> is available it is used; otherwise demo accounts
          are checked in your browser. Decision support only.
        </p>
      </form>
    </div>
  )
}
