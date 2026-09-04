/**
 * Home / Dashboard — daily snapshot, dues, and recent activity.
 */
import React, { useMemo } from 'react';
import {
  HandCoins, Handshake, ShoppingCart, ShoppingBag, TrendingUp, TrendingDown,
  ArrowDownLeft, ArrowUpRight, Clock, Package,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { AccountingState } from '../../../accounting/types';
import { fmtMoney, fmtDate, todayISO, sum } from '../../../accounting/format';
import { customerBalance, supplierBalance, cashBalance } from '../../../accounting/store';
import { Card, StatCard, EmptyState, Badge } from './ui';

export const Home: React.FC<{ s: AccountingState }> = ({ s }) => {
  const today = todayISO();
  const cur = s.settings.currency;

  const totalReceivable = useMemo(
    () => s.parties.filter((p) => p.type === 'customer').reduce((a, p) => a + customerBalance(s, p.id), 0),
    [s],
  );
  const totalPayable = useMemo(
    () => s.parties.filter((p) => p.type === 'supplier').reduce((a, p) => a + supplierBalance(s, p.id), 0),
    [s],
  );

  const todaySales = sum(s.sales.filter((x) => x.date === today).map((x) => x.total));
  const todayPurchases = sum(s.purchases.filter((x) => x.date === today).map((x) => x.total));
  const todayIncome = sum(s.moneyTxns.filter((x) => x.type === 'income' && x.date === today).map((x) => x.amount));
  const todayExpense = sum(s.moneyTxns.filter((x) => x.type === 'expense' && x.date === today).map((x) => x.amount));
  const todayReceived = sum(s.payments.filter((x) => x.direction === 'receive' && x.date === today).map((x) => x.amount));
  const todayPaid = sum(s.payments.filter((x) => x.direction === 'pay' && x.date === today).map((x) => x.amount));

  // 7-day chart data
  const chartData = useMemo(() => {
    const days: { name: string; sale: number; purchase: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const off = d.getTimezoneOffset();
      const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
      days.push({
        name: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        sale: sum(s.sales.filter((x) => x.date === iso).map((x) => x.total)),
        purchase: sum(s.purchases.filter((x) => x.date === iso).map((x) => x.total)),
      });
    }
    return days;
  }, [s]);

  // Recent transactions (merged)
  const recent = useMemo(() => {
    const items: { id: string; label: string; kind: string; amount: number; date: string; dir: 'in' | 'out' }[] = [];
    s.sales.forEach((x) => items.push({ id: x.id, label: `Sale — ${x.customerName}`, kind: 'Sale', amount: x.total, date: x.date, dir: 'in' }));
    s.purchases.forEach((x) => items.push({ id: x.id, label: `Purchase — ${x.supplierName}`, kind: 'Purchase', amount: x.total, date: x.date, dir: 'out' }));
    s.moneyTxns.forEach((x) => items.push({ id: x.id, label: x.category, kind: x.type === 'income' ? 'Income' : 'Expense', amount: x.amount, date: x.date, dir: x.type === 'income' ? 'in' : 'out' }));
    s.payments.forEach((x) => items.push({ id: x.id, label: `${x.direction === 'receive' ? 'Received from' : 'Paid to'} ${x.partyName}`, kind: 'Payment', amount: x.amount, date: x.date, dir: x.direction === 'receive' ? 'in' : 'out' }));
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [s]);

  const lowStock = s.products.filter((p) => p.stock < p.minStock).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">ড্যাশবোর্ড / Dashboard</h1>
        <p className="text-slate-500 mt-0.5 text-sm">আজকের ({fmtDate(today)}) ব্যবসার সারসংক্ষেপ</p>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="মোট পাওনা (Receivable)" value={fmtMoney(totalReceivable, cur)} icon={HandCoins} tone="green" sub={`${s.parties.filter((p) => p.type === 'customer').length} কাস্টমার`} />
        <StatCard label="মোট দেনা (Payable)" value={fmtMoney(totalPayable, cur)} icon={Handshake} tone="red" sub={`${s.parties.filter((p) => p.type === 'supplier').length} সরবরাহকারী`} />
        <StatCard label="আজকের বিক্রি" value={fmtMoney(todaySales, cur)} icon={ShoppingCart} tone="blue" sub={`${s.sales.filter((x) => x.date === today).length} বিক্রি`} />
        <StatCard label="আজকের কেনাকাটা" value={fmtMoney(todayPurchases, cur)} icon={ShoppingBag} tone="amber" sub={`${s.purchases.filter((x) => x.date === today).length} কেনাকাটা`} />
        <StatCard label="আজকের আয়" value={fmtMoney(todayIncome, cur)} icon={TrendingUp} tone="green" />
        <StatCard label="আজকের খরচ" value={fmtMoney(todayExpense, cur)} icon={TrendingDown} tone="red" />
        <StatCard label="আজ জমা হয়েছে" value={fmtMoney(todayReceived, cur)} icon={ArrowDownLeft} tone="indigo" sub="টাকা গ্রহণ" />
        <StatCard label="আজ পরিশোধ" value={fmtMoney(todayPaid, cur)} icon={ArrowUpRight} tone="amber" sub="টাকা প্রদান" />
      </div>

      {/* Chart + side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-bold text-slate-900 mb-1">গত ৭ দিনের বিক্রি ও কেনাকাটা</h3>
          <p className="text-xs text-slate-400 mb-4">Sales vs Purchase</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gsale" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gpurchase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Area type="monotone" dataKey="sale" name="বিক্রি" stroke="#10b981" strokeWidth={2} fill="url(#gsale)" />
                <Area type="monotone" dataKey="purchase" name="কেনাকাটা" stroke="#f59e0b" strokeWidth={2} fill="url(#gpurchase)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <h3 className="font-bold text-slate-900">বাকি আদায় / পরিশোধ</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">পাওনা আদায় হবে</span>
                <span className="font-bold text-emerald-600">{fmtMoney(totalReceivable, cur)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">দেনা পরিশোধ করতে হবে</span>
                <span className="font-bold text-red-600">{fmtMoney(totalPayable, cur)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-2"><Package size={15} /> Low stock</span>
              <Badge tone={lowStock ? 'red' : 'green'}>{lowStock} পণ্য</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-2"><Clock size={15} /> Cash balance</span>
              <span className="font-bold">{fmtMoney(cashBalance(s), cur)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-900 mb-3">সাম্প্রতিক লেনদেন</h3>
        {recent.length === 0 ? (
          <EmptyState title="কোনো লেনদেন নেই" subtitle="নতুন বিক্রি, কেনাকাটা বা লেনদেন যোগ করুন।" />
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.dir === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {r.dir === 'in' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.label}</p>
                  <p className="text-xs text-slate-400">{r.kind} · {fmtDate(r.date)}</p>
                </div>
                <span className={`text-sm font-bold ${r.dir === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.dir === 'in' ? '+' : '-'}{fmtMoney(r.amount, cur)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
