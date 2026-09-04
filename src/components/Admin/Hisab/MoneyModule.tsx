/**
 * Income & Expense — shared add/list/report module.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyTxn } from '../../../accounting/types';
import { fmtMoney, fmtDate, todayISO, downloadCSV } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, TextArea, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

const INCOME_CATS = ['Sales Income / বিক্রয় আয়', 'Service / সেবা', 'Commission / কমিশন', 'Other Income / অন্যান্য আয়'];
const EXPENSE_CATS = ['Shop Rent / দোকান ভাড়া', 'Employee Salary / কর্মচারীর বেতন', 'Electricity Bill / বিদ্যুৎ বিল', 'Transport / পরিবহন', 'Purchase / কেনাকাটা', 'Other Expense / অন্যান্য খরচ'];

const MoneyModule: React.FC<{ store: Store; type: 'income' | 'expense' }> = ({ store, type }) => {
  const { state: s, addMoneyTxn, deleteMoneyTxn } = store;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '', date: todayISO(), party: '', method: 'Cash', note: '' });
  const [range, setRange] = useState('all');

  const txns = s.moneyTxns.filter((t) => t.type === type);
  const isIncome = type === 'income';
  const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;

  const filtered = useMemo(() => {
    const t = todayISO();
    if (range === 'today') return txns.filter((x) => x.date === t);
    if (range === 'week') {
      const week = new Date(); week.setDate(week.getDate() - 7);
      const iso = week.toISOString().slice(0, 10);
      return txns.filter((x) => x.date >= iso);
    }
    if (range === 'month') {
      const m = todayISO().slice(0, 7);
      return txns.filter((x) => x.date.startsWith(m));
    }
    return txns;
  }, [txns, range]);

  const total = filtered.reduce((a, x) => a + x.amount, 0);
  // category-wise breakdown
  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((x) => { map[x.category] = (map[x.category] || 0) + x.amount; });
    return Object.entries(map).map(([cat, amt]) => ({ cat, amt })).sort((a, b) => b.amt - a.amt);
  }, [filtered]);

  const openNew = () => { setForm({ category: cats[0], amount: '', date: todayISO(), party: '', method: 'Cash', note: '' }); setModal(true); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !parseFloat(form.amount)) { toast.error('ধরন ও পরিমাণ দিন'); return; }
    addMoneyTxn({ type, category: form.category, amount: parseFloat(form.amount), date: form.date, party: form.party, method: form.method, note: form.note });
    toast.success(isIncome ? 'আয় যোগ হয়েছে' : 'খরচ যোগ হয়েছে');
    setModal(false);
  };

  const exportCSV = () => {
    downloadCSV(`${type}-report.csv`, [
      ['Date', 'Category', 'Amount', 'Party', 'Method', 'Note'],
      ...filtered.map((x) => [x.date, x.category, x.amount, x.party || '', x.method, x.note || '']),
    ]);
    toast.success('CSV ডাউনলোড হয়েছে');
  };

  return (
    <div>
      <SectionTitle
        title={isIncome ? 'আয় / Income' : 'খরচ / Expense'}
        subtitle={`${filtered.length} টি এন্ট্রি · মোট ${fmtMoney(total, s.settings.currency)}`}
        right={
          <>
            <Button variant="outline" onClick={exportCSV}><Download size={16} /> রিপোর্ট</Button>
            <Button onClick={openNew}><Plus size={16} /> {isIncome ? 'নতুন আয়' : 'নতুন খরচ'}</Button>
          </>
        }
      />

      <Card className="p-3 mb-4">
        <div className="flex gap-1">
          {[['all', 'সব'], ['today', 'আজ'], ['week', 'সপ্তাহ'], ['month', 'মাস']].map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${range === k ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{l}</button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          {filtered.length === 0 ? (
            <EmptyState title={`কোনো ${isIncome ? 'আয়' : 'খরচ'} নেই`} />
          ) : (
            <Table head={<><Th>তারিখ</Th><Th>ধরন</Th><Th>কে / বিবরণ</Th><Th>মাধ্যম</Th><Th>পরিমাণ</Th><Th className="text-right">Action</Th></>}>
              {filtered.map((x) => (
                <tr key={x.id} className="hover:bg-slate-50">
                  <Td>{fmtDate(x.date)}</Td>
                  <Td className="font-semibold">{x.category}</Td>
                  <Td className="text-slate-500">{x.party || x.note || '—'}</Td>
                  <Td><Badge>{x.method}</Badge></Td>
                  <Td className={isIncome ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmtMoney(x.amount, s.settings.currency)}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Delete?')) { deleteMoneyTxn(x.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-3">ধরন অনুযায়ী {isIncome ? 'আয়' : 'খরচ'}</h3>
          {byCat.length === 0 ? <p className="text-sm text-slate-400">কোনো ডেটা নেই</p> : (
            <div className="space-y-3">
              {byCat.map((b) => (
                <div key={b.cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{b.cat}</span>
                    <span className="font-bold">{fmtMoney(b.amt, s.settings.currency)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${total ? (b.amt / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={isIncome ? 'নতুন আয়' : 'নতুন খরচ'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="ধরন">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="টাকার পরিমাণ *"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="৳ 0" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="তারিখ"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="মাধ্যম">
              <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {['Cash', 'Bank', 'bKash', 'Nagad', 'Rocket'].map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={isIncome ? 'কে টাকা দিয়েছে' : 'কাকে টাকা দেওয়া হয়েছে'}><Input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} /></Field>
          <Field label="নোট / বিবরণ"><TextArea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const Income: React.FC<{ store: Store }> = ({ store }) => <MoneyModule store={store} type="income" />;
export const Expense: React.FC<{ store: Store }> = ({ store }) => <MoneyModule store={store} type="expense" />;
