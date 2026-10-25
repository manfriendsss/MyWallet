import React, { Suspense, lazy, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { AppLayout } from './components/layout/AppLayout';
import {
  AnalyticsSkeleton,
  CalendarSkeleton,
  DashboardSkeleton,
  SettingsSkeleton,
} from './components/ui/Skeleton';

// Chunk factories, shared by lazy() and the idle prefetch below
const loadDashboard = () =>
  import('./components/dashboard/BentoDashboard').then((m) => ({ default: m.BentoDashboard }));
const loadCalendar = () =>
  import('./components/calendar/MonthlyCalendar').then((m) => ({ default: m.MonthlyCalendar }));
const loadAnalytics = () =>
  import('./components/analytics/AnalyticsView').then((m) => ({ default: m.AnalyticsView }));
const loadSettings = () =>
  import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView }));

// Code-splitting lazy loads to optimize bundle size and startup speed
const BentoDashboard = lazy(loadDashboard);
const MonthlyCalendar = lazy(loadCalendar);
const AnalyticsView = lazy(loadAnalytics);
const SettingsView = lazy(loadSettings);
const AiAssistantSheet = lazy(() =>
  import('./components/assistant/AiAssistantSheet').then((m) => ({ default: m.AiAssistantSheet }))
);

const AppContent: React.FC = () => {
  const { activeTab, isReady } = useWallet();

  // Warm the other tab chunks once the browser is idle after first paint
  useEffect(() => {
    const prefetch = () => {
      void loadCalendar();
      void loadAnalytics();
      void loadSettings();
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetch, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <AppLayout>
      {activeTab === 'dashboard' && (
        <Suspense fallback={<DashboardSkeleton />}>
          {isReady ? <BentoDashboard /> : <DashboardSkeleton />}
        </Suspense>
      )}
      {activeTab === 'calendar' && (
        <Suspense fallback={<CalendarSkeleton />}>
          {isReady ? <MonthlyCalendar /> : <CalendarSkeleton />}
        </Suspense>
      )}
      {activeTab === 'analytics' && (
        <Suspense fallback={<AnalyticsSkeleton />}>
          {isReady ? <AnalyticsView /> : <AnalyticsSkeleton />}
        </Suspense>
      )}
      {activeTab === 'settings' && (
        <Suspense fallback={<SettingsSkeleton />}>
          {isReady ? <SettingsView /> : <SettingsSkeleton />}
        </Suspense>
      )}

      {/* Persistent AI Assistant Bottom Sheet */}
      <Suspense fallback={null}>
        <AiAssistantSheet />
      </Suspense>
    </AppLayout>
  );
};

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}

export default App;
