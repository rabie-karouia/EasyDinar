import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';

interface NavItemProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

export default function NavItem({ icon, title, onClick }: NavItemProps) {
  const { activeSection } = useDashboard();
  const isActive = activeSection === title.toLowerCase().replace(' ', '_');

  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-3 w-full p-4 hover:bg-indigo-50 transition-colors ${
        isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'
      }`}
    >
      <span className="h-5 w-5">{icon}</span>
      <span className="font-medium">{title}</span>
    </button>
  );
}