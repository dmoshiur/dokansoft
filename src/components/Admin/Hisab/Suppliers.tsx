/**
 * Suppliers — list, add/edit, payable balance, purchase & payment history.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Search, Phone, MapPin, Eye, Pencil, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Party } from '../../../accounting/types';
import { fmtMoney, fmtDate, todayISO } from '../../../accounting/format';
import { supplierBalance } from '../../../accounting/store';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, TextArea, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Suppliers: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addParty, updateParty, deleteParty, addPayment } = store;
  const suppliers = s.parties.filter((p) => p.type === 'supplier');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | 'pay' | null>(null);
  const [target, setTarget] = useState<Party | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', notes: '', openingBalance: '0' });
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', note: '' });

  const filtered = useMemo(
    () => suppliers.filter((c) => (c.name + (c.phone || '') + (c.address || '')).toLowerCase().includes(q.toLowerCase())),
    [suppliers, q],
  );

  const openAdd = () => { setForm({ name: '', phone: '', address: '', email: '', notes: '', openingBalance: '0' }); setModal('add'); };
  const openEdit = (c: Party) => {
    setTarget(c);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', email: c.email || '', notes: c.notes || '', openingBalance: String(c.openingBalance || 0) });
    setModal('edit');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('সরবরাহকারীর নাম দিন'); return; }
    if (modal === 'add') {
      addParty({ type: 'supplier', name: form.name, phone: form.phone, address: form.address, email: form.email, notes: form.notes, openingBalance: parseFloat(form.openingBalance) || 0 });
      toast.success('নতুন সরবরাহকারী যোগ হয়েছে');
    } else if (modal === 'edit' && target) {
      updateParty(target.id, { name: form.name, phone: form.phone, address: form.address, email: form.email, notes: form.notes, openingBalance: parseFloat(form.openingBalance) || 0 });
      toast.success('আপডেট হয়েছে');
    }
    setModal(null);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !parseFloat(payForm.amount)) { toast.error('টাকার পরিমাণ দিন'); return; }
    addPayment({ direction: 'pay', partyId: target.id, partyName: target.name, partyType: 'supplier', amount: parseFloat(payForm.amount), date: todayISO(), method: payForm.method, note: payForm.note });
    toast.success('পরিশোধ যোগ হয়েছে');
    setModal(null);
    setPayForm({ amount: '', method: 'Cash', note: '' });
  };

  const totalPayable = suppliers.reduce((a, c) => a + supplierBalance(s, c.id), 0);

  return (
    <div>
      <SectionTitle
        title="সরবরাহকারী / Suppliers"
        subtitle={`${suppliers.length} জন সরবরাহকারী · মোট দেনা ${fmtMoney(totalPayable, s.settings.currency)}`}
        right={<Button onClick={openAdd}><Plus size={16} /> নতুন সরবরাহকারী</Button>}
      />

      <Card className="p-3 mb-4">
        <div className="flex items-center gap-2 px-2">
          <Search size={17} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম বা মোবাইল দিয়ে খুঁজুন…" className="flex-1 bg-transparent border-none focus:outline-none text-sm" />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="কোনো সরবরাহকারী নেই" />
        ) : (
          <Table head={<><Th>নাম</Th><Th>মোবাইল</Th><Th>ঠিকানা</Th><Th>মোট দেনা</Th><Th>পরিশোধ হয়েছে</Th><Th className="text-right">Action</Th></>}>
            {filtered.map((c) => {
              const bal = supplierBalance(s, c.id);
              const paid = s.payments.filter((p) => p.partyId === c.id && p.direction === 'pay').reduce((a, p) => a + p.amount, 0);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td><p className="font-semibold">{c.name}</p></Td>
                  <Td><span className="flex items-center gap-1 text-slate-500"><Phone size={13} />{c.phone || '—'}</span></Td>
                  <Td><span className="flex items-center gap-1 text-slate-500"><MapPin size={13} />{c.address || '—'}</span></Td>
                  <Td><Badge tone={bal > 0 ? 'red' : 'green'}>{fmtMoney(bal, s.settings.currency)}</Badge></Td>
                  <Td className="text-emerald-600 font-semibold">{fmtMoney(paid, s.settings.currency)}</Td>
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

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'নতুন সরবরাহকারী' : 'এডিট'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="নাম *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="মোবাইল"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="ইমেইল"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="ঠিকানা"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="পূর্বের দেনা"><Input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} /></Field>
          <Field label="নোট"><TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'view' && !!target} onClose={() => setModal(null)} title={target ? `${target.name} — বাকি হিসাব` : ''} width="max-w-2xl">
        {target && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card className="p-3 text-center"><p className="text-xs text-slate-400">মোট দেনা</p><p className="font-black text-red-600">{fmtMoney(supplierBalance(s, target.id), s.settings.currency)}</p></Card>
              <Card className="p-3 text-center"><p className="text-xs text-slate-400">মোট পরিশোধ</p><p className="font-black text-emerald-600">{fmtMoney(s.payments.filter((p) => p.partyId === target.id && p.direction === 'pay').reduce((a, p) => a + p.amount, 0), s.settings.currency)}</p></Card>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">কেনাকাটার ইতিহাস</p>
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl mb-4">
              <Table head={<><Th>তারিখ</Th><Th>পণ্য</Th><Th>মোট</Th><Th>বাকি</Th></>}>
                {s.purchases.filter((x) => x.supplierId === target.id).map((p) => (
                  <tr key={p.id}>
                    <Td>{fmtDate(p.date)}</Td>
                    <Td>{p.items.map((i) => i.productName).join(', ')}</Td>
                    <Td>{fmtMoney(p.total, s.settings.currency)}</Td>
                    <Td><Badge tone={p.due > 0 ? 'red' : 'green'}>{fmtMoney(p.due, s.settings.currency)}</Badge></Td>
                  </tr>
                ))}
                {s.purchases.filter((x) => x.supplierId === target.id).length === 0 && <tr><Td colSpan={4}>কোনো কেনাকাটা নেই</Td></tr>}
              </Table>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Payment history</p>
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl">
              <Table head={<><Th>তারিখ</Th><Th>পরিমাণ</Th><Th>মাধ্যম</Th><Th>নোট</Th></>}>
                {s.payments.filter((x) => x.partyId === target.id && x.direction === 'pay').map((p) => (
                  <tr key={p.id}>
                    <Td>{fmtDate(p.date)}</Td>
                    <Td className="text-emerald-600">{fmtMoney(p.amount, s.settings.currency)}</Td>
                    <Td>{p.method}</Td>
                    <Td>{p.note || '—'}</Td>
                  </tr>
                ))}
                {s.payments.filter((x) => x.partyId === target.id && x.direction === 'pay').length === 0 && <tr><Td colSpan={4}>কোনো পরিশোধ নেই</Td></tr>}
              </Table>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => { setPayForm({ amount: '', method: 'Cash', note: '' }); setModal('pay'); }}><ArrowUpRight size={15} /> পরিশোধ করুন</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === 'pay' && !!target} onClose={() => setModal(null)} title={target ? `পরিশোধ — ${target.name}` : ''}>
        <form onSubmit={submitPayment} className="space-y-4">
          <Field label="পরিমাণ *"><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></Field>
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
