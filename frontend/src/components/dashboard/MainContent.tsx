import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import AccountsSection from './sections/AccountsSection';
import TransactionsSection from './sections/TransactionsSection';
import ExchangeSection from './sections/ExchangeSection';
import SecuritySection from './sections/SecuritySection';
import BranchAtmMap from './sections/BranchAtmMap';
import LoanSection from './sections/LoanSection';

export default function MainContent() {
  const { activeSection } = useDashboard();

  const renderSection = () => {
    switch (activeSection) {
      case 'accounts':
        return <AccountsSection />;
      case 'transactions':
        return <TransactionsSection />;
      case 'loan':
        return <LoanSection />;
      case 'bills':
        return <BranchAtmMap />;
      case 'exchange':
        return <ExchangeSection />;
      case 'security':
        return <SecuritySection />;
      default:
        return <AccountsSection />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      {renderSection()}
    </main>
  );
}