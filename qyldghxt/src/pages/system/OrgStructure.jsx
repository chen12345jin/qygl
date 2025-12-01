import React, { useEffect, useState } from 'react'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { buildOrgTreeWithEmployees } from '../../utils/orgSync'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'

const OrgNode = ({ node }) => {
  const [expanded, setExpanded] = useState(true)
  if (!node) return null
  return (
    <div className="ml-4 border-l border-slate-200 pl-3 my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center space-x-2 font-semibold text-slate-800 hover:text-blue-600"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>{node.name}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {Array.isArray(node.employees) && node.employees.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              {node.employees.map((emp) => (
                <span key={emp.id || emp.employee_id || emp.name} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  <Users size={12} className="mr-1" />{emp.name || emp.username || emp.employee_name}
                </span>
              ))}
            </div>
          )}
          {Array.isArray(node.children) && node.children.map((child) => (
            <OrgNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}

const OrgStructure = () => {
  const { getDepartments, getEmployees } = useData()
  const [treeData, setTreeData] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    const [deptRes, empRes] = await Promise.all([getDepartments(), getEmployees()])
    const departments = deptRes.success ? (deptRes.data || []) : []
    const employees = empRes.success ? (empRes.data || []) : []
    const tree = buildOrgTreeWithEmployees(departments, employees)
    setTreeData(tree)
    setLoading(false)
  }

  useEffect(() => {
    handleSync()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeaderBanner title="组织架构" subTitle="钉钉/企微部门与员工树形视图" />
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-800">组织树</h3>
          <button
            onClick={handleSync}
            disabled={loading}
            className={`px-3 py-2 ${loading ? 'bg-gray-300' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md`}
          >
            {loading ? '加载中...' : '刷新数据'}
          </button>
        </div>
        {treeData.length === 0 ? (
          <div className="text-sm text-slate-500">暂无数据</div>
        ) : (
          <div>
            {treeData.map((root) => (
              <OrgNode key={root.id} node={root} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrgStructure
