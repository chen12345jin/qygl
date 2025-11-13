import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

const DeleteConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '确认删除', 
  message = '确定要删除这条记录吗？此操作不可恢复！',
  itemName = '',
  confirmText = '确认删除',
  cancelText = '取消'
}) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-gray-600 mb-2">{message}</p>
          {itemName && (
            <div className="bg-gray-50 rounded-lg p-3 mt-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">删除项目：</span>
                <span className="text-red-600 font-medium">{itemName}</span>
              </p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmDialog