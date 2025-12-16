export const normalizeProgress = (value) => {
  const n = Number(value || 0)
  if (isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

// 状态转换映射表
export const statusMap = {
  'completed': '已完成',
  'done': '已完成',
  'finished': '已完成',
  'in_progress': '进行中',
  'executing': '进行中',
  'preparing': '进行中',
  'on_track': '进行中',
  'ongoing': '进行中',
  'ahead': '已完成',
  'delayed': '已延期',
  'not_started': '待开始',
  'at_risk': '风险中',
  'on_track': '进行中'
}

// 将英文状态转换为中文状态
export const translateStatus = (status) => {
  if (!status) return '待开始'
  const s = String(status).toLowerCase()
  return statusMap[s] || status
}

export const computeActionPlanStatus = (progress, when) => {
  const p = normalizeProgress(progress)
  if (p >= 100) return '已完成'
  if (when) {
    const d = new Date(when)
    if (!isNaN(d.getTime())) {
      // Add 1 month grace period
      const deadline = new Date(d)
      deadline.setMonth(deadline.getMonth() + 1)
      if (deadline.getTime() < Date.now()) return '已延期'
    }
  }
  if (p > 0) return '进行中'
  return '待开始'
}
