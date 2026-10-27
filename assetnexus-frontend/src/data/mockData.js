// SIMULATED DATA — used only when the backend is unreachable.
// The UI labels this clearly as "Demo data" so it is never mistaken for real results.
import { diagnosisLabel } from '../utils/meta'

export const FAULT_TYPES = [
  'Bearing degradation',
  'Bearing fault',
  'Rotor imbalance',
  'Shaft misalignment',
  'Cavitation',
  'Impeller wear',
  'Valve leakage',
  'Oil starvation',
  'Gear tooth wear',
  'Overheating',
  'Hydraulic seal failure',
  'Blade fouling',
  'No fault',
]

const r2 = (x) => Math.round(x * 100) / 100

// fault pool, typical temperature (°C) and pressure (bar; 0 = no pressure sensor) per asset type
export const TYPE_INFO = {
  'CNC Machine': { faults: ['Bearing degradation', 'Shaft misalignment', 'Overheating'], temp: 55, press: 0 },
  'Centrifugal Pump': { faults: ['Bearing degradation', 'Cavitation', 'Impeller wear'], temp: 60, press: 6 },
  'Cooling Pump': { faults: ['Impeller wear', 'Bearing degradation', 'Cavitation'], temp: 45, press: 4 },
  'Air Compressor': { faults: ['Bearing fault', 'Valve leakage', 'Oil starvation', 'Overheating'], temp: 85, press: 8 },
  'Electric Motor': { faults: ['Bearing degradation', 'Rotor imbalance', 'Shaft misalignment'], temp: 70, press: 0 },
  Gearbox: { faults: ['Gear tooth wear', 'Bearing degradation', 'Oil starvation'], temp: 75, press: 0 },
  'Hydraulic Press': { faults: ['Hydraulic seal failure', 'Valve leakage', 'Overheating'], temp: 65, press: 20 },
  'Gas Turbine': { faults: ['Blade fouling', 'Bearing degradation', 'Shaft misalignment'], temp: 400, press: 14 },
  'Cooling Fan': { faults: ['Rotor imbalance', 'Bearing degradation'], temp: 40, press: 0 },
  'Robotic Arm': { faults: ['Gear tooth wear', 'Bearing degradation'], temp: 50, press: 0 },
}
export const ASSET_TYPES = Object.keys(TYPE_INFO)

export const statusFromHealth = (h) => (h >= 70 ? 'healthy' : h >= 50 ? 'warning' : 'critical')
// Placeholder default thresholds (the Trust Center can simulate others client-side)
export const trustFromUncertainty = (u) => (u < 0.25 ? 'recommend' : u < 0.55 ? 'confirm' : 'withhold')

// [name, type, location, health, confidence %, uncertainty, top fault (null = no fault), RUL days]
const RAW = [
  ['CNC Machine 01', 'CNC Machine', 'Production Unit A', 92, 94, 0.12, null, 420],
  ['Industrial Pump 04', 'Centrifugal Pump', 'Production Unit B', 68, 81, 0.31, 'Bearing degradation', 74],
  ['Compressor 02', 'Air Compressor', 'Utility Section', 41, 62, 0.72, 'Bearing fault', 23],
  ['Industrial Motor 07', 'Electric Motor', 'Production Unit A', 76, 88, 0.19, null, 210],
  ['Hydraulic Press 03', 'Hydraulic Press', 'Production Unit C', 84, 90, 0.15, null, 340],
  ['Cooling Pump 11', 'Cooling Pump', 'Utility Section', 57, 76, 0.38, 'Impeller wear', 96],
  ['Gearbox 05', 'Gearbox', 'Production Unit B', 52, 70, 0.44, 'Gear tooth wear', 58],
  ['Gas Turbine 01', 'Gas Turbine', 'Power Block', 47, 58, 0.66, 'Blade fouling', 31],
  ['Boiler Feed Pump 02', 'Centrifugal Pump', 'Boiler House', 63, 74, 0.41, 'Cavitation', 88],
  ['Conveyor Drive 09', 'Electric Motor', 'Packaging Line', 71, 78, 0.36, null, 190],
  ['Screw Compressor 06', 'Air Compressor', 'Utility Section', 55, 68, 0.52, 'Valve leakage', 40],
  ['Extruder Motor 03', 'Electric Motor', 'Production Unit C', 79, 83, 0.29, null, 230],
  ['Hydraulic Press 08', 'Hydraulic Press', 'Production Unit C', 44, 55, 0.63, 'Hydraulic seal failure', 19],
  ['CNC Machine 04', 'CNC Machine', 'Production Unit A', 90, 93, 0.13, null, 400],
  ['CNC Machine 07', 'CNC Machine', 'Production Unit D', 87, 91, 0.16, null, 380],
  ['Cooling Pump 03', 'Cooling Pump', 'Utility Section', 88, 92, 0.14, null, 360],
  ['Industrial Pump 01', 'Centrifugal Pump', 'Production Unit B', 94, 96, 0.09, null, 450],
  ['Air Compressor 05', 'Air Compressor', 'Utility Section', 82, 89, 0.18, null, 300],
  ['Hydraulic Press 01', 'Hydraulic Press', 'Production Unit C', 86, 90, 0.17, null, 350],
  ['Industrial Motor 02', 'Electric Motor', 'Production Unit A', 91, 94, 0.11, null, 410],
  ['Gearbox 02', 'Gearbox', 'Production Unit B', 80, 87, 0.21, null, 280],
  ['Cooling Fan 06', 'Cooling Fan', 'Utility Section', 95, 97, 0.08, null, 480],
  ['Packaging Robot 12', 'Robotic Arm', 'Packaging Line', 89, 92, 0.15, null, 370],
  ['Gas Turbine 03', 'Gas Turbine', 'Power Block', 83, 88, 0.22, null, 310],
]

const assetId = (n) => `AST-${String(n).padStart(3, '0')}`

function makeAsset([name, type, location, health, confidence, u, fault, rul], i) {
  return {
    id: assetId(i + 1),
    name,
    type,
    location,
    health,
    status: statusFromHealth(health),
    confidence,
    baseUncertainty: u,
    topFault: fault || 'No fault',
    rul,
  }
}

export const BASE_ASSETS = RAW.map(makeAsset)

// Used by the "Add Asset" form (demo mode)
export function makeCustomAsset({ name, type, location, health }, nextNum) {
  const h = Math.max(0, Math.min(100, Math.round(health)))
  const u = r2(0.1 + ((100 - h) / 100) * 0.9)
  const pool = TYPE_INFO[type]?.faults || FAULT_TYPES
  return {
    id: assetId(nextNum),
    name,
    type,
    location,
    health: h,
    status: statusFromHealth(h),
    confidence: Math.round(100 - u * 45),
    baseUncertainty: u,
    topFault: h >= 70 ? 'No fault' : pool[0],
    rul: Math.max(10, h * 4 - 40),
  }
}

function diagnoses(a) {
  const pool = TYPE_INFO[a.type]?.faults || []
  const top = a.topFault
  const others = pool.filter((f) => f !== top).slice(0, 2)
  const p = a.confidence / 100
  const rest = 1 - p
  const out = [{ fault: top, probability: r2(p) }]
  if (others[0]) out.push({ fault: others[0], probability: r2(rest * 0.6) })
  if (others[1]) out.push({ fault: others[1], probability: r2(rest * 0.4) })
  return out
}

// Approved (validated) engineer corrections that apply to this asset.
// Only non-healthy assets receive them, and only when the corrected fault is among the asset's top-2 diagnoses.
export function knowledgeFor(a, records) {
  if (a.status === 'healthy') return []
  const top2 = diagnoses(a).slice(0, 2).map((d) => d.fault)
  return records.filter(
    (k) => k.validation === 'validated' && k.decision === 'corrected' && k.assetType === a.type && top2.includes(k.correctedFault),
  )
}

// Seeded history is already reflected in the baseline model (incorporated = true);
// only corrections validated during this session lower uncertainty (demo effect).
export function adjustedUncertainty(a, records) {
  const fresh = knowledgeFor(a, records).filter((k) => !k.incorporated)
  return r2(Math.max(0.05, a.baseUncertainty - 0.08 * Math.min(fresh.length, 2)))
}

export function publicAsset(a, records) {
  const u = adjustedUncertainty(a, records)
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    location: a.location,
    health: a.health,
    status: a.status,
    confidence: a.confidence,
    uncertainty: u,
    trust: trustFromUncertainty(u),
    topFault: a.topFault,
    rulDays: a.rul,
  }
}

function series(seed, base, amp, total, n = 48) {
  let s = seed
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin(i / 4) * amp * 0.4
    const noise = (rnd() - 0.5) * amp
    const trend = total * (i / (n - 1)) ** 2
    return Math.round((base + wave + noise + trend) * 100) / 100
  })
}

export function buildSensors(a) {
  const info = TYPE_INFO[a.type] || { temp: 60, press: 0 }
  const stress = (100 - a.health) / 100
  const n = parseInt(a.id.slice(4), 10) || 1
  const out = [
    { key: 'vibration', label: 'Vibration', unit: 'mm/s', limit: 6, data: series(n * 11, 1.2 + stress * 2, 0.25 + stress * 0.6, stress * 3.2) },
    { key: 'temperature', label: 'Temperature', unit: '°C', limit: Math.round(info.temp * 1.25), data: series(n * 23, info.temp, info.temp * 0.03, stress * info.temp * 0.25) },
  ]
  if (info.press > 0) {
    out.push({ key: 'pressure', label: 'Pressure', unit: 'bar', limit: r2(info.press * 1.3), data: series(n * 37, info.press, info.press * 0.03, -stress * info.press * 0.15) })
  }
  return out
}

export function buildAnalysis(a, records) {
  const matches = knowledgeFor(a, records)
  const fresh = matches.filter((k) => !k.incorporated)
  const u = adjustedUncertainty(a, records)
  const stress = 100 - a.health
  const anomaly = a.health >= 70 ? r2((stress / 100) * 0.8) : Math.min(0.98, r2((stress / 100) * 2))
  const healthy = a.status === 'healthy'
  const evidence = healthy
    ? ['All sensor channels within normal operating envelope.', 'Vibration RMS stable over the recent window.']
    : [
        `Vibration RMS is ${Math.round(stress * 1.3)}% above baseline.`,
        a.health < 50 ? 'Temperature exceeds its alarm threshold.' : 'Temperature trending upward.',
        `Signal signature is consistent with ${a.topFault.toLowerCase()}.`,
        ...(u >= 0.55 ? ['Model sub-estimates disagree — uncertainty is high.'] : []),
      ]
  let recommendation = healthy ? 'Continue routine monitoring' : a.status === 'warning' ? 'Schedule maintenance inspection' : 'Immediate engineer inspection advised'
  if (fresh.length) recommendation += ` — informed by validated engineer feedback (${fresh[0].correctedFault.toLowerCase()})`
  return {
    assetId: a.id,
    assetName: a.name,
    confidence: a.confidence,
    anomalyScore: anomaly,
    anomalyDetected: anomaly >= 0.5,
    anomalyResult: healthy ? 'No anomaly detected' : a.health < 50 ? 'Abnormal vibration and temperature' : 'Abnormal vibration',
    diagnoses: diagnoses(a),
    diagnosisNote: 'The diagnosis is generated from current sensor patterns and historical asset behavior.',
    rul: { days: a.rul, low: Math.round(a.rul * (1 - u * 0.8)), high: Math.round(a.rul * (1 + u * 0.6)) },
    uncertainty: u,
    trust: trustFromUncertainty(u),
    evidence,
    recommendation,
    retrievedKnowledge: matches.slice(0, 3),
    sensors: buildSensors(a),
  }
}

// ---- seeded feedback history: 128 records = 96 accepted + 21 corrected + 11 pending ----
const ENGINEERS = ['R. Verma', 'S. Iyer', 'A. Khan', 'P. Nair']

export function seedFeedback() {
  const list = []
  for (let n = 0; n < 128; n++) {
    const pending = n >= 3 && n <= 13
    let asset
    let decision
    let correctedFault = null
    let conf
    if (n === 0) { asset = BASE_ASSETS[1]; decision = 'accepted'; conf = 81 }
    else if (n === 1) { asset = BASE_ASSETS[2]; decision = 'corrected'; correctedFault = 'Bearing fault'; conf = 62 }
    else if (n === 2) { asset = BASE_ASSETS[0]; decision = 'accepted'; conf = 94 }
    else {
      asset = BASE_ASSETS[(n * 7 + 2) % BASE_ASSETS.length]
      const isCorrected = pending ? n % 2 === 0 : n % 6 === 1 || n === 100
      decision = isCorrected ? 'corrected' : 'accepted'
      conf = Math.max(50, Math.min(99, asset.confidence + ((n * 13) % 9) - 4))
      if (isCorrected) correctedFault = TYPE_INFO[asset.type].faults.find((f) => f !== asset.topFault)
    }
    const faultName = decision === 'corrected' ? correctedFault : asset.topFault
    list.push({
      id: `FB-${String(n + 1).padStart(3, '0')}`,
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type,
      date: new Date(Date.UTC(2026, 9, 6 - n, 9, 30)).toISOString(),
      aiDecision: diagnosisLabel(asset.topFault),
      aiConfidence: conf,
      uncertaintyAtReview: asset.baseUncertainty,
      decision,
      correctedFault,
      expertKnowledge: faultName === 'No fault' ? 'Normal operation confirmed' : `${faultName} confirmed`,
      comments: decision === 'corrected' ? `Inspection indicated ${faultName.toLowerCase()}.` : 'Matches on-site inspection.',
      engineer: ENGINEERS[n % ENGINEERS.length],
      validation: pending ? 'pending' : 'validated',
      incorporated: !pending,
    })
  }
  return list
}
