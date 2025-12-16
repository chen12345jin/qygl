import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Send, 
  Save, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Bell,
  Settings,
  Zap,
  RefreshCw,
  HelpCircle,
  Target,
  Calendar,
  Clock
} from 'lucide-react'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { toast } from 'react-hot-toast'
import { api } from '../../utils/api'

const DingtalkConfig = () => {
  // 配置状态
  const [config, setConfig] = useState({
    enabled: false,
    webhookUrl: '',
    accessToken: '',
    secret: ''
  })
  
  // 连接状态
  const [connectionStatus, setConnectionStatus] = useState('untested') // untested, testing, connected, failed
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 测试消息
  const [testMessage, setTestMessage] = useState({
    title: '企业年度规划系统测试',
    content: '这是一条测试消息，用于验证钉钉集成是否正常工作。'
  })
  const [sendingTest, setSendingTest] = useState(false)
  
  // 通知场景测试状态
  const [testingScenario, setTestingScenario] = useState(null)

  // 加载配置
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const response = await api.get('/system-settings')
      const settings = Array.isArray(response.data) ? response.data : []
      const dingtalkSetting = settings.find(s => s.key === 'dingtalk_webhook')
      
      if (dingtalkSetting && dingtalkSetting.value) {
        const value = typeof dingtalkSetting.value === 'string' 
          ? JSON.parse(dingtalkSetting.value) 
          : dingtalkSetting.value
        setConfig({
          enabled: value.enabled || false,
          webhookUrl: value.webhookUrl || '',
          accessToken: value.accessToken || '',
          secret: value.secret || ''
        })
      }
    } catch (error) {
      console.error('加载钉钉配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 保存配置
  const handleSaveConfig = async () => {
    if (config.enabled && !config.webhookUrl) {
      toast.error('请填写Webhook地址')
      return
    }
    
    setSaving(true)
    try {
      // 先获取现有配置
      const response = await api.get('/system-settings')
      const settings = Array.isArray(response.data) ? response.data : []
      const existing = settings.find(s => s.key === 'dingtalk_webhook')
      
      const configData = {
        key: 'dingtalk_webhook',
        value: config
      }
      
      if (existing) {
        await api.put(`/system-settings/${existing.id}`, configData)
      } else {
        await api.post('/system-settings', configData)
      }
      
      toast.success('配置保存成功')
    } catch (error) {
      console.error('保存配置失败:', error)
      toast.error('保存配置失败')
    } finally {
      setSaving(false)
    }
  }

  // 测试连接
  const handleTestConnection = async () => {
    if (!config.webhookUrl) {
      toast.error('请先填写Webhook地址')
      return
    }
    
    setConnectionStatus('testing')
    try {
      const response = await api.post('/dingtalk/test-connection', {
        webhookUrl: config.webhookUrl,
        secret: config.secret
      })
      
      if (response.data.success) {
        setConnectionStatus('connected')
        toast.success('连接测试成功')
      } else {
        setConnectionStatus('failed')
        toast.error(response.data.message || '连接测试失败')
      }
    } catch (error) {
      setConnectionStatus('failed')
      toast.error(error.response?.data?.error || '连接测试失败')
    }
  }

  // 发送测试消息
  const handleSendTestMessage = async () => {
    if (!config.webhookUrl) {
      toast.error('请先填写Webhook地址')
      return
    }
    
    if (!testMessage.title || !testMessage.content) {
      toast.error('请填写消息标题和内容')
      return
    }
    
    setSendingTest(true)
    try {
      const response = await api.post('/dingtalk/send-message', {
        webhookUrl: config.webhookUrl,
        secret: config.secret,
        title: testMessage.title,
        content: testMessage.content
      })
      
      if (response.data.success) {
        toast.success('测试消息发送成功')
        setConnectionStatus('connected')
      } else {
        toast.error(response.data.message || '发送失败')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || '发送测试消息失败')
    } finally {
      setSendingTest(false)
    }
  }

  // 测试通知场景
  const handleTestScenario = async (scenario) => {
    if (!config.webhookUrl) {
      toast.error('请先配置Webhook地址')
      return
    }
    
    setTestingScenario(scenario)
    try {
      const messages = {
        target_update: {
          title: '【目标更新通知】',
          content: '部门目标分解表有新的更新\n\n部门：销售部\n目标类型：销售目标\n目标值：500万\n更新人：张三\n更新时间：' + new Date().toLocaleString()
        },
        plan_complete: {
          title: '【计划完成通知】',
          content: '5W2H行动计划已完成\n\n计划名称：新产品推广计划\n负责人：李四\n完成时间：' + new Date().toLocaleString() + '\n完成率：100%'
        },
        event_reminder: {
          title: '【重要事件提醒】',
          content: '以下重要事件即将到期\n\n事件名称：年度总结会议\n截止时间：' + new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString() + '\n剩余天数：3天\n请及时处理！'
        }
      }
      
      const msg = messages[scenario]
      const response = await api.post('/dingtalk/send-message', {
        webhookUrl: config.webhookUrl,
        secret: config.secret,
        title: msg.title,
        content: msg.content
      })
      
      if (response.data.success) {
        toast.success('场景通知发送成功')
      } else {
        toast.error(response.data.message || '发送失败')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || '发送失败')
    } finally {
      setTestingScenario(null)
    }
  }

  // 连接状态显示
  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <div className="flex items-center space-x-2 text-blue-600">
            <RefreshCw size={18} className="animate-spin" />
            <span>测试中...</span>
          </div>
        )
      case 'connected':
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle size={18} />
            <span>已连接</span>
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle size={18} />
            <span>连接失败</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center space-x-2 text-gray-500">
            <AlertCircle size={18} />
            <span>未测试</span>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="钉钉集成配置"
        subTitle="配置钉钉机器人Webhook，实现系统通知自动推送"
      />

      {/* 连接状态卡片 */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-white/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${config.enabled ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}>
              <MessageSquare size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-gray-800">连接状态:</span>
                {getStatusDisplay()}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {config.enabled ? '钉钉通知已启用' : '钉钉通知已禁用'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">启用钉钉通知</span>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                config.enabled ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 配置表单 */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-white/50 p-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center">
            <Settings size={20} className="mr-2 text-blue-600" />
            Webhook配置
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Webhook地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.webhookUrl}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1.5">钉钉群机器人的Webhook地址，可在群设置中获取</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Access Token
              </label>
              <input
                type="text"
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                placeholder="机器人的Access Token"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                加签密钥 (可选)
              </label>
              <input
                type="password"
                value={config.secret}
                onChange={(e) => setConfig({ ...config, secret: e.target.value })}
                placeholder="机器人的加签密钥"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1.5">如果启用了加签安全设置，请填写密钥</p>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {saving ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>{saving ? '保存中...' : '保存配置'}</span>
              </button>
              
              <button
                onClick={handleTestConnection}
                disabled={connectionStatus === 'testing' || !config.webhookUrl}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {connectionStatus === 'testing' ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Zap size={18} />
                )}
                <span>测试连接</span>
              </button>
            </div>
          </div>
        </div>

        {/* 测试消息 */}
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border border-white/50 p-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center">
            <Send size={20} className="mr-2 text-purple-600" />
            测试消息
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                消息标题
              </label>
              <input
                type="text"
                value={testMessage.title}
                onChange={(e) => setTestMessage({ ...testMessage, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                消息内容
              </label>
              <textarea
                value={testMessage.content}
                onChange={(e) => setTestMessage({ ...testMessage, content: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 resize-none"
              />
            </div>
            
            <button
              onClick={handleSendTestMessage}
              disabled={sendingTest || !config.webhookUrl}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {sendingTest ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              <span>{sendingTest ? '发送中...' : '发送测试消息'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 通知场景 */}
      <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg border border-white/50 p-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-6 flex items-center">
          <Bell size={20} className="mr-2 text-green-600" />
          通知场景
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg">
                <Target size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">目标更新通知</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">当部门目标分解表有更新时自动通知相关人员</p>
            <button
              onClick={() => handleTestScenario('target_update')}
              disabled={testingScenario === 'target_update' || !config.webhookUrl}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {testingScenario === 'target_update' ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span>测试通知</span>
            </button>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-green-400 to-green-600 rounded-lg">
                <CheckCircle size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">计划完成通知</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">当5W2H行动计划完成时通知团队成员</p>
            <button
              onClick={() => handleTestScenario('plan_complete')}
              disabled={testingScenario === 'plan_complete' || !config.webhookUrl}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {testingScenario === 'plan_complete' ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span>测试通知</span>
            </button>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg">
                <Clock size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">重要事件提醒</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">重要事件临近截止时间时自动提醒</p>
            <button
              onClick={() => handleTestScenario('event_reminder')}
              disabled={testingScenario === 'event_reminder' || !config.webhookUrl}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {testingScenario === 'event_reminder' ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span>测试通知</span>
            </button>
          </div>
        </div>
      </div>

      {/* 使用指南 */}
      <div className="bg-gradient-to-br from-white to-yellow-50 rounded-xl shadow-lg border border-white/50 p-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-6 flex items-center">
          <HelpCircle size={20} className="mr-2 text-yellow-600" />
          使用指南
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <h3 className="font-semibold text-gray-800">创建钉钉群机器人</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2 ml-11">
              <li>• 在钉钉群中添加自定义机器人</li>
              <li>• 选择安全设置（建议使用加签方式）</li>
              <li>• 复制Webhook地址和相关密钥</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <h3 className="font-semibold text-gray-800">配置系统集成</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2 ml-11">
              <li>• 将Webhook地址填入上方配置表单</li>
              <li>• 如使用加签，请填入对应密钥</li>
              <li>• 启用钉钉通知功能</li>
              <li>• 点击"测试连接"验证配置是否正确</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <h3 className="font-semibold text-gray-800">自动通知场景</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2 ml-11">
              <li>• 目标分解表更新时通知相关部门负责人</li>
              <li>• 重要事件临近截止时间自动提醒</li>
              <li>• 月度工作计划完成状态变更通知</li>
              <li>• 系统重要操作和数据变更提醒</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DingtalkConfig

