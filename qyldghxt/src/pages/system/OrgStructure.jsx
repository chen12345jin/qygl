import React, { useEffect, useState } from 'react'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { ChevronDown, ChevronRight, User, Building2, FolderTree, Users, Layers, RefreshCw, Minimize2, Maximize2, Search } from 'lucide-react'
import { mergeEmployeesAsNodes } from '../../utils/orgSync'

const OrgNode = ({ node, level = 0, defaultExpanded = true, searchTerm = '' }) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  if (!node) return null
  
  const nodeType = (node.type || '').toUpperCase()
  const nodeName = node.name || ''
  // 判断是否是公司：type 为 COMPANY 或名称包含 "公司"
  const isCompany = nodeType === 'COMPANY' || nodeName.includes('公司')
  const isUser = nodeType === 'USER'
  
  // 搜索匹配高亮
  const isMatch = searchTerm && node.name?.toLowerCase().includes(searchTerm.toLowerCase())
  
  const hasChildren = node.children && node.children.length > 0
  const childCount = hasChildren ? node.children.length : 0

  // 根据节点类型设置样式
  const getNodeStyles = () => {
    if (isCompany) {
      return {
        icon: Building2,
        iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        iconColor: 'text-white',
        textStyle: 'text-gray-900 font-semibold',
        badge: { bg: 'bg-blue-100', text: 'text-blue-700', label: '公司' }
      }
    } else if (isUser) {
      return {
        icon: User,
        iconBg: 'bg-gradient-to-br from-gray-200 to-gray-300',
        iconColor: 'text-gray-600',
        textStyle: 'text-gray-600',
        badge: null
      }
    } else {
      return {
        icon: FolderTree,
        iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
        iconColor: 'text-white',
        textStyle: 'text-gray-800 font-medium',
        badge: { bg: 'bg-amber-100', text: 'text-amber-700', label: '部门' }
      }
    }
  }

  const styles = getNodeStyles()
  const Icon = styles.icon

  return (
    <div className="select-none">
      <div 
        className={`group flex items-center py-1.5 px-2 rounded-lg transition-all duration-200 cursor-pointer
          ${isMatch ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'hover:bg-gray-50'}
        `}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* 展开/收起箭头 */}
        <span className="w-5 h-5 flex items-center justify-center mr-1 flex-shrink-0">
          {hasChildren ? (
            <span className={`transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown size={14} className="text-gray-400" />
            </span>
          ) : <span className="w-4" />}
        </span>
        
        {/* 图标 */}
        <span className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 flex-shrink-0 shadow-sm ${styles.iconBg}`}>
          <Icon size={14} className={styles.iconColor} />
        </span>
        
        {/* 名称 */}
        <span className={`flex-1 text-sm truncate ${styles.textStyle}`}>
          {node.name}
        </span>
        
        {/* 子节点数量 */}
        {hasChildren && !isUser && (
          <span className="text-[10px] text-gray-400 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {childCount} 项
          </span>
        )}
        
        {/* 类型标签 */}
        {styles.badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles.badge.bg} ${styles.badge.text}`}>
            {styles.badge.label}
          </span>
        )}
      </div>

      {/* 子节点 */}
      {expanded && hasChildren && (
        <div className={`relative ${level > 0 ? 'ml-4' : ''}`}>
          {/* 连接线 */}
          <div className="absolute left-[18px] top-0 bottom-2 w-px bg-gray-200" style={{ marginLeft: `${level * 20}px` }} />
          {node.children.map((child, idx) => (
            <OrgNode 
              key={child.uniqueKey || child.id} 
              node={child} 
              level={level + 1}
              defaultExpanded={level < 1}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const OrgStructure = () => {
  const { getOrganizationTree, getEmployees, syncDepartmentsFromDingTalk, syncEmployeesFromDingTalk } = useData()
  const [treeData, setTreeData] = useState([])
  const [loading, setLoading] = useState(false)
  const [allExpanded, setAllExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [treeKey, setTreeKey] = useState(0)
  const [stats, setStats] = useState({ companies: 0, departments: 0, employees: 0 })

  const handleSync = async () => {
    setLoading(true)
    try {
      // 先同步钉钉部门数据
      await syncDepartmentsFromDingTalk()
      // 再同步钉钉员工数据
      await syncEmployeesFromDingTalk()
      // 最后获取最新的组织架构数据
      const [treeRes, empRes] = await Promise.all([getOrganizationTree(), getEmployees()])
      const tree = treeRes.success ? (treeRes.data || []) : []
      const employees = empRes.success ? (empRes.data || []) : []

      // 计算统计数据（基于原始数据）
      let companies = 0
      let departments = 0
      
      const countNodes = (nodes) => {
        nodes.forEach(node => {
          const nodeType = (node.type || '').toUpperCase()
          const nodeName = node.name || ''
          // 判断是否是公司：type 为 COMPANY 或名称包含 "公司"
          const isCompany = nodeType === 'COMPANY' || nodeName.includes('公司')
          
          if (isCompany) {
            companies++
          } else {
            // 默认为部门
            departments++
          }
          if (node.children && node.children.length > 0) {
            countNodes(node.children)
          }
        })
      }
      countNodes(tree)
      
      setStats({
        companies,
        departments,
        employees: employees.length
      })
      
      const treeWithEmployees = mergeEmployeesAsNodes(tree, employees)
      setTreeData(treeWithEmployees)
    } catch (error) {
      setTreeData([])
      setStats({ companies: 0, departments: 0, employees: 0 })
    } finally {
      setLoading(false)
    }
  }

  const toggleAllExpanded = () => {
    setAllExpanded(!allExpanded)
    setTreeKey(prev => prev + 1) // 强制重新渲染树
  }

  useEffect(() => {
    handleSync()
  }, [])

  return (
    <div className="space-y-4 p-6">
      <PageHeaderBanner title="组织架构" subTitle="公司、部门与员工的统一视图" />
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs">公司</p>
              <p className="text-2xl font-bold mt-1">{stats.companies}</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs">部门</p>
              <p className="text-2xl font-bold mt-1">{stats.departments}</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Layers size={20} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs">员工</p>
              <p className="text-2xl font-bold mt-1">{stats.employees}</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 工具栏 */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-800">组织架构图</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              treeData.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {treeData.length > 0 ? '已同步' : '无数据'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 搜索框 */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* 展开/收起全部 */}
            <button
              onClick={toggleAllExpanded}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={allExpanded ? '收起全部' : '展开全部'}
            >
              {allExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            
            {/* 同步钉钉组织架构按钮 */}
            <button
              onClick={handleSync}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? '同步中' : '同步钉钉组织架构'}</span>
            </button>
            
            {/* 刷新按钮 */}
            <button
              onClick={handleSync}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? '刷新中' : '刷新'}</span>
            </button>
          </div>
        </div>
        
        {/* 树形区域 - 限制高度可滚动 */}
        <div className="p-4 max-h-[480px] overflow-y-auto">
          {treeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <FolderTree size={40} className="mb-3 opacity-30" />
              <p className="text-sm">暂无组织架构数据</p>
              <p className="text-xs text-gray-300 mt-1">请先在部门管理中添加数据</p>
            </div>
          ) : (
            <div key={treeKey} className="space-y-0.5">
              {treeData.map((root) => (
                <OrgNode 
                  key={root.uniqueKey || root.id} 
                  node={root}
                  defaultExpanded={allExpanded || true}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* 图例 */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Building2 size={10} className="text-white" />
            </span>
            <span>公司</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <FolderTree size={10} className="text-white" />
            </span>
            <span>部门</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <User size={10} className="text-gray-600" />
            </span>
            <span>员工</span>
          </div>
          <div className="ml-auto text-gray-400">
            点击节点可展开/收起
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrgStructure
