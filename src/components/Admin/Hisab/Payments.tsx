/**
 * Payments — receive/pay, cash/bank/mobile banking, history, receipt, dues.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Printer, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { fmtMoney, fmtDate, todayISO, fmtDateTime } from '../../../accounting/format';
import { customerBalance, supplierBalance } from '../../../accounting/store';
import { useAccountingStore } from '../../../accounting/store';
import { useSubmitGuard } from '../../../lib/useSubmitGuard';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, Table, Th, Td, EmptyState, Tabs } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Payments: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addPayment, deletePayment } = store;
  const [tab, setTab] = useState('receive');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ partyId: '', amount: '', method: 'Cash', reference: '', note: '' });

  const receiveParties = s.parties.filter((p) => p.type === 'customer');
  const payParties = s.parties.filter((p) => p.type === 'supplier');
  const direction = tab === 'receive' ? 'receive' : 'pay';
  const parties = direction === 'receive' ? receiveParties : payParties;

  const history = useMemo(
    () => s.payments.filter((p) => p.direction === direction).slice().reverse(),
    [s.payments, direction],
  );

  const openNew = () => { setForm({ partyId: parties[0]?.id || '', amount: '', method: 'Cash', reference: '', note: '' }); setModal(true); };

  const payGuard = useSubmitGuard();

  const submit = payGuard.guard(() => {
    if (!form.partyId || !parseFloat(form.amount)) { toast.error('সব ফিল্ড দিন'); return; }
    const p = s.parties.find((x) => x.id === form.partyId);
    const res = addPayment({ direction, partyId: form.partyId, partyName: p?.name || '', partyType: direction === 'receive' ? 'customer' : 'supplier', amount: parseFloat(form.amount), date: todayISO(), method: form.method, reference: form.reference, note: form.note });
    if (!res.ok) { toast.error(res.reason || 'ডুপ্লিকেট লেনদেন'); return; }
    toast.success(direction === 'receive' ? 'টাকা গ্রহণ হয়েছে' : 'টাকা প্রদান হয়েছে');
    payGuard.resetKey();
    setModal(false);
  });

  const balanceOf = (id: string) => (direction === 'receive' ? customerBalance(s, id) : supplierBalance(s, id));

  return (
    <div>
      <SectionTitle
        title="লেনদেন / Payments"
        subtitle="টাকা গ্রহণ ও প্রদান — Cash, Bank, Mobile Banking"
        right={<Button onClick={openNew}><Plus size={16} /> {direction === 'receive' ? 'টাকা গ্রহণ' : 'টাকা প্রদান'}</Button>}
      />

      <Tabs
        tabs={[
          { id: 'receive', label: 'টাকা গ্রহণ (Receive)', icon: ArrowDownLeft },
          { id: 'pay', label: 'টাকা প্রদান (Pay)', icon: ArrowUpRight },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        <Card>
          {history.length === 0 ? (
            <EmptyState title="কোনো লেনদেন নেই" />
          ) : (
            <Table head={<><Th>তারিখ</Th><Th>{direction === 'receive' ? 'কাস্টমার' : 'সরবরাহকারী'}</Th><Th>পরিমাণ</Th><Th>মাধ্যম</Th><Th>রেফারেন্স</Th><Th className="text-right">Action</Th></>}>
              {history.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>{fmtDate(p.date)}</Td>
                  <Td className="font-semibold">{p.partyName}</Td>
                  <Td className={direction === 'receive' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmtMoney(p.amount, s.settings.currency)}</Td>
                  <Td><Badge>{p.method}</Badge></Td>
                  <Td className="text-slate-500">{p.reference || '—'}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setForm({ partyId: p.partyId, amount: String(p.amount), method: p.method, reference: p.reference || '', note: p.note || '' }); /* receipt */ }}><Printer size={15} /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Delete?')) { deletePayment(p.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={direction === 'receive' ? 'টাকা গ্রহণ' : 'টাকা প্রদান'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label={direction === 'receive' ? 'কাস্টমার' : 'সরবরাহকারী'}>
            <Select value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name} — বাকি {fmtMoney(balanceOf(p.id), s.settings.currency)}</option>)}
              {parties.length === 0 && <option value="">কোনো পার্টি নেই</option>}
            </Select>
          </Field>
          <Field label="পরিমাণ *"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="মাধ্যম (Cash / Bank / Mobile Banking)">
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {['Cash', 'Bank', 'bKash', 'Nagad', 'Rocket'].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="রেফারেন্স / TxID"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
          <Field label="নোট"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>বাতিল</Button>
            <Button type="submit" disabled={payGuard.submitting}>{payGuard.submitting ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
