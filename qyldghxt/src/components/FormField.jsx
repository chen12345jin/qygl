import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

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
  hint = '' // 内联提示文本
}) => {
  const [focused, setFocused] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    if (hint) setShowHint(true);
  };

  const handleBlur = () => {
    setFocused(false);
    if (hint && !error) setShowHint(false);
  };

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md transition-all duration-200
    ${focused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}
    ${error ? 'border-red-500 ring-2 ring-red-200' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
    focus:outline-none
  `;

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">{placeholder || '请选择...'}</option>
            {options.map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
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
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className="form-field-container">
      <label className="form-field-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="form-field-input-wrapper">
        {renderInput()}
        
        {hint && (
          <div className="form-field-hint-wrapper">
            <AlertCircle 
              size={16} 
              className="form-field-hint-icon"
              onMouseEnter={() => setShowHint(true)}
              onMouseLeave={() => setShowHint(false)}
            />
            {showHint && (
              <div className="form-field-hint-text">
                {hint}
              </div>
            )}
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