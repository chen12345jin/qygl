import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { computeActionPlanStatus, normalizeProgress } from '../utils/status'
import { ArrowLeft, Calendar, Users, MapPin, Settings, DollarSign, Info, CheckSquare } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import toast from 'react-hot-toast'

const ActionPlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getActionPlans, getDepartments } = useData()
  const [plan, setPlan] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlan()
    loadDepartments()
  }, [id])

  const loadPlan = async () => {
    setLoading(true)
    try {
      const result = await getActionPlans({ id })
      if (result.success && result.data && result.data.length > 0) {
        const data = result.data[0]
        // 计算进度和状态
        const actual = parseFloat(data.actual_result) || 0
        const budget = parseFloat(data.how_much) || 0
        let progress = 0
        if (budget > 0 && !isNaN(actual)) {
          progress = (actual / budget) * 100
        }
        progress = parseFloat(progress.toFixed(2))
        const normalizedProgress = normalizeProgress(progress)
        const dateToUse = data.end_date || data.start_date || data.when
        const status = computeActionPlanStatus(normalizedProgress, dateToUse)
        
        setPlan({ ...data, progress: normalizedProgress, status })
      } else {
        toast.error('未找到该行动计划')
        navigate('/action-plans')
      }
    } catch (error) {
      console.error('加载行动计划详情失败:', error)
      toast.error('加载失败，请稍后重试')
      navigate('/action-plans')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const getDepartmentName = (name) => {
    const dept = departments.find(d => d.name === name)
    return dept ? dept.name : name
  }

  const renderStatusBadge = (progress, status) => {
    let statusText = '未开始'
    let colorClass = ''
    
    if (progress === 100) {
      colorClass = 'bg-blue-100 text-blue-800'
      statusText = '已完成'
    } else if (progress > 75) {
      colorClass = 'bg-emerald-100 text-emerald-800'
      statusText = '即将完成'
    } else if (progress > 50) {
      colorClass = 'bg-orange-100 text-orange-800'
      statusText = '接近完成'
    } else if (progress > 25) {
      colorClass = 'bg-lime-100 text-lime-800'
      statusText = '进行中'
    } else if (progress > 0) {
      colorClass = 'bg-green-50 text-green-700'
      statusText = '初始'
    } else {
      colorClass = 'bg-white border border-gray-200 text-gray-500'
      statusText = '未开始'
    }
    
    if (status === 'delayed') {
       statusText += ' (延期)'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
        {statusText}
      </span>
    )
  }

  const renderPriorityBadge = (priority) => {
    const priorityMap = {
      high: { text: '高', color: 'bg-red-100 text-red-800' },
      medium: { text: '中', color: 'bg-yellow-100 text-yellow-800' },
      low: { text: '低', color: 'bg-green-100 text-green-800' }
    }
    const p = priorityMap[priority] || priorityMap.medium
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${p.color}`}>
        {p.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!plan) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* 返回按钮 */}
      <div className="flex items-center gap-3 px-4">
        <button 
          onClick={() => navigate('/action-plans')}
          className="flex items-center gap-2 px-4 h-10 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft size={16} />
          <span>返回列表</span>
        </button>
      </div>

      {/* 页面头部 */}
      <PageHeaderBanner
        title={`5W2H行动计划详情`}
        subTitle={plan.goal}
        year={plan.year}
      />

      {/* 行动计划详情卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mx-1">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 左侧：核心信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 事项标题 */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{plan.what}</h2>
              <div className="flex flex-wrap items-center gap-3">
                {renderStatusBadge(plan.progress, plan.status)}
                {renderPriorityBadge(plan.priority)}
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                  {plan.year}年度
                </span>
              </div>
            </div>

            {/* 5W2H详情 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                5W2H分析法详情
              </h3>
              
              {/* 5W2H网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* What - 做什么 */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare size={16} className="text-blue-600" />
                    <h4 className="font-medium text-blue-800">What (做什么)</h4>
                  </div>
                  <p className="text-gray-700">{plan.what}</p>
                </div>

                {/* Why - 为什么 */}
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={16} className="text-indigo-600" />
                    <h4 className="font-medium text-indigo-800">Why (为什么)</h4>
                  </div>
                  <p className="text-gray-700">{plan.why}</p>
                </div>

                {/* Who - 谁来做 */}
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={16} className="text-purple-600" />
                    <h4 className="font-medium text-purple-800">Who (谁来做)</h4>
                  </div>
                  <p className="text-gray-700">{plan.who}</p>
                </div>

                {/* When - 什么时候做 */}
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-pink-600" />
                    <h4 className="font-medium text-pink-800">When (什么时候做)</h4>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-700">开始日期：{plan.start_date || '-'}</p>
                    <p className="text-gray-700">结束日期：{plan.end_date || '-'}</p>
                  </div>
                </div>

                {/* Where - 在哪里做 */}
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-orange-600" />
                    <h4 className="font-medium text-orange-800">Where (在哪里做)</h4>
                  </div>
                  <p className="text-gray-700">{plan.where || '-'}</p>
                </div>

                {/* How - 如何做 */}
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings size={16} className="text-teal-600" />
                    <h4 className="font-medium text-teal-800">How (如何做)</h4>
                  </div>
                  <p className="text-gray-700">{plan.how}</p>
                </div>

                {/* How Much - 多少成本 */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-emerald-600" />
                    <h4 className="font-medium text-emerald-800">How Much (多少成本)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <div className="text-sm text-gray-500 mb-1">投入预算</div>
                      <div className="text-xl font-semibold text-emerald-700">{plan.how_much || 0}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <div className="text-sm text-gray-500 mb-1">实际结果</div>
                      <div className="text-xl font-semibold text-emerald-700">{plan.actual_result || 0}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <div className="text-sm text-gray-500 mb-1">完成进度</div>
                      <div className="text-xl font-semibold text-emerald-700">{plan.progress}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 目标与备注 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 目标 */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-2">目标 (SMART)</h4>
                <p className="text-gray-700">{plan.goal || '-'}</p>
              </div>
              
              {/* 备注 */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-2">备注</h4>
                <p className="text-gray-700">{plan.remarks || '-'}</p>
              </div>
            </div>
          </div>

          {/* 右侧：辅助信息 */}
          <div className="space-y-6">
            {/* 负责部门 */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">负责部门</h4>
              <div className="text-lg text-gray-700">{getDepartmentName(plan.department)}</div>
            </div>

            {/* 进度详情 */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">进度详情</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>完成进度</span>
                    <span>{plan.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(plan.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>投入预算</span>
                    <span>{plan.how_much || 0}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>实际结果</span>
                    <span>{plan.actual_result || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>进度计算</span>
                    <span className="text-gray-800 font-medium">
                      ({plan.actual_result || 0} / {plan.how_much || 1}) × 100%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 时间信息 */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">时间信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-500" />
                  <span className="text-gray-600">开始日期：</span>
                  <span className="text-gray-800 font-medium">{plan.start_date || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-500" />
                  <span className="text-gray-600">结束日期：</span>
                  <span className="text-gray-800 font-medium">{plan.end_date || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作日志（如果需要） */}
      {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mx-1">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">操作日志</h3>
        <div className="space-y-3">
          <div className="text-sm text-gray-500 italic">暂无操作日志</div>
        </div>
      </div> */}
    </div>
  )
}

export default ActionPlanDetail
