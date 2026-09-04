/**
 * Shared admin menu definition used by both the desktop sidebar
 * (AdminLayout) and the mobile bottom navigation / "More" sheet
 * (MobileNavigation). Keeping it in one place guarantees the two
 * navigation patterns always expose the exact same routes.
 */
import React from 'react';
import {
  LayoutDashboard,
  Settings,
  MessageSquare,
  Receipt,
  Trophy,
  Inbox,
  UserCog,
  Share2,
  Calculator,
  PhoneCall,
  SlidersHorizontal,
  ListChecks,
  Copy,
} from 'lucide-react';
import { HISAB_NAV } from './Hisab/HisabHub';

export interface MenuChild {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  group: string;
}

export interface MenuItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  children?: MenuChild[];
}

export const SETTINGS_CHILDREN: MenuChild[] = [
  { id: 'settings', label: 'সাধারণ সেটিংস', sub: 'General Settings', icon: SlidersHorizontal, group: 'সেটিংস' },
  { id: 'gateways', label: 'নোটিফিকেশন গেটওয়ে', sub: 'Notification Gateways', icon: Share2, group: 'সেটিংস' },
  { id: 'smsLog', label: 'SMS লগ', sub: 'SMS Log', icon: ListChecks, group: 'ডায়াগনস্টিকস' },
  { id: 'duplicates', label: 'ডুপ্লিকেট রিপোর্ট', sub: 'Duplicate Report', icon: Copy, group: 'ডায়াগনস্টিকস' },
];

export const getMenuItems = (role: string): MenuItem[] => {
  const items: MenuItem[] = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', sub: 'Dashboard', icon: LayoutDashboard },
    { id: 'hisab', label: 'হালখাতা', sub: 'Hisab', icon: Calculator, children: HISAB_NAV },
    { id: 'billing', label: 'বিলিং', sub: 'Billing / Memo', icon: Receipt },
    { id: 'communication', label: 'যোগাযোগ', sub: 'Communication', icon: PhoneCall },
    { id: 'whatsapp', label: 'হোয়াটসঅ্যাপ', sub: 'WhatsApp', icon: MessageSquare },
    { id: 'awards', label: 'অ্যাওয়ার্ড', sub: 'Awards Management', icon: Trophy },
    { id: 'inbox', label: 'ইনবক্স', sub: 'Admin Inbox', icon: Inbox },
    { id: 'settings', label: 'সেটিংস', sub: 'Settings', icon: Settings, children: SETTINGS_CHILDREN },
  ];

  if (role === 'Super Admin' || role === 'admin') {
    items.push({ id: 'adminManagement', label: 'অ্যাডমিন', sub: 'Admin Management', icon: UserCog });
  }

  return items;
};

// Group a parent's children by their `group` field (Hisab groups, Settings group, …).
export const groupChildren = (children: MenuChild[]): { group: string; items: MenuChild[] }[] => {
  const groups: { group: string; items: MenuChild[] }[] = [];
  const seen = new Set<string>();
  for (const c of children) {
    if (!seen.has(c.group)) {
      seen.add(c.group);
      groups.push({ group: c.group, items: [] });
    }
    groups.find((g) => g.group === c.group)!.items.push(c);
  }
  return groups;
};
