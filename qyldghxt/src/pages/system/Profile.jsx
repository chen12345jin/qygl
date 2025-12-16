import React, { useState } from 'react'
import { User, ArrowLeft, Mail, Phone, MapPin, Calendar, Edit2, Shield, Award, X, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { formatDateTime } from '../../utils/locale'
import toast from 'react-hot-toast'
import PageHeaderBanner from '../../components/PageHeaderBanner'

const Profile = () => {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { getDepartmentTargets, getActionPlans, getAnnualWorkPlans } = useData()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalTargets: 0,
    completedTasks: 0,
    inProgress: 0,
    completionRate: 0
  })
  const [activities, setActivities] = useState([])
  // 详细信息弹窗状态
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsType, setDetailsType] = useState('') // targets, completed, inProgress
  const [detailedData, setDetailedData] = useState([])
  // 完整的用户相关数据
  const [userRelatedData, setUserRelatedData] = useState({
    targets: [],
    completedPlans: [],
    inProgressPlans: [],
    allPlans: []
  })

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    join_date: ''
  })

  // 加载统计数据和最近活动
  React.useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return

      try {
        const [targetsRes, plansRes, annualRes] = await Promise.all([
          getDepartmentTargets({ year: new Date().getFullYear() }),
          getActionPlans(),
          getAnnualWorkPlans({ year: new Date().getFullYear() })
        ])

        const username = user.username
        const realName = user.name || user.username // 如果有真实姓名，优先匹配
        const userDept = user.department

        // 辅助函数：检查是否与用户相关
        const isRelatedToUser = (item, personField, deptField) => {
          const person = item[personField]
          const dept = item[deptField]
          return (person && (person === username || person === realName)) || 
                 (dept && dept === userDept)
        }

        // 1. 计算统计数据
        const allTargets = Array.isArray(targetsRes.data) ? targetsRes.data : []
        const userTargets = allTargets.filter(t => isRelatedToUser(t, 'responsible_person', 'department'))

        const allPlans = Array.isArray(plansRes.data) ? plansRes.data : []
        const userPlans = allPlans.filter(p => isRelatedToUser(p, 'who', 'department'))

        const completedPlans = userPlans.filter(p => ['completed', 'done', 'finished'].includes(p.status))
        const inProgressPlans = userPlans.filter(p => ['in_progress', 'ongoing', 'started'].includes(p.status))
        const completed = completedPlans.length
        const inProgress = inProgressPlans.length
        const totalPlans = userPlans.length
        const rate = totalPlans > 0 ? Math.round((completed / totalPlans) * 100) : 0

        // 保存完整的用户相关数据
        setUserRelatedData({
          targets: userTargets,
          completedPlans: completedPlans,
          inProgressPlans: inProgressPlans,
          allPlans: userPlans
        })

        setStats({
          totalTargets: userTargets.length,
          completedTasks: completed,
          inProgress: inProgress,
          completionRate: rate
        })

        // 2. 生成最近活动
        let allActivities = []

        // 部门目标动态
        userTargets.forEach(t => {
          allActivities.push({
            id: `target-${t.id}`,
            type: 'target',
            title: `部门目标: ${t.target_name}`,
            time: new Date(t.updated_at || t.created_at || Date.now()),
            color: 'bg-purple-500'
          })
        })

        // 行动计划动态
        userPlans.forEach(p => {
          allActivities.push({
            id: `plan-${p.id}`,
            type: 'plan',
            title: `行动计划: ${p.what}`,
            time: new Date(p.updated_at || p.created_at || Date.now()),
            color: 'bg-green-500'
          })
        })

        // 年度计划动态
        const allAnnual = Array.isArray(annualRes.data) ? annualRes.data : []
        allAnnual.filter(p => isRelatedToUser(p, 'responsible_person', 'department')).forEach(p => {
          allActivities.push({
            id: `annual-${p.id}`,
            type: 'annual',
            title: `年度计划: ${p.plan_name || p.task_name || '未命名计划'}`,
            time: new Date(p.updated_at || p.created_at || Date.now()),
            color: 'bg-blue-500'
          })
        })

        // 按时间倒序排序并取前10条
        allActivities.sort((a, b) => b.time - a.time)
        setActivities(allActivities.slice(0, 10))

      } catch (error) {
        console.error('加载个人资料数据失败:', error)
      }
    }

    loadProfileData()
  }, [user, getDepartmentTargets, getActionPlans, getAnnualWorkPlans])


  const userInfo = {
    username: user?.username || '管理员',
    email: user?.email || 'admin@company.com',
    phone: user?.phone || '+86 138-0013-8000',
    department: user?.department || '技术部',
    role: user?.role || '系统管理员',
    joinDate: user?.join_date ? new Date(user.join_date).toLocaleDateString() : (user?.created_at ? new Date(user.created_at).toLocaleDateString() : '2023-01-15'),
    lastLogin: user?.lastActive ? new Date(user.lastActive).toLocaleString() : '2024-12-25 14:30',
    avatar: null,
    permissions: user?.permissions || ['系统管理', '用户管理', '数据查看', '报表导出']
  }

  const handleEditClick = () => {
    setEditForm({
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      join_date: user?.join_date ? new Date(user.join_date).toISOString().split('T')[0] : (user?.created_at ? new Date(user.created_at).toISOString().split('T')[0] : ''),
      password: ''
    })
    setIsEditing(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // 构建更新数据，如果密码为空则不发送
    const updateData = {
      username: editForm.username,
      email: editForm.email,
      phone: editForm.phone,
      join_date: editForm.join_date
    }
    
    if (editForm.password) {
      updateData.password = editForm.password
    }

    try {
      const result = await updateUser(updateData)
      if (result.success) {
        toast.success('个人资料更新成功')
        setIsEditing(false)
      } else {
        toast.error('更新失败: ' + result.error)
      }
    } catch (error) {
      toast.error('更新发生错误')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 处理统计卡片点击事件，显示详细信息
  const handleStatsClick = (type) => {
    setDetailsType(type)
    
    switch (type) {
      case 'targets':
        setDetailedData(userRelatedData.targets)
        break
      case 'completed':
        setDetailedData(userRelatedData.completedPlans)
        break
      case 'inProgress':
        setDetailedData(userRelatedData.inProgressPlans)
        break
      case 'allPlans':
        setDetailedData(userRelatedData.allPlans)
        break
      default:
        setDetailedData([])
    }
    
    setShowDetailsModal(true)
  }

  return (
    <div className="space-y-6 p-6">
      {/* 标题区域 */}
      <PageHeaderBanner title="个人资料" subTitle="查看和编辑您的个人信息" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧 - 个人信息卡片 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                <User size={40} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">{userInfo.username}</h2>
              <p className="text-gray-600">{userInfo.role}</p>
              <div className="mt-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm rounded-full inline-block">
                {userInfo.department}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={16} className="text-gray-500" />
                <span className="text-gray-700">{userInfo.email}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone size={16} className="text-gray-500" />
                <span className="text-gray-700">{userInfo.phone}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-gray-700">入职时间: {userInfo.joinDate}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <MapPin size={16} className="text-gray-500" />
                <span className="text-gray-700">最后登录: {userInfo.lastLogin}</span>
              </div>
            </div>

            <button 
              onClick={handleEditClick}
              className="w-full mt-6 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Edit2 size={16} />
              <span>编辑资料</span>
            </button>
          </div>
        </div>

        {/* 右侧 - 详细信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 权限信息 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <Shield size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">系统权限</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {userInfo.permissions.map((permission, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{permission}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 统计信息 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                <Award size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">工作统计</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 年度目标卡片 */}
              <div 
                onClick={() => handleStatsClick('targets')}
                className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:from-blue-100 hover:to-blue-200"
              >
                <div className="text-2xl font-bold text-blue-600">{stats.totalTargets}</div>
                <div className="text-sm text-gray-600">年度目标</div>
                <div className="text-xs text-blue-500 mt-1">点击查看详情</div>
              </div>
              {/* 完成任务卡片 */}
              <div 
                onClick={() => handleStatsClick('completed')}
                className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:from-green-100 hover:to-green-200"
              >
                <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
                <div className="text-sm text-gray-600">完成任务</div>
                <div className="text-xs text-green-500 mt-1">点击查看详情</div>
              </div>
              {/* 进行中任务卡片 */}
              <div 
                onClick={() => handleStatsClick('inProgress')}
                className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:from-purple-100 hover:to-purple-200"
              >
                <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
                <div className="text-sm text-gray-600">进行中</div>
                <div className="text-xs text-purple-500 mt-1">点击查看详情</div>
              </div>
              {/* 完成率卡片 */}
              <div 
                onClick={() => handleStatsClick('allPlans')}
                className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:from-orange-100 hover:to-orange-200"
              >
                <div className="text-2xl font-bold text-orange-600">{stats.completionRate}%</div>
                <div className="text-sm text-gray-600">完成率</div>
                <div className="text-xs text-orange-500 mt-1">点击查看详情</div>
              </div>
            </div>
          </div>

          {/* 最近活动 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Calendar size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">最近活动</h3>
            </div>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                      <span className="text-sm text-gray-700">{activity.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDateTime(activity.time, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">暂无最近活动</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 编辑资料弹窗 */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* 弹窗头部 */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 size={20} />
                编辑个人资料
              </h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* 弹窗表单 */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  入职时间
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={editForm.join_date}
                    onChange={(e) => setEditForm({...editForm, join_date: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  用户名 <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入用户名"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  电子邮箱 <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入电子邮箱"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  联系电话
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入联系电话"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  新密码 <span className="text-gray-400 text-xs ml-2 font-normal">(留空保持不变)</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入新密码"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      保存修改
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 详细信息弹窗 */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* 弹窗头部 */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Award size={20} />
                {detailsType === 'targets' && '年度目标详情'}
                {detailsType === 'completed' && '已完成任务详情'}
                {detailsType === 'inProgress' && '进行中任务详情'}
                {detailsType === 'allPlans' && '完成率详情'}
              </h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {detailedData.length > 0 ? (
                <div className="space-y-4">
                  {/* 完成率概览信息 */}
                  {detailsType === 'allPlans' && (
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 mb-6">
                      <h4 className="text-lg font-semibold text-orange-800 mb-3">完成率概览</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <div className="text-xl font-bold text-orange-600">{detailedData.length}</div>
                          <div className="text-sm text-gray-600">总任务数</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <div className="text-xl font-bold text-green-600">{detailedData.filter(p => ['completed', 'done', 'finished'].includes(p.status)).length}</div>
                          <div className="text-sm text-gray-600">已完成任务</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <div className="text-xl font-bold text-purple-600">{detailedData.filter(p => ['in_progress', 'ongoing', 'started'].includes(p.status)).length}</div>
                          <div className="text-sm text-gray-600">进行中任务</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">完成率</span>
                          <span className="text-lg font-bold text-orange-800">{stats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-orange-500 h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${stats.completionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {detailsType === 'targets' ? (
                    /* 年度目标详情 */
                    detailedData.map((target, index) => (
                      <div key={target.id || index} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-semibold text-blue-800">{target.target_name || '未命名目标'}</h4>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${target.status === 'completed' ? 'bg-green-100 text-green-800' : target.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            {target.status === 'completed' ? '已完成' : target.status === 'in_progress' ? '进行中' : '未开始'}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-20">负责人：</span>
                            <span className="text-gray-800">{target.responsible_person || '未指定'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-20">所属部门：</span>
                            <span className="text-gray-800">{target.department || '未指定'}</span>
                          </div>
                          {target.target_value && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">目标值：</span>
                              <span className="text-gray-800">{target.target_value}</span>
                            </div>
                          )}
                          {target.completed_value && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">完成值：</span>
                              <span className="text-gray-800">{target.completed_value}</span>
                            </div>
                          )}
                          {(target.target_value && target.completed_value) && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">完成率：</span>
                              <span className="text-gray-800">{Math.round((target.completed_value / target.target_value) * 100)}%</span>
                            </div>
                          )}
                          {target.created_at && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">创建时间：</span>
                              <span className="text-gray-800">{formatDateTime(new Date(target.created_at), { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* 任务详情（已完成、进行中或所有任务） */
                    detailedData.map((plan, index) => {
                      const isCompleted = ['completed', 'done', 'finished'].includes(plan.status);
                      const isInProgress = ['in_progress', 'ongoing', 'started'].includes(plan.status);
                      return (
                        <div key={plan.id || index} className={`p-4 rounded-lg border hover:shadow-md transition-all ${isCompleted ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : isInProgress ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`text-lg font-semibold ${isCompleted ? 'text-green-800' : isInProgress ? 'text-purple-800' : 'text-gray-800'}`}>{plan.what || '未命名任务'}</h4>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-800' : isInProgress ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                              {isCompleted ? '已完成' : isInProgress ? '进行中' : '未开始'}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">负责人：</span>
                              <span className="text-gray-800">{plan.who || '未指定'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20">所属部门：</span>
                              <span className="text-gray-800">{plan.department || '未指定'}</span>
                            </div>
                            {plan.when && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20">计划时间：</span>
                                <span className="text-gray-800">{formatDateTime(new Date(plan.when), { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                            )}
                            {plan.how && (
                              <div className="md:col-span-2">
                                <div className="text-gray-500 mb-1">执行方式：</div>
                                <div className="text-gray-800 bg-white p-3 rounded border border-gray-200">{plan.how}</div>
                              </div>
                            )}
                            {plan.why && (
                              <div className="md:col-span-2">
                                <div className="text-gray-500 mb-1">任务原因：</div>
                                <div className="text-gray-800 bg-white p-3 rounded border border-gray-200">{plan.why}</div>
                              </div>
                            )}
                            {isCompleted && plan.completed_at && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20">完成时间：</span>
                                <span className="text-gray-800">{formatDateTime(new Date(plan.completed_at), { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg mb-2">暂无数据</div>
                  <div className="text-sm">该类别下没有相关数据</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile