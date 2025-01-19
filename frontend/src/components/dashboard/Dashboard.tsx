import React from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { DashboardProvider } from '../../contexts/DashboardContext';

export default function Dashboard() {
  return (
    <DashboardProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <MainContent />
      </div>
    </DashboardProvider>
  );
}