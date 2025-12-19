export const buildTree = (items) => {
  const roots = []
  const byId = {}
  for (const item of items) {
    byId[item.id] = { ...item, children: Array.isArray(item.children) ? item.children : [] }
  }
  for (const item of items) {
    const pid = item.parentId ?? item.parent_id ?? item.parentID ?? item.parent ?? null
    if (pid && byId[pid]) {
      byId[pid].children.push(byId[item.id])
    } else {
      roots.push(byId[item.id])
    }
  }
  return roots
}

export const attachEmployeesToDepartments = (departments, employees) => {
  const nameMap = new Map()
  for (const dept of departments) {
    nameMap.set(dept.name, dept)
  }
  for (const emp of employees) {
    const deptName = emp.department || emp.deptName || emp.dept || ''
    const target = nameMap.get(deptName)
    if (target) {
      if (!Array.isArray(target.employees)) target.employees = []
      target.employees.push(emp)
    }
  }
  return departments
}

export const buildOrgTreeWithEmployees = (departments, employees) => {
  const withEmployees = attachEmployeesToDepartments([...departments], employees)
  return buildTree(withEmployees)
}

// Recursively merge employees into the tree as nodes (children)
export const mergeEmployeesAsNodes = (nodes, employees) => {
  return nodes.map(node => {
    // Find employees belonging to this node (department/company)
    const nodeEmployees = employees.filter(emp => {
      const empDept = emp.department || emp.deptName || ''
      return empDept === node.name
    }).map(emp => ({
      ...emp,
      id: `user-${emp.id}`, // Avoid ID collision with departments
      originalId: emp.id,
      name: emp.name || emp.username || emp.employee_name,
      type: 'USER',
      children: []
    }))
    
    // Process children nodes recursively
    const childrenNodes = node.children && node.children.length > 0 
      ? mergeEmployeesAsNodes(node.children, employees) 
      : []
      
    // Combine children nodes (sub-departments) and employee nodes
    // Sort: Departments/Companies first, then Employees
    const allChildren = [...childrenNodes, ...nodeEmployees]
    
    return {
      ...node,
      uniqueKey: `dept-${node.id}`,
      children: allChildren
    }
  })
}

export const getLeafDepartments = (departments) => {
  if (!Array.isArray(departments)) return []
  const childrenMap = new Map()
  for (const dept of departments) {
    const pid = dept.parentId ?? dept.parent_id ?? dept.parentID ?? dept.parent ?? null
    if (!pid) continue
    if (!childrenMap.has(pid)) childrenMap.set(pid, 0)
    childrenMap.set(pid, childrenMap.get(pid) + 1)
  }
  return departments.filter(d => {
    if (!d || d.id == null) return false
    const name = String(d.name || '')
    if (!name || name.includes('公司')) return false
    return !childrenMap.has(d.id)
  })
}

export const getBusinessDepartments = (departments) => {
  if (!Array.isArray(departments)) return []
  return departments.filter(d => {
    if (!d || d.id == null) return false
    const name = String(d.name || '')
    if (!name) return false
    return !name.includes('公司')
  })
}

export const getDescendantDepartmentNames = (departments, selectedName) => {
  if (!Array.isArray(departments) || !selectedName) return []
  const name = String(selectedName || '').trim()
  if (!name) return []
  const byId = new Map()
  const childrenMap = new Map()
  for (const dept of departments) {
    if (!dept || dept.id == null) continue
    byId.set(dept.id, dept)
    const pid = dept.parentId ?? dept.parent_id ?? dept.parentID ?? dept.parent ?? null
    if (!pid) continue
    if (!childrenMap.has(pid)) childrenMap.set(pid, [])
    childrenMap.get(pid).push(dept.id)
  }
  const roots = departments.filter(d => String(d.name || '') === name).map(d => d.id)
  if (roots.length === 0) return [name]
  const resultNames = new Set()
  const stack = [...roots]
  while (stack.length) {
    const id = stack.pop()
    const node = byId.get(id)
    if (!node) continue
    const nodeName = String(node.name || '')
    if (nodeName && !nodeName.includes('公司')) {
      resultNames.add(nodeName)
    }
    const childIds = childrenMap.get(id)
    if (Array.isArray(childIds) && childIds.length > 0) {
      for (const cid of childIds) {
        stack.push(cid)
      }
    }
  }
  if (resultNames.size === 0) {
    resultNames.add(name)
  }
  return Array.from(resultNames)
}
