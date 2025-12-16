import React, { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import { useData } from '../contexts/DataContext'

const ScoreAndOutput = () => {
  const { globalYear, setGlobalYear, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [years, setYears] = useState([2024, 2025, 2026])
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  const [yearChangeByUser, setYearChangeByUser] = useState(false)

  // 加载年份设置
  useEffect(() => {
    const loadYears = async () => {
      try {
        const settingsRes = await getSystemSettings()
        const settings = settingsRes?.data || []
        const found = settings.find(s => s.key === 'planningYears')
        const currentFound = settings.find(s => s.key === 'currentPlanningYear')
        if (found && Array.isArray(found.value)) {
          setYears(found.value)
          setYearsSettingId(found.id)
        }
        if (currentFound && (typeof currentFound.value === 'number' || typeof currentFound.value === 'string')) {
          const y = parseInt(currentFound.value)
          if (!isNaN(y)) {
            setGlobalYear(y)
            setCurrentYearSettingId(currentFound.id)
          }
        }
      } catch (e) {}
    }
    loadYears()
  }, [])

  // 保存年份设置
  const persistYears = async (arr) => {
    try {
      if (yearsSettingId) {
        const res = await updateSystemSetting(yearsSettingId, { key: 'planningYears', value: arr }, false)
        if (res?.success) return
      }
      const addRes = await addSystemSetting({ key: 'planningYears', value: arr }, false)
      if (addRes?.data?.id) setYearsSettingId(addRes.data.id)
    } catch (e) {}
  }

  // 保存当前年份设置
  const persistSelectedYear = async (y, showToast = false) => {
    try {
      if (currentYearSettingId) {
        const res = await updateSystemSetting(currentYearSettingId, { key: 'currentPlanningYear', value: y }, showToast)
        if (res?.success) return
      }
      const addRes = await addSystemSetting({ key: 'currentPlanningYear', value: y }, showToast)
      if (addRes?.data?.id) setCurrentYearSettingId(addRes.data.id)
    } catch (e) {}
  }

  // 监听年份变化
  useEffect(() => {
    if (globalYear) {
      persistSelectedYear(globalYear, yearChangeByUser)
      if (yearChangeByUser) setYearChangeByUser(false)
    }
  }, [globalYear, yearChangeByUser])

  return (
    <div className="space-y-8">
      {/* 页面头部 */}
      <PageHeaderBanner
        title="积分 & 产值"
        subTitle="积分与产值管理系统"
        year={globalYear}
        onYearChange={(y)=>{ 
          setYearChangeByUser(true)
          setGlobalYear(y) 
        }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
      />

      {/* 内容卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mx-1">
        <div className="text-gray-500 text-center py-12">
          <p className="text-lg">页面内容正在开发中...</p>
        </div>
      </div>

      {/* 年度管理弹窗 */}
      {showYearModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
              <div className="font-semibold">年份管理</div>
              <button onClick={() => setShowYearModal(false)} className="text-white/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">新增年份</div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={newYear}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewYear(v)
                      const n = parseInt(v)
                      if (!v) {
                        setYearError('')
                      } else if (isNaN(n) || n < 1900 || n > 2100) {
                        setYearError('请输入有效年份（1900-2100）')
                      } else if (years.includes(n)) {
                        setYearError('年份已存在')
                      } else {
                        setYearError('')
                      }
                    }}
                    placeholder="输入年份，如 2027"
                    className="h-10 w-40 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  />
                  <button
                    onClick={async () => {
                      const v = String(newYear).trim()
                      const n = parseInt(v)
                      if (!v) {
                        setYearError('请输入有效年份（1900-2100）')
                        return
                      } else if (isNaN(n) || n < 1900 || n > 2100) {
                        setYearError('请输入有效年份（1900-2100）')
                        return
                      } else if (years.includes(n)) {
                        setYearError('年份已存在')
                        return
                      }
                      
                      const updated = [...years, n].sort((a,b)=>a-b)
                      setYears(updated)
                      await persistYears(updated)
                      setYearChangeByUser(true)
                      setGlobalYear(n)
                      setNewYear('')
                      setYearError('')
                      setShowYearModal(false)
                    }}
                    className="h-10 px-4 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    添加
                  </button>
                  {yearError && <span className="text-red-500 text-xs">{yearError}</span>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">年份列表</div>
                <div className="grid grid-cols-3 gap-2">
                  {years.map((y) => (
                    <div key={y} className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-gray-200 bg-white shadow-sm">
                      <span className="text-sm text-gray-800 whitespace-nowrap">{y}年</span>
                      {globalYear === y ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">当前</span>
                      ) : (
                        <button
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                          onClick={() => { setYearChangeByUser(true); setGlobalYear(y) }}
                        >设为当前</button>
                      )}
                      <button
                        onClick={async () => {
                          const next = years.filter(v=>v!==y)
                          const fallback = next[next.length-1] || new Date().getFullYear()
                          if (next.length === 0) {
                            setYears([fallback])
                            await persistYears([fallback])
                          } else {
                            setYears(next)
                            await persistYears(next)
                          }
                          if (globalYear===y) {
                            setYearChangeByUser(true)
                            setGlobalYear(fallback)
                          }
                        }}
                        className="p-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowYearModal(false)} className="h-10 px-4 bg-white border border-gray-300 rounded-xl">关闭</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreAndOutput