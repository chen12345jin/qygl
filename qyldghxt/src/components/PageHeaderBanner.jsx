import React from 'react'
import { Calendar, Plus } from 'lucide-react'

const PageHeaderBanner = ({ title, subTitle, right, left, year, onYearChange, years = [2024, 2025, 2026], stackActions = false, compact = true, onAddYear, className = '', yearSelectClass }) => {
  return (
    <div className={`relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl ${compact ? 'p-4' : 'p-8'} text-white overflow-hidden min-h-[72px] ${className}`}>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-blob"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-white rounded-full animate-blob animation-delay-4000"></div>
      </div>
      {stackActions ? (
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${compact ? 'space-x-3' : 'space-x-4'}`}>
              {left && <div>{left}</div>}
              <div className={`${compact ? 'p-2' : 'p-3'} bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg`}>
                <Calendar size={compact ? 22 : 28} className="text-white" />
              </div>
              <div>
                <h1 className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold mb-1 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent`}>{title}</h1>
                {subTitle && <p className={`text-blue-100 ${compact ? 'text-sm' : 'text-lg'} font-medium`}>{subTitle}</p>}
              </div>
            </div>
            {typeof year !== 'undefined' && (
              <div className="relative z-20 flex items-center">
                <Calendar size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <select
                  value={year}
                  onChange={e => onYearChange && onYearChange(parseInt(e.target.value))}
                  className={`${yearSelectClass || 'year-select'} select-center`}
                  title="选择年度"
                  aria-label="选择年度"
                >
                  {years.map(y=> (<option key={y} value={y}>{y}年</option>))}
                </select>
                {onAddYear && (
                  <button
                    type="button"
                    onClick={onAddYear}
                    className={`ml-2 year-add-btn`}
                    title="添加年份"
                    aria-label="添加年份"
                  >
                    <Plus size={16} />
                    <span>添加年份</span>
                  </button>
                )}
              </div>
            )}
          </div>
          {right && (
            <div className="mt-4 flex items-center justify-end gap-2 flex-nowrap overflow-x-hidden overflow-y-hidden">
              {right}
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 flex items-center justify-between">
          <div className={`flex items-center ${compact ? 'space-x-3' : 'space-x-4'} min-w-0`}>
            {left && <div>{left}</div>}
            <div className={`${compact ? 'p-2' : 'p-3'} bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg`}>
              <Calendar size={compact ? 22 : 28} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold mb-1 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent truncate`}>{title}</h1>
              {subTitle && <p className={`text-blue-100 ${compact ? 'text-sm' : 'text-lg'} font-medium truncate`}>{subTitle}</p>}
            </div>
          </div>
            <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} flex-wrap whitespace-normal`}>
            {typeof year !== 'undefined' && (
                <div className="relative z-20 flex items-center">
                  <Calendar size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                  <select
                    value={year}
                    onChange={e => onYearChange && onYearChange(parseInt(e.target.value))}
                    className={`${yearSelectClass || 'year-select'} select-center`}
                    title="选择年度"
                    aria-label="选择年度"
                  >
                    {years.map(y=> (<option key={y} value={y}>{y}年</option>))}
                  </select>
                {onAddYear && (
                  <button
                    type="button"
                    onClick={onAddYear}
                    className={`ml-2 year-add-btn`}
                    title="添加年份"
                    aria-label="添加年份"
                  >
                    <Plus size={16} />
                    <span>添加年份</span>
                  </button>
                )}
              </div>
            )}
            {right && (
              <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} flex-nowrap`}>
                {right}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PageHeaderBanner
