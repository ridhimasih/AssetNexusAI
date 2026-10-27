import { Link } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { resetThresholds, useGate } from '../state/gate'

// Shown on every page whenever the user is simulating a non-default trust policy.
export default function PolicyBanner() {
  const { t, modified } = useGate()
  if (!modified) return null
  return (
    <div className="policy-banner" role="status">
      <FlaskConical size={17} />
      <span>
        <strong>What-if trust policy active</strong> — low &lt; {t.low}, medium &lt; {t.medium}. Decisions on this page are re-gated client-side from each asset's uncertainty, not taken from the backend.
      </span>
      <Link to="/trust" className="link">Adjust</Link>
      <button className="btn" onClick={resetThresholds}>Reset</button>
    </div>
  )
}
