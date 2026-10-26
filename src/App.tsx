import React, { Suspense, lazy, useEffect, useLayoutEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { LoginScreen, FirstPasswordScreen, OfflineNotice } from './components/auth/AuthScreens';
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
const loadTransactions = () =>
  import('./components/transactions/AllTransactionsView').then((m) => ({ default: m.AllTransactionsView }));
const loadAssistant = () =>
  import('./components/assistant/AiAssistantSheet').then((m) => ({ default: m.AiAssistantSheet }));

// Code-splitting lazy loads to optimize bundle size and startup speed
const BentoDashboard = lazy(loadDashboard);
const MonthlyCalendar = lazy(loadCalendar);
const AnalyticsView = lazy(loadAnalytics);
const SettingsView = lazy(loadSettings);
const AllTransactionsView = lazy(loadTransactions);
const AiAssistantSheet = lazy(loadAssistant);

const AppContent: React.FC = () => {
  const { activeTab, isReady, isAssistantOpen } = useWallet();
  const [assistantLoaded, setAssistantLoaded] = useState(false);

  useEffect(() => {
    if (isAssistantOpen) setAssistantLoaded(true);
  }, [isAssistantOpen]);

  // Every tab opens at its top, not at the scroll position of the page before it.
  // The browser would otherwise restore an old offset on back/forward.
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Warm the other tab chunks once the browser is idle after first paint
  useEffect(() => {
    const prefetch = () => {
      void loadCalendar();
      void loadAnalytics();
      void loadSettings();
      void loadTransactions();
      void loadAssistant();
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

      {activeTab === 'transactions' && (
        <Suspense fallback={<AnalyticsSkeleton />}>
          {isReady ? <AllTransactionsView /> : <AnalyticsSkeleton />}
        </Suspense>
      )}

      {/* Persistent AI Assistant Bottom Sheet */}
      <Suspense fallback={null}>
        {assistantLoaded && <AiAssistantSheet />}
      </Suspense>
    </AppLayout>
  );
};

/** Who sees what: the login form, the first-password form, or the app (synced, or offline on cached data) */
const AuthGate: React.FC = () => {
  const { status, user, retry } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper" role="status" aria-label="Đang tải">
        <img src="/logo.webp" alt="" width={64} height={64} className="h-16 w-16 object-contain motion-safe:animate-pulse" />
      </div>
    );
  }
  if (status === 'signedOut') return <LoginScreen />;
  if (status === 'mustChangePassword') return <FirstPasswordScreen />;

  // Remount the wallet when the signed-in user changes, so nothing carries over between sessions
  return (
    <>
      {status === 'offline' && <OfflineNotice onRetry={retry} />}
      <WalletProvider key={user?.username ?? 'offline'} syncEnabled={status === 'signedIn'}>
        <AppContent />
      </WalletProvider>
    </>
  );
};

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}

export default App;
