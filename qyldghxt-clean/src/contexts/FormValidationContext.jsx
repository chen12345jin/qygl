import React, { createContext, useContext, useState } from 'react';

const FormValidationContext = createContext();

// 13个模块的必填字段配置（排除备注字段）
const REQUIRED_FIELDS_CONFIG = {
  // 1. 首页概览
  dashboard: ['year', 'department', 'status'],
  
  // 2. 部门目标分解
  departmentTargets: ['department', 'targetType', 'targetValue', 'deadline', 'responsible'],
  
  // 3. 年度规划表
  annualPlanning: ['planType', 'planName', 'startDate', 'endDate', 'department', 'responsible'],
  
  // 4. 年度规划图表
  annualPlanningChart: ['chartType', 'dataSource', 'timeRange'],
  
  // 5. 年度工作计划
  annualWorkPlan: ['planName', 'department', 'startDate', 'endDate', 'responsible', 'priority'],
  
  // 6. 重大事项
  majorEvents: ['eventName', 'eventType', 'startDate', 'endDate', 'responsible', 'priority'],
  
  // 7. 月度进展
  monthlyProgress: ['month', 'department', 'planName', 'progress', 'status'],
  
  // 8. 行动计划
  actionPlans: ['actionName', 'department', 'startDate', 'endDate', 'responsible'],
  
  // 9. 数据分析
  dataAnalysis: ['analysisType', 'dataSource', 'timeRange'],
  
  // 10. 公司信息
  companyInfo: ['companyName', 'address', 'phone', 'email'],
  
  // 11. 部门管理
  departmentManagement: ['departmentName', 'manager', 'phone'],
  
  // 12. 员工管理
  employeeManagement: ['employeeName', 'department', 'position', 'phone', 'email'],
  
  // 13. 用户管理
  userManagement: ['username', 'email', 'role', 'department']
};

// 字段验证规则
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '请输入有效的邮箱地址'
  },
  phone: {
    pattern: /^[\d\s\-\+\(\)]{10,}$/,
    message: '请输入有效的电话号码'
  },
  date: {
    validate: (value) => {
      const date = new Date(value);
      return !isNaN(date.getTime()) && date > new Date('1900-01-01');
    },
    message: '请输入有效的日期'
  },
  url: {
    pattern: /^https?:\/\/.+/,
    message: '请输入有效的网址（以http://或https://开头）'
  },
  required: {
    validate: (value) => value !== null && value !== undefined && value.toString().trim() !== '',
    message: '此字段为必填项'
  }
};

export const FormValidationProvider = ({ children }) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // 获取模块的必填字段
  const getRequiredFields = (module) => {
    return REQUIRED_FIELDS_CONFIG[module] || [];
  };

  // 验证单个字段
  const validateField = (fieldName, value, fieldType = 'text', isRequired = false) => {
    const fieldErrors = [];

    // 必填验证
    if (isRequired && !VALIDATION_RULES.required.validate(value)) {
      fieldErrors.push(VALIDATION_RULES.required.message);
    }

    // 如果字段有值，进行格式验证
    if (value && value.toString().trim() !== '') {
      switch (fieldType) {
        case 'email':
          if (!VALIDATION_RULES.email.pattern.test(value)) {
            fieldErrors.push(VALIDATION_RULES.email.message);
          }
          break;
        case 'phone':
          if (!VALIDATION_RULES.phone.pattern.test(value)) {
            fieldErrors.push(VALIDATION_RULES.phone.message);
          }
          break;
        case 'date':
          if (!VALIDATION_RULES.date.validate(value)) {
            fieldErrors.push(VALIDATION_RULES.date.message);
          }
          break;
        case 'url':
          if (!VALIDATION_RULES.url.pattern.test(value)) {
            fieldErrors.push(VALIDATION_RULES.url.message);
          }
          break;
      }
    }

    return fieldErrors;
  };

  // 验证整个表单
  const validateForm = (formData, module) => {
    const requiredFields = getRequiredFields(module);
    const formErrors = {};
    let isValid = true;

    // 验证所有字段
    Object.keys(formData).forEach(fieldName => {
      const isRequired = requiredFields.includes(fieldName);
      const fieldType = getFieldType(fieldName);
      const fieldErrors = validateField(fieldName, formData[fieldName], fieldType, isRequired);
      
      if (fieldErrors.length > 0) {
        formErrors[fieldName] = fieldErrors[0]; // 只显示第一个错误
        isValid = false;
      }
    });

    setErrors(formErrors);
    return { isValid, errors: formErrors };
  };

  // 根据字段名推断字段类型
  const getFieldType = (fieldName) => {
    if (fieldName.includes('email')) return 'email';
    if (fieldName.includes('phone')) return 'phone';
    if (fieldName.includes('date') || fieldName.includes('Date')) return 'date';
    if (fieldName.includes('url') || fieldName.includes('website')) return 'url';
    return 'text';
  };

  // 设置字段错误
  const setFieldError = (fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  // 清除字段错误
  const clearFieldError = (fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // 清除所有错误
  const clearAllErrors = () => {
    setErrors({});
    setTouched({});
  };

  // 标记字段为已触摸
  const setFieldTouched = (fieldName, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: isTouched
    }));
  };

  // 实时验证字段
  const validateFieldRealtime = (fieldName, value, module) => {
    const requiredFields = getRequiredFields(module);
    const isRequired = requiredFields.includes(fieldName);
    const fieldType = getFieldType(fieldName);
    const fieldErrors = validateField(fieldName, value, fieldType, isRequired);
    
    if (fieldErrors.length > 0) {
      setFieldError(fieldName, fieldErrors[0]);
    } else {
      clearFieldError(fieldName);
    }
    
    return fieldErrors.length === 0;
  };

  const value = {
    errors,
    touched,
    getRequiredFields,
    validateField,
    validateForm,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    setFieldTouched,
    validateFieldRealtime,
    REQUIRED_FIELDS_CONFIG
  };

  return (
    <FormValidationContext.Provider value={value}>
      {children}
    </FormValidationContext.Provider>
  );
};

export const useFormValidation = () => {
  const context = useContext(FormValidationContext);
  if (!context) {
    throw new Error('useFormValidation must be used within a FormValidationProvider');
  }
  return context;
};

export default FormValidationContext;