import React from 'react';
import {
  Utensils,
  ShoppingBag,
  Car,
  Home,
  Film,
  HeartPulse,
  GraduationCap,
  CircleEllipsis,
  Briefcase,
  Award,
  TrendingUp,
  Gift,
  WalletCards,
  Coffee,
  Plane,
  Laptop,
  Tag,
  CircleDot,
  Wallet,
  Landmark,
  CreditCard,
  Globe,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Utensils,
  ShoppingBag,
  Car,
  Home,
  Film,
  HeartPulse,
  GraduationCap,
  CircleEllipsis,
  Briefcase,
  Award,
  TrendingUp,
  Gift,
  WalletCards,
  Coffee,
  Plane,
  Laptop,
  Tag,
  CircleDot,
  Wallet,
  Landmark,
  CreditCard,
  Globe,
  Receipt,
};

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  name,
  className = 'w-5 h-5',
  size = 20,
}) => {
  const IconComponent = iconMap[name] || CircleDot;
  return <IconComponent className={className} size={size} />;
};
