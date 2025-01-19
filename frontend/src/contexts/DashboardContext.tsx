import React, { createContext, useContext, useState } from 'react';

type Section = 'accounts' | 'transactions' | 'loan' | 'bills' | 'exchange' | 'security';

interface DashboardContextType {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<Section>('accounts');

  return (
    <DashboardContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}