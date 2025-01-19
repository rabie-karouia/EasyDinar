import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // For React Router v6
import { Lock } from 'lucide-react';
import FormInput from './FormInput';

export default function NewPasswordForm() {
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [searchParams] = useSearchParams(); // Get query parameters
  const token = searchParams.get('token'); // Extract the token

  const validatePasswords = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const safeToken = token || ''; // Default to an empty string if token is null

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (validatePasswords()) {
    try {
      const response = await fetch(
        `http://localhost:8000/reset-password?token=${encodeURIComponent(safeToken)}&new_password=${encodeURIComponent(formData.password)}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reset password.');
      }

      setMessage('Password updated successfully!');
    } catch (error) {
      setMessage('Failed to update password. Please try again.');
    }
  }
};

  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your new password</p>
        </div>

        {message && (
          <div className={`mb-4 text-center ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="New Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock className="h-5 w-5 text-gray-400" />}
          />

          <FormInput
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            icon={<Lock className="h-5 w-5 text-gray-400" />}
          />

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
