import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, Building2, User, FolderTree } from 'lucide-react'

const TreeSelect = ({ value, onChange, options = [], placeholder = '请选择', disabled = false, excludeIds = [] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  // 过滤掉需要排除的节点及其子节点
  const filterExcludedNodes = (nodes) => {
    return nodes.filter(node => !excludeIds.includes(node.id)).map(node => {
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: filterExcludedNodes(node.children)
        }
      }
      return node
    })
  }
  
  const filteredOptions = excludeIds.length > 0 ? filterExcludedNodes(options) : options

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const findNodeById = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, id)
        if (found) return found
      }
    }
    return null
  }

  const selectedNode = value ? findNodeById(filteredOptions, value) : null
  const displayText = selectedNode ? selectedNode.name : placeholder

  const renderTreeNode = (node, level = 0) => {
    const isSelected = value === node.id
    const isExcluded = excludeIds.includes(node.id)
    
    const nodeType = node.type || 'DEPT'
    const isCompany = nodeType === 'COMPANY'
    const isUser = nodeType === 'USER' // Assumption: Employees might be in the tree with type 'USER'
    
    // Logic: Disable if explicitly excluded OR if it's a User node (cannot select User as parent)
    const isDisabled = isExcluded || isUser

    let Icon = FolderTree
    let iconColor = 'text-amber-500'
    let textColor = 'text-gray-700'
    let typeLabel = '部门'
    let typeLabelColor = 'text-amber-500 bg-amber-50 border-amber-200'

    if (isCompany) {
      Icon = Building2
      iconColor = 'text-blue-600'
      textColor = 'text-gray-900 font-bold'
      typeLabel = '公司'
      typeLabelColor = 'text-blue-600 bg-blue-50 border-blue-200'
    } else if (isUser) {
      Icon = User
      iconColor = 'text-gray-400'
      textColor = 'text-gray-500'
      typeLabel = '员工'
      typeLabelColor = 'text-gray-500 bg-gray-50 border-gray-200'
    }

    return (
      <div key={node.id}>
        <div
          className={`flex items-center px-3 py-2 transition-colors ${
            isDisabled 
              ? 'bg-gray-50 cursor-not-allowed opacity-60' 
              : 'hover:bg-gray-100 cursor-pointer'
          } ${isSelected ? 'bg-blue-50' : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => {
            if (!isDisabled) {
              onChange(node.id)
              setIsOpen(false)
            }
          }}
          title={isDisabled ? (isUser ? '员工不能作为上级节点' : '此选项不可选') : ''}
        >
          <Icon size={16} className={`mr-2 ${iconColor}`} />
          <span className={`flex-1 text-sm ${textColor}`}>
            {node.name}
          </span>
          <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded border ${typeLabelColor}`}>
            {typeLabel}
          </span>
        </div>
        {node.children && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedNode ? 'text-gray-800' : 'text-gray-500'}>
            {displayText}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">暂无选项</div>
          ) : (
            filteredOptions.map(node => renderTreeNode(node))
          )}
        </div>
      )}
    </div>
  )
}

export default TreeSelect

