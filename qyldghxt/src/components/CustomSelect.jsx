import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = '请选择', 
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === value) || null
  const displayText = selectedOption ? selectedOption.label : placeholder

  return (
    <div className={`relative w-full`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-blue-300'} ${className}`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-800' : 'text-gray-500'}>
            {displayText}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {options.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value === option.value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomSelect