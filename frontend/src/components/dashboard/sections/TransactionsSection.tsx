import React, { useState, useEffect } from 'react';
import { Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description: string;
  timestamp: string;
}

export default function TransactionsSection() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState({
    cin: '',
    accountNumber: '',
    dateOfTransaction: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [depositForm, setDepositForm] = useState({ amount: '', accountNumber: '' });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', accountNumber: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', email: '', firstName: '', lastName: '' });

  // Fetch transactions logic
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view transactions.');
        return;
      }

      const params = new URLSearchParams();
      if (filters.cin) params.append('cin', filters.cin);
      if (filters.accountNumber) params.append('account_number', filters.accountNumber);
      if (filters.dateOfTransaction) params.append('date_of_transaction', filters.dateOfTransaction);

      const response = await fetch(`http://localhost:8000/transactions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch transactions.');
      }

      const data = await response.json();
      setTransactions(data);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Deposit funds
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in to make a deposit.');

      const response = await fetch(
        `http://localhost:8000/deposit?amount=${depositForm.amount}&account_number=${depositForm.accountNumber}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to make a deposit.');
      }

      const data = await response.json();
      setMessage(data.message);
      setDepositForm({ amount: '', accountNumber: '' });
      fetchTransactions(); // Refresh transactions
    } catch (err: any) {
      console.error('Error making deposit:', err);
      setError(err.message);
    }
  };

  // Withdraw funds
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in to withdraw funds.');

      const response = await fetch(
        `http://localhost:8000/withdraw?amount=${withdrawForm.amount}&account_number=${withdrawForm.accountNumber}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to withdraw funds.');
      }

      const data = await response.json();
      setMessage(data.message);
      setWithdrawForm({ amount: '', accountNumber: '' });
      fetchTransactions(); // Refresh transactions
    } catch (err: any) {
      console.error('Error making withdrawal:', err);
      setError(err.message);
    }
  };

  // Make a payment
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in to make a payment.');
  
      const response = await fetch(
        `http://localhost:8000/generate-payment?amount=${paymentForm.amount}&email=${paymentForm.email}&first_name=${paymentForm.firstName}&last_name=${paymentForm.lastName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate payment.');
      }
  
      const data = await response.json();
  
      // Open the payment URL in a new tab
      if (data.payment_url) {
        window.open(data.payment_url, '_blank');
      } else {
        throw new Error('Payment URL not found in response.');
      }
    } catch (err: any) {
      console.error('Error generating payment:', err);
      setError(err.message);
    }
  };
  
  

  // Fetch transactions on component mount and when filters change
  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Recent Transactions</h2>
      </div>

      {/* Deposit Form */}
      <form onSubmit={handleDeposit} className="space-y-4">
        <h3 className="text-lg font-bold">Deposit</h3>
        <input
          type="text"
          placeholder="Account Number"
          value={depositForm.accountNumber}
          onChange={(e) => setDepositForm({ ...depositForm, accountNumber: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <input
          type="number"
          placeholder="Amount"
          value={depositForm.amount}
          onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md">
          Deposit
        </button>
      </form>

      {/* Withdraw Form */}
      <form onSubmit={handleWithdraw} className="space-y-4">
        <h3 className="text-lg font-bold">Withdraw</h3>
        <input
          type="text"
          placeholder="Account Number"
          value={withdrawForm.accountNumber}
          onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <input
          type="number"
          placeholder="Amount"
          value={withdrawForm.amount}
          onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-md">
          Withdraw
        </button>
      </form>

      {/* Payment Form */}
      <form onSubmit={handlePayment} className="space-y-4">
        <h3 className="text-lg font-bold">Make a Payment</h3>
        <input
          type="number"
          placeholder="Amount"
          value={paymentForm.amount}
          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={paymentForm.email}
          onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <input
          type="text"
          placeholder="First Name"
          value={paymentForm.firstName}
          onChange={(e) => setPaymentForm({ ...paymentForm, firstName: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={paymentForm.lastName}
          onChange={(e) => setPaymentForm({ ...paymentForm, lastName: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">
          Make Payment
        </button>
      </form>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-md">
        {loading ? (
          <p className="p-4">Loading transactions...</p>
        ) : error ? (
          <p className="p-4 text-red-500">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="p-4">No transactions available</p>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="p-4 border-b last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {transaction.type === 'deposit' ? (
                    <ArrowDownLeft className="h-6 w-6 text-green-500" />
                  ) : (
                    <ArrowUpRight className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <p
                  className={`font-semibold ${
                    transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
