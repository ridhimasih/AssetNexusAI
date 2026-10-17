export const TRUST_META = {
  recommend: {
    label: 'High Trust',
    level: 'Low',
    ruleSub: 'Low uncertainty',
    autonomy: 'Recommendation permitted',
    rule: 'AI can provide recommendations with minimal human intervention.',
    tone: 'ok',
  },
  confirm: {
    label: 'Medium Trust',
    level: 'Medium',
    ruleSub: 'Moderate uncertainty',
    autonomy: 'Human approval required',
    rule: 'AI can recommend an action, but human approval is required.',
    tone: 'warn',
  },
  withhold: {
    label: 'Low Trust',
    level: 'High',
    ruleSub: 'High uncertainty',
    autonomy: 'Human review required',
    rule: 'AI cannot proceed autonomously and must request human review.',
    tone: 'bad',
  },
}

export const STATUS_META = {
  healthy: { label: 'Healthy', tone: 'ok' },
  warning: { label: 'Warning', tone: 'warn' },
  critical: { label: 'Critical', tone: 'bad' },
}

// Outcome shown in Feedback History
export const FEEDBACK_STATUS = {
  accepted: { label: 'Accepted', tone: 'ok' },
  corrected: { label: 'Corrected', tone: 'warn' },
  rejected: { label: 'Rejected', tone: 'bad' },
  pending: { label: 'Pending', tone: 'neutral' },
  declined: { label: 'Declined', tone: 'bad' },
}

// Status shown in Knowledge Base
export const KB_STATUS = {
  validated: { label: 'Validated', tone: 'ok' },
  pending: { label: 'Pending review', tone: 'warn' },
  declined: { label: 'Declined', tone: 'bad' },
}

export const HUMAN_DECISION = {
  accepted: 'Confirmed',
  corrected: 'Confirmed with correction',
  rejected: 'Rejected',
}

export const statusOf = (r) =>
  r.validation === 'pending' ? 'pending' : r.validation === 'declined' ? 'declined' : r.decision

export const diagnosisLabel = (fault) =>
  fault === 'No fault' ? 'Normal operating condition' : `Possible ${fault.toLowerCase()}`

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
