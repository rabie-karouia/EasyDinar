import React from 'react';
import { 
  Wallet, 
  ArrowRightLeft, 
  Receipt, 
  DollarSign,
  Shield,
  LogOut,
  Calculator
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import NavItem from './NavItem';
import { FaMapMarkerAlt } from 'react-icons/fa';

export default function Sidebar() {
  const { setActiveSection } = useDashboard();

  const handleLogout = async () => {
    const token = localStorage.getItem('token'); // Retrieve the stored token
    if (!token) {
      console.error('No token found. Unable to log out.');
      window.location.href = 'http://localhost:5173'; // Redirect anyway
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        localStorage.removeItem('token'); // Clear the token from localStorage
        localStorage.removeItem('cin'); // Clear the CIN (if stored)
        window.location.href = 'http://localhost:5173'; // Redirect to the home page
      } else {
        const errorData = await response.json();
        console.error('Logout failed:', errorData.detail || 'Unknown error.');
        window.location.href = 'http://localhost:5173'; // Redirect anyway
      }
    } catch (err) {
      console.error('An error occurred during logout:', err);
      window.location.href = 'http://localhost:5173'; // Redirect anyway
    }
  };

  return (
    <div className="w-64 bg-white h-full shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-600">EasyDinar</h1>
      </div>
      
      <nav className="mt-6">
        <NavItem 
          icon={<Wallet />} 
          title="My Accounts" 
          onClick={() => setActiveSection('accounts')}
        />
        <NavItem 
          icon={<ArrowRightLeft />} 
          title="Transactions" 
          onClick={() => setActiveSection('transactions')}
        />
        <NavItem 
          icon={<Calculator />} 
          title="Loan Eligibility" 
          onClick={() => setActiveSection('loan')}
        />
        <NavItem
          icon={<FaMapMarkerAlt />}
          title="Find Branch/ATM"
          onClick={() => setActiveSection('bills')}
        />
        <NavItem 
          icon={<DollarSign />} 
          title="Currency Exchange" 
          onClick={() => setActiveSection('exchange')}
        />
        <NavItem 
          icon={<Shield />} 
          title="Security Center" 
          onClick={() => setActiveSection('security')}
        />
      </nav>

      <div className="absolute bottom-0 w-64 p-6">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
