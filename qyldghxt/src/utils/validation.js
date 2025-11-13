// 数据验证工具函数

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} - 是否为有效邮箱
 */
export function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证电话号码格式
 * @param {string} phone - 电话号码
 * @returns {boolean} - 是否为有效电话号码
 */
export function validatePhone(phone) {
  if (!phone) return true; // 电话号码可选
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 7 && phone.length <= 20;
}

/**
 * 验证部门数据
 * @param {object} data - 部门数据
 * @returns {object} - 验证结果
 */
export function validateDepartmentData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.name || data.name.trim() === '') {
    errors.push('部门名称不能为空');
  } else if (data.name.length > 100) {
    errors.push('部门名称长度不能超过100个字符');
  }
  
  if (!data.code || data.code.trim() === '') {
    errors.push('部门编码不能为空');
  } else if (data.code.length > 50) {
    errors.push('部门编码长度不能超过50个字符');
  }
  
  // 选填字段验证
  if (data.manager && data.manager.length > 50) {
    errors.push('部门负责人长度不能超过50个字符');
  }
  
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('电话号码格式不正确');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('邮箱格式不正确');
  }
  
  if (data.status && !['active', 'inactive'].includes(data.status)) {
    errors.push('状态值不正确');
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('描述长度不能超过500个字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证员工数据
 * @param {object} data - 员工数据
 * @returns {object} - 验证结果
 */
export function validateEmployeeData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.name || data.name.trim() === '') {
    errors.push('员工姓名不能为空');
  } else if (data.name.length > 50) {
    errors.push('员工姓名长度不能超过50个字符');
  }
  
  if (!data.department_id) {
    errors.push('部门ID不能为空');
  } else if (!Number.isInteger(Number(data.department_id)) || Number(data.department_id) <= 0) {
    errors.push('部门ID必须是正整数');
  }
  
  // 选填字段验证
  if (data.position && data.position.length > 50) {
    errors.push('职位长度不能超过50个字符');
  }
  
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('电话号码格式不正确');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('邮箱格式不正确');
  }
  
  if (data.status && !['active', 'inactive'].includes(data.status)) {
    errors.push('状态值不正确');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证用户数据
 * @param {object} data - 用户数据
 * @returns {object} - 验证结果
 */
export function validateUserData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.username || data.username.trim() === '') {
    errors.push('用户名不能为空');
  } else if (data.username.length > 50) {
    errors.push('用户名长度不能超过50个字符');
  }
  
  if (!data.password || data.password.trim() === '') {
    errors.push('密码不能为空');
  } else if (data.password.length < 6) {
    errors.push('密码长度不能少于6个字符');
  }
  
  if (!data.role || data.role.trim() === '') {
    errors.push('角色不能为空');
  } else if (!['admin', 'user'].includes(data.role)) {
    errors.push('角色值不正确');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证部门目标数据
 * @param {object} data - 部门目标数据
 * @returns {object} - 验证结果
 */
export function validateDepartmentTargetData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.department_id) {
    errors.push('部门ID不能为空');
  } else if (!Number.isInteger(Number(data.department_id)) || Number(data.department_id) <= 0) {
    errors.push('部门ID必须是正整数');
  }
  
  if (!data.year) {
    errors.push('年份不能为空');
  } else if (!Number.isInteger(Number(data.year)) || Number(data.year) < 1900 || Number(data.year) > 2100) {
    errors.push('年份必须是1900-2100之间的整数');
  }
  
  if (!data.target_type || data.target_type.trim() === '') {
    errors.push('目标类型不能为空');
  } else if (data.target_type.length > 50) {
    errors.push('目标类型长度不能超过50个字符');
  }
  
  // 选填字段验证
  if (data.target_level && !['A', 'B', 'C', 'D'].includes(data.target_level)) {
    errors.push('目标级别必须是A、B、C或D');
  }
  
  if (data.target_value !== undefined && data.target_value !== null) {
    const value = Number(data.target_value);
    if (isNaN(value) || value < 0) {
      errors.push('目标值必须是非负数');
    }
  }
  
  if (data.month !== undefined && data.month !== null) {
    const month = Number(data.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.push('月份必须是1-12之间的整数');
    }
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('描述长度不能超过500个字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证年度工作计划数据
 * @param {object} data - 年度工作计划数据
 * @returns {object} - 验证结果
 */
export function validateAnnualWorkPlanData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.department_id) {
    errors.push('部门ID不能为空');
  } else if (!Number.isInteger(Number(data.department_id)) || Number(data.department_id) <= 0) {
    errors.push('部门ID必须是正整数');
  }
  
  if (!data.year) {
    errors.push('年份不能为空');
  } else if (!Number.isInteger(Number(data.year)) || Number(data.year) < 1900 || Number(data.year) > 2100) {
    errors.push('年份必须是1900-2100之间的整数');
  }
  
  if (!data.plan_name || data.plan_name.trim() === '') {
    errors.push('计划名称不能为空');
  } else if (data.plan_name.length > 255) {
    errors.push('计划名称长度不能超过255个字符');
  }
  
  // 选填字段验证
  if (data.month !== undefined && data.month !== null) {
    const month = Number(data.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.push('月份必须是1-12之间的整数');
    }
  }
  
  if (data.target_value !== undefined && data.target_value !== null) {
    const value = Number(data.target_value);
    if (isNaN(value) || value < 0) {
      errors.push('目标值必须是非负数');
    }
  }
  
  if (data.target_level && !['A', 'B', 'C', 'D'].includes(data.target_level)) {
    errors.push('目标级别必须是A、B、C或D');
  }
  
  if (data.status && !['pending', 'in_progress', 'completed'].includes(data.status)) {
    errors.push('状态值不正确');
  }
  
  if (data.sheet_type && !['planning', 'major_event', 'monthly_progress', 'action_plan'].includes(data.sheet_type)) {
    errors.push('表格类型值不正确');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('描述长度不能超过1000个字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证5W2H行动计划数据
 * @param {object} data - 5W2H行动计划数据
 * @returns {object} - 验证结果
 */
export function validateActionPlanData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.department_id) {
    errors.push('部门ID不能为空');
  } else if (!Number.isInteger(Number(data.department_id)) || Number(data.department_id) <= 0) {
    errors.push('部门ID必须是正整数');
  }
  
  if (!data.year) {
    errors.push('年份不能为空');
  } else if (!Number.isInteger(Number(data.year)) || Number(data.year) < 1900 || Number(data.year) > 2100) {
    errors.push('年份必须是1900-2100之间的整数');
  }
  
  if (!data.plan_name || data.plan_name.trim() === '') {
    errors.push('计划名称不能为空');
  } else if (data.plan_name.length > 255) {
    errors.push('计划名称长度不能超过255个字符');
  }
  
  // 5W2H字段验证
  if (!data.what || data.what.trim() === '') {
    errors.push('What字段不能为空');
  }
  
  if (!data.why || data.why.trim() === '') {
    errors.push('Why字段不能为空');
  }
  
  if (!data.where || data.where.trim() === '') {
    errors.push('Where字段不能为空');
  }
  
  if (!data.when || data.when.trim() === '') {
    errors.push('When字段不能为空');
  }
  
  if (!data.who || data.who.trim() === '') {
    errors.push('Who字段不能为空');
  }
  
  if (!data.how || data.how.trim() === '') {
    errors.push('How字段不能为空');
  }
  
  if (!data.how_much || data.how_much.trim() === '') {
    errors.push('How much字段不能为空');
  }
  
  // 选填字段验证
  if (data.status && !['pending', 'in_progress', 'completed'].includes(data.status)) {
    errors.push('状态值不正确');
  }
  
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
    errors.push('优先级值不正确');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证大事件数据
 * @param {object} data - 大事件数据
 * @returns {object} - 验证结果
 */
export function validateMajorEventData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.department_id) {
    errors.push('部门ID不能为空');
  } else if (!Number.isInteger(Number(data.department_id)) || Number(data.department_id) <= 0) {
    errors.push('部门ID必须是正整数');
  }
  
  if (!data.year) {
    errors.push('年份不能为空');
  } else if (!Number.isInteger(Number(data.year)) || Number(data.year) < 1900 || Number(data.year) > 2100) {
    errors.push('年份必须是1900-2100之间的整数');
  }
  
  if (!data.event_name || data.event_name.trim() === '') {
    errors.push('事件名称不能为空');
  } else if (data.event_name.length > 255) {
    errors.push('事件名称长度不能超过255个字符');
  }
  
  // 选填字段验证
  if (data.event_type && data.event_type.length > 50) {
    errors.push('事件类型长度不能超过50个字符');
  }
  
  if (data.importance && !['low', 'medium', 'high'].includes(data.importance)) {
    errors.push('重要性值不正确');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('描述长度不能超过1000个字符');
  }
  
  if (data.status && !['pending', 'in_progress', 'completed'].includes(data.status)) {
    errors.push('状态值不正确');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证月度推进计划数据
 * @param {object} data - 月度推进计划数据
 * @returns {object} - 验证结果
 */
export function validateMonthlyProgressData(data) {
  const errors = [];
  
  // 必填字段验证
  if (!data.department_id) {
    errors.push('部门ID不能为空');
  } else if (!Number.isInteger(Number(data.department_id)) || Number(data.department_id) <= 0) {
    errors.push('部门ID必须是正整数');
  }
  
  if (!data.year) {
    errors.push('年份不能为空');
  } else if (!Number.isInteger(Number(data.year)) || Number(data.year) < 1900 || Number(data.year) > 2100) {
    errors.push('年份必须是1900-2100之间的整数');
  }
  
  if (!data.month) {
    errors.push('月份不能为空');
  } else {
    const month = Number(data.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.push('月份必须是1-12之间的整数');
    }
  }
  
  if (!data.progress_name || data.progress_name.trim() === '') {
    errors.push('进度名称不能为空');
  } else if (data.progress_name.length > 255) {
    errors.push('进度名称长度不能超过255个字符');
  }
  
  // 选填字段验证
  if (data.progress_value !== undefined && data.progress_value !== null) {
    const value = Number(data.progress_value);
    if (isNaN(value) || value < 0 || value > 100) {
      errors.push('进度值必须是0-100之间的数字');
    }
  }
  
  if (data.status && !['pending', 'in_progress', 'completed'].includes(data.status)) {
    errors.push('状态值不正确');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('描述长度不能超过1000个字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 验证中间件
export function createValidationMiddleware(validator) {
  return (req, res, next) => {
    const validation = validator(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: '数据验证失败',
        details: validation.errors
      });
    }
    next();
  };
}