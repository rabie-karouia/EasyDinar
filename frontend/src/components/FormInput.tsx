import React from 'react';

interface FormInputProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: React.ReactNode;
}

export default function FormInput({
  label,
  name,
  type,
  value,
  onChange,
  error,
  icon,
}: FormInputProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          type={type}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {icon && <div className="absolute right-3 top-2">{icon}</div>}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}