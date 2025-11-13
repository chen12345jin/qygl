import React from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const InlineAlert = ({ message, type = 'info', onClose, className = '' }) => {
  if (!message) return null

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    warning: <AlertTriangle size={20} className="text-yellow-500" />,
    info: <Info size={20} className="text-blue-500" />
  }

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${styles[type]} ${className}`}
      role="alert"
    >
      <div className="flex items-center space-x-3">
        {icons[type]}
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="hover:opacity-70 transition-opacity"
          aria-label="关闭提示"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

export default InlineAlert

