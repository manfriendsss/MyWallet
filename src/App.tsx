import React, { Suspense, lazy } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardSkeleton } from './components/ui/Skeleton';

// Code-splitting lazy loads to optimize bundle size and startup speed
const BentoDashboard = lazy(() =>
  import('./components/dashboard/BentoDashboard').then((m) => ({ default: m.BentoDashboard }))
);
const MonthlyCalendar = lazy(() =>
  import('./components/calendar/MonthlyCalendar').then((m) => ({ default: m.MonthlyCalendar }))
);
const AnalyticsView = lazy(() =>
  import('./components/analytics/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const AiAssistantSheet = lazy(() =>
  import('./components/assistant/AiAssistantSheet').then((m) => ({ default: m.AiAssistantSheet }))
);

const AppContent: React.FC = () => {
  const { activeTab } = useWallet();

  return (
    <AppLayout>
      <Suspense fallback={<DashboardSkeleton />}>
        {activeTab === 'dashboard' && <BentoDashboard />}
        {activeTab === 'calendar' && <MonthlyCalendar />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'settings' && <SettingsView />}
      </Suspense>

      {/* Persistent AI Assistant Bottom Sheet */}
      <Suspense fallback={null}>
        <AiAssistantSheet />
      </Suspense>
    </AppLayout>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
