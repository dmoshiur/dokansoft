/**
 * Notifications & Reminders — due reminders, low stock alerts, payment, daily summary.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Bell, Check, Trash2, AlertTriangle, Package, CalendarClock, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { fmtMoney, fmtDateTime } from '../../../accounting/format';
import { customerBalance, supplierBalance } from '../../../accounting/store';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, TextArea, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

const TYPE_META: Record<string, { label: string; icon: React.ElementType; tone: 'red' | 'amber' | 'blue' | 'indigo'; cls: string }> = {
  customer_due: { label: 'কাস্টমারের বাকি', icon: UserRound, tone: 'red', cls: 'bg-red-100 text-red-600' },
  supplier_payment: { label: 'Supplier payment', icon: CalendarClock, tone: 'amber', cls: 'bg-amber-100 text-amber-600' },
  due_date: { label: 'Due date', icon: CalendarClock, tone: 'amber', cls: 'bg-amber-100 text-amber-600' },
  low_stock: { label: 'Low stock', icon: Package, tone: 'blue', cls: 'bg-blue-100 text-blue-600' },
  payment: { label: 'Payment', icon: Bell, tone: 'indigo', cls: 'bg-indigo-100 text-indigo-600' },
  daily_summary: { label: 'Daily summary', icon: Bell, tone: 'indigo', cls: 'bg-indigo-100 text-indigo-600' },
};

export const Reminders: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addReminder, updateReminder, deleteReminder } = store;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: 'customer_due', title: '', message: '', dueDate: '' });

  // Auto-generated alerts (not persisted)
  const autoAlerts = useMemo(() => {
    const list: { id: string; type: string; title: string; message: string }[] = [];
    s.parties.filter((p) => p.type === 'customer').forEach((p) => {
      const bal = customerBalance(s, p.id);
      if (bal > 0) list.push({ id: `auto-cust-${p.id}`, type: 'customer_due', title: `${p.name} এর বাকি ${fmtMoney(bal, s.settings.currency)}`, message: `কাস্টমার ${p.name} এর কাছে ${fmtMoney(bal, s.settings.currency)} বাকি আছে।` });
    });
    s.parties.filter((p) => p.type === 'supplier').forEach((p) => {
      const bal = supplierBalance(s, p.id);
      if (bal > 0) list.push({ id: `auto-sup-${p.id}`, type: 'supplier_payment', title: `${p.name} কে পরিশোধ ${fmtMoney(bal, s.settings.currency)}`, message: `সরবরাহকারী ${p.name} কে ${fmtMoney(bal, s.settings.currency)} পরিশোধ করতে হবে।` });
    });
    s.products.filter((p) => p.stock <= p.minStock).forEach((p) => {
      list.push({ id: `auto-stock-${p.id}`, type: 'low_stock', title: `${p.name} stock কম (${p.stock})`, message: `পণ্য ${p.name} এর stock ${p.stock}, minimum ${p.minStock}।` });
    });
    return list;
  }, [s]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('শিরোনাম দিন'); return; }
    addReminder({ type: form.type as any, title: form.title, message: form.message, dueDate: form.dueDate || undefined, status: 'pending' });
    toast.success('রিমাইন্ডার যোগ হয়েছে');
    setModal(false);
    setForm({ type: 'customer_due', title: '', message: '', dueDate: '' });
  };

  const pending = s.reminders.filter((r) => r.status === 'pending');

  return (
    <div>
      <SectionTitle
        title="নোটিফিকেশন / Reminders"
        subtitle={`${pending.length} টি pending রিমাইন্ডার · ${autoAlerts.length} টি অটো-অ্যালার্ট`}
        right={<Button onClick={() => setModal(true)}><Plus size={16} /> নতুন রিমাইন্ডার</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><AlertTriangle size={17} className="text-amber-500" /> অটো অ্যালার্ট</h3>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {autoAlerts.length === 0 && <EmptyState title="কোনো অ্যালার্ট নেই" subtitle="সবকিছু ঠিক আছে!" />}
            {autoAlerts.map((a) => {
              const meta = TYPE_META[a.type];
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta?.cls || 'bg-slate-100 text-slate-500'}`}>
                    {meta ? <meta.icon size={17} /> : <Bell size={17} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Bell size={17} className="text-emerald-600" /> ম্যানুয়াল রিমাইন্ডার</h3>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {s.reminders.length === 0 && <EmptyState title="কোনো রিমাইন্ডার নেই" />}
            {s.reminders.map((r) => {
              const meta = TYPE_META[r.type];
              return (
                <div key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border ${r.status === 'done' ? 'bg-slate-50 opacity-60' : 'bg-white border-slate-200'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                      <Badge tone={r.status === 'done' ? 'green' : meta?.tone || 'slate'}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{r.message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(r.createdAt)}{r.dueDate ? ` · Due ${r.dueDate}` : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    {r.status === 'pending' && <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => { updateReminder(r.id, { status: 'done' }); toast.success('সম্পন্ন'); }}><Check size={15} /></Button>}
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { deleteReminder(r.id); toast.success('Deleted'); }}><Trash2 size={15} /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="নতুন রিমাইন্ডার">
        <form onSubmit={submit} className="space-y-4">
          <Field label="ধরন">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
          </Field>
          <Field label="শিরোনাম *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="মেসেজ"><TextArea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setModal(false)}>বাতিল</Button><Button type="submit">সংরক্ষণ</Button></div>
        </form>
      </Modal>
    </div>
  );
};
