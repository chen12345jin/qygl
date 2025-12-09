import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatDateTime, formatDate } from '../utils/locale.js'

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
    target_type: '目标类型',
    month: '月份',
    sales_amount: '销售额',
    profit: '利润',
    completion_rate: '完成率',
    notes: '备注',
    created_at: '创建时间'
  },
  annualWorkPlans: {
    year: '年度',
    department: '部门',
    plan_name: '计划名称',
    objective: '目标',
    key_tasks: '关键任务',
    timeline: '时间线',
    resources: '资源需求',
    success_criteria: '成功标准',
    responsible_person: '负责人',
    status: '状态',
    created_at: '创建时间'
  },
  majorEvents: {
    year: '年度',
    event_name: '事件名称',
    event_type: '事件类型',
    priority: '优先级',
    description: '描述',
    impact: '影响',
    responsible_department: '负责部门',
    start_date: '开始日期',
    end_date: '结束日期',
    status: '状态',
    created_at: '创建时间'
  },
  monthlyProgress: {
    year: '年度',
    month: '月份',
    department: '部门',
    task_name: '任务名称',
    target: '目标',
    actual: '实际',
    progress: '进度',
    issues: '问题',
    next_steps: '下一步',
    responsible_person: '负责人',
    created_at: '创建时间'
  },
  actionPlans: {
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

// 导出Excel
export const exportToExcel = (data, filename, sheetName = 'Sheet1', dataType = 'default') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('没有数据可以导出')
  }

  try {
    // 获取字段映射，如果没有找到对应的映射，使用空对象
    const fieldMap = fieldMaps[dataType] || {}
    
    // 转换数据
    const exportData = data.map(item => {
      const row = {}
      
      // 如果没有字段映射，直接使用原始数据
      if (Object.keys(fieldMap).length === 0) {
        Object.keys(item).forEach(key => {
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
        // 使用字段映射转换
        Object.keys(item).forEach(key => {
          const label = fieldMap[key] || key
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
        })
      }
      return row
    })

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // 设置列宽
    const colWidths = []
    if (exportData.length > 0) {
      Object.keys(exportData[0]).forEach(key => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map(row => String(row[key] || '').length)
        )
        colWidths.push({ wch: Math.min(maxLength + 2, 50) })
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

    // 使用html2canvas截图
    const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 2))
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })
    
    const imgData = canvas.toDataURL('image/png')
    
    // 创建PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    const marginTop = 20
    const ratioW = pdfWidth / imgWidth
    const pageHeightPx = Math.floor((pdfHeight - marginTop) / ratioW)

    const sliceCanvas = (source, startY, height) => {
      const slice = document.createElement('canvas')
      slice.width = source.width
      slice.height = height
      const ctx = slice.getContext('2d')
      ctx.drawImage(source, 0, startY, source.width, height, 0, 0, source.width, height)
      return slice
    }

    let rendered = 0

    // 添加标题（第一页）
    pdf.setFontSize(16)
    pdf.text(filename, pdfWidth / 2, 15, { align: 'center' })

    while (rendered < imgHeight) {
      const sliceHeight = Math.min(pageHeightPx, imgHeight - rendered)
      const slice = sliceCanvas(canvas, rendered, sliceHeight)
      const sliceImg = slice.toDataURL('image/png')
      const displayHeightMm = sliceHeight * ratioW
      const y = rendered === 0 ? marginTop : 10
      pdf.addImage(sliceImg, 'PNG', 0, y, pdfWidth, displayHeightMm)
      rendered += sliceHeight
      if (rendered < imgHeight) pdf.addPage()
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
          value = value.toLocaleString('zh-CN', { 
            style: 'currency', 
            currency: 'CNY' 
          })
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
          value = value.toLocaleString('zh-CN', { 
            style: 'currency', 
            currency: 'CNY' 
          })
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
