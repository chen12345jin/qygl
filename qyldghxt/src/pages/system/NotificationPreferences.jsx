import React, { useEffect, useState } from 'react'
import { Bell, Save, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'

const NotificationPreferences = () => {
  const { getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [settingsId, setSettingsId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [prefs, setPrefs] = useState({
    emailNotification: true,
    smsNotification: false,
    dingtalkNotification: true,
    taskReminder: true,
    deadlineAlert: true,
    reportNotification: true
  })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await getSystemSettings()
      const list = Array.isArray(res?.data) ? res.data : []
      const rec = list.find(s => s.key === 'notification')
      setSettingsId(rec?.id || null)
      const v = rec?.value || {}
      setPrefs({
        emailNotification: v.emailNotification ?? true,
        smsNotification: v.smsNotification ?? false,
        dingtalkNotification: v.dingtalkNotification ?? true,
        taskReminder: v.taskReminder ?? true,
        deadlineAlert: v.deadlineAlert ?? true,
        reportNotification: v.reportNotification ?? true
      })
    } catch (e) {
      toast.error('加载通知偏好失败')
    }
  }

  const updatePref = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    let loadingId
    try {
      setSaving(true)
      loadingId = toast.loading('正在保存通知偏好…')
      let result
      if (settingsId) {
        result = await updateSystemSetting(settingsId, { key: 'notification', value: prefs }, false)
      } else {
        result = await addSystemSetting({ key: 'notification', value: prefs }, false)
        if (result?.data?.id) setSettingsId(result.data.id)
      }
      if (result?.success) toast.success('通知偏好已保存', { id: loadingId })
      else toast.error('保存失败', { id: loadingId })
    } catch (e) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    let loadingId
    try {
      setResetting(true)
      loadingId = toast.loading('正在重置通知偏好…')
      const defaults = {
        emailNotification: true,
        smsNotification: false,
        dingtalkNotification: true,
        taskReminder: true,
        deadlineAlert: true,
        reportNotification: true
      }
      setPrefs(defaults)
      let result
      if (settingsId) {
        result = await updateSystemSetting(settingsId, { key: 'notification', value: defaults }, false)
      } else {
        result = await addSystemSetting({ key: 'notification', value: defaults }, false)
        if (result?.data?.id) setSettingsId(result.data.id)
      }
      if (result?.success) toast.success('已重置通知偏好', { id: loadingId })
      else toast.error('重置失败', { id: loadingId })
    } catch (e) {
      toast.error('重置失败')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        <PageHeaderBanner title="通知偏好设置" subTitle="统一配置邮件、短信、钉钉及提醒策略" />
        <div className="bg-white/80 rounded-2xl shadow-xl border border-white/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Bell size={22} className="text-white" />
              </div>
              <div className="text-lg font-semibold text-gray-800">通知偏好</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={save} className="btn-primary" disabled={saving}>
                {saving ? <span className="inline-flex items-center"><Save size={16} className="mr-2 animate-spin" />保存中…</span> : <span className="inline-flex items-center"><Save size={16} className="mr-2" />保存设置</span>}
              </button>
              <button onClick={reset} className="btn-secondary" disabled={resetting}>
                {resetting ? <span className="inline-flex items-center"><RotateCcw size={16} className="mr-2 animate-spin" />重置中…</span> : <span className="inline-flex items-center"><RotateCcw size={16} className="mr-2" />重置设置</span>}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">邮件通知</div>
                <div className="text-sm text-gray-500">通过邮件发送系统通知</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={prefs.emailNotification} onChange={(e) => updatePref('emailNotification', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative"><span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span></div>
                <span className={`ml-2 text-sm ${prefs.emailNotification ? 'text-blue-600' : 'text-gray-600'}`}>{prefs.emailNotification ? '已开启' : '已关闭'}</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">短信通知</div>
                <div className="text-sm text-gray-500">通过短信发送紧急通知</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={prefs.smsNotification} onChange={(e) => updatePref('smsNotification', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative"><span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span></div>
                <span className={`ml-2 text-sm ${prefs.smsNotification ? 'text-blue-600' : 'text-gray-600'}`}>{prefs.smsNotification ? '已开启' : '已关闭'}</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">钉钉通知</div>
                <div className="text-sm text-gray-500">通过钉钉发送工作通知</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={prefs.dingtalkNotification} onChange={(e) => updatePref('dingtalkNotification', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative"><span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span></div>
                <span className={`ml-2 text-sm ${prefs.dingtalkNotification ? 'text-blue-600' : 'text-gray-600'}`}>{prefs.dingtalkNotification ? '已开启' : '已关闭'}</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">任务提醒</div>
                <div className="text-sm text-gray-500">任务截止前自动提醒</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={prefs.taskReminder} onChange={(e) => updatePref('taskReminder', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative"><span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span></div>
                <span className={`ml-2 text-sm ${prefs.taskReminder ? 'text-blue-600' : 'text-gray-600'}`}>{prefs.taskReminder ? '已开启' : '已关闭'}</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">截止提醒</div>
                <div className="text-sm text-gray-500">计划截止日期提醒</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={prefs.deadlineAlert} onChange={(e) => updatePref('deadlineAlert', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative"><span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span></div>
                <span className={`ml-2 text-sm ${prefs.deadlineAlert ? 'text-blue-600' : 'text-gray-600'}`}>{prefs.deadlineAlert ? '已开启' : '已关闭'}</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">报告通知</div>
                <div className="text-sm text-gray-500">定期发送进度报告</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={prefs.reportNotification} onChange={(e) => updatePref('reportNotification', e.target.checked)} className="sr-only peer" />
                <div className="w-12 h-7 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600 relative"><span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span></div>
                <span className={`ml-2 text-sm ${prefs.reportNotification ? 'text-blue-600' : 'text-gray-600'}`}>{prefs.reportNotification ? '已开启' : '已关闭'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationPreferences
