import React, { useState, useEffect } from 'react'
import { api } from '../../utils/api'
import { Save, Shield, Database, Bell, Wifi, Target, Plus, Edit, Trash2, X, RotateCcw, CheckCircle, Ban, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../contexts/DataContext'
import DeleteConfirmDialog from '../../components/DeleteConfirmDialog'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { useAuth } from '../../contexts/AuthContext'
import { appVersion } from '../../version'
import { formatDateTime, applyLocalePrefs } from '../../utils/locale.js'

const SettingsButtons = ({ disabled, onSave, onReset, saving, resetting }) => (
  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
    <button
      onClick={onSave}
      className="btn-primary flex items-center space-x-2"
      disabled={disabled || saving}
      aria-busy={saving}
    >
      {saving ? (<Loader2 size={18} className="animate-spin" />) : (<Save size={18} />)}
      <span>{saving ? '保存中…' : '保存设置'}</span>
    </button>
    <button
      onClick={onReset}
      className="btn-secondary flex items-center space-x-2"
      disabled={disabled || resetting}
      aria-busy={resetting}
    >
      {resetting ? (<Loader2 size={18} className="animate-spin" />) : (<RotateCcw size={18} />)}
      <span>{resetting ? '重置中…' : '重置设置'}</span>
    </button>
  </div>
)

const SystemSettings = () => {
  const { user, checkPermission } = useAuth()
  const isAdmin = (user?.role === 'admin') || checkPermission('admin')
  const [backups, setBackups] = useState([])
  const { getSystemSettings, addSystemSetting, updateSystemSetting, getTargetTypes, addTargetType, updateTargetType, deleteTargetType, loading } = useData()
  const [settings, setSettings] = useState({
    system: {
      systemName: '企业年度规划系统',
      version: appVersion,
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      autoBackup: true,
      backupInterval: 24,
      maintenanceMode: false
    },
    security: {
      passwordMinLength: 8,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      enableTwoFactor: false,
      ipWhitelist: '',
      auditLog: true
    },
    notification: {
      emailNotification: true,
      smsNotification: false,
      dingtalkNotification: true,
      taskReminder: true,
      deadlineAlert: true,
      reportNotification: true
    },
    integration: {
      dingtalkEnabled: false,
      dingtalkAppKey: '',
      dingtalkAppSecret: '',
      emailHost: '',
      emailPort: 587,
      emailUser: '',
      emailPassword: '',
      databaseBackup: true
    }
  })

  const [targetTypes, setTargetTypes] = useState([])
  const [isEditingType, setIsEditingType] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    itemId: null, 
    itemName: '' 
  })
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '',
    category: '',
    isActive: true
  })

  const [activeTab, setActiveTab] = useState('system')
  const [errors, setErrors] = useState({
    system: {},
    security: {},
    notification: {},
    integration: {}
  })
  const [typeErrors, setTypeErrors] = useState({})
  const toggleAndToast = (category, key, checked, label) => {
    updateSetting(category, key, checked)
    toast.success(`${label}${checked ? '已启用' : '已关闭'}`)
  }
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [settingIds, setSettingIds] = useState({
    system: null,
    security: null,
    notification: null,
    integration: null
  })

  const formatBackupName = (name) => {
    if (/^system-backup-.*\.json$/.test(name)) return 'system-backup.json'
    if (/^\d{8}-\d{6}$/.test(name)) return '备份快照'
    return name
  }

  const setFieldError = (category, key, msg) => {
    setErrors(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: msg
      }
    }))
  };

  const validateField = (category, key, value) => {
    let msg = ''
    if (['systemName', 'language', 'timezone'].includes(key) && String(value).trim() === '') msg = '该字段为必填项'
    if (category === 'security' && key === 'passwordMinLength') {
      if (!value || value < 6 || value > 20) msg = '长度需在 6-20 之间'
    }
    if (category === 'security' && key === 'sessionTimeout') {
      if (!value || value < 5 || value > 480) msg = '范围需在 5-480 之间'
    }
    if (category === 'security' && key === 'maxLoginAttempts') {
      if (!value || value < 3 || value > 10) msg = '范围需在 3-10 之间'
    }
    if (category === 'integration' && activeTab === 'integration') {
      if (settings.integration.dingtalkEnabled) {
        if (key === 'dingtalkAppKey' && String(value).trim() === '') msg = '启用后为必填'
        if (key === 'dingtalkAppSecret' && String(value).trim() === '') msg = '启用后为必填'
      }
    }
    if (category === 'integration' && ['emailHost', 'emailPort', 'emailUser'].includes(key)) {
      if (String(value).trim() === '') msg = '该字段为必填项'
      if (key === 'emailPort' && (!Number.isInteger(value) || value <= 0)) msg = '请输入有效端口'
    }
    setFieldError(category, key, msg)
    return !msg
  }

  const validateAll = () => {
    const s = settings
    const checks = []
    checks.push(validateField('system', 'systemName', s.system.systemName))
    checks.push(validateField('system', 'language', s.system.language))
    checks.push(validateField('system', 'timezone', s.system.timezone))
    checks.push(validateField('security', 'passwordMinLength', s.security.passwordMinLength))
    checks.push(validateField('security', 'sessionTimeout', s.security.sessionTimeout))
    checks.push(validateField('security', 'maxLoginAttempts', s.security.maxLoginAttempts))
    if (s.integration.dingtalkEnabled) {
      checks.push(validateField('integration', 'dingtalkAppKey', s.integration.dingtalkAppKey))
      checks.push(validateField('integration', 'dingtalkAppSecret', s.integration.dingtalkAppSecret))
    }
    checks.push(validateField('integration', 'emailHost', s.integration.emailHost))
    checks.push(validateField('integration', 'emailPort', s.integration.emailPort))
    checks.push(validateField('integration', 'emailUser', s.integration.emailUser))
    return checks.every(Boolean)
  }

  const validateActiveTab = () => {
    const s = settings
    const checks = []
    switch (activeTab) {
      case 'system':
        checks.push(validateField('system', 'systemName', s.system.systemName))
        checks.push(validateField('system', 'language', s.system.language))
        checks.push(validateField('system', 'timezone', s.system.timezone))
        break
      case 'security':
        checks.push(validateField('security', 'passwordMinLength', s.security.passwordMinLength))
        checks.push(validateField('security', 'sessionTimeout', s.security.sessionTimeout))
        checks.push(validateField('security', 'maxLoginAttempts', s.security.maxLoginAttempts))
        break
      case 'integration':
        if (s.integration.dingtalkEnabled) {
          checks.push(validateField('integration', 'dingtalkAppKey', s.integration.dingtalkAppKey))
          checks.push(validateField('integration', 'dingtalkAppSecret', s.integration.dingtalkAppSecret))
        }
        checks.push(validateField('integration', 'emailHost', s.integration.emailHost))
        checks.push(validateField('integration', 'emailPort', s.integration.emailPort))
        checks.push(validateField('integration', 'emailUser', s.integration.emailUser))
        break
      case 'notification':
        // 通知页当前无强校验必填项
        break
      default:
        break
    }
    return checks.every(Boolean)
  }

  useEffect(() => {
    loadSettings()
    loadTargetTypes()
    loadBackups()
  }, [])

  const loadSettings = async () => {
    try {
      const result = await getSystemSettings()
      const list = Array.isArray(result?.data) ? result.data : []
      const byKey = (key) => list.find(s => s.key === key)
      const systemRec = byKey('system')
      const securityRec = byKey('security')
      const notificationRec = byKey('notification')
      const integrationRec = byKey('integration')
      setSettingIds({
        system: systemRec?.id || null,
        security: securityRec?.id || null,
        notification: notificationRec?.id || null,
        integration: integrationRec?.id || null
      })
      const safeData = {
        system: {
          systemName: systemRec?.value?.systemName || '企业目标管理系统',
          version: appVersion,
          language: systemRec?.value?.language || 'zh-CN',
          timezone: systemRec?.value?.timezone || 'Asia/Shanghai',
          autoBackup: systemRec?.value?.autoBackup ?? true,
          backupInterval: systemRec?.value?.backupInterval || 24,
          maintenanceMode: systemRec?.value?.maintenanceMode ?? false
        },
        security: {
          passwordMinLength: securityRec?.value?.passwordMinLength || 8,
          sessionTimeout: securityRec?.value?.sessionTimeout || 30,
          maxLoginAttempts: securityRec?.value?.maxLoginAttempts || 5,
          enableTwoFactor: securityRec?.value?.enableTwoFactor ?? false,
          ipWhitelist: securityRec?.value?.ipWhitelist || '',
          auditLog: securityRec?.value?.auditLog ?? true
        },
        notification: {
          emailNotification: notificationRec?.value?.emailNotification ?? true,
          smsNotification: notificationRec?.value?.smsNotification ?? false,
          dingtalkNotification: notificationRec?.value?.dingtalkNotification ?? true,
          taskReminder: notificationRec?.value?.taskReminder ?? true,
          deadlineAlert: notificationRec?.value?.deadlineAlert ?? true,
          reportNotification: notificationRec?.value?.reportNotification ?? true
        },
        integration: {
          dingtalkEnabled: integrationRec?.value?.dingtalkEnabled ?? false,
          dingtalkAppKey: integrationRec?.value?.dingtalkAppKey || '',
          dingtalkAppSecret: integrationRec?.value?.dingtalkAppSecret || '',
          emailHost: integrationRec?.value?.emailHost || '',
          emailPort: integrationRec?.value?.emailPort || 587,
          emailUser: integrationRec?.value?.emailUser || '',
          emailPassword: integrationRec?.value?.emailPassword || '',
          databaseBackup: integrationRec?.value?.databaseBackup ?? true
        }
      }
      setSettings(safeData)
    } catch (error) {
      console.error('加载系统设置失败:', error)
      toast.error('加载系统设置失败')
    }
  }

  const loadTargetTypes = async () => {
    try {
      const result = await getTargetTypes()
      if (result.success && result.data) {
        setTargetTypes(result.data)
      } else {
        // 如果没有数据，使用默认目标类型
        setTargetTypes([
          {
            id: 1,
            name: '销售目标',
            description: '销售业绩和客户拓展相关目标',
            color: '#3B82F6',
            icon: 'target',
            category: 'business',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            name: '市场目标',
            description: '品牌推广和市场占有率相关目标',
            color: '#10B981',
            icon: 'trending-up',
            category: 'marketing',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 3,
            name: '技术目标',
            description: '技术研发和产品创新相关目标',
            color: '#8B5CF6',
            icon: 'cpu',
            category: 'tech',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 4,
            name: '运营目标',
            description: '运营效率和流程优化相关目标',
            color: '#F59E0B',
            icon: 'activity',
            category: 'operations',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ])
      }
    } catch (error) {
      console.error('加载目标类型失败:', error)
      toast.error('加载目标类型失败')
    }
  }

  const loadBackups = async () => {
    try {
      const res = await api.get('/admin/backups')
      const items = res?.data?.items || []
      setBackups(items)
    } catch (e) {}
  }

  const saveActiveSettings = async () => {
    const ok = validateActiveTab()
    if (!ok) {
      toast.error('请先修正校验错误')
      return
    }
    try {
      setSaving(true)
      const loadingId = toast.loading(activeTab === 'notification' ? '正在保存通知设置…' : '正在保存当前页面设置…')
      let result
      const id = settingIds[activeTab]
      const payload = activeTab === 'system' ? { ...settings.system, version: appVersion } : settings[activeTab]
      if (id) {
        result = await updateSystemSetting(id, { key: activeTab, value: payload }, true)
      } else {
        result = await addSystemSetting({ key: activeTab, value: payload }, true)
      }
      if (result.success) {
        toast.success(activeTab === 'notification' ? '通知设置已保存' : '当前页面设置已保存')
        if (activeTab === 'system') {
          applyLocalePrefs({ language: settings.system.language, timeZone: settings.system.timezone })
        }
      } else {
        toast.error(activeTab === 'notification' ? '保存通知设置失败' : '保存当前页面设置失败')
      }
    } catch (error) {
      toast.error(activeTab === 'notification' ? '保存通知设置失败' : '保存当前页面设置失败')
      console.error('保存当前页面设置失败:', error)
    } finally {
      toast.dismiss()
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    await saveActiveSettings()
  }

  const resetSettings = async () => {
    if (window.confirm('确定要重置所有设置吗？此操作不可恢复。')) {
      try {
        setResetting(true)
        const loadingId = toast.loading(activeTab === 'notification' ? '正在重置通知设置…' : '正在重置设置…')
        // 重置为默认设置
        const defaultSettings = {
          system: {
            systemName: '企业年度规划系统',
            version: appVersion,
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
            autoBackup: true,
            backupInterval: 24,
            maintenanceMode: false
          },
          security: {
            passwordMinLength: 8,
            sessionTimeout: 30,
            maxLoginAttempts: 5,
            enableTwoFactor: false,
            ipWhitelist: '',
            auditLog: true
          },
          notification: {
            emailNotification: true,
            smsNotification: false,
            dingtalkNotification: true,
            taskReminder: true,
            deadlineAlert: true,
            reportNotification: true
          },
          integration: {
            dingtalkEnabled: false,
            dingtalkAppKey: '',
            dingtalkAppSecret: '',
            emailHost: '',
            emailPort: 587,
            emailUser: '',
            emailPassword: '',
            databaseBackup: true
          }
        }
        
        // 使用API保存默认设置
        await saveActiveSettings()
        setSettings(defaultSettings)
        toast.success(activeTab === 'notification' ? '通知设置已重置为默认值' : '设置已重置')
      } catch (error) {
        console.error('重置设置失败:', error)
        toast.error(activeTab === 'notification' ? '重置通知设置失败' : '重置设置失败')
      } finally {
        toast.dismiss()
        setResetting(false)
      }
    }
  }

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
    validateField(category, key, value)
  }

  // 目标类型管理功能
  const handleAddTargetType = () => {
    setIsEditingType(true)
    setEditingTypeId(null)
    setTypeFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: '',
      category: '',
      isActive: true
    })
  }

  const handleEditTargetType = (type) => {
    setIsEditingType(true)
    setEditingTypeId(type.id)
    setTypeFormData({
      name: type.name,
      description: type.description,
      color: type.color,
      icon: type.icon,
      category: type.category,
      isActive: type.isActive
    })
  }

  const handleSaveTargetType = async () => {
    const nextErrors = {}
    if (!typeFormData.name?.trim()) nextErrors.name = '类型名称为必填项'
    if (!typeFormData.category?.trim()) nextErrors.category = '请选择分类'
    if (!typeFormData.icon?.trim()) nextErrors.icon = '请选择图标'
    if (!typeFormData.color?.trim()) {
      nextErrors.color = '请输入主题色'
    } else if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(typeFormData.color.trim())) {
      nextErrors.color = '请输入有效HEX颜色，如 #3B82F6'
    }
    setTypeErrors(nextErrors)
    if (Object.keys(nextErrors).length) { toast.error('请修正带红色提示的字段'); return }

    try {
      let result
      if (editingTypeId) {
        // 更新目标类型
        result = await updateTargetType(editingTypeId, {
          ...typeFormData,
          updatedAt: new Date().toISOString()
        })
      } else {
        // 添加新目标类型
        result = await addTargetType({
          ...typeFormData,
          createdAt: new Date().toISOString()
        })
      }

      if (result.success) {
        await loadTargetTypes() // 重新加载目标类型列表
        setIsEditingType(false)
        setEditingTypeId(null)
        setTypeErrors({})
        const statusText = typeFormData.isActive ? '（已启用）' : '（未启用）'
        toast.success(`${editingTypeId ? '目标类型更新成功' : '目标类型添加成功'}${statusText}`)
      } else {
        toast.error('保存目标类型失败')
      }
    } catch (error) {
      console.error('保存目标类型失败:', error)
      toast.error('保存目标类型失败')
    }
  }

  const handleDeleteTargetType = (targetType) => {
    setDeleteDialog({
      isOpen: true,
      itemId: targetType.id,
      itemName: targetType.name
    })
  }

  const confirmDeleteTargetType = async () => {
    try {
      const result = await deleteTargetType(deleteDialog.itemId)
      if (result.success) {
        await loadTargetTypes() // 重新加载目标类型列表
        toast.success('目标类型删除成功')
      } else {
        toast.error('删除目标类型失败')
      }
    } catch (error) {
      console.error('删除目标类型失败:', error)
      toast.error('删除目标类型失败')
    }
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
  }

  const handleToggleTypeStatus = async (id) => {
    try {
      const type = targetTypes.find(t => t.id === id)
      if (type) {
        const result = await updateTargetType(id, {
          ...type,
          isActive: !type.isActive,
          updatedAt: new Date().toISOString()
        })
        if (result.success) {
          await loadTargetTypes() // 重新加载目标类型列表
          toast.success('状态更新成功')
        } else {
          toast.error('状态更新失败')
        }
      }
    } catch (error) {
      console.error('状态更新失败:', error)
      toast.error('状态更新失败')
    }
  }

  const cancelEditType = () => {
    setIsEditingType(false)
    setEditingTypeId(null)
  }

  const tabs = [
    { id: 'system', name: '系统设置', icon: Shield },
    { id: 'security', name: '安全设置', icon: Shield },
    { id: 'notification', name: '通知设置', icon: Bell },
    { id: 'integration', name: '集成设置', icon: Wifi },
    { id: 'targetTypes', name: '目标类型', icon: Target }
  ]

  const categoryOptions = [
    { value: 'business', label: '业务类' },
    { value: 'marketing', label: '市场类' },
    { value: 'hr', label: '人力资源' },
    { value: 'tech', label: '技术类' },
    { value: 'finance', label: '财务类' },
    { value: 'operations', label: '运营类' }
  ]
  const categoryLabelMap = Object.fromEntries(categoryOptions.map(o => [o.value, o.label]))

  const iconOptions = [
    { value: 'target', label: '目标' },
    { value: 'dollar-sign', label: '金钱' },
    { value: 'trending-up', label: '上升趋势' },
    { value: 'users', label: '用户' },
    { value: 'cpu', label: '技术' },
    { value: 'bar-chart', label: '图表' },
    { value: 'pie-chart', label: '饼图' },
    { value: 'activity', label: '活动' }
  ]

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            系统名称
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="text"
            value={settings.system.systemName}
            onChange={(e) => updateSetting('system', 'systemName', e.target.value)}
            className="form-input"
          />
          {errors.system.systemName && <span className="text-red-500 text-sm mt-1 block">{errors.system.systemName}</span>}
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            系统版本
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="text"
            value={appVersion}
            className={`form-input bg-gray-100 cursor-not-allowed`}
            readOnly
            disabled
          />
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            系统语言
            <span className="ml-1 text-red-500">*</span>
          </label>
          <select
            value={settings.system.language}
            onChange={(e) => updateSetting('system', 'language', e.target.value)}
            className="form-select"
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁体中文</option>
            <option value="en-US">English</option>
          </select>
          {errors.system.language && <span className="text-red-500 text-sm mt-1 block">{errors.system.language}</span>}
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            时区设置
            <span className="ml-1 text-red-500">*</span>
          </label>
          <select
            value={settings.system.timezone}
            onChange={(e) => updateSetting('system', 'timezone', e.target.value)}
            className="form-select"
          >
            <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
            <option value="Asia/Tokyo">东京时间 (UTC+9)</option>
            <option value="UTC">协调世界时 (UTC+0)</option>
          </select>
          {errors.system.timezone && <span className="text-red-500 text-sm mt-1 block">{errors.system.timezone}</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">自动备份</h3>
            <p className="text-sm text-gray-500">定期自动备份系统数据</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.system.autoBackup}
              onChange={(e) => updateSetting('system', 'autoBackup', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.system.autoBackup ? 'text-blue-600' : 'text-gray-600'}`}>{settings.system.autoBackup ? '已开启' : '已关闭'}</span>
          </label>
        </div>

        {settings.system.autoBackup && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备份间隔（小时）
            </label>
            <input
              type="number"
              value={settings.system.backupInterval}
              onChange={(e) => updateSetting('system', 'backupInterval', parseInt(e.target.value))}
              className="form-input w-32"
              min="1"
              max="168"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">维护模式</h3>
            <p className="text-sm text-gray-500">启用后用户将无法访问系统</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.system.maintenanceMode}
              onChange={(e) => updateSetting('system', 'maintenanceMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.system.maintenanceMode ? 'text-blue-600' : 'text-gray-600'}`}>{settings.system.maintenanceMode ? '已开启' : '已关闭'}</span>
          </label>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            密码最小长度
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="number"
            value={settings.security.passwordMinLength}
            onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
            className="form-input"
            min="6"
            max="20"
          />
          {errors.security.passwordMinLength && <span className="text-red-500 text-sm mt-1 block">{errors.security.passwordMinLength}</span>}
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            会话超时（分钟）
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
            className="form-input"
            min="5"
            max="480"
          />
          {errors.security.sessionTimeout && <span className="text-red-500 text-sm mt-1 block">{errors.security.sessionTimeout}</span>}
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            最大登录尝试次数
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="number"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
            className="form-input"
            min="3"
            max="10"
          />
          {errors.security.maxLoginAttempts && <span className="text-red-500 text-sm mt-1 block">{errors.security.maxLoginAttempts}</span>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          IP白名单（一行一个IP）
        </label>
        <textarea
          value={settings.security.ipWhitelist}
          onChange={(e) => updateSetting('security', 'ipWhitelist', e.target.value)}
          className="form-textarea"
          rows="4"
          placeholder="192.168.1.1&#10;10.0.0.1"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">启用双因子认证</h3>
            <p className="text-sm text-gray-500">增强账户安全性</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.security.enableTwoFactor}
              onChange={(e) => toggleAndToast('security', 'enableTwoFactor', e.target.checked, '双因子认证')}
              className="sr-only peer"
              aria-label="启用双因子认证"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.security.enableTwoFactor ? 'text-blue-600' : 'text-gray-600'}`}>{settings.security.enableTwoFactor ? '已启用' : '已关闭'}</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">审计日志</h3>
            <p className="text-sm text-gray-500">记录用户操作日志</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.security.auditLog}
              onChange={(e) => toggleAndToast('security', 'auditLog', e.target.checked, '审计日志')}
              className="sr-only peer"
              aria-label="审计日志"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.security.auditLog ? 'text-blue-600' : 'text-gray-600'}`}>{settings.security.auditLog ? '已启用' : '已关闭'}</span>
          </label>
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">邮件通知</h3>
            <p className="text-sm text-gray-500">通过邮件发送系统通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.notification.emailNotification}
              onChange={(e) => updateSetting('notification', 'emailNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.notification.emailNotification ? 'text-blue-600' : 'text-gray-600'}`}>{settings.notification.emailNotification ? '已开启' : '已关闭'}</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">短信通知</h3>
            <p className="text-sm text-gray-500">通过短信发送紧急通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.notification.smsNotification}
              onChange={(e) => updateSetting('notification', 'smsNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.notification.smsNotification ? 'text-blue-600' : 'text-gray-600'}`}>{settings.notification.smsNotification ? '已开启' : '已关闭'}</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">钉钉通知</h3>
            <p className="text-sm text-gray-500">通过钉钉发送工作通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.notification.dingtalkNotification}
              onChange={(e) => updateSetting('notification', 'dingtalkNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.notification.dingtalkNotification ? 'text-blue-600' : 'text-gray-600'}`}>{settings.notification.dingtalkNotification ? '已开启' : '已关闭'}</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">任务提醒</h3>
            <p className="text-sm text-gray-500">任务截止前自动提醒</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.notification.taskReminder}
              onChange={(e) => updateSetting('notification', 'taskReminder', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.notification.taskReminder ? 'text-blue-600' : 'text-gray-600'}`}>{settings.notification.taskReminder ? '已开启' : '已关闭'}</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">截止提醒</h3>
            <p className="text-sm text-gray-500">计划截止日期提醒</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.notification.deadlineAlert}
              onChange={(e) => updateSetting('notification', 'deadlineAlert', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.notification.deadlineAlert ? 'text-blue-600' : 'text-gray-600'}`}>{settings.notification.deadlineAlert ? '已开启' : '已关闭'}</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">报告通知</h3>
            <p className="text-sm text-gray-500">定期发送进度报告</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.notification.reportNotification}
              onChange={(e) => updateSetting('notification', 'reportNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
              <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
            </div>
            <span className={`ml-2 text-sm ${settings.notification.reportNotification ? 'text-blue-600' : 'text-gray-600'}`}>{settings.notification.reportNotification ? '已开启' : '已关闭'}</span>
          </label>
        </div>
      </div>
    </div>
  )

  const renderIntegrationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">钉钉集成</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700">启用钉钉集成</h4>
              <p className="text-sm text-gray-500">集成钉钉实现消息推送和审批</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.integration.dingtalkEnabled}
                onChange={(e) => toggleAndToast('integration', 'dingtalkEnabled', e.target.checked, '钉钉集成')}
                className="sr-only peer"
                aria-label="启用钉钉集成"
              />
              <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
                <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
              </div>
              <span className={`ml-2 text-sm ${settings.integration.dingtalkEnabled ? 'text-blue-600' : 'text-gray-600'}`}>{settings.integration.dingtalkEnabled ? '已启用' : '已关闭'}</span>
            </label>
          </div>

          {settings.integration.dingtalkEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  应用Key
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.integration.dingtalkAppKey}
                  onChange={(e) => updateSetting('integration', 'dingtalkAppKey', e.target.value)}
                  className="form-input"
                  placeholder="请输入钉钉应用Key"
                />
                {errors.integration.dingtalkAppKey && <span className="text-red-500 text-sm mt-1 block">{errors.integration.dingtalkAppKey}</span>}
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  应用Secret
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={settings.integration.dingtalkAppSecret}
                  onChange={(e) => updateSetting('integration', 'dingtalkAppSecret', e.target.value)}
                  className="form-input"
                  placeholder="请输入钉钉应用Secret"
                />
                {errors.integration.dingtalkAppSecret && <span className="text-red-500 text-sm mt-1 block">{errors.integration.dingtalkAppSecret}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">邮件服务</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              SMTP服务器
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="text"
              value={settings.integration.emailHost}
              onChange={(e) => updateSetting('integration', 'emailHost', e.target.value)}
              className="form-input"
              placeholder="smtp.example.com"
            />
            {errors.integration.emailHost && <span className="text-red-500 text-sm mt-1 block">{errors.integration.emailHost}</span>}
          </div>
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              端口
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="number"
              value={settings.integration.emailPort}
              onChange={(e) => updateSetting('integration', 'emailPort', parseInt(e.target.value))}
              className="form-input"
            />
            {errors.integration.emailPort && <span className="text-red-500 text-sm mt-1 block">{errors.integration.emailPort}</span>}
          </div>
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              用户名
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="text"
              value={settings.integration.emailUser}
              onChange={(e) => updateSetting('integration', 'emailUser', e.target.value)}
              className="form-input"
              placeholder="user@example.com"
            />
            {errors.integration.emailUser && <span className="text-red-500 text-sm mt-1 block">{errors.integration.emailUser}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={settings.integration.emailPassword}
              onChange={(e) => updateSetting('integration', 'emailPassword', e.target.value)}
              className="form-input"
              placeholder="请输入邮箱密码"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">数据库备份</h3>
          <p className="text-sm text-gray-500">定期备份数据库</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.integration.databaseBackup}
            onChange={(e) => toggleAndToast('integration', 'databaseBackup', e.target.checked, '数据库备份')}
            className="sr-only peer"
            aria-label="数据库备份"
          />
          <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative">
            <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
          </div>
          <span className={`ml-2 text-sm ${settings.integration.databaseBackup ? 'text-blue-600' : 'text-gray-600'}`}>{settings.integration.databaseBackup ? '已启用' : '已关闭'}</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            className={`btn-primary inline-flex items-center ${!settings.integration.databaseBackup ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!settings.integration.databaseBackup}
            onClick={async () => {
              try {
                const res = await api.post('/admin/backup')
                toast.success(`备份成功：${res.data?.path || '已保存至backups目录'}`)
                await loadBackups()
              } catch (err) {
                toast.error('备份失败')
              }
            }}
          >
            <Database size={16} className="mr-2" />
            立即备份
          </button>
        </div>
      </div>
      <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">备份文件</div>
          <button className="btn-secondary" onClick={loadBackups}>刷新</button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-gray-700">文件名</th>
                <th className="px-3 py-2 text-left text-gray-700">更新时间</th>
                <th className="px-3 py-2 text-right text-gray-700">大小</th>
                <th className="px-3 py-2 text-center text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(backups) ? backups : []).map((b) => (
                <tr key={b.name} className="border-t">
                  <td className="px-3 py-2 text-gray-800">
                    <span className="inline-block max-w-[360px] truncate" title={b.name}>{formatBackupName(b.name)}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDateTime(b.mtime)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{(b.size/1024).toFixed(1)} KB</td>
                  <td className="px-3 py-2 text-center">
                    <a className="btn-primary" href={b.url} target="_blank" rel="noreferrer">下载</a>
                  </td>
                </tr>
              ))}
              {(!backups || backups.length === 0) && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>暂无备份文件</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderTargetTypes = () => {
    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-700">目标类型管理</h3>
          <p className="text-sm text-gray-500 mt-1">管理系统中的各种目标类型，用于分类和组织企业目标</p>
        </div>
        <button
          onClick={handleAddTargetType}
          className="btn-primary flex items-center space-x-2"
          disabled={isEditingType}
        >
          <Plus size={16} />
          <span>新增类型</span>
        </button>
      </div>

      {isEditingType && (
        <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
          已打开新增类型弹窗，请在弹窗中填写并保存
        </div>
      )}

      {isEditingType && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all duration-200">
            <div className="p-5 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
              <div className="font-semibold text-lg">{editingTypeId ? '编辑目标类型' : '新增目标类型'}</div>
              <button onClick={cancelEditType} className="text白色/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">类型名称<span className="ml-1 text-red-500">*</span></label>
                  <input
                    type="text"
                    value={typeFormData.name}
                    onChange={(e) => { setTypeFormData({ ...typeFormData, name: e.target.value }); if (typeErrors.name) setTypeErrors(prev => ({ ...prev, name: '' })) }}
                    className="form-input"
                    placeholder="请输入目标类型名称"
                    autoFocus
                  />
                  {typeErrors.name ? (
                    <span className="text-red-500 text-sm mt-1 block">{typeErrors.name}</span>
                  ) : (
                    <span className="text-gray-500 text-xs mt-1 block">如：销售目标、市场目标</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分类<span className="ml-1 text-red-500">*</span></label>
                  <select
                    value={typeFormData.category}
                    onChange={(e) => { setTypeFormData({ ...typeFormData, category: e.target.value }); if (typeErrors.category) setTypeErrors(prev => ({ ...prev, category: '' })) }}
                    className={`form-select ${typeErrors.category ? 'border-red-500' : ''}`}
                  >
                    <option value="">请选择分类</option>
                    {categoryOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {typeErrors.category ? (
                    <span className="text-red-500 text-sm mt-1 block">{typeErrors.category}</span>
                  ) : (
                    <span className="text-gray-500 text-xs mt-1 block">用于组织与筛选类型</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">图标<span className="ml-1 text-red-500">*</span></label>
                  <select
                    value={typeFormData.icon}
                    onChange={(e) => { setTypeFormData({ ...typeFormData, icon: e.target.value }); if (typeErrors.icon) setTypeErrors(prev => ({ ...prev, icon: '' })) }}
                    className={`form-select ${typeErrors.icon ? 'border-red-500' : ''}`}
                  >
                    <option value="">请选择图标</option>
                    {iconOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {typeErrors.icon ? (
                    <span className="text-red-500 text-sm mt-1 block">{typeErrors.icon}</span>
                  ) : (
                    <span className="text-gray-500 text-xs mt-1 block">选择一个代表性的图标</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">主题色<span className="ml-1 text-red-500">*</span></label>
                  <input
                    type="text"
                    value={typeFormData.color}
                    onChange={(e) => { setTypeFormData({ ...typeFormData, color: e.target.value }); if (typeErrors.color) setTypeErrors(prev => ({ ...prev, color: '' })) }}
                    className={`form-input ${typeErrors.color ? 'border-red-500' : ''}`}
                    placeholder="#3B82F6"
                  />
                  {typeErrors.color ? (
                    <span className="text-red-500 text-sm mt-1 block">{typeErrors.color}</span>
                  ) : (
                    <span className="text-gray-500 text-xs mt-1 block">支持HEX颜色，如 #10B981</span>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                  <textarea
                    value={typeFormData.description}
                    onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                    className="form-textarea"
                    rows={3}
                    placeholder="请输入该类型的用途说明"
                  />
                  <span className="text-gray-500 text-xs mt-1 block">补充该类型的使用范围与示例</span>
                </div>
                <div>
                  <div className="flex items-center">
                    <label className="text-sm font-medium text-gray-700 mr-3">启用</label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={typeFormData.isActive}
                        onChange={(e) => setTypeFormData({ ...typeFormData, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-green-500 relative">
                        <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
                      </div>
                      <span className={`ml-3 inline-flex items-center text-sm ${typeFormData.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                        {typeFormData.isActive ? (<CheckCircle size={16} className="mr-1" />) : (<Ban size={16} className="mr-1" />)}
                        {typeFormData.isActive ? '已启用' : '未启用'}
                      </span>
                    </label>
                  </div>
                  <span className="text-gray-500 text-xs mt-1 block">关闭后该类型不可选用</span>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={cancelEditType} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                <button onClick={handleSaveTargetType} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg flex items-center space-x-2">
                  <Save size={18} />
                  <span>保存</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 目标类型列表 */}
      <div className="card p-4 mt-4">
        <div className="flex items-center justify-start mb-3">
          <div className="text-sm text-gray-600">共 {targetTypes.length} 项类型</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">名称</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">分类</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">颜色</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">启用状态</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">描述</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {targetTypes.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 text-sm text-gray-800">
                    <span className="inline-flex items-center">
                      <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: t.color || '#3B82F6' }}></span>
                      {t.name}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{categoryLabelMap[t.category] || t.category || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{t.color || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {t.isActive ? '已启用' : '未启用'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    <span className="inline-block max-w-[260px] truncate" title={t.description || ''}>{t.description || '-'}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button className="btn-secondary" onClick={() => handleEditTargetType(t)} title="编辑">
                        <Edit size={16} />
                      </button>
                      <button className="btn-danger" onClick={() => handleDeleteTargetType(t)} title="删除">
                        <Trash2 size={16} />
                      </button>
                      <button className="btn-primary" onClick={() => handleToggleTypeStatus(t.id)} title={t.isActive ? '禁用' : '启用'}>
                        {t.isActive ? '禁用' : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{targetTypes.length}</div>
          <div className="text-sm text-blue-600">总类型数</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {targetTypes.filter(t => t.isActive).length}
          </div>
          <div className="text-sm text-green-600">启用类型</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">
            {[...new Set(targetTypes.map(t => t.category))].length}
          </div>
          <div className="text-sm text-purple-600">分类数量</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">
            {targetTypes.filter(t => !t.isActive).length}
          </div>
          <div className="text-sm text-orange-600">禁用类型</div>
        </div>
      </div>
    </div>
    );
  }

  const renderContent = () => {
    let contentView = null
    const disabled = loading
    switch (activeTab) {
      case 'system':
        contentView = (
          <div className="space-y-6">
            {renderSystemSettings()}
            <SettingsButtons disabled={disabled} onSave={saveActiveSettings} onReset={resetSettings} saving={saving} resetting={resetting} />
          </div>
        )
        break
      case 'security':
        contentView = (
          <div className="space-y-6">
            {renderSecuritySettings()}
            <SettingsButtons disabled={disabled} onSave={saveActiveSettings} onReset={resetSettings} saving={saving} resetting={resetting} />
          </div>
        )
        break
      case 'notification':
        contentView = (
          <div className="space-y-6">
            {renderNotificationSettings()}
            <SettingsButtons disabled={disabled} onSave={saveActiveSettings} onReset={resetSettings} saving={saving} resetting={resetting} />
          </div>
        )
        break
      case 'integration':
        contentView = (
          <div className="space-y-6">
            {renderIntegrationSettings()}
            <SettingsButtons disabled={disabled} onSave={saveActiveSettings} onReset={resetSettings} saving={saving} resetting={resetting} />
          </div>
        )
        break
      case 'targetTypes':
        contentView = renderTargetTypes()
        break
      default:
        contentView = (
          <div className="space-y-6">
            {renderSystemSettings()}
            <SettingsButtons disabled={disabled} onSave={saveSettings} onReset={resetSettings} />
          </div>
        )
    }
    return contentView
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <PageHeaderBanner title="系统设置" subTitle="系统设置的年度工作落地规划" />

        {/* 标签页导航 */}
        <div className="bg-gradient-to-r from-white to-blue-50 rounded-xl shadow-lg border border-white/50 mb-6 overflow-hidden">
          <div className="flex space-x-1 p-2 bg-gradient-to-r from-blue-100/50 to-purple-100/50">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 transform ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md'
                  }`}
                >
                  <IconComponent size={18} />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-white/50 p-6">
            {renderContent()}
          </div>
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteTargetType}
        itemName={deleteDialog.itemName}
        title="确认删除目标类型"
        message="确定要删除这个目标类型吗？此操作不可恢复！"
      />
    </div>
  )
}

export default SystemSettings
