import React, { useState, useEffect } from 'react'
import { Save, Building2 } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import InlineAlert from '../../components/InlineAlert'
import toast from 'react-hot-toast'

const CompanyInfo = () => {
  const [formData, setFormData] = useState({
    name: '',
    legalPerson: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    establishDate: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' })
  const [alertTimeout, setAlertTimeout] = useState(null)

  // 清理定时器
  useEffect(() => {
    return () => {
      if (alertTimeout) {
        clearTimeout(alertTimeout)
      }
    }
  }, [alertTimeout])

  const { getCompanyInfo, updateCompanyInfo } = useData()

  useEffect(() => {
    (async () => {
      const result = await getCompanyInfo()
      if (result.success) {
        setFormData({
          name: result.data?.name || '',
          legalPerson: result.data?.legalPerson || '',
          address: result.data?.address || '',
          phone: result.data?.phone || '',
          email: result.data?.email || '',
          website: result.data?.website || '',
          establishDate: result.data?.establishDate || ''
        })
      }
    })()
  }, [])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name?.trim()) {
      newErrors.name = '企业名称不能为空'
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的电话号码'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = '请输入有效的网址'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const showAlert = (message, type = 'success') => {
    // 清除之前的定时器
    if (alertTimeout) {
      clearTimeout(alertTimeout)
    }
    
    setAlert({ show: true, message, type })
    
    // 设置新的定时器并保存引用
    const timeoutId = setTimeout(() => {
      setAlert({ show: false, message: '', type: 'info' })
      setAlertTimeout(null)
    }, 3000)
    
    setAlertTimeout(timeoutId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showAlert('请检查表单中的错误', 'error')
      return
    }
    
    try {
      await updateCompanyInfo(formData)
      setIsEditing(false)
      toast.success('企业信息更新成功！')
      showAlert('企业信息更新成功！', 'success')
    } catch (error) {
      toast.error('更新失败，请重试')
      showAlert('更新失败，请重试', 'error')
    }
  }

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-white/20 to-white/30 rounded-lg shadow-lg">
                  <Building2 size={24} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  企业信息管理
                </h1>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-white/20 to-white/30 hover:from-white/30 hover:to-white/40 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                {isEditing ? (
                  <>
                    <span>取消编辑</span>
                  </>
                ) : (
                  <>
                    <span>编辑信息</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-blue-100 text-lg">管理企业基本信息和联系信息</p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-white/50 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {alert.show && (
              <InlineAlert
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, show: false })}
              />
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                企业名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => {
                  handleChange('name', e.target.value)
                  if (errors.name) {
                    setErrors({ ...errors, name: '' })
                  }
                }}
                className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                disabled={!isEditing}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                法定代表人
              </label>
              <input
                type="text"
                value={formData.legalPerson || ''}
                onChange={(e) => handleChange('legalPerson', e.target.value)}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                企业地址
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系电话
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => {
                  handleChange('phone', e.target.value)
                  if (errors.phone) {
                    setErrors({ ...errors, phone: '' })
                  }
                }}
                className={`form-input ${errors.phone ? 'border-red-500' : ''}`}
                disabled={!isEditing}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                企业邮箱
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => {
                  handleChange('email', e.target.value)
                  if (errors.email) {
                    setErrors({ ...errors, email: '' })
                  }
                }}
                className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                disabled={!isEditing}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                官方网站
              </label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => {
                  handleChange('website', e.target.value)
                  if (errors.website) {
                    setErrors({ ...errors, website: '' })
                  }
                }}
                className={`form-input ${errors.website ? 'border-red-500' : ''}`}
                disabled={!isEditing}
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                成立日期
              </label>
              <input
                type="date"
                value={formData.establishDate || ''}
                onChange={(e) => handleChange('establishDate', e.target.value)}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <Save size={18} />
                <span>保存信息</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setFormData(companyInfo)
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                取消
              </button>
            </div>
          )}
        </form>

        {!isEditing && (
          <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg border border-white/50">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">企业概览</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">企业名称：</span>
                <span className="text-gray-600">{formData.name || '未设置'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">法定代表人：</span>
                <span className="text-gray-600">{formData.legalPerson || '未设置'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">联系电话：</span>
                <span className="text-gray-600">{formData.phone || '未设置'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">成立日期：</span>
                <span className="text-gray-600">{formData.establishDate || '未设置'}</span>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default CompanyInfo
