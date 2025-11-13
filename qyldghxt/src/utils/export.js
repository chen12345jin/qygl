import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
    what: '做什么',
    why: '为什么',
    who: '谁来做',
    when: '什么时候',
    where: '在哪里',
    how: '怎么做',
    how_much: '多少钱',
    department: '部门',
    priority: '优先级',
    status: '状态',
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
                value = new Date(value).toLocaleString('zh-CN')
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
                value = new Date(value).toLocaleString('zh-CN')
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
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })
    
    const imgData = canvas.toDataURL('image/png')
    
    // 创建PDF
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
    const imgX = (pdfWidth - imgWidth * ratio) / 2
    const imgY = 30
    
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
    
    // 添加标题
    pdf.setFontSize(16)
    pdf.text(filename, pdfWidth / 2, 20, { align: 'center' })
    
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
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.write(printContent)
    printWindow.document.close()
    
    return { success: true, message: '打印窗口已打开' }
  } catch (error) {
    console.error('打印失败:', error)
    throw new Error(`打印失败: ${error.message}`)
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
              value = new Date(value).toLocaleDateString('zh-CN')
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
              value = new Date(value).toLocaleDateString('zh-CN')
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
  batchExport,
  formatDataForExport,
  getExportTemplate,
  fieldMaps
}
