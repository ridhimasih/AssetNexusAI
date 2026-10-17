import { useState } from 'react'
import { api } from '../api/client'
import { ASSET_TYPES } from '../data/mockData'
import { bump } from '../state/refresh'
import { toast } from '../state/toast'

export default function AddAssetModal({ onClose }) {
  const [form, setForm] = useState({ name: '', type: ASSET_TYPES[0], location: '', health: '85' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const health = Number(form.health)
    if (!form.name.trim() || !form.location.trim()) return setError('Name and location are required.')
    if (!Number.isFinite(health) || health < 0 || health > 100) return setError('Health must be a number from 0 to 100.')
    setBusy(true)
    setError(null)
    try {
      await api.createAsset({ name: form.name.trim(), type: form.type, location: form.location.trim(), health })
      bump()
      toast(`Asset "${form.name.trim()}" added`, 'ok')
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false) 
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal form" onSubmit={submit} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add asset">
        <h3>Add asset</h3>
        <p className="muted small" style={{ margin: 0 }}>Registers a new asset for monitoring. Its analysis is generated from the health score you enter.</p>
        <label className="field">Asset name<input autoFocus value={form.name} onChange={set('name')} placeholder="e.g. Industrial Pump 12" /></label>
        <label className="field">Type
          <select value={form.type} onChange={set('type')}>{ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label className="field">Location<input value={form.location} onChange={set('location')} placeholder="e.g. Production Unit B" /></label>
        <label className="field">Initial health score (0–100)<input type="number" min={0} max={100} value={form.health} onChange={set('health')} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add asset'}</button>
        </div>
      </form>
    </div>
  )
}
