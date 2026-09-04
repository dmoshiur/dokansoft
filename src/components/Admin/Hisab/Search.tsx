/**
 * Global Search — customers, products, invoices, transactions, date & mobile.
 */
import React, { useMemo, useState } from 'react';
import { Search as SearchIcon, UserRound, Package, Receipt, ArrowRightLeft } from 'lucide-react';
import { fmtMoney, fmtDate, normalizePhone } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Field, Input, Badge, Tabs } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const SearchModule: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s } = store;
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const qPhone = normalizePhone(q);
    const inDate = (d: string) => (!from || d >= from) && (!to || d <= to);

    const customers = s.parties.filter((p) => p.type === 'customer' && (!query || p.name.toLowerCase().includes(query) || (p.phone && normalizePhone(p.phone).includes(qPhone)) || (p.address && p.address.toLowerCase().includes(query))));
    const suppliers = s.parties.filter((p) => p.type === 'supplier' && (!query || p.name.toLowerCase().includes(query) || (p.phone && normalizePhone(p.phone).includes(qPhone))));
    const products = s.products.filter((p) => (!query || p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.toLowerCase().includes(query))));
    const invoices = s.sales.filter((x) => (!query || x.invoiceNo.toLowerCase().includes(query) || x.customerName.toLowerCase().includes(query)) && inDate(x.date));
    const transactions = [
      ...s.moneyTxns.map((t) => ({ id: t.id, date: t.date, label: t.category, amount: t.amount, type: t.type === 'income' ? 'Income' : 'Expense' })),
      ...s.payments.map((t) => ({ id: t.id, date: t.date, label: `${t.direction === 'receive' ? 'Received' : 'Paid'} — ${t.partyName}`, amount: t.amount, type: 'Payment' })),
    ].filter((t) => (!query || t.label.toLowerCase().includes(query)) && inDate(t.date));

    return { customers, suppliers, products, invoices, transactions };
  }, [s, q, from, to]);

  const totalHits = results.customers.length + results.suppliers.length + results.products.length + results.invoices.length + results.transactions.length;

  return (
    <div>
      <SectionTitle title="সার্চ / Search" subtitle="কাস্টমার, পণ্য, ইনভয়েস, লেনদেন, তারিখ ও মোবাইল দিয়ে খুঁজুন" />

      <Card className="p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3">
          <SearchIcon size={17} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম, মোবাইল, invoice, barcode…" className="flex-1 py-2.5 bg-transparent focus:outline-none text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: 'all', label: `সব (${totalHits})` },
          { id: 'customers', label: `কাস্টমার (${results.customers.length})` },
          { id: 'products', label: `পণ্য (${results.products.length})` },
          { id: 'invoices', label: `ইনভয়েস (${results.invoices.length})` },
          { id: 'transactions', label: `লেনদেন (${results.transactions.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4 space-y-4">
        {(tab === 'all' || tab === 'customers') && results.customers.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><UserRound size={16} className="text-emerald-600" /> কাস্টমার</h3>
            <div className="divide-y divide-slate-100">
              {results.customers.map((c) => <div key={c.id} className="flex justify-between py-2"><span className="text-sm font-medium">{c.name} <span className="text-slate-400">({c.phone || '—'})</span></span><span className="text-sm text-slate-500">{c.address || ''}</span></div>)}
            </div>
          </Card>
        )}

        {(tab === 'all' || tab === 'products') && results.products.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Package size={16} className="text-blue-600" /> পণ্য</h3>
            <div className="divide-y divide-slate-100">
              {results.products.map((p) => <div key={p.id} className="flex justify-between py-2"><span className="text-sm font-medium">{p.name} <span className="text-slate-400">({p.barcode || '—'})</span></span><Badge tone={p.stock > 0 ? 'green' : 'red'}>stock {p.stock}</Badge></div>)}
            </div>
          </Card>
        )}

        {(tab === 'all' || tab === 'invoices') && results.invoices.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Receipt size={16} className="text-indigo-600" /> ইনভয়েস</h3>
            <div className="divide-y divide-slate-100">
              {results.invoices.map((x) => <div key={x.id} className="flex justify-between py-2"><span className="text-sm font-medium">{x.invoiceNo} — {x.customerName}</span><span className="text-sm text-slate-500">{fmtDate(x.date)} · {fmtMoney(x.total, s.settings.currency)}</span></div>)}
            </div>
          </Card>
        )}

        {(tab === 'all' || tab === 'transactions') && results.transactions.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><ArrowRightLeft size={16} className="text-amber-600" /> লেনদেন</h3>
            <div className="divide-y divide-slate-100">
              {results.transactions.map((t) => <div key={t.id} className="flex justify-between py-2"><span className="text-sm font-medium">{t.label}</span><span className="text-sm text-slate-500">{fmtDate(t.date)} · {fmtMoney(t.amount, s.settings.currency)}</span></div>)}
            </div>
          </Card>
        )}

        {totalHits === 0 && q && (
          <Card className="p-8 text-center text-slate-400">কোনো ফলাফল পাওয়া যায়নি</Card>
        )}
      </div>
    </div>
  );
};
