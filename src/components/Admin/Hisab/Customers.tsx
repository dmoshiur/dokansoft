/**
 * Customers — list, add/edit, full statement, payment entry, SMS/WhatsApp share.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Search, Phone, MapPin, Eye, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Party } from '../../../accounting/types';
import { fmtMoney, fmtDate, waLink, smsLink, shareText, todayISO } from '../../../accounting/format';
import { customerBalance } from '../../../accounting/store';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, TextArea, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Customers: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addParty, updateParty, deleteParty, addPayment } = store;
  const customers = s.parties.filter((p) => p.type === 'customer');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | 'pay' | null>(null);
  const [target, setTarget] = useState<Party | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', notes: '', openingBalance: '0' });
  const [payForm, setPayForm] = useState({ direction: 'receive', amount: '', method: 'Cash', note: '' });

  const filtered = useMemo(
    () => customers.filter((c) => (c.name + (c.phone || '') + (c.address || '')).toLowerCase().includes(q.toLowerCase())),
    [customers, q],
  );

  const resetForm = () => setForm({ name: '', phone: '', address: '', email: '', notes: '', openingBalance: '0' });

  const openAdd = () => { resetForm(); setModal('add'); };
  const openEdit = (c: Party) => {
    setTarget(c);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', email: c.email || '', notes: c.notes || '', openingBalance: String(c.openingBalance || 0) });
    setModal('edit');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('কাস্টমারের নাম দিন'); return; }
    if (modal === 'add') {
      addParty({ type: 'customer', name: form.name, phone: form.phone, address: form.address, email: form.email, notes: form.notes, openingBalance: parseFloat(form.openingBalance) || 0 });
      toast.success('নতুন কাস্টমার যোগ হয়েছে');
    } else if (modal === 'edit' && target) {
      updateParty(target.id, { name: form.name, phone: form.phone, address: form.address, email: form.email, notes: form.notes, openingBalance: parseFloat(form.openingBalance) || 0 });
      toast.success('কাস্টমার আপডেট হয়েছে');
    }
    setModal(null);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !parseFloat(payForm.amount)) { toast.error('টাকার পরিমাণ দিন'); return; }
    addPayment({ direction: payForm.direction as 'receive' | 'pay', partyId: target.id, partyName: target.name, partyType: 'customer', amount: parseFloat(payForm.amount), date: todayISO(), method: payForm.method, note: payForm.note });
    toast.success('লেনদেন যোগ হয়েছে');
    setModal(null);
    setPayForm({ direction: 'receive', amount: '', method: 'Cash', note: '' });
  };

  const statement = (c: Party) => {
    const rows: { date: string; desc: string; debit: number; credit: number }[] = [];
    if (c.openingBalance) rows.push({ date: c.createdAt.slice(0, 10), desc: 'Opening balance', debit: c.openingBalance, credit: 0 });
    s.sales.filter((x) => x.customerId === c.id).forEach((x) => rows.push({ date: x.date, desc: `Sale ${x.invoiceNo}`, debit: x.total, credit: 0 }));
    s.payments.filter((x) => x.partyId === c.id).forEach((x) => rows.push({ date: x.date, desc: x.direction === 'receive' ? 'টাকা জমা' : 'টাকা ফেরত', debit: 0, credit: x.amount }));
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  };

  const sendStatement = (c: Party) => {
    const bal = customerBalance(s, c.id);
    const rows = statement(c);
    const text = `${s.profile.name}\nহিসাব স্টেটমেন্ট — ${c.name}\nমোট বাকি: ৳${bal.toLocaleString()}\n\n` +
      rows.map((r) => `${r.date} | ${r.desc} | ${r.debit ? '+' + r.debit : '-' + r.credit}`).join('\n');
    shareText(`হিসাব — ${c.name}`, text);
    toast.success('স্টেটমেন্ট শেয়ার করা হয়েছে');
  };

  const totalDue = customers.reduce((a, c) => a + customerBalance(s, c.id), 0);

  return (
    <div>
      <SectionTitle
        title="কাস্টমার / Customers"
        subtitle={`${customers.length} জন কাস্টমার · মোট বাকি ${fmtMoney(totalDue, s.settings.currency)}`}
        right={<Button onClick={openAdd}><Plus size={16} /> নতুন কাস্টমার</Button>}
      />

      <Card className="p-3 mb-4">
        <div className="flex items-center gap-2 px-2">
          <Search size={17} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন…" className="flex-1 bg-transparent border-none focus:outline-none text-sm" />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="কোনো কাস্টমার নেই" subtitle="নতুন কাস্টমার যোগ করতে উপরের বাটনে ক্লিক করুন।" />
        ) : (
          <Table head={<><Th>নাম</Th><Th>মোবাইল</Th><Th>ঠিকানা</Th><Th>মোট পাওনা</Th><Th>মোট জমা</Th><Th className="text-right">Action</Th></>}>
            {filtered.map((c) => {
              const bal = customerBalance(s, c.id);
              const deposited = s.payments.filter((p) => p.partyId === c.id && p.direction === 'receive').reduce((a, p) => a + p.amount, 0);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td><p className="font-semibold">{c.name}</p></Td>
                  <Td><span className="flex items-center gap-1 text-slate-500"><Phone size={13} />{c.phone || '—'}</span></Td>
                  <Td><span className="flex items-center gap-1 text-slate-500"><MapPin size={13} />{c.address || '—'}</span></Td>
                  <Td><Badge tone={bal > 0 ? 'red' : 'green'}>{fmtMoney(bal, s.settings.currency)}</Badge></Td>
                  <Td className="text-emerald-600 font-semibold">{fmtMoney(deposited, s.settings.currency)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setTarget(c); setModal('view'); }}><Eye size={15} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil size={15} /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm(`Delete ${c.name}?`)) { deleteParty(c.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Add / Edit modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'নতুন কাস্টমার' : 'কাস্টমার এডিট'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="নাম *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="মোবাইল"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" /></Field>
            <Field label="ইমেইল"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></Field>
          </div>
          <Field label="ঠিকানা"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" /></Field>
          <Field label="পূর্বের বাকি (opening balance)"><Input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} /></Field>
          <Field label="নোট"><TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ</Button>
          </div>
        </form>
      </Modal>

      {/* View / statement modal */}
      <Modal open={modal === 'view' && !!target} onClose={() => setModal(null)} title={target ? `${target.name} — সম্পূর্ণ হিসাব` : ''} width="max-w-2xl">
        {target && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3 text-center"><p className="text-xs text-slate-400">মোট পাওনা</p><p className="font-black text-red-600">{fmtMoney(customerBalance(s, target.id), s.settings.currency)}</p></Card>
              <Card className="p-3 text-center"><p className="text-xs text-slate-400">মোট জমা</p><p className="font-black text-emerald-600">{fmtMoney(s.payments.filter((p) => p.partyId === target.id && p.direction === 'receive').reduce((a, p) => a + p.amount, 0), s.settings.currency)}</p></Card>
              <Card className="p-3 text-center"><p className="text-xs text-slate-400">মোবাইল</p><p className="font-black">{target.phone || '—'}</p></Card>
            </div>
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
              <Table head={<><Th>তারিখ</Th><Th>বিবরণ</Th><Th>ডেবিট</Th><Th>ক্রেডিট</Th></>}>
                {statement(target).map((r, i) => (
                  <tr key={i}>
                    <Td>{fmtDate(r.date)}</Td>
                    <Td>{r.desc}</Td>
                    <Td className="text-red-600">{r.debit ? fmtMoney(r.debit, s.settings.currency) : ''}</Td>
                    <Td className="text-emerald-600">{r.credit ? fmtMoney(r.credit, s.settings.currency) : ''}</Td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={() => { setPayForm({ direction: 'receive', amount: '', method: 'Cash', note: '' }); setModal('pay'); }}><ArrowDownLeft size={15} /> টাকা নেওয়া</Button>
              <Button size="sm" variant="outline" onClick={() => { setPayForm({ direction: 'pay', amount: '', method: 'Cash', note: '' }); setModal('pay'); }}><ArrowUpRight size={15} /> টাকা ফেরত</Button>
              {target.phone && (
                <>
                  <a href={waLink(target.phone, `হিসাব — ${target.name}\nমোট বাকি: ৳${customerBalance(s, target.id).toLocaleString()}`)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><MessageCircle size={15} /> WhatsApp</Button>
                  </a>
                  <a href={smsLink(target.phone, `হিসাব: মোট বাকি ৳${customerBalance(s, target.id).toLocaleString()}`)}>
                    <Button size="sm" variant="outline"><Send size={15} /> SMS</Button>
                  </a>
                </>
              )}
              <Button size="sm" variant="secondary" onClick={() => sendStatement(target)}>Share Statement</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal open={modal === 'pay' && !!target} onClose={() => setModal(null)} title={target ? `লেনদেন — ${target.name}` : ''}>
        <form onSubmit={submitPayment} className="space-y-4">
          <Field label="ধরন">
            <select className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm" value={payForm.direction} onChange={(e) => setPayForm({ ...payForm, direction: e.target.value })}>
              <option value="receive">টাকা নেওয়া (Receive)</option>
              <option value="pay">টাকা ফেরত (Return)</option>
            </select>
          </Field>
          <Field label="পরিমাণ *"><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="৳ 0" /></Field>
          <Field label="মাধ্যম">
            <select className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
              {['Cash', 'Bank', 'bKash', 'Nagad', 'Rocket'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="নোট"><Input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
