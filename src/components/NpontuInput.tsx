import React from 'react';

interface NpontuInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' | 'url';
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  step?: string;
}

const NpontuInput: React.FC<NpontuInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  label,
  error,
  required = false,
  disabled = false,
  className = '',
  icon,
  step
}) => {
  const inputClasses = `
    w-full px-4 py-3 border border-npontu-300 rounded-xl
    focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:border-transparent
    transition-all duration-300 bg-gradient-card shadow-inner-warm
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-red-300 focus:ring-red-500' : ''}
    ${icon ? 'pl-12' : ''}
    ${className}
  `;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && !label && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          step={step}
          className={inputClasses}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
};

export default NpontuInput;