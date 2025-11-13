import React, { useState, useEffect } from 'react'
import TableManager from '../components/TableManager'
import FormField from '../components/FormField'
import { useData } from '../contexts/DataContext'
import { useFormValidation } from '../contexts/FormValidationContext'
import { exportToExcel } from '../utils/export'
import { TrendingUp, Filter, Table, List, Download, Upload, Building, Award, Target, Calendar, RefreshCcw } from 'lucide-react'
import * as XLSX from 'xlsx'

const DepartmentTargets = () => {
  const { getDepartmentTargets, addDepartmentTarget, updateDepartmentTarget, deleteDepartmentTarget, getDepartments } = useData()
  const { getRequiredFields, validateForm, errors, clearAllErrors } = useFormValidation()
  const [targets, setTargets] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'table'
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    department: '',
    targetType: ''
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // 获取部门目标模块的必填字段
  const requiredFields = getRequiredFields('departmentTargets')

  useEffect(() => {
    loadTargets()
    loadDepartments()
  }, [filters])

  const loadTargets = async () => {
    const result = await getDepartmentTargets(filters)
    if (result.success) {
      setTargets(result.data || [])
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const handleAdd = async (data) => {
    // 表单验证
    const validation = validateForm(data, 'departmentTargets')
    if (!validation.isValid) {
      return false // 验证失败，不提交
    }

    const result = await addDepartmentTarget({
      ...data,
      year: filters.year
    })
    if (result.success) {
      loadTargets()
      clearAllErrors() // 清除验证错误
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    // 表单验证
    const validation = validateForm(data, 'departmentTargets')
    if (!validation.isValid) {
      return false // 验证失败，不提交
    }

    const result = await updateDepartmentTarget(id, data)
    if (result.success) {
      loadTargets()
      setEditingId(null)
      clearAllErrors() // 清除验证错误
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteDepartmentTarget(id)
    if (result.success) {
      loadTargets()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    handleAdd(newData)
  }

  // 导出Excel函数
  const handleExportToExcel = () => {
    try {
      // 准备导出数据
      const exportData = targets.map(target => ({
        year: target.year,
        department: target.department,  // 现在从JOIN查询中获取部门名称
        target_level: target.target_level,
        target_type: target.target_type,
        target_name: target.target_name,
        target_value: target.target_value,
        unit: target.unit,
        month: target.month,
        current_value: target.current_value,
        completion_rate: target.current_value && target.target_value 
          ? ((target.current_value / target.target_value) * 100).toFixed(1) + '%'
          : '0%',
        responsible_person: target.responsible_person,
        description: target.description,
        created_at: target.created_at
      }))

      // 调用导出函数
      exportToExcel(exportData, `部门目标分解_${filters.year}年`, '部门目标', 'departmentTargets')
    } catch (error) {
      console.error('导出Excel失败:', error)
      alert('导出失败，请稍后重试')
    }
  }

  const handleImportFromExcel = async (file) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)
      for (const row of rows) {
        const dept = departments.find(d => d.name === (row['部门'] || row['部门名称']))
        const payload = {
          year: Number(row['年度'] || filters.year),
          department_id: dept ? dept.id : undefined,
          target_level: row['级别'] || 'A',
          target_type: row['目标类型'] || '',
          target_name: row['目标名称'] || '',
          target_value: row['目标值'] ? Number(row['目标值']) : null,
          unit: row['单位'] || '',
          month: row['月份'] ? Number(row['月份']) : null,
          current_value: row['当前值'] ? Number(row['当前值']) : 0,
          responsible_person: row['负责人'] || '',
          description: row['描述'] || ''
        }
        await addDepartmentTarget(payload)
      }
      await loadTargets()
      alert('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      alert('导入失败，请检查文件格式')
    }
  }

  const columns = [
    { 
      key: 'department_id', 
      label: '部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.id, label: dept.name })),
      required: requiredFields.includes('department'),
      hint: '选择目标所属的部门'
    },
    { 
      key: 'target_level', 
      label: '级别', 
      type: 'select',
      options: [
        { value: 'A', label: 'A - 保底' },
        { value: 'B', label: 'B - 平衡' },
        { value: 'C', label: 'C - 突破' },
        { value: 'D', label: 'D - 冲刺' }
      ],
      required: requiredFields.includes('targetLevel'),
      hint: '目标难度级别：A保底、B平衡、C突破、D冲刺'
    },
    { 
      key: 'target_type', 
      label: '目标类型', 
      type: 'select',
      options: [
        { value: 'sales', label: '销售目标' },
        { value: 'profit', label: '利润目标' },
        { value: 'project', label: '项目目标' },
        { value: 'efficiency', label: '效率目标' },
        { value: 'quality', label: '质量目标' },
        { value: 'cost', label: '成本目标' }
      ],
      required: requiredFields.includes('targetType'),
      hint: '选择目标的业务类型',
      // 添加目标类型变化时的处理函数
      onChange: (value, setFormData, formData) => {
        // 设置目标名称为选中的目标类型的中文名称
        const targetTypeMap = {
          'sales': '销售目标',
          'profit': '利润目标',
          'project': '项目目标',
          'efficiency': '效率目标',
          'quality': '质量目标',
          'cost': '成本目标'
        };
        
        setFormData({
          ...formData,
          target_type: value,
          target_name: targetTypeMap[value] || ''
        });
      }
    },
    { 
      key: 'target_name', 
      label: '目标名称', 
      required: requiredFields.includes('targetName'),
      hint: '具体的目标名称描述'
    },
    { 
      key: 'target_value', 
      label: '目标值', 
      type: 'number', 
      required: requiredFields.includes('targetValue'),
      hint: '目标的具体数值'
    },
    { 
      key: 'unit', 
      label: '单位',
      hint: '目标值的计量单位，如：万元、个、%等'
    },
    { 
      key: 'quarter', 
      label: '季度', 
      type: 'select',
      options: [
        { value: 'Q1', label: '第一季度' },
        { value: 'Q2', label: '第二季度' },
        { value: 'Q3', label: '第三季度' },
        { value: 'Q4', label: '第四季度' }
      ],
      hint: '目标所属的季度'
    },
    { 
      key: 'month', 
      label: '月份', 
      type: 'select',
      options: Array.from({ length: 12 }, (_, i) => ({ 
        value: i + 1, 
        label: `${i + 1}月` 
      })),
      hint: '目标所属的月份'
    },
    { 
      key: 'current_value', 
      label: '当前值', 
      type: 'number',
      hint: '目标的当前完成数值'
    },
    { 
      key: 'completion_rate', 
      label: '完成率', 
      render: (value, item) => {
        const rate = item.current_value && item.target_value 
          ? (item.current_value / item.target_value * 100).toFixed(1)
          : 0
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${
            rate >= 100 ? 'bg-green-100 text-green-800' :
            rate >= 80 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {rate}%
          </span>
        )
      }
    },
    { 
      key: 'responsible_person', 
      label: '负责人',
      required: requiredFields.includes('responsible'),
      hint: '目标的主要负责人'
    },
    { 
      key: 'description', 
      label: '描述', 
      type: 'textarea',
      hint: '目标的详细描述和说明（选填）'
    }
  ]

  // 生成表格视图数据
  const generateTableData = () => {
    const tableData = {
      departments: [...new Set(targets.map(t => t.department))],
      levels: ['A', 'B', 'C', 'D'],
      months: Array.from({ length: 12 }, (_, i) => i + 1),
      data: {}
    }

    // 初始化数据结构
    tableData.departments.forEach(dept => {
      tableData.data[dept] = {}
      tableData.levels.forEach(level => {
        tableData.data[dept][level] = {}
        tableData.months.forEach(month => {
          tableData.data[dept][level][month] = []
        })
      })
    })

    // 填充数据
    targets.forEach(target => {
      const dept = target.department
      const level = target.target_level || 'A'
      const month = target.month || 1

      if (tableData.data[dept] && tableData.data[dept][level]) {
        if (!tableData.data[dept][level][month]) {
          tableData.data[dept][level][month] = []
        }
        tableData.data[dept][level][month].push(target)
      }
    })

    return tableData
  }

  const tableData = generateTableData()

  const levelLabels = {
    'A': '保底',
    'B': '平衡', 
    'C': '突破',
    'D': '冲刺'
  }

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  return (
    <div className="space-y-6 p-6 relative">
      {/* 页面标题区域 - 与欢迎区保持一致的配色 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white overflow-hidden">
        {/* 背景装饰元素，与欢迎区一致 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-white rounded-full animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <TrendingUp size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                部门目标分解
              </h1>
              <p className="text-blue-100 text-lg font-medium">管理和跟踪各部门的年度目标设定与执行情况</p>
            </div>
          </div>
          
          {/* 统计信息卡片 */}
          <div className="grid grid-cols-3 gap-6 mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-100 shadow-lg">
              <div className="text-2xl font-bold text-blue-600">{departments.length}</div>
              <div className="text-sm text-gray-600">参与部门</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-green-100 shadow-lg">
              <div className="text-2xl font-bold text-green-600">{targets.length}</div>
              <div className="text-sm text-gray-600">目标总数</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-purple-100 shadow-lg">
              <div className="text-2xl font-bold text-purple-600">
                {targets.filter(t => t.current_value && t.target_value && t.current_value >= t.target_value).length}
              </div>
              <div className="text-sm text-gray-600">已完成目标</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器区域 - 将选择器收纳到筛选按钮弹层（旧位置隐藏） */}
      {false && (
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 border border-gray-100 shadow-xl z-10 mt-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <button 
              className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-sm gap-2"
              onClick={() => setIsFilterOpen(prev => !prev)}
            >
              <Filter size={16} />
              <span>筛选</span>
            </button>
            {isFilterOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">年份</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/60 backdrop-blur-sm transition-all duration-200 hover:border-blue-300 text-sm"
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">部门</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/60 backdrop-blur-sm transition-all duration-200 hover:border-green-300 text-sm"
                      value={filters.department}
                      onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    >
                      <option value="">全部部门</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">类型</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/60 backdrop-blur-sm transition-all duration-200 hover:border-purple-300 text-sm"
                      value={filters.targetType}
                      onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                    >
                      <option value="">全部类型</option>
                      <option value="sales">销售</option>
                      <option value="profit">利润</option>
                      <option value="project">项目</option>
                      <option value="efficiency">效率</option>
                      <option value="quality">质量</option>
                      <option value="cost">成本</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button 
                    className="h-9 px-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-all text-sm"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    关闭
                  </button>
                  <button 
                    className="h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all text-sm"
                    onClick={() => { loadTargets(); setIsFilterOpen(false) }}
                  >
                    应用筛选
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <button 
              className="h-10 px-4 border border-gray-300 text-gray-700 bg-white/70 backdrop-blur-sm rounded-xl font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-1"
              onClick={() => setFilters({
                year: new Date().getFullYear(),
                department: '',
                targetType: ''
              })}
            >
              <RefreshCcw size={16} />
              <span className="whitespace-nowrap">重置</span>
            </button>
          </div>
        </div>
      </div>
      )}


      {/* 数据视图与筛选按钮区 */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Table size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">数据视图</h3>
              <p className="text-gray-600 text-sm">选择最适合您的数据查看方式</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              className="px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700"
              onClick={() => setIsFilterOpen(prev => !prev)}
            >
              <Filter className="mr-2" size={18} />
              筛选
            </button>
            <button 
              className="px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center bg-white/80 text-gray-700 hover:bg-gray-100 border border-gray-300"
              onClick={() => {
                setFilters({ year: new Date().getFullYear(), department: '', targetType: '' })
                loadTargets()
              }}
            >
              <RefreshCcw className="mr-2" size={18} />
              重置
            </button>
            <div className="flex space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-100 shadow-lg">
              <button 
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                    : 'bg-white/50 text-gray-600 hover:bg-gray-50/80 hover:text-gray-800'
                }`}
                onClick={() => setViewMode('list')}
              >
                <List className="mr-2" size={18} />
                列表视图
              </button>
              <button 
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center ${
                  viewMode === 'table' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                    : 'bg-white/50 text-gray-600 hover:bg-gray-50/80 hover:text-gray-800'
                }`}
                onClick={() => setViewMode('table')}
              >
                <Table className="mr-2" size={18} />
                表格视图
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 中间筛选面板：位于数据视图与目标列表/表格之间 */}
      {isFilterOpen && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-200 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">年份</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">部门</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              >
                <option value="">全部部门</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">类型</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                value={filters.targetType}
                onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
              >
                <option value="">全部类型</option>
                <option value="sales">销售</option>
                <option value="profit">利润</option>
                <option value="project">项目</option>
                <option value="efficiency">效率</option>
                <option value="quality">质量</option>
                <option value="cost">成本</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button 
              className="h-9 px-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-all text-sm"
              onClick={() => setIsFilterOpen(false)}
            >
              关闭
            </button>
            <button 
              className="h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all text-sm"
              onClick={() => { loadTargets(); setIsFilterOpen(false) }}
            >
              应用筛选
            </button>
          </div>
        </div>
      )}

      {/* 列表视图 - 现代化设计 */}
      {viewMode === 'list' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <List size={24} className="text-blue-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">目标列表</h3>
                  <p className="text-gray-600 text-sm">按部门和时间维度展示目标详情</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                共 {targets.length} 条记录
              </div>
            </div>
          </div>
          
          <div className="p-1">
            <TableManager
              title={`${filters.year}年度目标分解`}
              data={targets}
              columns={columns}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
              editingId={editingId}
              onEditingChange={setEditingId}
              showActions={true}
              pagination={true}
              pageSize={10}
              className="rounded-2xl overflow-hidden"
            />
          </div>
        </div>
      )}

      {/* 表格视图 - 现代化设计 */}
      {viewMode === 'table' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Table size={24} className="text-purple-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">目标分解详情</h3>
                  <p className="text-gray-600 text-sm">各部门月度目标分解情况</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-teal-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  onClick={handleExportToExcel}
                >
                  <Download size={18} />
                  <span>导出Excel</span>
                </button>
                <label className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl cursor-pointer">
                  <Upload size={18} />
                  <span>导入Excel</span>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
                </label>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex items-center">
                      <Building size={16} className="mr-2 text-blue-500" />
                      部门
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex items-center">
                      <Award size={16} className="mr-2 text-green-500" />
                      级别
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-purple-500" />
                      目标类型
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-orange-500" />
                      年度目标
                    </div>
                  </th>
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <th key={month} className="px-4 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">{month}月</span>
                        <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mt-1"></div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.departments.map((department, deptIndex) => (
                  tableData.levels.map((level, levelIndex) => {
                    const hasData = tableData.months.some(month => 
                      tableData.data[department] && 
                      tableData.data[department][level] && 
                      tableData.data[department][level][month] && 
                      tableData.data[department][level][month].length > 0
                    )
                    
                    if (!hasData) return null
                    
                    return (
                      <tr key={`${deptIndex}-${levelIndex}`} className="hover:bg-gradient-to-r from-blue-50/30 to-purple-50/30 transition-all duration-200 group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 border-b border-gray-100 group-hover:border-blue-100">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            {department}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 group-hover:border-green-100">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {levelLabels[level] || level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 group-hover:border-purple-100">
                          {tableData.data[department] && tableData.data[department][level] && 
                            Object.values(tableData.data[department][level]).flat().map(t => t.target_type).filter(Boolean)[0] || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 border-b border-gray-100 group-hover:border-orange-100">
                          {tableData.data[department] && tableData.data[department][level] && 
                            Object.values(tableData.data[department][level]).flat().reduce((sum, t) => sum + (t.target_value || 0), 0) || '-'}
                        </td>
                        {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                          const monthData = tableData.data[department] && 
                            tableData.data[department][level] && 
                            tableData.data[department][level][month]
                          
                          const targetValue = monthData ? 
                            monthData.reduce((sum, t) => sum + (t.target_value || 0), 0) : 0
                          
                          return (
                            <td key={month} className="px-4 py-4 text-center text-sm text-gray-600 border-b border-gray-100 group-hover:border-gray-200">
                              <div className={`inline-flex items-center px-2 py-1 rounded-lg ${
                                targetValue > 0 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : 'bg-gray-50 text-gray-500 border border-gray-200'
                              }`}>
                                {targetValue > 0 ? targetValue : '-'}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )).filter(Boolean)}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>部门目标</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>级别标识</span>
                </div>
              </div>
              <div>
                共 {targets.length} 条记录 • 更新时间: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DepartmentTargets
