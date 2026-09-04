/**
 * Hisab (হিসাব / হালখাতা) — full accounting module hub.
 *
 * The sub-navigation now lives in the main sidebar (AdminLayout) as an inline
 * accordion, so this component is a *controlled* view that only renders the
 * currently selected sub-page. `HISAB_NAV` is exported so the sidebar can
 * render the same menu without duplicating the definition.
 */
import React from 'react';
import {
  LayoutDashboard, Users, Store, Package, ShoppingCart, ShoppingBag,
  TrendingUp, TrendingDown, CreditCard, Wallet, Landmark, BarChart3,
  Receipt, Bell, UserCog, ShieldCheck, Search, Trash2, CloudUpload, Settings,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAccountingStore } from '../../../accounting/store';
import { Home } from './Home';
import { Customers } from './Customers';
import { Suppliers } from './Suppliers';
import { Products } from './Products';
import { Sales } from './Sales';
import { Purchase } from './Purchase';
import { Income, Expense } from './MoneyModule';
import { Payments } from './Payments';
import { Cashbook } from './Cashbook';
import { Bank } from './Bank';
import { Reports } from './Reports';
import { Invoices } from './Invoices';
import { Reminders } from './Reminders';
import { Employees } from './Employees';
import { Users as UsersModule } from './Users';
import { SearchModule } from './Search';
import { Trash } from './Trash';
import { Backup } from './Backup';
import { SettingsModule } from './Settings';
import { HalKhata } from '../HalKhata';

export interface HisabNavItem {
  id: string;
  label: string; // Bangla main label
  sub?: string; // English sub-label (small)
  icon: React.ElementType;
  group: string;
}

export const HISAB_NAV: HisabNavItem[] = [
  { id: 'home', label: 'ড্যাশবোর্ড', sub: 'Dashboard', icon: LayoutDashboard, group: 'সারসংক্ষেপ' },
  { id: 'customers', label: 'কাস্টমার', sub: 'Customers', icon: Users, group: 'পক্ষ' },
  { id: 'suppliers', label: 'সরবরাহকারী', sub: 'Suppliers', icon: Store, group: 'পক্ষ' },
  { id: 'products', label: 'পণ্য ও ক্যাটাগরি', sub: 'Products', icon: Package, group: 'স্টক' },
  { id: 'sales', label: 'বিক্রি', sub: 'Sales', icon: ShoppingCart, group: 'লেনদেন' },
  { id: 'purchase', label: 'ক্রয়', sub: 'Purchase', icon: ShoppingBag, group: 'লেনদেন' },
  { id: 'income', label: 'আয়', sub: 'Income', icon: TrendingUp, group: 'লেনদেন' },
  { id: 'expense', label: 'খরচ', sub: 'Expense', icon: TrendingDown, group: 'লেনদেন' },
  { id: 'payments', label: 'লেনদেন', sub: 'Payments', icon: CreditCard, group: 'টাকা' },
  { id: 'cashbook', label: 'ক্যাশবুক', sub: 'Cashbook', icon: Wallet, group: 'টাকা' },
  { id: 'bank', label: 'ব্যাংক ও মোবাইল', sub: 'Bank & Mobile', icon: Landmark, group: 'টাকা' },
  { id: 'halkhata', label: 'হালখাতা ইভেন্ট', sub: 'HalKhata Events', icon: Sparkles, group: 'টাকা' },
  { id: 'reports', label: 'রিপোর্ট', sub: 'Reports', icon: BarChart3, group: 'বিশ্লেষণ' },
  { id: 'invoices', label: 'ইনভয়েস', sub: 'Invoices', icon: Receipt, group: 'বিশ্লেষণ' },
  { id: 'reminders', label: 'নোটিফিকেশন', sub: 'Notifications', icon: Bell, group: 'ব্যবস্থাপনা' },
  { id: 'employees', label: 'কর্মচারী', sub: 'Employees', icon: UserCog, group: 'ব্যবস্থাপনা' },
  { id: 'users', label: 'ইউজার ও অনুমতি', sub: 'Users & Permissions', icon: ShieldCheck, group: 'ব্যবস্থাপনা' },
  { id: 'search', label: 'সার্চ', sub: 'Search', icon: Search, group: 'ডেটা' },
  { id: 'trash', label: 'ট্র্যাশ', sub: 'Trash', icon: Trash2, group: 'ডেটা' },
  { id: 'backup', label: 'ব্যাকআপ ও রিস্টোর', sub: 'Backup & Restore', icon: CloudUpload, group: 'ডেটা' },
  { id: 'settings', label: 'সেটিংস', sub: 'Settings', icon: Settings, group: 'সিস্টেম' },
];

export const HISAB_GROUPS = [
  'সারসংক্ষেপ',
  'পক্ষ',
  'স্টক',
  'লেনদেন',
  'টাকা',
  'বিশ্লেষণ',
  'ব্যবস্থাপনা',
  'ডেটা',
  'সিস্টেম',
];

interface HisabHubProps {
  active: string;
  onNavigate: (id: string) => void;
}

export const HisabHub: React.FC<HisabHubProps> = ({ active, onNavigate }) => {
  const store = useAccountingStore();

  return (
    <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
      {active === 'home' && <Home s={store.state} />}
      {active === 'customers' && <Customers store={store} />}
      {active === 'suppliers' && <Suppliers store={store} />}
      {active === 'products' && <Products store={store} />}
      {active === 'sales' && <Sales store={store} />}
      {active === 'purchase' && <Purchase store={store} />}
      {active === 'income' && <Income store={store} />}
      {active === 'expense' && <Expense store={store} />}
      {active === 'payments' && <Payments store={store} />}
      {active === 'cashbook' && <Cashbook store={store} />}
      {active === 'bank' && <Bank store={store} />}
      {active === 'halkhata' && <HalKhata />}
      {active === 'reports' && <Reports store={store} />}
      {active === 'invoices' && <Invoices store={store} />}
      {active === 'reminders' && <Reminders store={store} />}
      {active === 'employees' && <Employees store={store} />}
      {active === 'users' && <UsersModule store={store} />}
      {active === 'search' && <SearchModule store={store} />}
      {active === 'trash' && <Trash store={store} />}
      {active === 'backup' && <Backup store={store} />}
      {active === 'settings' && <SettingsModule store={store} />}
    </motion.div>
  );
};

export default HisabHub;
