import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
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
const loadTransactionForm = () =>
  import('./components/transactions/TransactionForm').then((m) => ({ default: m.TransactionFormModal }));

// Code-splitting lazy loads to optimize bundle size and startup speed
const BentoDashboard = lazy(loadDashboard);
const MonthlyCalendar = lazy(loadCalendar);
const AnalyticsView = lazy(loadAnalytics);
const SettingsView = lazy(loadSettings);
const AllTransactionsView = lazy(loadTransactions);
const AiAssistantSheet = lazy(loadAssistant);
const TransactionFormModal = lazy(loadTransactionForm);

function isQuickAddUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'mywallet:' && parsed.hostname === 'quick-add';
  } catch {
    return false;
  }
}

const AppContent: React.FC = () => {
  const { activeTab, isReady, isAssistantOpen } = useWallet();
  const [assistantLoaded, setAssistantLoaded] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    if (isAssistantOpen) setAssistantLoaded(true);
  }, [isAssistantOpen]);

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

  // Android's home-screen widget launches this native deep link. Keeping the
  // form here means it also survives authentication before being displayed.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    const openFromUrl = (url: string | undefined) => {
      if (!disposed && url && isQuickAddUrl(url)) setQuickAddOpen(true);
    };

    void CapacitorApp.getLaunchUrl().then((launch) => openFromUrl(launch?.url));
    void CapacitorApp.addListener('appUrlOpen', ({ url }) => openFromUrl(url)).then((handle) => {
      removeListener = () => handle.remove();
    });

    return () => {
      disposed = true;
      void removeListener?.();
    };
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
        {quickAddOpen && isReady && (
          <TransactionFormModal isOpen onClose={() => setQuickAddOpen(false)} />
        )}
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
