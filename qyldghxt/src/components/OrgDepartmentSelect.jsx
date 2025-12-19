import React, { useEffect, useMemo, useState } from 'react'
import { useData } from '../contexts/DataContext'
import TreeSelect from './TreeSelect'

const EXCLUDED_BRANCH_KEYWORDS = ['公司信息', '钉钉部署', '外部人员']

const shouldExcludeBranch = (name) => {
  if (!name) return false
  const n = String(name)
  return EXCLUDED_BRANCH_KEYWORDS.some((k) => n.includes(k))
}

const filterOrgTreeForDepartment = (nodes) => {
  if (!Array.isArray(nodes)) return []
  const traverse = (node) => {
    if (!node) return null
    const name = node.name || ''
    if (shouldExcludeBranch(name)) return null
    const children = Array.isArray(node.children)
      ? node.children.map(traverse).filter(Boolean)
      : []
    return { ...node, children }
  }
  return nodes.map(traverse).filter(Boolean)
}

const flattenNodes = (nodes) => {
  const result = []
  const walk = (items) => {
    items.forEach((n) => {
      if (!n || n.id == null) return
      result.push(n)
      if (Array.isArray(n.children) && n.children.length > 0) {
        walk(n.children)
      }
    })
  }
  walk(nodes || [])
  return result
}

const OrgDepartmentSelect = ({
  value,
  onChange,
  placeholder = '请选择部门',
  leafOnly = true,
  disabled = false
}) => {
  const { getOrganizationTree } = useData()
  const [orgTree, setOrgTree] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const result = await getOrganizationTree()
        if (mounted) {
          if (result && result.success) {
            const tree = result.data || []
            const filtered = filterOrgTreeForDepartment(tree)
            setOrgTree(filtered)
          } else {
            setOrgTree([])
          }
        }
      } catch {
        if (mounted) {
          setOrgTree([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [getOrganizationTree])

  const allNodes = useMemo(() => flattenNodes(orgTree), [orgTree])

  const idToNode = useMemo(() => {
    const map = new Map()
    allNodes.forEach((n) => {
      map.set(n.id, n)
    })
    return map
  }, [allNodes])

  const nameToNode = useMemo(() => {
    const map = new Map()
    allNodes.forEach((n) => {
      const name = n.name
      if (name && !map.has(name)) {
        map.set(name, n)
      }
    })
    return map
  }, [allNodes])

  const [internalValue, setInternalValue] = useState(null)

  useEffect(() => {
    if (!value) {
      setInternalValue(null)
      return
    }
    const node = nameToNode.get(value)
    setInternalValue(node ? node.id : null)
  }, [value, nameToNode])

  const handleChange = (id) => {
    setInternalValue(id)
    const node = idToNode.get(id)
    if (node && onChange) {
      onChange(node.name || '')
    } else if (onChange) {
      onChange('')
    }
  }

  return (
    <TreeSelect
      value={internalValue}
      onChange={handleChange}
      options={orgTree}
      placeholder={loading ? '部门加载中...' : placeholder}
      disabled={disabled || loading}
      leafOnly={leafOnly}
      selectableTypes={['DEPT']}
    />
  )
}

export default OrgDepartmentSelect

