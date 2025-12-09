export const normalizeProgress = (value) => {
  const n = Number(value || 0)
  if (isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

export const computeActionPlanStatus = (progress, when) => {
  const p = normalizeProgress(progress)
  if (p >= 100) return 'completed'
  if (when) {
    const d = new Date(when)
    if (!isNaN(d.getTime()) && d.getTime() < Date.now()) return 'delayed'
  }
  if (p > 0) return 'in_progress'
  return 'not_started'
}
