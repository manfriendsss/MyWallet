import { LayoutDashboard, CalendarDays, BarChart3, Settings, type LucideIcon } from 'lucide-react';
import type { ActiveTab } from '../../types';

export const NAV_ITEMS: Array<{ id: ActiveTab; label: string; title: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Trang chủ', title: 'Tổng quan', icon: LayoutDashboard },
  { id: 'calendar', label: 'Lịch', title: 'Lịch thu chi', icon: CalendarDays },
  { id: 'analytics', label: 'Thống kê', title: 'Thống kê', icon: BarChart3 },
  { id: 'settings', label: 'Cài đặt', title: 'Cài đặt', icon: Settings },
];
