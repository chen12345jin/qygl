import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatDateTime, formatDate, formatCurrency } from '../utils/locale.js'

// 字段映射配置
const fieldMaps = {
  departments: {
    name: '部门名称',
    code: '部门编码',
    parent_id: '上级部门',
    manager: '部门负责人',
    description: '部门描述',
    created_at: '创建时间'
  },
  employees: {
    name: '姓名',
    employee_id: '工号',
    department: '部门',
    position: '职位',
    phone: '电话',
    email: '邮箱',
    hire_date: '入职日期',
    status: '状态',
    created_at: '创建时间'
  },
  departmentTargets: {
    year: '年度',
    department: '部门',
    target_level: '级别',
    target_type: '目标类型',
    target_name: '目标名称',
    target_value: '目标值',
    unit: '单位',
    quarter: '季度',
    month: '月份',
    current_value: '当前值',
    completion_rate: '完成率',
    responsible_person: '负责人',
    description: '描述',
    created_at: '创建时间'
  },
  annualWorkPlans: {
    year: '年度',
    department: '部门',
    event_name: '计划名称',
    month: '月份',
    event_type: '类别',
    importance: '重要性',
    occurred_at: '开始时间',
    closed_at: '结束时间',
    impact_amount: '预算',
    status: '状态',
    owner: '负责人',
    review_points: '预期成果',
    created_at: '创建时间'
  },
  majorEvents: {
    year: '年度',
    event_name: '事件名称',
    event_type: '事件类型',
    importance: '重要性',
    planned_date: '计划日期',
    actual_date: '实际日期',
    responsible_department: '负责部门',
    responsible_person: '负责人',
    status: '状态',
    budget: '预算',
    actual_cost: '实际成本',
    description: '描述',
    created_at: '创建时间'
  },
  monthlyProgress: {
    year: '年度',
    month: '月份',
    department: '部门',
    task_name: '任务名称',
    key_activities: '核心动作',
    achievements: '达成成果',
    challenges: '存在问题',
    next_month_plan: '下月规划',
    support_needed: '所需支持',
    target_value: '目标值',
    actual_value: '实际值',
    completion_rate: '完成率',
    status: '状态',
    start_date: '开始日期',
    end_date: '结束日期',
    responsible_person: '负责人',
    created_at: '创建时间'
  },
  // 年度规划表 - planning sheet
  planning: {
    month: '月份',
    theme: '主题',
    goals: '目标',
    tasks: '主要任务',
    resources: '资源需求',
    timeline: '时间安排',
    responsible: '负责人',
    notes: '备注'
  },
  // 大事件提炼 - events sheet
  events: {
    month: '月份',
    event_name: '事件名称',
    event_type: '事件类型',
    importance: '重要程度',
    description: '事件描述',
    impact: '影响分析',
    lessons: '经验教训'
  },
  // 月度推进计划 - monthly sheet
  monthly: {
    month: '月份',
    objectives: '目标',
    key_tasks: '关键任务',
    deliverables: '交付成果',
    milestones: '里程碑',
    resources_needed: '资源需求',
    risks: '风险点',
    success_metrics: '成功指标'
  },
  // 5W2H行动计划 - action sheet
  action: {
    goal: '目标',
    when: '日期',
    what: '事项',
    who: '执行人/协同人',
    how: '策略方法/执行步骤/行动方案',
    why: '价值',
    how_much: '投入预算/程度/数量',
    department: '部门',
    priority: '优先级',
    status: '状态',
    progress: '进度（%）',
    expected_result: '预期结果',
    actual_result: '实际结果',
    remarks: '备注'
  },
  actionPlans: {
    year: '年度',
    goal: '目标',
    when: '日期',
    what: '事项',
    who: '执行人/协同人',
    how: '策略方法/执行步骤/行动方案',
    why: '价值',
    how_much: '投入预算/程度/数量',
    department: '部门',
    priority: '优先级',
    status: '状态',
    progress: '进度（%）',
    expected_result: '预期结果',
    actual_result: '实际结果',
    remarks: '备注',
    created_at: '创建时间'
  }
}

// 字段顺序配置（确保导出时按正确顺序）
const fieldOrders = {
  planning: ['month', 'theme', 'goals', 'tasks', 'resources', 'timeline', 'responsible', 'notes'],
  events: ['month', 'event_name', 'event_type', 'importance', 'description', 'impact', 'lessons'],
  monthly: ['month', 'objectives', 'key_tasks', 'deliverables', 'milestones', 'resources_needed', 'risks', 'success_metrics'],
  action: ['goal', 'when', 'what', 'who', 'how', 'why', 'how_much', 'department', 'priority', 'status', 'progress', 'expected_result', 'actual_result', 'remarks'],
  departmentTargets: ['year', 'department', 'target_level', 'target_type', 'target_name', 'target_value', 'unit', 'quarter', 'month', 'current_value', 'completion_rate', 'responsible_person', 'description'],
  annualWorkPlans: ['year', 'department', 'event_name', 'month', 'event_type', 'importance', 'occurred_at', 'closed_at', 'impact_amount', 'status', 'owner', 'review_points'],
  majorEvents: ['year', 'event_name', 'event_type', 'importance', 'planned_date', 'actual_date', 'responsible_department', 'responsible_person', 'budget', 'actual_cost', 'status', 'description'],
  monthlyProgress: ['year', 'month', 'department', 'task_name', 'key_activities', 'achievements', 'challenges', 'next_month_plan', 'support_needed', 'target_value', 'actual_value', 'completion_rate', 'start_date', 'end_date', 'responsible_person', 'status'],
  actionPlans: ['year', 'department', 'goal', 'what', 'when', 'who', 'how', 'why', 'how_much', 'priority', 'status', 'progress', 'expected_result', 'actual_result', 'remarks']
}

// 状态值映射
const statusMaps = {
  priority: {
    high: '高',
    medium: '中',
    low: '低'
  },
  status: {
    not_started: '未开始',
    in_progress: '进行中',
    completed: '已完成',
    delayed: '延期'
  },
  importance: {
    '高': '高',
    '中': '中',
    '低': '低'
  },
  event_type: {
    strategic: '战略性事件',
    strateg: '战略性事件',
    operational: '运营性事件',
    operation: '运营性事件',
    risk: '风险性事件',
    opportunity: '机会性事件',
    product: '产品',
    recruitment: '招聘',
    training: '培训',
    meeting: '会议',
    release: '发布',
    promotion: '推广',
    audit: '审计',
    delivery: '交付',
    milestone: '里程碑',
    purchase: '采购',
    inventory: '库存',
    quality: '质量',
    plan: '计划',
    summary: '总结'
  }
}

// 导出Excel
export const exportToExcel = (data, filename, sheetName = 'Sheet1', dataType = 'default') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('没有数据可以导出')
  }

  try {
    // 获取字段映射，如果没有找到对应的映射，使用空对象
    const fieldMap = fieldMaps[dataType] || {}
    const fieldOrder = fieldOrders[dataType] || null
    
    // 转换数据
    const exportData = data.map(item => {
      const row = {}
      
      // 如果有字段顺序定义，按顺序处理
      if (fieldOrder) {
        fieldOrder.forEach(key => {
          const label = fieldMap[key] || key
          let value = item[key]
          
          // 转换状态值
          if (key === 'priority' && statusMaps.priority[value]) {
            value = statusMaps.priority[value]
          } else if (key === 'status' && statusMaps.status[value]) {
            value = statusMaps.status[value]
          } else if (key === 'event_type' && statusMaps.event_type[String(value || '').toLowerCase()]) {
            value = statusMaps.event_type[String(value || '').toLowerCase()]
          } else if (key === 'importance' && statusMaps.importance[value]) {
            value = statusMaps.importance[value]
          }
          
          // 格式化月份
          if (key === 'month' && typeof value === 'number') {
            value = `${value}月`
          }
          
          // 格式化进度
          if (key === 'progress' && value !== null && value !== undefined && value !== '') {
            value = `${value}%`
          }
          
          // 格式化日期字段
          if ((key.includes('date') || key === 'when' || key.includes('_at')) && value) {
            try {
              // 保持日期格式不变
              if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                value = value.split('T')[0] // 只保留日期部分
              }
            } catch (e) {
              // 如果日期解析失败，保持原值
            }
          }
          
          // 处理布尔值
          if (typeof value === 'boolean') {
            value = value ? '是' : '否'
          }
          
          // 处理null和undefined
          if (value === null || value === undefined) {
            value = ''
          }
          
          row[label] = value
        })
      } else if (Object.keys(fieldMap).length === 0) {
        // 如果没有字段映射，直接使用原始数据
        Object.keys(item).forEach(key => {
          // 跳过内部字段
          if (key === 'id' || key === '_id' || key === 'year' || key === 'created_at' || key === 'updated_at') {
            return
          }
          
          let value = item[key]
          
          // 格式化特殊字段
          if (key.includes('date') || key.includes('_at')) {
            if (value) {
              try {
                value = formatDateTime(value)
              } catch (e) {
                // 如果日期解析失败，保持原值
              }
            }
          }
          
          // 处理布尔值
          if (typeof value === 'boolean') {
            value = value ? '是' : '否'
          }
          
          // 处理null和undefined
          if (value === null || value === undefined) {
            value = ''
          }
          
          row[key] = value
        })
      } else {
        // 使用字段映射转换（按映射顺序）
        Object.keys(fieldMap).forEach(key => {
          if (item.hasOwnProperty(key) || key in item) {
            const label = fieldMap[key]
            let value = item[key]
            
            // 格式化特殊字段
            if (key.includes('date') || key.includes('_at')) {
              if (value) {
                try {
                  value = formatDateTime(value)
                } catch (e) {
                  // 如果日期解析失败，保持原值
                }
              }
            }
            
            // 处理布尔值
            if (typeof value === 'boolean') {
              value = value ? '是' : '否'
            }
            
            // 处理null和undefined
            if (value === null || value === undefined) {
              value = ''
            }
            
            row[label] = value
          }
        })
      }
      return row
    })

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // 设置列宽（针对不同类型优化）
    const colWidths = []
    if (exportData.length > 0) {
      Object.keys(exportData[0]).forEach((key, idx) => {
        // 计算内容最大长度
        const maxContentLength = Math.max(
          key.length * 2, // 中文字符算两倍宽度
          ...exportData.map(row => {
            const val = String(row[key] || '')
            // 中文字符算两倍宽度
            return val.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 127 ? 2 : 1), 0)
          })
        )
        // 根据内容类型设置合适的列宽
        let width = Math.min(Math.max(maxContentLength + 4, 10), 60)
        
        // 对特定列设置固定宽度
        if (key === '月份') width = 8
        else if (key === '优先级' || key === '重要程度') width = 10
        else if (key === '状态') width = 10
        else if (key === '进度（%）') width = 12
        else if (key === '日期') width = 14
        else if (key.includes('描述') || key.includes('结果') || key.includes('方案')) width = 40
        
        colWidths.push({ wch: width })
      })
      ws['!cols'] = colWidths
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    
    // 导出文件
    const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    
    return { success: true, filename: fileName }
  } catch (error) {
    console.error('Excel导出失败:', error)
    throw new Error(`Excel导出失败: ${error.message}`)
  }
}

// 导出PDF
export const exportToPDF = async (elementId, filename) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('找不到要导出的元素')
    }

    // 创建一个用于PDF导出的简化克隆
    const createPrintableClone = () => {
      const clone = element.cloneNode(true)
      clone.id = 'pdf-export-clone'
      
      // 移除不需要打印的元素
      clone.querySelectorAll('.no-print, button, [class*="floating"]').forEach(el => el.remove())
      
      // 设置基础样式
      clone.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: max-content;
        min-width: 100%;
        background: #ffffff;
        padding: 20px;
        font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      `
      
      // 简化所有元素的样式
      clone.querySelectorAll('*').forEach(el => {
        const computedStyle = window.getComputedStyle(el)
        
        // 移除复杂的背景效果
        if (el.className && (
          el.className.includes('bg-gradient') || 
          el.className.includes('backdrop-blur') ||
          el.className.includes('shadow')
        )) {
          // 根据元素类型设置简单背景色
          if (el.tagName === 'TH') {
            el.style.background = '#f3f4f6'
            el.style.backgroundColor = '#f3f4f6'
          } else if (el.tagName === 'BUTTON' || el.className.includes('btn')) {
            el.style.display = 'none'
          } else {
            el.style.background = '#ffffff'
            el.style.backgroundColor = '#ffffff'
          }
          el.style.backdropFilter = 'none'
          el.style.webkitBackdropFilter = 'none'
          el.style.boxShadow = 'none'
        }
        
        // 修复文字渐变
        if (el.className && el.className.includes('bg-clip-text')) {
          el.style.color = '#1f2937'
          el.style.background = 'none'
          el.style.backgroundClip = 'unset'
          el.style.webkitBackgroundClip = 'unset'
          el.style.webkitTextFillColor = '#1f2937'
        }
      })
      
      // 设置表格样式
      clone.querySelectorAll('table').forEach(table => {
        table.style.cssText = `
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
          font-size: 12px;
        `
      })
      
      // 设置表头样式
      clone.querySelectorAll('th').forEach(th => {
        th.style.cssText = `
          padding: 10px 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-weight: 600;
          color: #1e293b;
          text-align: center;
          white-space: nowrap;
        `
      })
      
      // 设置单元格样式
      clone.querySelectorAll('td').forEach(td => {
        td.style.cssText = `
          padding: 8px 6px;
          border: 1px solid #e2e8f0;
          color: #334155;
          vertical-align: top;
        `
        // 保留输入框/文本域的内容
        td.querySelectorAll('input, textarea, select').forEach(input => {
          const value = input.value || input.textContent || ''
          const span = document.createElement('span')
          span.textContent = value
          span.style.cssText = 'white-space: pre-wrap; word-break: break-word;'
          input.parentNode.replaceChild(span, input)
        })
      })
      
      // 设置标题区域样式
      clone.querySelectorAll('[class*="rounded-3xl"], [class*="rounded-2xl"]').forEach(el => {
        if (el.querySelector('h3') || el.querySelector('svg')) {
          el.style.cssText = `
            padding: 15px;
            margin-bottom: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          `
        }
      })
      
      // 移除SVG图标的渐变
      clone.querySelectorAll('svg').forEach(svg => {
        svg.style.color = '#6b7280'
      })
      
      return clone
    }
    
    // 创建克隆并添加到DOM
    const printClone = createPrintableClone()
    document.body.appendChild(printClone)
    
    // 等待一下让样式生效
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const elementWidth = printClone.scrollWidth || printClone.offsetWidth
    const elementHeight = printClone.scrollHeight || printClone.offsetHeight
    const isWideTable = elementWidth > 1200

    console.log('[PDF Export] 克隆元素尺寸:', { width: elementWidth, height: elementHeight })

    // 使用html2canvas截图
    const maxCanvasHeight = 15000
    const maxCanvasWidth = 15000
    let scale = 2
    
    if (elementHeight * scale > maxCanvasHeight) {
      scale = Math.floor(maxCanvasHeight / elementHeight * 10) / 10
    }
    if (elementWidth * scale > maxCanvasWidth) {
      scale = Math.min(scale, Math.floor(maxCanvasWidth / elementWidth * 10) / 10)
    }
    if (scale < 1) scale = 1
    
    console.log('[PDF Export] 使用缩放比例:', scale)

    let canvas
    try {
      canvas = await html2canvas(printClone, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000
      })
    } catch (canvasError) {
      console.error('[PDF Export] html2canvas 错误:', canvasError)
      canvas = await html2canvas(printClone, {
        scale: 1,
        backgroundColor: '#ffffff',
        logging: false
      })
    }
    
    // 移除克隆元素
    document.body.removeChild(printClone)

    console.log('[PDF Export] Canvas 尺寸:', { width: canvas.width, height: canvas.height })

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('导出内容为空 (Canvas dimensions are 0)')
    }
    
    let imgData
    try {
      imgData = canvas.toDataURL('image/png')
    } catch (toDataUrlError) {
      console.error('[PDF Export] toDataURL 错误:', toDataUrlError)
      imgData = canvas.toDataURL('image/jpeg', 0.9)
    }
    
    if (!imgData || imgData === 'data:,' || imgData.length < 100) {
      throw new Error('导出图片数据无效 (Empty data URL)')
    }
    
    console.log('[PDF Export] 图片数据长度:', imgData.length)
    
    // 创建PDF - 根据内容宽度选择方向和纸张大小
    const orientation = isWideTable ? 'landscape' : 'portrait'
    const format = isWideTable ? 'a3' : 'a4' // 宽表格使用A3纸张
    
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    })
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    const marginLeft = 5
    const marginTop = 20
    const contentWidth = pdfWidth - marginLeft * 2
    const ratioW = contentWidth / imgWidth
    const pageHeightPx = Math.floor((pdfHeight - marginTop - 10) / ratioW)

    const sliceCanvas = (source, startY, height) => {
      const slice = document.createElement('canvas')
      slice.width = source.width
      slice.height = Math.min(height, source.height - startY)
      const ctx = slice.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(source, 0, startY, source.width, slice.height, 0, 0, source.width, slice.height)
      return slice
    }

    let rendered = 0
    let pageNum = 0

    // 创建标题图片（解决中文乱码问题）
    const createTitleImage = (text, width) => {
      const titleCanvas = document.createElement('canvas')
      const dpr = 2 // 高清渲染
      titleCanvas.width = width * dpr
      titleCanvas.height = 40 * dpr
      const ctx = titleCanvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, 40)
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 16px "Microsoft YaHei", "PingFang SC", "Helvetica Neue", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, width / 2, 20)
      return titleCanvas.toDataURL('image/png')
    }
    
    const titleImg = createTitleImage(filename, pdfWidth * 3) // 3倍宽度确保清晰

    while (rendered < imgHeight) {
      if (pageNum > 0) {
        pdf.addPage()
      }
      
      // 添加标题图片（每页）- 使用图片避免中文乱码
      pdf.addImage(titleImg, 'PNG', 0, 2, pdfWidth, 12)
      
      const sliceHeight = Math.min(pageHeightPx, imgHeight - rendered)
      const slice = sliceCanvas(canvas, rendered, sliceHeight)
      const sliceImg = slice.toDataURL('image/png')
      const displayHeightMm = slice.height * ratioW
      
      pdf.addImage(sliceImg, 'PNG', marginLeft, marginTop, contentWidth, displayHeightMm)
      rendered += sliceHeight
      pageNum++
    }

    // 保存PDF
    const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(fileName)
    
    return { success: true, filename: fileName }
  } catch (error) {
    console.error('PDF导出失败:', error)
    throw new Error(`PDF导出失败: ${error.message}`)
  }
}

// 打印元素
export const printElement = (elementId) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('找不到要打印的元素')
    }

    // 创建新的打印窗口
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('无法打开打印窗口')
    }
    
    // 获取当前页面的样式
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n')
        } catch (e) {
          return ''
        }
      })
      .join('\n')

    // 构建打印页面内容
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>打印页面</title>
          <style>
            ${styles}
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none !important; }
              table { page-break-inside: avoid; }
              .annual-planning-table { font-size: 12px; }
              .annual-planning-table th,
              .annual-planning-table td { 
                padding: 8px 4px;
                border: 1px solid #000;
              }
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body { background: #fff; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #e5e7eb; color: #111827; }
            @page { size: auto; margin: 10mm; }
          </style>
        </head>
        <body>
          ${element.outerHTML}
          <script>
            window.onload = function() {
              try {
                setTimeout(function(){ window.focus(); window.print(); }, 500);
              } catch (e) {}
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.open()
    printWindow.document.write(printContent)
    printWindow.document.close()
    
    setTimeout(() => {
      try {
        printWindow.focus()
      } catch (e) {
        console.error('打印窗口焦点失败:', e)
      }
    }, 600)
    
    return { success: true, message: '打印窗口已打开' }
  } catch (error) {
    console.error('打印失败:', error)
    throw new Error(`打印失败: ${error.message}`)
  }
}

export const printViaCanvas = async (elementId) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('找不到要打印的元素')

    const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 2))
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })

    const printWindow = window.open('', '_blank')
    if (!printWindow) throw new Error('无法打开打印窗口')

    const ratio = 1 // 在打印窗口按原像素显示由浏览器缩放
    const slices = []
    const sliceHeight = Math.min(canvas.height, 1600) // 分片高度，避免一次性过长
    let rendered = 0
    while (rendered < canvas.height) {
      const height = Math.min(sliceHeight, canvas.height - rendered)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = height
      const ctx = slice.getContext('2d')
      ctx.drawImage(canvas, 0, rendered, canvas.width, height, 0, 0, canvas.width, height)
      slices.push(slice.toDataURL('image/png'))
      rendered += height
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>打印页面</title>
          <style>
            body{margin:0;padding:20px;background:#fff}
            img{display:block;width:100%;margin:0 0 10px 0}
            @page{size:auto;margin:10mm}
          </style>
        </head>
        <body>
          ${slices.map(src => `<img src="${src}" />`).join('')}
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { try { printWindow.focus(); printWindow.print(); } catch {} }, 400)
    return { success: true }
  } catch (e) {
    console.error('Canvas打印失败:', e)
    throw e
  }
}

export const printViaIframe = (elementId) => {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('找不到要打印的元素')

    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n')
        } catch (e) {
          return ''
        }
      })
      .join('\n')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>打印页面</title>
          <style>
            ${styles}
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none !important; }
              table { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()

    setTimeout(() => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch (e) {
        console.error('iframe打印失败:', e)
      } finally {
        document.body.removeChild(iframe)
      }
    }, 300)

    return { success: true }
  } catch (e) {
    console.error('Iframe打印失败:', e)
    throw e
  }
}

// 批量导出
export const batchExport = async (exportConfigs) => {
  const results = []
  
  for (const config of exportConfigs) {
    try {
      let result
      if (config.type === 'excel') {
        result = exportToExcel(config.data, config.filename, config.sheetName, config.dataType)
      } else if (config.type === 'pdf') {
        result = await exportToPDF(config.elementId, config.filename)
      }
      results.push({ ...config, success: true, result })
    } catch (error) {
      results.push({ ...config, success: false, error: error.message })
    }
  }
  
  return results
}

// 数据格式化工具
export const formatDataForExport = (data, type) => {
  if (!data || !Array.isArray(data)) return []
  
  // 确保 fieldMap 存在
  const fieldMap = fieldMaps[type] || {}
  
  return data.map(item => {
    const formatted = {}
    
    // 如果没有字段映射，直接使用原始键名
    if (Object.keys(fieldMap).length === 0) {
      Object.keys(item).forEach(key => {
        let value = item[key]
        
        // 格式化日期
        if (key.includes('date') || key.includes('_at')) {
          if (value) {
            try {
              value = formatDate(value)
            } catch (e) {
              // 保持原值
            }
          }
        }
        
        // 格式化数字
        if (typeof value === 'number' && key.includes('amount')) {
          value = formatCurrency(value, 'CNY')
        }
        
        formatted[key] = value || ''
      })
    } else {
      // 使用字段映射
      Object.keys(item).forEach(key => {
        const label = fieldMap[key] || key
        let value = item[key]
        
        // 格式化日期
        if (key.includes('date') || key.includes('_at')) {
          if (value) {
            try {
              value = formatDate(value)
            } catch (e) {
              // 保持原值
            }
          }
        }
        
        // 格式化数字
        if (typeof value === 'number' && key.includes('amount')) {
          value = formatCurrency(value, 'CNY')
        }
        
        formatted[label] = value || ''
      })
    }
    return formatted
  })
}

// 获取导出模板
export const getExportTemplate = (type) => {
  const fieldMap = fieldMaps[type]
  if (!fieldMap) return null
  
  const template = {}
  Object.entries(fieldMap).forEach(([key, label]) => {
    template[label] = ''
  })
  
  return [template]
}

export default {
  exportToExcel,
  exportToPDF,
  printElement,
  printViaCanvas,
  printViaIframe,
  batchExport,
  formatDataForExport,
  getExportTemplate,
  fieldMaps
}
