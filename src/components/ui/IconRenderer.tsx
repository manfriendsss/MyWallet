import React from 'react';
import {
  // Food & drink
  Utensils, Coffee, Pizza, Sandwich, Soup, IceCreamCone, Beer, Wine, Apple, Croissant,
  // Shopping
  ShoppingBag, ShoppingCart, Shirt, Gem, Gift, Package, Store,
  // Getting around
  Car, Bus, Bike, TrainFront, Plane, Fuel, CircleParking, Ship,
  // Home & bills
  Home, Zap, Droplets, Wifi, Smartphone, Tv, Flame, Wrench, Sofa,
  // Fun & travel
  Film, Music, Gamepad2, Ticket, Hotel, Palmtree, Camera,
  // Health & care
  HeartPulse, Pill, Stethoscope, Dumbbell, Scissors, Sparkles,
  // Family & pets
  Baby, Dog, Cat, Users, HeartHandshake,
  // Work & study
  GraduationCap, BookOpen, Laptop, Briefcase, Building2, PenTool,
  // Money
  Award, TrendingUp, PiggyBank, Banknote, Coins, HandCoins, Landmark, Receipt, CreditCard, WalletCards,
  Wallet, Globe, Shield, Percent, Bitcoin,
  // Other
  Tag, CircleDot, CircleEllipsis,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Utensils, Coffee, Pizza, Sandwich, Soup, IceCreamCone, Beer, Wine, Apple, Croissant,
  ShoppingBag, ShoppingCart, Shirt, Gem, Gift, Package, Store,
  Car, Bus, Bike, TrainFront, Plane, Fuel, CircleParking, Ship,
  Home, Zap, Droplets, Wifi, Smartphone, Tv, Flame, Wrench, Sofa,
  Film, Music, Gamepad2, Ticket, Hotel, Palmtree, Camera,
  HeartPulse, Pill, Stethoscope, Dumbbell, Scissors, Sparkles,
  Baby, Dog, Cat, Users, HeartHandshake,
  GraduationCap, BookOpen, Laptop, Briefcase, Building2, PenTool,
  Award, TrendingUp, PiggyBank, Banknote, Coins, HandCoins, Landmark, Receipt, CreditCard, WalletCards,
  Wallet, Globe, Shield, Percent, Bitcoin,
  Tag, CircleDot, CircleEllipsis,
};

/** Category icons offered in the picker, grouped in the order they appear */
export const CATEGORY_ICON_GROUPS: Array<{ label: string; icons: string[] }> = [
  { label: 'Ăn uống', icons: ['Utensils', 'Coffee', 'Pizza', 'Sandwich', 'Soup', 'IceCreamCone', 'Beer', 'Wine', 'Apple', 'Croissant'] },
  { label: 'Mua sắm', icons: ['ShoppingBag', 'ShoppingCart', 'Shirt', 'Gem', 'Gift', 'Package', 'Store'] },
  { label: 'Đi lại', icons: ['Car', 'Bus', 'Bike', 'TrainFront', 'Plane', 'Fuel', 'CircleParking', 'Ship'] },
  { label: 'Nhà cửa & hóa đơn', icons: ['Home', 'Zap', 'Droplets', 'Flame', 'Wifi', 'Smartphone', 'Tv', 'Wrench', 'Sofa'] },
  { label: 'Giải trí & du lịch', icons: ['Film', 'Music', 'Gamepad2', 'Ticket', 'Hotel', 'Palmtree', 'Camera'] },
  { label: 'Sức khỏe & làm đẹp', icons: ['HeartPulse', 'Pill', 'Stethoscope', 'Dumbbell', 'Scissors', 'Sparkles'] },
  { label: 'Gia đình', icons: ['Baby', 'Dog', 'Cat', 'Users', 'HeartHandshake'] },
  { label: 'Công việc & học tập', icons: ['GraduationCap', 'BookOpen', 'Laptop', 'Building2', 'PenTool'] },
  {
    label: 'Tiền & đầu tư',
    icons: ['Briefcase', 'Award', 'TrendingUp', 'PiggyBank', 'Banknote', 'Coins', 'HandCoins', 'Landmark', 'Receipt', 'Percent', 'Shield', 'Bitcoin'],
  },
  { label: 'Khác', icons: ['Tag', 'CircleEllipsis'] },
];

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
