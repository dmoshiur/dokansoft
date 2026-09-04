/**
 * Cashbook — opening balance, cash in/out, current balance, daily summary.
 */
import React, { useMemo, useState } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import { fmtMoney, fmtDate, todayISO, round2, downloadCSV } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, StatCard, Table, Th, Td, Field, Input } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Cashbook: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, setOpeningBalance } = store;
  const [date, setDate] = useState(todayISO());

  const entries = useMemo(() => {
    const list: { id: string; date: string; desc: string; type: 'in' | 'out'; amount: number }[] = [];
    s.moneyTxns.filter((t) => t.method === 'Cash').forEach((t) =>
      list.push({ id: t.id, date: t.date, desc: t.category, type: t.type === 'income' ? 'in' : 'out', amount: t.amount }));
    s.payments.filter((p) => p.method === 'Cash').forEach((p) =>
      list.push({ id: p.id, date: p.date, desc: `${p.direction === 'receive' ? 'Received' : 'Paid'} — ${p.partyName}`, type: p.direction === 'receive' ? 'in' : 'out', amount: p.amount }));
    s.sales.filter((x) => x.paymentMethod === 'Cash' && x.paid > 0).forEach((x) =>
      list.push({ id: x.id, date: x.date, desc: `Sale ${x.invoiceNo} (paid)`, type: 'in', amount: x.paid }));
    s.purchases.filter((x) => x.paymentMethod === 'Cash' && x.paid > 0).forEach((x) =>
      list.push({ id: x.id, date: x.date, desc: `Purchase — ${x.supplierName} (paid)`, type: 'out', amount: x.paid }));
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [s]);

  const cashIn = round2(entries.filter((e) => e.type === 'in').reduce((a, e) => a + e.amount, 0));
  const cashOut = round2(entries.filter((e) => e.type === 'out').reduce((a, e) => a + e.amount, 0));
  const current = round2((s.openingBalance || 0) + cashIn - cashOut);

  const daily = useMemo(() => {
    const map: Record<string, { in: number; out: number }> = {};
    entries.forEach((e) => {
      map[e.date] = map[e.date] || { in: 0, out: 0 };
      map[e.date][e.type] += e.amount;
    });
    return Object.entries(map).map(([d, v]) => ({ date: d, ...v })).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const exportCSV = () => {
    downloadCSV('cashbook.csv', [
      ['Date', 'Description', 'Cash In', 'Cash Out'],
      ...entries.map((e) => [e.date, e.desc, e.type === 'in' ? e.amount : '', e.type === 'out' ? e.amount : '']),
    ]);
  };

  return (
    <div>
      <SectionTitle
        title="ক্যাশবুক / Cashbook"
        subtitle="দৈনিক cash হিসাব ও closing"
        right={<Button variant="outline" onClick={exportCSV}><Download size={16} /> Export</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
        <StatCard label="Opening balance" value={fmtMoney(s.openingBalance, s.settings.currency)} icon={Wallet} tone="slate" />
        <StatCard label="Cash in" value={fmtMoney(cashIn, s.settings.currency)} icon={ArrowDownLeft} tone="green" />
        <StatCard label="Cash out" value={fmtMoney(cashOut, s.settings.currency)} icon={ArrowUpRight} tone="red" />
        <StatCard label="Current balance" value={fmtMoney(current, s.settings.currency)} icon={Wallet} tone={current >= 0 ? 'indigo' : 'red'} />
      </div>

      <Card className="p-5 mb-5">
        <Field label="Opening balance সেট করুন">
          <div className="flex gap-2 max-w-xs">
            <Input type="number" value={String(s.openingBalance)} onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)} />
          </div>
        </Field>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="px-4 pt-4"><h3 className="font-bold text-slate-900">Cash transaction history</h3></div>
          <div className="overflow-x-auto">
            <Table head={<><Th>তারিখ</Th><Th>বিবরণ</Th><Th>Cash in</Th><Th>Cash out</Th></>}>
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <Td>{fmtDate(e.date)}</Td>
                  <Td>{e.desc}</Td>
                  <Td className="text-emerald-600 font-semibold">{e.type === 'in' ? fmtMoney(e.amount, s.settings.currency) : ''}</Td>
                  <Td className="text-red-500 font-semibold">{e.type === 'out' ? fmtMoney(e.amount, s.settings.currency) : ''}</Td>
                </tr>
              ))}
              {entries.length === 0 && <tr><Td colSpan={4}>কোনো cash লেনদেন নেই</Td></tr>}
            </Table>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-3">দৈনিক cash হিসাব</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {daily.map((d) => (
              <div key={d.date} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-sm text-slate-600">{fmtDate(d.date)}</span>
                <div className="text-right text-xs">
                  <span className="text-emerald-600 font-bold">+{fmtMoney(d.in, s.settings.currency)}</span>{' '}
                  <span className="text-red-500 font-bold">-{fmtMoney(d.out, s.settings.currency)}</span>
                </div>
              </div>
            ))}
            {daily.length === 0 && <p className="text-sm text-slate-400">কোনো ডেটা নেই</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};
