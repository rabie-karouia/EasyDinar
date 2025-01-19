import React, { useState } from 'react';
import { CreditCard, Wallet } from 'lucide-react';

interface Account {
  accountNumber: string;
  accountType: string;
  balance: number;
}

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Form state for account creation
  const [cin, setCin] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [balance, setBalance] = useState('');

  // Fetch accounts logic
  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view your accounts.');
      setLoadingAccounts(false);
      return;
    }

    try {
      // Fetch accounts without passing CIN; backend handles CIN via the token
      const response = await fetch('http://localhost:8000/accounts/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(
          data.map((account: any) => ({
            accountNumber: account.account_number,
            accountType: account.account_type,
            balance: account.balance,
          }))
        );
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to fetch accounts.');
      }
    } catch (err) {
      setError('An error occurred while fetching accounts.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Handle account creation
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to create an account.');
      return;
    }

    const newAccount = {
      CIN: cin,
      account_type: accountType,
      balance: parseFloat(balance),
    };

    try {
      const response = await fetch('http://localhost:8000/accounts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAccount),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Account successfully created.');
        setAccounts((prev) => [
          ...prev,
          {
            accountNumber: data.account.account_number,
            accountType: data.account.account_type,
            balance: data.account.balance,
          },
        ]);
        setCin('');
        setAccountType('checking');
        setBalance('');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create account.');
      }
    } catch (err) {
      setError('An error occurred while creating the account.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Account Creation Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Account</h2>
          {message && <p className="text-green-600 mb-4">{message}</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <form onSubmit={handleCreateAccount} className="space-y-6">
            <div>
              <label htmlFor="cin" className="block text-sm font-medium text-gray-700">
                CIN
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="cin"
                  required
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  className="pl-10 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter CIN number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Account Type
              </label>
              <select
                id="type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'checking' | 'savings')}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>

            <div>
              <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
                Initial Balance
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wallet className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="balance"
                  required
                  min="0"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="pl-10 block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter initial balance"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Account
            </button>
          </form>
        </div>

        {/* See My Accounts Button */}
        <div className="mb-6">
          <button
            onClick={fetchAccounts}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            See My Accounts
          </button>
        </div>

        {/* Accounts List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Accounts</h2>
          {loadingAccounts ? (
            <p className="text-gray-500">Loading accounts...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : accounts.length === 0 ? (
            <p className="text-gray-500">Click the button to display</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {accounts.map((account, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500">Account Number: {account.accountNumber}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        account.accountType === 'checking'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {account.balance.toFixed(2)} TND
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
