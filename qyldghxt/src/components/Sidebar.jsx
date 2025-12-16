import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Target, 
  Calendar, 
  AlertTriangle, 
  TrendingUp,
  CheckSquare,
  BarChart3,
  BarChart,
  Settings,
  Building2,
  Users,
  Shield,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Menu,
  Info,
  GitBranch,
  Bell,
  Database
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { appVersion } from '../version'

const Sidebar = ({ collapsed, setCollapsed, currentPath }) => {
  const { user } = useAuth()
  const [systemMenuOpen, setSystemMenuOpen] = useState(currentPath.startsWith('/system'))
  const location = useLocation()

  const menuItems = [
    { id: 'dashboard', icon: Home, label: '首页概览', path: '/dashboard' },
    { id: 'department-targets', icon: Target, label: '部门目标分解', path: '/department-targets', perm: '数据查看' },
    { id: 'annual-planning', icon: Calendar, label: '年度规划表', path: '/annual-planning', perm: '数据查看' },
    { id: 'annual-planning-chart', icon: BarChart3, label: '年度规划图表', path: '/annual-planning-chart', perm: '数据查看' },
    { id: 'annual-work-plan', icon: FileText, label: '年度工作规划', path: '/annual-work-plan', perm: '数据查看' },
    { id: 'major-events', icon: AlertTriangle, label: '大事件提炼', path: '/major-events', perm: '数据查看' },
    { id: 'monthly-progress', icon: TrendingUp, label: '月度推进计划', path: '/monthly-progress', perm: '数据查看' },
    { id: 'action-plans', icon: CheckSquare, label: '5W2H行动计划', path: '/action-plans', perm: '数据查看' },
    { id: 'score-and-output', icon: Database, label: '积分 & 产值', path: '/score-and-output', perm: 'admin' },
    { id: 'data-analysis', icon: BarChart, label: '数据分析', path: '/data-analysis', perm: '数据查看' },
  ]

  const systemMenuItems = [
    { id: 'company-info', icon: Info, label: '公司信息', path: '/system/company-info', perm: '系统管理' },
    { id: 'departments', icon: Building2, label: '部门管理', path: '/system/departments', perm: '系统管理' },
    { id: 'employees', icon: Users, label: '员工管理', path: '/system/employees', perm: '系统管理' },
    { id: 'org-structure', icon: GitBranch, label: '组织架构', path: '/system/org-structure', perm: '系统管理' },
    { id: 'roles', icon: Shield, label: '角色管理', path: '/system/roles', perm: '系统管理' },
    { id: 'users', icon: Users, label: '用户管理', path: '/system/users', perm: '用户管理' },
    { id: 'logs', icon: FileText, label: '系统日志', path: '/system/logs', perm: '系统管理' },

    { id: 'templates', icon: FileText, label: '模板设置', path: '/system/templates', perm: '系统管理' },
    { id: 'dingtalk', icon: Bell, label: '钉钉集成', path: '/system/dingtalk', perm: '系统管理' },
    { id: 'settings', icon: Settings, label: '系统设置', path: '/system/settings', perm: '系统管理' },
  ]

  if (!user) {
    return null
  }

  if (collapsed) {
    return (
      <div className="w-16 bg-gradient-to-b from-slate-50 to-slate-100 shadow-xl border-r border-slate-200/50 flex flex-col backdrop-blur-sm">
        <div className="p-4 border-b border-slate-200/50">
          <button
            onClick={() => setCollapsed(false)}
            className="text-slate-600 hover:text-blue-600 transition-all duration-300 hover:scale-110"
          >
            <Menu size={24} />
          </button>
        </div>
        <nav className="flex-1 mt-4 px-2 overflow-y-auto">
          {menuItems.filter(m => !m.perm || (user && (user.permissions?.includes('admin') || user.permissions?.includes(m.perm)))).map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center justify-center p-3 rounded-lg mb-2 transition-all duration-300 hover:scale-105 ${
                location.pathname === item.path
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                  : 'text-slate-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-md'
              }`}
              title={item.label}
            >
              <item.icon size={20} />
            </Link>
          ))}
          <div className="border-t border-slate-200/50 mt-4 pt-4">
            <button
              onClick={() => {
                setSystemMenuOpen(!systemMenuOpen)
                if (!systemMenuOpen) setCollapsed(false)
              }}
              className="w-full flex items-center justify-center p-3 rounded-lg mb-2 text-slate-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 transition-all duration-300 hover:scale-105"
              title="系统管理"
            >
              <Settings size={20} />
            </button>
          </div>
        </nav>
      </div>
    )
  }

  return (
    <div className="w-64 bg-gradient-to-b from-slate-50 to-slate-100 shadow-xl border-r border-slate-200/50 flex flex-col backdrop-blur-sm">
      <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
              企业年度规划系统
              <span className="ml-2 text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">v{appVersion}</span>
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">泉州太禾服饰有限公司</p>
          </div>
          <div></div>
        </div>
      </div>
      
      <nav className="flex-1 mt-4 px-3 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 hover:translate-x-1 ${
              location.pathname === item.path
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-l-4 border-blue-400' 
                : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-md border-l-4 border-transparent'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              location.pathname === item.path 
                ? 'bg-white/20' 
                : 'bg-blue-100/50'
            }`}>
              <item.icon size={18} className={location.pathname === item.path ? 'text-white' : 'text-blue-500'} />
            </div>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
        
        <div className="mt-6">
          <button
            onClick={() => setSystemMenuOpen(!systemMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 rounded-xl transition-all duration-300 hover:translate-x-1"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100/50">
                <Settings size={18} className="text-purple-500" />
              </div>
              <span className="font-medium">系统管理</span>
            </div>
            {systemMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
              {systemMenuOpen && (
                <div className="ml-4 mt-2 space-y-2">
                  {systemMenuItems.filter(m => !m.perm || (user && (user.permissions?.includes('admin') || user.permissions?.includes(m.perm)))).map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-300 hover:translate-x-1 ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/25' 
                      : 'text-slate-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${
                    location.pathname === item.path 
                      ? 'bg-white/20' 
                      : 'bg-purple-100/50'
                  }`}>
                    <item.icon size={16} className={location.pathname === item.path ? 'text-white' : 'text-purple-500'} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
      
      {/* 系统状态 */}
      <div className="p-4 border-t border-slate-200/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="text-sm font-semibold text-green-700">系统运行正常</div>
      </div>
    </div>
  )
}

export default Sidebar
