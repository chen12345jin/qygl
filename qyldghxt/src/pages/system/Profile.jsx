import React from 'react'
import { User, ArrowLeft, Mail, Phone, MapPin, Calendar, Edit2, Shield, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const Profile = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const userInfo = {
    username: user?.username || '管理员',
    email: user?.email || 'admin@company.com',
    phone: user?.phone || '+86 138-0013-8000',
    department: user?.department || '技术部',
    role: user?.role || '系统管理员',
    joinDate: '2023-01-15',
    lastLogin: '2024-12-25 14:30',
    avatar: null,
    permissions: ['系统管理', '用户管理', '数据查看', '报表导出']
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              <div className="p-3 bg-gradient-to-r from-white/20 to-white/30 rounded-lg shadow-lg">
                <User size={24} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                个人资料
              </h1>
            </div>
            <p className="text-blue-100 text-lg">查看和编辑您的个人信息</p>
          </div>
        </div>

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

              <button className="w-full mt-6 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl">
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
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-gray-600">年度目标</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">45</div>
                  <div className="text-sm text-gray-600">完成任务</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">8</div>
                  <div className="text-sm text-gray-600">进行中</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">95%</div>
                  <div className="text-sm text-gray-600">完成率</div>
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
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">登录系统</span>
                  </div>
                  <span className="text-xs text-gray-500">今天 14:30</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">完成月度报告</span>
                  </div>
                  <span className="text-xs text-gray-500">今天 11:20</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">更新部门目标</span>
                  </div>
                  <span className="text-xs text-gray-500">昨天 16:45</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile