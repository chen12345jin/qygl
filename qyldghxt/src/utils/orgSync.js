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
