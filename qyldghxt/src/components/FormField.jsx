import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  required = false, 
  placeholder = '', 
  error = '', 
  disabled = false,
  options = [], // for select type
  className = '',
  hint = '', // 内联提示文本
  min,
  max
}) => {
  const [focused, setFocused] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleFocus = () => {
    setFocused(true);
    if (hint) setShowHint(true);
  };

  const handleBlur = () => {
    setFocused(false);
    if (hint && !error) setShowHint(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 pr-10
    ${focused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}
    ${error ? 'border-red-500 ring-2 ring-red-200' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
    focus:outline-none
  `;

  const renderInput = () => {
    switch (type) {
      case 'select':
        const selectedOption = options.find(opt => opt.value === value) || null;
        const displayText = selectedOption ? selectedOption.label : placeholder || '请选择...';
        
        return (
          <div className="relative w-full" ref={dropdownRef}>
            <button
              type="button"
              id={`ff-${name}`}
              onClick={() => !disabled && setIsOpen(!isOpen)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={disabled}
              className={`w-full h-10 px-3 border rounded-md transition-all duration-200 placeholder-gray-400 pr-10 focus:outline-none
                ${focused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}
                ${error ? 'border-red-500 ring-2 ring-red-200' : ''}
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
                flex items-center justify-between text-left`}
            >
              <span className={selectedOption ? 'text-gray-800' : 'text-gray-500'}>
                {displayText}
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && !disabled && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {options.map((option, index) => (
                  <div
                    key={`${option.value}-${index}`}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value === option.value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'textarea':
        return (
          <textarea
            id={`ff-${name}`}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
            className={baseInputClasses}
          />
        );
      default:
        return (
          <input
            type={type}
            id={`ff-${name}`}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            min={min}
            max={max}
          />
        );
    }
  };

  return (
    <div className={`form-field-container ${className}`}>
      <label className="form-field-label" htmlFor={`ff-${name}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="form-field-input-wrapper">
        {renderInput()}
        
        {hint && (
          <div className="text-xs text-gray-500 mt-1">
            {hint}
          </div>
        )}
      </div>
      
      {error && (
        <div className="form-field-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;
