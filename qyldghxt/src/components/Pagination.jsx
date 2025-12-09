import React from 'react'

const Pagination = ({
  page = 1,
  pageSize = 10,
  total = 0,
  onChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = ''
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  const handlePageSize = (e) => {
    const nextSize = parseInt(e.target.value)
    const maxPage = Math.max(1, Math.ceil(total / nextSize))
    const nextPage = Math.min(page, maxPage)
    onChange && onChange({ page: nextPage, pageSize: nextSize })
  }

  const goPrev = () => { if (canPrev) onChange && onChange({ page: page - 1, pageSize }) }
  const goNext = () => { if (canNext) onChange && onChange({ page: page + 1, pageSize }) }

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white ${className}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">共 {total} 条</span>
        <select
          value={pageSize}
          onChange={handlePageSize}
          className="h-9 px-3 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}/页</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          disabled={!canPrev}
          className={`h-9 px-3 rounded-xl text-sm border transition-all ${canPrev ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
        >上一页</button>
        <span className="text-sm text-gray-700">{page} / {totalPages}</span>
        <button
          onClick={goNext}
          disabled={!canNext}
          className={`h-9 px-3 rounded-xl text-sm border transition-all ${canNext ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
        >下一页</button>
      </div>
    </div>
  )
}

export default Pagination

