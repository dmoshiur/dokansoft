/**
 * Bank & Mobile Banking — accounts, deposit/withdraw/transfer, balance, history.
 */
import React, { useState } from 'react';
import { Plus, Landmark, Smartphone, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BankAccountType } from '../../../accounting/types';
import { fmtMoney, fmtDate, todayISO } from '../../../accounting/format';
import { accountBalance } from '../../../accounting/store';
import { useAccountingStore } from '../../../accounting/store';
import { useSubmitGuard } from '../../../lib/useSubmitGuard';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, Table, Th, Td } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

const TYPE_ICON: Record<BankAccountType, React.ElementType> = {
  Bank: Landmark, Cash: Landmark, bKash: Smartphone, Nagad: Smartphone, Rocket: Smartphone,
};

export const Bank: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addBankAccount, deleteBankAccount, addBankTxn, deleteBankTxn } = store;
  const [modal, setModal] = useState<'account' | 'txn' | null>(null);
  const [acctForm, setAcctForm] = useState({ name: '', type: 'Bank' as BankAccountType, accountNo: '', openingBalance: '0' });
  const [txnForm, setTxnForm] = useState({ accountId: '', type: 'deposit', amount: '', toAccountId: '', note: '' });

  const accounts = s.bankAccounts;
  const txns = s.bankTxns.slice().reverse();
  const totalBalance = accounts.reduce((a, acc) => a + accountBalance(s, acc.id), 0);

  const acctGuard = useSubmitGuard();
  const btxnGuard = useSubmitGuard();

  const submitAccount = acctGuard.guard(() => {
    if (!acctForm.name.trim()) { toast.error('নাম দিন'); return; }
    if (accounts.some((a) => a.name.trim().toLowerCase() === acctForm.name.trim().toLowerCase())) {
      toast.error('এই নামে অ্যাকাউন্ট আগে থেকেই আছে'); return;
    }
    addBankAccount({ name: acctForm.name, type: acctForm.type, accountNo: acctForm.accountNo, openingBalance: parseFloat(acctForm.openingBalance) || 0 });
    toast.success('অ্যাকাউন্ট যোগ হয়েছে');
    acctGuard.resetKey();
    setModal(null);
  });

  const submitTxn = btxnGuard.guard(() => {
    const amt = parseFloat(txnForm.amount);
    if (!txnForm.accountId || !amt) { toast.error('অ্যাকাউন্ট ও পরিমাণ দিন'); return; }
    const acc = accounts.find((a) => a.id === txnForm.accountId);
    const res = addBankTxn({
      accountId: txnForm.accountId, accountName: acc?.name || '',
      type: txnForm.type as 'deposit' | 'withdraw' | 'transfer',
      amount: amt, date: todayISO(),
      toAccountId: txnForm.type === 'transfer' ? txnForm.toAccountId : undefined,
      toAccountName: txnForm.type === 'transfer' ? accounts.find((a) => a.id === txnForm.toAccountId)?.name : undefined,
      note: txnForm.note,
    });
    if (!res.ok) { toast.error(res.reason || 'ডুপ্লিকেট লেনদেন'); return; }
    toast.success('লেনদেন যোগ হয়েছে');
    btxnGuard.resetKey();
    setModal(null);
  });

  return (
    <div>
      <SectionTitle
        title="ব্যাংক ও মোবাইল ব্যাংকিং / Bank & Mobile"
        subtitle={`মোট ব্যালেন্স ${fmtMoney(totalBalance, s.settings.currency)}`}
        right={<Button onClick={() => { setAcctForm({ name: '', type: 'Bank', accountNo: '', openingBalance: '0' }); setModal('account'); }}><Plus size={16} /> নতুন অ্যাকাউন্ট</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {accounts.map((a) => {
          const Icon = TYPE_ICON[a.type];
          const bal = accountBalance(s, a.id);
          return (
            <Card key={a.id} className="p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Icon size={18} /></div>
                  <div>
                    <p className="font-bold text-slate-900">{a.name}</p>
                    <Badge>{a.type}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Delete account?')) { deleteBankAccount(a.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
              </div>
              <p className="text-xs text-slate-400">{a.accountNo || '—'}</p>
              <p className={`text-2xl font-black mt-1 ${bal >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{fmtMoney(bal, s.settings.currency)}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => { setTxnForm({ accountId: a.id, type: 'deposit', amount: '', toAccountId: '', note: '' }); setModal('txn'); }}><ArrowDownCircle size={14} /> জমা</Button>
                <Button size="sm" variant="outline" onClick={() => { setTxnForm({ accountId: a.id, type: 'withdraw', amount: '', toAccountId: '', note: '' }); setModal('txn'); }}><ArrowUpCircle size={14} /> উত্তোলন</Button>
                <Button size="sm" variant="outline" onClick={() => { setTxnForm({ accountId: a.id, type: 'transfer', amount: '', toAccountId: accounts.find((x) => x.id !== a.id)?.id || '', note: '' }); setModal('txn'); }}><ArrowRightLeft size={14} /> Transfer</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="px-4 pt-4"><h3 className="font-bold text-slate-900">Transaction history</h3></div>
        <div className="overflow-x-auto">
          <Table head={<><Th>তারিখ</Th><Th>অ্যাকাউন্ট</Th><Th>ধরন</Th><Th>To</Th><Th>পরিমাণ</Th><Th className="text-right">Action</Th></>}>
            {txns.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>{fmtDate(t.date)}</Td>
                <Td>{t.accountName}</Td>
                <Td><Badge tone={t.type === 'deposit' ? 'green' : t.type === 'withdraw' ? 'red' : 'blue'}>{t.type}</Badge></Td>
                <Td>{t.toAccountName || '—'}</Td>
                <Td className={t.type === 'deposit' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmtMoney(t.amount, s.settings.currency)}</Td>
                <Td><div className="flex justify-end"><Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Delete?')) { deleteBankTxn(t.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button></div></Td>
              </tr>
            ))}
            {txns.length === 0 && <tr><Td colSpan={6}>কোনো লেনদেন নেই</Td></tr>}
          </Table>
        </div>
      </Card>

      <Modal open={modal === 'account'} onClose={() => setModal(null)} title="নতুন অ্যাকাউন্ট">
        <form onSubmit={submitAccount} className="space-y-4">
          <Field label="নাম *"><Input value={acctForm.name} onChange={(e) => setAcctForm({ ...acctForm, name: e.target.value })} placeholder="e.g. Dutch-Bangla Bank" /></Field>
          <Field label="ধরন">
            <Select value={acctForm.type} onChange={(e) => setAcctForm({ ...acctForm, type: e.target.value as BankAccountType })}>
              {['Bank', 'bKash', 'Nagad', 'Rocket', 'Cash'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="অ্যাকাউন্ট নম্বর"><Input value={acctForm.accountNo} onChange={(e) => setAcctForm({ ...acctForm, accountNo: e.target.value })} /></Field>
          <Field label="Opening balance"><Input type="number" value={acctForm.openingBalance} onChange={(e) => setAcctForm({ ...acctForm, openingBalance: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={acctGuard.submitting} onClick={() => setModal(null)}>বাতিল</Button><Button type="submit" disabled={acctGuard.submitting}>{acctGuard.submitting ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ'}</Button></div>
        </form>
      </Modal>

      <Modal open={modal === 'txn'} onClose={() => setModal(null)} title="নতুন লেনদেন">
        <form onSubmit={submitTxn} className="space-y-4">
          <Field label="অ্যাকাউন্ট">
            <Select value={txnForm.accountId} onChange={(e) => setTxnForm({ ...txnForm, accountId: e.target.value })}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="ধরন">
            <Select value={txnForm.type} onChange={(e) => setTxnForm({ ...txnForm, type: e.target.value })}>
              <option value="deposit">টাকা জমা (Deposit)</option>
              <option value="withdraw">টাকা উত্তোলন (Withdraw)</option>
              <option value="transfer">Transfer</option>
            </Select>
          </Field>
          {txnForm.type === 'transfer' && (
            <Field label="To account">
              <Select value={txnForm.toAccountId} onChange={(e) => setTxnForm({ ...txnForm, toAccountId: e.target.value })}>
                {accounts.filter((a) => a.id !== txnForm.accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="পরিমাণ *"><Input type="number" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} /></Field>
          <Field label="নোট"><Input value={txnForm.note} onChange={(e) => setTxnForm({ ...txnForm, note: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={btxnGuard.submitting} onClick={() => setModal(null)}>বাতিল</Button><Button type="submit" disabled={btxnGuard.submitting}>{btxnGuard.submitting ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ'}</Button></div>
        </form>
      </Modal>
    </div>
  );
};
