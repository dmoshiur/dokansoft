/**
 * কাস্টমার / Customers — the single source of truth for the Hisab ledger.
 *
 * - Summary stat cards (total customers, total due, total collected + advance, net balance)
 * - Sortable, filterable, paginated list with a net-balance column
 * - Quick actions per row: statement (eye), add due/জমা, SMS reminder, edit, delete
 * - Full ledger statement (তারিখ / বিবরণ / জমা / পাওনা / ব্যালেন্স) like a হালখাতা
 * - Card view on small screens
 */
import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Phone, MapPin, Eye, Pencil, Trash2, ArrowDownLeft, ArrowUpRight,
  MessageCircle, Send, Users, HandCoins, Wallet, Scale, ChevronLeft, ChevronRight,
  ArrowUpDown, Filter, Receipt, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Party } from '../../../accounting/types';
import { fmtMoney, fmtDate, waLink, smsLink, shareText, todayISO, normalizePhone } from '../../../accounting/format';
import { customerBalance } from '../../../accounting/store';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, TextArea, Table, Th, Td, EmptyState, StatCard } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

interface LedgerRow {
  date: string;
  desc: string;
  debit: number;
  credit: number;
  balance: number;
}

type SortKey = 'name' | 'due' | 'collected';
type SortDir = 'asc' | 'desc';
type ModalKind = 'add' | 'edit' | 'view' | 'txn' | null;
type TxnDir = 'receive' | 'refund' | 'due';

const PAGE_SIZE = 8;

const emptyForm = { name: '', phone: '', address: '', email: '', notes: '', openingBalance: '0' };
const emptyPayForm = { direction: 'receive' as TxnDir, amount: '', method: 'Cash', note: '' };

export const Customers: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addParty, updateParty, deleteParty, addPayment, addSale } = store;
  const customers = s.parties.filter((p) => p.type === 'customer');

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<SortDir>('asc');
  const [onlyDue, setOnlyDue] = useState(false);
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalKind>(null);
  const [target, setTarget] = useState<Party | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);

  // ---- Derived per-customer figures ----
  const rows = useMemo(
    () =>
      customers.map((c) => {
        const net = customerBalance(s, c.id);
        const collected = s.payments
          .filter((p) => p.partyId === c.id && p.direction === 'receive')
          .reduce((a, p) => a + p.amount, 0);
        return {
          c,
          net,
          collected,
          due: Math.max(net, 0),
          advance: Math.max(-net, 0),
        };
      }),
    [s, customers],
  );

  const totalCustomers = rows.length;
  const totalDue = rows.reduce((a, r) => a + r.due, 0);
  const totalCollected = rows.reduce((a, r) => a + r.collected, 0);
  const totalAdvance = rows.reduce((a, r) => a + r.advance, 0);
  const netBalance = totalDue - totalAdvance;

  // ---- Filter + sort ----
  const filtered = useMemo(() => {
    let list = rows.filter((r) =>
      (r.c.name + (r.c.phone || '') + (r.c.address || '')).toLowerCase().includes(q.toLowerCase()),
    );
    if (onlyDue) list = list.filter((r) => r.due > 0);
    const mult = dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.c.name.localeCompare(b.c.name) * mult;
      if (sort === 'due') return (a.due - b.due) * mult;
      return (a.collected - b.collected) * mult;
    });
    return list;
  }, [rows, q, onlyDue, sort, dir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (curPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(curPage * PAGE_SIZE, filtered.length);

  // ---- Ledger / statement ----
  const ledger = (c: Party): LedgerRow[] => {
    const rows: { date: string; desc: string; debit: number; credit: number }[] = [];
    if (c.openingBalance) {
      rows.push({ date: c.createdAt.slice(0, 10), desc: 'প্রারম্ভিক ব্যালেন্স / Opening balance', debit: c.openingBalance, credit: 0 });
    }
    s.sales.filter((x) => x.customerId === c.id).forEach((x) =>
      rows.push({ date: x.date, desc: `বিক্রি / Sale ${x.invoiceNo}`, debit: x.total, credit: 0 }),
    );
    s.payments.filter((x) => x.partyId === c.id).forEach((x) => {
      if (x.direction === 'receive') {
        rows.push({ date: x.date, desc: `জমা / Received (${x.method})`, debit: 0, credit: x.amount });
      } else {
        rows.push({ date: x.date, desc: `ফেরত / Refund (${x.method})`, debit: x.amount, credit: 0 });
      }
    });
    rows.sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    return rows.map((r) => {
      bal += r.debit - r.credit;
      return { ...r, balance: bal };
    });
  };

  // ---- Actions ----
  const openAdd = () => { setForm(emptyForm); setModal('add'); };
  const openEdit = (c: Party) => {
    setTarget(c);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', email: c.email || '', notes: c.notes || '', openingBalance: String(c.openingBalance || 0) });
    setModal('edit');
  };
  const openTxn = (c: Party, dir: TxnDir = 'receive') => {
    setTarget(c);
    setPayForm({ direction: dir, amount: '', method: 'Cash', note: '' });
    setModal('txn');
  };
  const openStatement = (c: Party) => { setTarget(c); setModal('view'); };

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

  const submitTxn = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payForm.amount);
    if (!target || !amount) { toast.error('টাকার পরিমাণ দিন'); return; }

    if (payForm.direction === 'due') {
      const invoiceNo = `DUE-${Date.now().toString().slice(-6)}`;
      addSale({
        invoiceNo,
        customerId: target.id,
        customerName: target.name,
        date: todayISO(),
        items: [{ productId: '', productName: 'বাকি যোগ / Due entry', quantity: 1, unitPrice: amount, total: amount }],
        subtotal: amount,
        discount: 0,
        vat: 0,
        total: amount,
        paid: 0,
        due: amount,
        paymentMethod: 'Due',
        status: 'Due',
        note: payForm.note || 'বাকি যোগ',
      });
      toast.success(`বাকি যোগ হয়েছে — ৳${amount.toLocaleString()}`);
    } else {
      addPayment({
        direction: payForm.direction === 'receive' ? 'receive' : 'pay',
        partyId: target.id,
        partyName: target.name,
        partyType: 'customer',
        amount,
        date: todayISO(),
        method: payForm.method,
        note: payForm.note,
      });
      toast.success(payForm.direction === 'receive' ? 'জমা যোগ হয়েছে' : 'ফেরত যোগ হয়েছে');
    }
    setModal(null);
    setPayForm(emptyPayForm);
  };

  const sendSmsReminder = async (c: Party) => {
    if (!c.phone) { toast.error('এই কাস্টমারের মোবাইল নম্বর নেই'); return; }
    const bal = customerBalance(s, c.id);
    if (bal <= 0) { toast.error('এই কাস্টমারের কোনো বকেয়া নেই'); return; }
    setSendingSmsId(c.id);
    try {
      const raw = normalizePhone(c.phone);
      // sms.net.bd expects the international 880… format for local numbers.
      const to = raw.startsWith('0') && raw.length === 11 ? `88${raw}` : raw;
      const msg = `প্রিয় ${c.name}, ${s.profile.name} থেকে মনে করিয়ে দিচ্ছি — আপনার বকেয়া ৳${bal.toLocaleString()} আছে। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ।`;
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch('/api/gateways/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, msg }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) toast.success(`${c.name} কে রিমাইন্ডার SMS পাঠানো হয়েছে`);
      else if (data.skipped) toast.warning('SMS গেটওয়ে চালু নেই — সেটিংস → Notification Gateways এ sms.net.bd কনফিগার করুন');
      else toast.error(data.error || 'SMS পাঠানো যায়নি');
    } catch (e: any) {
      toast.error('নেটওয়ার্ক সমস্যা: ' + e.message);
    } finally {
      setSendingSmsId(null);
    }
  };

  const sendStatement = (c: Party) => {
    const bal = customerBalance(s, c.id);
    const lines = ledger(c);
    const text =
      `${s.profile.name}\nহিসাব স্টেটমেন্ট — ${c.name}\nমোট বাকি: ৳${bal.toLocaleString()}\n\n` +
      lines.map((r) => `${r.date} | ${r.desc} | ${r.debit ? '+' + r.debit : '-' + r.credit}`).join('\n');
    shareText(`হিসাব — ${c.name}`, text);
    toast.success('স্টেটমেন্ট শেয়ার করা হয়েছে');
  };

  const handleDelete = (c: Party) => {
    if (confirm(`"${c.name}" কে মুছে ফেলবেন? এটি ফেরানো যাবে না।`)) {
      deleteParty(c.id);
      toast.success('কাস্টমার মুছে ফেলা হয়েছে');
    }
  };

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'name', label: 'নাম অনুযায়ী' },
    { value: 'due', label: 'বাকি অনুযায়ী' },
    { value: 'collected', label: 'জমা অনুযায়ী' },
  ];

  return (
    <div>
      <SectionTitle
        title="কাস্টমার / Customers"
        subtitle="হালখাতা — কাস্টমারদের হিসাব, বকেয়া ও লেনদেন"
        right={<Button onClick={openAdd}><Plus size={16} /> নতুন কাস্টমার</Button>}
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="মোট কাস্টমার" sub="Total customers" value={String(totalCustomers)} icon={Users} tone="blue" />
        <StatCard label="মোট পাওনা" sub="Total due" value={fmtMoney(totalDue, s.settings.currency)} icon={HandCoins} tone="red" />
        <StatCard label="মোট জমা" sub={`Collected · অগ্রিম ${fmtMoney(totalAdvance, s.settings.currency)}`} value={fmtMoney(totalCollected, s.settings.currency)} icon={Wallet} tone="green" />
        <StatCard label="নেট ব্যালেন্স" sub="Net balance" value={fmtMoney(netBalance, s.settings.currency)} icon={Scale} tone="indigo" />
      </div>

      {/* Toolbar: search + filter + sort */}
      <Card className="p-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2 px-2 flex-1 min-w-0">
            <Search size={17} className="text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন…"
              className="flex-1 bg-transparent border-none focus:outline-none text-sm min-w-0"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setOnlyDue(!onlyDue); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${onlyDue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <Filter size={14} />
              শুধু বাকি আছে
            </button>

            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none"
            >
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <button
              onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}
              title="উল্টে দিন"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              <ArrowUpDown size={14} />
              {dir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </Card>

      {/* List */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="কোনো কাস্টমার নেই"
            subtitle={onlyDue ? 'বাকি আছে এমন কোনো কাস্টমার পাওয়া যায়নি।' : 'নতুন কাস্টমার যোগ করতে উপরের বাটনে ক্লিক করুন।'}
          />
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden md:block">
              <Table
                head={
                  <>
                    <Th>নাম / Name</Th>
                    <Th>মোবাইল</Th>
                    <Th>মোট পাওনা</Th>
                    <Th>মোট জমা</Th>
                    <Th>নেট ব্যালেন্স</Th>
                    <Th className="text-right">অ্যাকশন</Th>
                  </>
                }
              >
                {pageRows.map(({ c, due, collected, net, advance }) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>
                      <p className="font-semibold">{c.name}</p>
                      {c.address && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={11} />{c.address}</p>}
                    </Td>
                    <Td><span className="flex items-center gap-1 text-slate-500"><Phone size={13} />{c.phone || '—'}</span></Td>
                    <Td>
                      {due > 0 ? (
                        <Badge tone="red">{fmtMoney(due, s.settings.currency)}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-emerald-600 font-semibold">{fmtMoney(collected, s.settings.currency)}</Td>
                    <Td>
                      {net > 0 ? (
                        <span className="font-bold text-red-600">{fmtMoney(net, s.settings.currency)}</span>
                      ) : net < 0 ? (
                        <span className="font-bold text-emerald-600">−{fmtMoney(advance, s.settings.currency)} <span className="text-[10px] font-medium text-emerald-500">অগ্রিম</span></span>
                      ) : (
                        <span className="text-xs text-slate-400">পরিশোধিত</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" title="হিসাব দেখুন" onClick={() => openStatement(c)}><Eye size={15} /></Button>
                        <Button size="sm" variant="ghost" title="বাকি / জমা যোগ করুন" onClick={() => openTxn(c, 'receive')}><ArrowDownLeft size={15} /></Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="SMS রিমাইন্ডার পাঠান"
                          disabled={sendingSmsId === c.id}
                          onClick={() => sendSmsReminder(c)}
                        >
                          {sendingSmsId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </Button>
                        <Button size="sm" variant="ghost" title="এডিট" onClick={() => openEdit(c)}><Pencil size={15} /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" title="মুছুন" onClick={() => handleDelete(c)}><Trash2 size={15} /></Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-slate-100">
              {pageRows.map(({ c, due, collected, net, advance }) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={12} />{c.phone}</p>}
                      {c.address && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12} />{c.address}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {net > 0 ? (
                        <p className="font-bold text-red-600">{fmtMoney(net, s.settings.currency)}</p>
                      ) : net < 0 ? (
                        <p className="font-bold text-emerald-600">−{fmtMoney(advance, s.settings.currency)}</p>
                      ) : (
                        <p className="text-xs text-slate-400">পরিশোধিত</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">বাকি {fmtMoney(due, s.settings.currency)} · জমা {fmtMoney(collected, s.settings.currency)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openStatement(c)}><Eye size={14} /> হিসাব</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openTxn(c, 'receive')}><ArrowDownLeft size={14} /> জমা</Button>
                    <Button size="sm" variant="outline" disabled={sendingSmsId === c.id} onClick={() => sendSmsReminder(c)}>
                      {sendingSmsId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil size={15} /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(c)}><Trash2 size={15} /></Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {rangeStart}–{rangeEnd} / {filtered.length} জন কাস্টমার
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>
                  <ChevronLeft size={14} /> আগের
                </Button>
                <span className="text-xs font-semibold text-slate-600">পৃষ্ঠা {curPage} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>
                  পরের <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
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

      {/* Statement / ledger modal */}
      <Modal open={modal === 'view' && !!target} onClose={() => setModal(null)} title={target ? `${target.name} — সম্পূর্ণ হিসাব (হালখাতা)` : ''} width="max-w-3xl">
        {target && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Card className="p-3 text-center"><p className="text-[11px] text-slate-400">মোট পাওনা</p><p className="font-black text-red-600">{fmtMoney(customerBalance(s, target.id), s.settings.currency)}</p></Card>
              <Card className="p-3 text-center"><p className="text-[11px] text-slate-400">মোট জমা</p><p className="font-black text-emerald-600">{fmtMoney(s.payments.filter((p) => p.partyId === target.id && p.direction === 'receive').reduce((a, p) => a + p.amount, 0), s.settings.currency)}</p></Card>
              <Card className="p-3 text-center"><p className="text-[11px] text-slate-400">মোবাইল</p><p className="font-black text-sm">{target.phone || '—'}</p></Card>
              <Card className="p-3 text-center"><p className="text-[11px] text-slate-400">ঠিকানা</p><p className="font-black text-sm truncate">{target.address || '—'}</p></Card>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
              {ledger(target).length === 0 ? (
                <EmptyState title="কোনো লেনদেন নেই" subtitle="এই কাস্টমারের হিসাবে এখনো কোনো এন্ট্রি নেই।" />
              ) : (
                <Table head={<><Th>তারিখ</Th><Th>বিবরণ</Th><Th>পাওনা</Th><Th>জমা</Th><Th className="text-right">ব্যালেন্স</Th></>}>
                  {ledger(target).map((r, i) => (
                    <tr key={i}>
                      <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                      <Td>{r.desc}</Td>
                      <Td className="text-red-600">{r.debit ? fmtMoney(r.debit, s.settings.currency) : ''}</Td>
                      <Td className="text-emerald-600">{r.credit ? fmtMoney(r.credit, s.settings.currency) : ''}</Td>
                      <Td className={`text-right font-bold ${r.balance > 0 ? 'text-red-600' : r.balance < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {fmtMoney(r.balance, s.settings.currency)}
                      </Td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={() => openTxn(target, 'receive')}><ArrowDownLeft size={15} /> জমা</Button>
              <Button size="sm" onClick={() => openTxn(target, 'due')}><Receipt size={15} /> বাকি যোগ</Button>
              <Button size="sm" variant="outline" onClick={() => openTxn(target, 'refund')}><ArrowUpRight size={15} /> ফেরত</Button>
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

      {/* Quick transaction modal (জমা / ফেরত / বাকি যোগ) */}
      <Modal open={modal === 'txn' && !!target} onClose={() => setModal(null)} title={target ? `লেনদেন — ${target.name}` : ''}>
        <form onSubmit={submitTxn} className="space-y-4">
          <Field label="ধরন">
            <select className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm" value={payForm.direction} onChange={(e) => setPayForm({ ...payForm, direction: e.target.value as TxnDir })}>
              <option value="receive">জমা (Receive)</option>
              <option value="due">বাকি যোগ (Add Due)</option>
              <option value="refund">ফেরত (Refund)</option>
            </select>
          </Field>
          <Field label="পরিমাণ *"><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="৳ 0" /></Field>
          {payForm.direction !== 'due' && (
            <Field label="মাধ্যম">
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                {['Cash', 'Bank', 'bKash', 'Nagad', 'Rocket'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          )}
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
