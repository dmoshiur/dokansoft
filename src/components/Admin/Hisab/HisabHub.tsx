/**
 * Hisab (হিসাব) — full accounting module hub with sub-navigation.
 */
import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Store, Package, ShoppingCart, ShoppingBag,
  TrendingUp, TrendingDown, CreditCard, Wallet, Landmark, BarChart3,
  Receipt, Bell, UserCog, ShieldCheck, Search, Trash2, CloudUpload, Settings,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
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

const NAV: { id: string; label: string; icon: React.ElementType; group: string }[] = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'customers', label: 'Customers', icon: Users, group: 'Parties' },
  { id: 'suppliers', label: 'Suppliers', icon: Store, group: 'Parties' },
  { id: 'products', label: 'Products & Categories', icon: Package, group: 'Inventory' },
  { id: 'sales', label: 'Sales', icon: ShoppingCart, group: 'Transactions' },
  { id: 'purchase', label: 'Purchase', icon: ShoppingBag, group: 'Transactions' },
  { id: 'income', label: 'Income', icon: TrendingUp, group: 'Transactions' },
  { id: 'expense', label: 'Expense', icon: TrendingDown, group: 'Transactions' },
  { id: 'payments', label: 'Payments', icon: CreditCard, group: 'Money' },
  { id: 'cashbook', label: 'Cashbook', icon: Wallet, group: 'Money' },
  { id: 'bank', label: 'Bank & Mobile', icon: Landmark, group: 'Money' },
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'Insights' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, group: 'Insights' },
  { id: 'reminders', label: 'Notifications', icon: Bell, group: 'Management' },
  { id: 'employees', label: 'Employees', icon: UserCog, group: 'Management' },
  { id: 'users', label: 'Users & Permissions', icon: ShieldCheck, group: 'Management' },
  { id: 'search', label: 'Search', icon: Search, group: 'Data' },
  { id: 'trash', label: 'Trash', icon: Trash2, group: 'Data' },
  { id: 'backup', label: 'Backup & Restore', icon: CloudUpload, group: 'Data' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'System' },
];

const GROUPS = ['Overview', 'Parties', 'Inventory', 'Transactions', 'Money', 'Insights', 'Management', 'Data', 'System'];

export const HisabHub: React.FC = () => {
  const [active, setActive] = useState('home');
  const store = useAccountingStore();

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Sub nav */}
      <aside className="lg:w-64 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 lg:sticky lg:top-4">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {GROUPS.map((g) => {
              const items = NAV.filter((n) => n.group === g);
              if (!items.length) return null;
              return (
                <div key={g} className="flex lg:flex-col gap-1 shrink-0">
                  <span className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{g}</span>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActive(item.id)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors',
                        active === item.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      <item.icon size={17} />
                      {item.label}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-w-0">
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
    </div>
  );
};
