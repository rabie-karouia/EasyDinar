import React, { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import FormInput from './FormInput';
import { validateClientId, validatePassword } from '../utils/validation';
import { useNavigate } from 'react-router-dom';
import PasswordResetModal from './PasswordResetModal';

interface SignInFormData {
  client_identifier: string;
  password: string;
}

export default function SignInForm() {
  const [formData, setFormData] = useState<SignInFormData>({
    client_identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const navigate = useNavigate(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = {
      client_identifier: validateClientId(formData.client_identifier),
      password: validatePassword(formData.password),
    };
  
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    if (hasErrors) {
      setErrors(newErrors);
    } else {
      console.log('Form submitted:', formData);
  
      // Construct URL with query parameters
      const url = new URL('http://localhost:8000/auth/login');
      url.searchParams.append('client_identifier', formData.client_identifier);
      url.searchParams.append('password', formData.password);
  
      try {
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          setMessage(`Error: ${JSON.stringify(errorData.detail) || 'Invalid credentials'}`);
        } else {
          const data = await response.json();
          setMessage('Login successful!');
          console.log('Access Token:', data.access_token);
  
          // Store the token securely
          localStorage.setItem('token', data.access_token); // Use sessionStorage for session-based storage
          localStorage.setItem('cin', data.cin);
          // Redirect to dashboard
          navigate('/dashboard');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        setMessage(`An unexpected error occurred: ${errorMsg}`);
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
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>

        {message && <div className="mb-4 text-red-600">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Client Identifier"
            name="client_identifier"
            type="text"
            value={formData.client_identifier}
            onChange={handleChange}
            error={errors.client_identifier}
            icon={<CreditCard className="h-5 w-5 text-gray-400" />}
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock className="h-5 w-5 text-gray-400" />}
          />

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Sign In
            </button>
            
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        </form>
      </div>

      {showResetModal && (
        <PasswordResetModal onClose={() => setShowResetModal(false)} />
      )}
    </div>
  );
}