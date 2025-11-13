import React, { useState, useEffect } from 'react'
import { Save, RefreshCw, Shield, Database, Bell, Wifi, Target, Plus, Edit, Trash2, X, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../contexts/DataContext'
import DeleteConfirmDialog from '../../components/DeleteConfirmDialog'

const SystemSettings = () => {
  const { getSystemSettings, addSystemSetting, updateSystemSetting, getTargetTypes, addTargetType, updateTargetType, deleteTargetType, loading } = useData()
  const [settings, setSettings] = useState({
    system: {
      systemName: '企业年度规划系统',
      version: '1.0.0',
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
  const [isAddingType, setIsAddingType] = useState(false)
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
    icon: 'target',
    category: 'business',
    isActive: true
  })

  const [activeTab, setActiveTab] = useState('system')

  useEffect(() => {
    loadSettings()
    loadTargetTypes()
  }, [])

  const loadSettings = async () => {
    try {
      const result = await getSystemSettings()
      if (result.success && result.data) {
        // 确保数据结构完整，添加安全检查
        const safeData = {
          system: {
            systemName: result.data.system?.systemName || '企业目标管理系统',
            version: result.data.system?.version || '1.0.0',
            language: result.data.system?.language || 'zh-CN',
            timezone: result.data.system?.timezone || 'Asia/Shanghai',
            autoBackup: result.data.system?.autoBackup ?? true,
            backupInterval: result.data.system?.backupInterval || 24,
            maintenanceMode: result.data.system?.maintenanceMode ?? false
          },
          security: {
            passwordMinLength: result.data.security?.passwordMinLength || 8,
            sessionTimeout: result.data.security?.sessionTimeout || 30,
            maxLoginAttempts: result.data.security?.maxLoginAttempts || 5,
            enableTwoFactor: result.data.security?.enableTwoFactor ?? false,
            ipWhitelist: result.data.security?.ipWhitelist || '',
            auditLog: result.data.security?.auditLog ?? true
          },
          notification: {
            emailNotification: result.data.notification?.emailNotification ?? true,
            smsNotification: result.data.notification?.smsNotification ?? false,
            dingtalkNotification: result.data.notification?.dingtalkNotification ?? true,
            taskReminder: result.data.notification?.taskReminder ?? true,
            deadlineAlert: result.data.notification?.deadlineAlert ?? true,
            reportNotification: result.data.notification?.reportNotification ?? true
          },
          integration: {
            dingtalkEnabled: result.data.integration?.dingtalkEnabled ?? false,
            dingtalkAppKey: result.data.integration?.dingtalkAppKey || '',
            dingtalkAppSecret: result.data.integration?.dingtalkAppSecret || '',
            emailHost: result.data.integration?.emailHost || '',
            emailPort: result.data.integration?.emailPort || 587,
            emailUser: result.data.integration?.emailUser || '',
            emailPassword: result.data.integration?.emailPassword || '',
            databaseBackup: result.data.integration?.databaseBackup ?? true
          }
        }
        setSettings(safeData)
      } else {
        // 如果没有数据，使用默认设置
        setSettings({
          system: {
            systemName: '企业目标管理系统',
            version: '1.0.0',
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
      }
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

  const saveSettings = async () => {
    try {
      const result = await addSystemSetting(settings)
      if (result.success) {
        toast.success('设置保存成功')
      } else {
        toast.error('保存设置失败')
      }
    } catch (error) {
      toast.error('设置保存失败')
      console.error('保存设置失败:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      await saveSettings(settings)
      toast.success('设置保存成功')
    } catch (error) {
      console.error('保存设置失败:', error)
      toast.error('保存设置失败')
    }
  }

  const resetSettings = async () => {
    if (window.confirm('确定要重置所有设置吗？此操作不可恢复。')) {
      try {
        // 重置为默认设置
        const defaultSettings = {
          system: {
            systemName: '企业年度规划系统',
            version: '1.0.0',
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
        await saveSettings(defaultSettings)
        setSettings(defaultSettings)
        toast.success('设置已重置')
      } catch (error) {
        console.error('重置设置失败:', error)
        toast.error('重置设置失败')
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
  }

  // 目标类型管理功能
  const handleAddTargetType = () => {
    setIsEditingType(true)
    setEditingTypeId(null)
    setTypeFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: 'target',
      category: 'business',
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
    if (!typeFormData.name.trim()) {
      toast.error('请输入目标类型名称')
      return
    }

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
        toast.success(editingTypeId ? '目标类型更新成功' : '目标类型添加成功')
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            系统名称
          </label>
          <input
            type="text"
            value={settings.system.systemName}
            onChange={(e) => updateSetting('system', 'systemName', e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            系统版本
          </label>
          <input
            type="text"
            value={settings.system.version}
            onChange={(e) => updateSetting('system', 'version', e.target.value)}
            className="form-input"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            系统语言
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
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            时区设置
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
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">自动备份</h3>
            <p className="text-sm text-gray-500">定期自动备份系统数据</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.system.autoBackup}
              onChange={(e) => updateSetting('system', 'autoBackup', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.system.maintenanceMode}
              onChange={(e) => updateSetting('system', 'maintenanceMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            密码最小长度
          </label>
          <input
            type="number"
            value={settings.security.passwordMinLength}
            onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
            className="form-input"
            min="6"
            max="20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            会话超时（分钟）
          </label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
            className="form-input"
            min="5"
            max="480"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            最大登录尝试次数
          </label>
          <input
            type="number"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
            className="form-input"
            min="3"
            max="10"
          />
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
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.enableTwoFactor}
              onChange={(e) => updateSetting('security', 'enableTwoFactor', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">审计日志</h3>
            <p className="text-sm text-gray-500">记录用户操作日志</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.auditLog}
              onChange={(e) => updateSetting('security', 'auditLog', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notification.emailNotification}
              onChange={(e) => updateSetting('notification', 'emailNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">短信通知</h3>
            <p className="text-sm text-gray-500">通过短信发送紧急通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notification.smsNotification}
              onChange={(e) => updateSetting('notification', 'smsNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">钉钉通知</h3>
            <p className="text-sm text-gray-500">通过钉钉发送工作通知</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notification.dingtalkNotification}
              onChange={(e) => updateSetting('notification', 'dingtalkNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">任务提醒</h3>
            <p className="text-sm text-gray-500">任务截止前自动提醒</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notification.taskReminder}
              onChange={(e) => updateSetting('notification', 'taskReminder', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">截止提醒</h3>
            <p className="text-sm text-gray-500">计划截止日期提醒</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notification.deadlineAlert}
              onChange={(e) => updateSetting('notification', 'deadlineAlert', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">报告通知</h3>
            <p className="text-sm text-gray-500">定期发送进度报告</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notification.reportNotification}
              onChange={(e) => updateSetting('notification', 'reportNotification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.integration.dingtalkEnabled}
                onChange={(e) => updateSetting('integration', 'dingtalkEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.integration.dingtalkEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  应用Key
                </label>
                <input
                  type="text"
                  value={settings.integration.dingtalkAppKey}
                  onChange={(e) => updateSetting('integration', 'dingtalkAppKey', e.target.value)}
                  className="form-input"
                  placeholder="请输入钉钉应用Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  应用Secret
                </label>
                <input
                  type="password"
                  value={settings.integration.dingtalkAppSecret}
                  onChange={(e) => updateSetting('integration', 'dingtalkAppSecret', e.target.value)}
                  className="form-input"
                  placeholder="请输入钉钉应用Secret"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">邮件服务</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP服务器
            </label>
            <input
              type="text"
              value={settings.integration.emailHost}
              onChange={(e) => updateSetting('integration', 'emailHost', e.target.value)}
              className="form-input"
              placeholder="smtp.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              端口
            </label>
            <input
              type="number"
              value={settings.integration.emailPort}
              onChange={(e) => updateSetting('integration', 'emailPort', parseInt(e.target.value))}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={settings.integration.emailUser}
              onChange={(e) => updateSetting('integration', 'emailUser', e.target.value)}
              className="form-input"
              placeholder="user@example.com"
            />
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
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.integration.databaseBackup}
            onChange={(e) => updateSetting('integration', 'databaseBackup', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  )

  const renderTargetTypes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-700">目标类型管理</h3>
          <p className="text-sm text-gray-500 mt-1">管理系统中的各种目标类型，用于分类和组织企业目标</p>
        </div>
        <button
          onClick={handleAddTargetType}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>新增类型</span>
        </button>
      </div>

      {/* 编辑表单 */}
      {isEditingType && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-md font-semibold mb-4">
            {editingTypeId ? '编辑目标类型' : '新增目标类型'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                类型名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={typeFormData.name}
                onChange={(e) => setTypeFormData({...typeFormData, name: e.target.value})}
                className="form-input"
                placeholder="请输入目标类型名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                类型分类
              </label>
              <select
                value={typeFormData.category}
                onChange={(e) => setTypeFormData({...typeFormData, category: e.target.value})}
                className="form-select"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                显示颜色
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={typeFormData.color}
                  onChange={(e) => setTypeFormData({...typeFormData, color: e.target.value})}
                  className="w-12 h-10 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={typeFormData.color}
                  onChange={(e) => setTypeFormData({...typeFormData, color: e.target.value})}
                  className="form-input flex-1"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                图标
              </label>
              <select
                value={typeFormData.icon}
                onChange={(e) => setTypeFormData({...typeFormData, icon: e.target.value})}
                className="form-select"
              >
                {iconOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <textarea
                value={typeFormData.description}
                onChange={(e) => setTypeFormData({...typeFormData, description: e.target.value})}
                className="form-textarea"
                rows="3"
                placeholder="请输入目标类型的详细描述"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={typeFormData.isActive}
                  onChange={(e) => setTypeFormData({...typeFormData, isActive: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  启用此目标类型
                </label>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 mt-6">
            <button
              onClick={handleSaveTargetType}
              className="btn-primary flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{editingTypeId ? '更新' : '保存'}</span>
            </button>
            <button
              onClick={cancelEditType}
              className="btn-secondary flex items-center space-x-2"
            >
              <X size={16} />
              <span>取消</span>
            </button>
          </div>
        </div>
      )}

      {/* 目标类型列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {targetTypes.map(type => (
          <div key={type.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: type.color + '20' }}
                >
                  <Target size={20} style={{ color: type.color }} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{type.name}</h4>
                  <span className="text-xs text-gray-500">
                    {categoryOptions.find(c => c.value === type.category)?.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEditTargetType(type)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="编辑"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteTargetType(type)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {type.description || '暂无描述'}
            </p>
            
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${
                type.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {type.isActive ? '启用' : '禁用'}
              </span>
              <button
                onClick={() => handleToggleTypeStatus(type.id)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  type.isActive
                    ? 'border-red-300 text-red-600 hover:bg-red-50'
                    : 'border-green-300 text-green-600 hover:bg-green-50'
                }`}
              >
                {type.isActive ? '禁用' : '启用'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {targetTypes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p>暂无目标类型，请添加新的目标类型</p>
        </div>
      )}

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
  )

  const renderContent = () => {
    const renderWithButtons = (content) => (
      <div className="space-y-6">
        {content}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={saveSettings}
            className="btn-primary flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Save size={18} />
            <span>保存设置</span>
          </button>
          <button
            onClick={resetSettings}
            className="btn-secondary flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <RotateCcw size={18} />
            <span>重置设置</span>
          </button>
        </div>
      </div>
    )

    switch (activeTab) {
      case 'system':
        return renderWithButtons(renderSystemSettings())
      case 'security':
        return renderWithButtons(renderSecuritySettings())
      case 'notification':
        return renderWithButtons(renderNotificationSettings())
      case 'integration':
        return renderWithButtons(renderIntegrationSettings())
      case 'targetTypes':
        return renderTargetTypes()
      default:
        return renderWithButtons(renderSystemSettings())
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-gradient-to-r from-white/20 to-white/30 rounded-lg shadow-lg">
                <Shield size={24} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                系统设置
              </h1>
            </div>
            <p className="text-blue-100 text-lg">管理系统配置、安全设置和集成选项</p>
          </div>
        </div>

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
