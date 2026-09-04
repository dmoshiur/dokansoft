/**
 * Reports & Profit/Loss — daily/weekly/monthly, sales, purchase, income/expense,
 * profit-loss, due reports, stock report, cash flow.
 */
import React, { useMemo, useState } from 'react';
import { Download, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { fmtMoney, fmtDate, todayISO, round2, downloadCSV } from '../../../accounting/format';
import { customerBalance, supplierBalance } from '../../../accounting/store';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Table, Th, Td, Tabs, Field, Input, StatCard } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

const REPORT_TYPES = [
  { id: 'summary', label: 'সারসংক্ষেপ' },
  { id: 'sales', label: 'বিক্রি' },
  { id: 'purchase', label: 'কেনাকাটা' },
  { id: 'income-expense', label: 'আয়-ব্যায়' },
  { id: 'profit-loss', label: 'লাভ-ক্ষতি' },
  { id: 'customer-due', label: 'Customer due' },
  { id: 'supplier-due', label: 'Supplier due' },
  { id: 'stock', label: 'Stock' },
  { id: 'cash-flow', label: 'Cash flow' },
];

export const Reports: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s } = store;
  const [type, setType] = useState('summary');
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const range = useMemo(() => {
    const today = new Date();
    let f: string, t: string;
    if (period === 'today') { f = t = todayISO(); }
    else if (period === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); f = d.toISOString().slice(0, 10); t = todayISO(); }
    else if (period === 'month') { f = todayISO().slice(0, 8) + '01'; t = todayISO(); }
    else if (period === 'all') { f = ''; t = ''; }
    else { f = from || ''; t = to || '9999-12-31'; }
    return { from: f, to: t };
  }, [period, from, to]);

  const inRange = (date: string) => {
    if (!range.from && !range.to) return true;
    if (range.from && date < range.from) return false;
    if (range.to && date > range.to) return false;
    return true;
  };

  const sales = s.sales.filter((x) => inRange(x.date));
  const purchases = s.purchases.filter((x) => inRange(x.date));
  const incomes = s.moneyTxns.filter((x) => x.type === 'income' && inRange(x.date));
  const expenses = s.moneyTxns.filter((x) => x.type === 'expense' && inRange(x.date));

  const totalSales = sales.reduce((a, x) => a + x.total, 0);
  const totalPurchase = purchases.reduce((a, x) => a + x.total, 0);
  const totalIncome = incomes.reduce((a, x) => a + x.amount, 0);
  const totalExpense = expenses.reduce((a, x) => a + x.amount, 0);
  const grossProfit = round2(totalSales - totalPurchase);
  const netProfit = round2(totalSales + totalIncome - totalPurchase - totalExpense);

  const exportCSV = () => {
    const rows: (string | number)[][] = [['Report', type], ['Period', fmtDate(range.from), 'to', fmtDate(range.to)]];
    if (type === 'summary' || type === 'profit-loss') {
      rows.push(['Total Sales', totalSales], ['Total Purchase', totalPurchase], ['Total Income', totalIncome], ['Total Expense', totalExpense], ['Gross Profit', grossProfit], ['Net Profit', netProfit]);
    } else if (type === 'sales') {
      rows.push(['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Due']);
      sales.forEach((x) => rows.push([x.invoiceNo, x.date, x.customerName, x.total, x.paid, x.due]));
    } else if (type === 'purchase') {
      rows.push(['Date', 'Supplier', 'Total', 'Paid', 'Due']);
      purchases.forEach((x) => rows.push([x.date, x.supplierName, x.total, x.paid, x.due]));
    } else if (type === 'customer-due') {
      rows.push(['Customer', 'Due']);
      s.parties.filter((p) => p.type === 'customer').forEach((p) => rows.push([p.name, customerBalance(s, p.id)]));
    } else if (type === 'supplier-due') {
      rows.push(['Supplier', 'Due']);
      s.parties.filter((p) => p.type === 'supplier').forEach((p) => rows.push([p.name, supplierBalance(s, p.id)]));
    } else if (type === 'stock') {
      rows.push(['Product', 'Stock', 'Min', 'Purchase Price', 'Sale Price']);
      s.products.forEach((p) => rows.push([p.name, p.stock, p.minStock, p.purchasePrice, p.salePrice]));
    }
    downloadCSV(`report-${type}.csv`, rows);
    toast.success('রিপোর্ট ডাউনলোড হয়েছে');
  };

  return (
    <div>
      <SectionTitle
        title="রিপোর্ট / Reports"
        subtitle="দৈনিক, সাপ্তাহিক ও মাসিক হিসাব"
        right={<Button variant="outline" onClick={exportCSV}><Download size={16} /> Export</Button>}
      />

      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {[['today', 'আজ'], ['week', 'সপ্তাহ'], ['month', 'মাস'], ['all', 'সব'], ['custom', 'কাস্টম']].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${period === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{l}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        )}
      </Card>

      <Tabs tabs={REPORT_TYPES} active={type} onChange={setType} />
      <div className="mt-4 space-y-4">
        {(type === 'summary' || type === 'profit-loss') && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="মোট বিক্রি" value={fmtMoney(totalSales, s.settings.currency)} icon={TrendingUp} tone="green" />
              <StatCard label="মোট ক্রয়" value={fmtMoney(totalPurchase, s.settings.currency)} icon={TrendingDown} tone="red" />
              <StatCard label="মোট খরচ" value={fmtMoney(totalExpense, s.settings.currency)} icon={TrendingDown} tone="amber" />
              {type === 'profit-loss' && (
                <>
                  <StatCard label="মোট আয়" value={fmtMoney(totalIncome, s.settings.currency)} icon={TrendingUp} tone="blue" />
                  <StatCard label="Gross profit" value={fmtMoney(grossProfit, s.settings.currency)} icon={Scale} tone={grossProfit >= 0 ? 'indigo' : 'red'} />
                  <StatCard label="Net profit / Loss" value={fmtMoney(netProfit, s.settings.currency)} icon={Scale} tone={netProfit >= 0 ? 'green' : 'red'} />
                </>
              )}
            </div>
            {type === 'profit-loss' && (
              <Card className="p-5">
                <h3 className="font-bold text-slate-900 mb-3">Profit & Loss</h3>
                <div className="max-w-md space-y-2 text-sm">
                  <div className="flex justify-between"><span>মোট বিক্রি (Revenue)</span><span className="font-semibold">{fmtMoney(totalSales, s.settings.currency)}</span></div>
                  <div className="flex justify-between"><span>মোট ক্রয় (COGS)</span><span className="font-semibold">-{fmtMoney(totalPurchase, s.settings.currency)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-bold">Gross profit</span><span className="font-bold">{fmtMoney(grossProfit, s.settings.currency)}</span></div>
                  <div className="flex justify-between"><span>অন্যান্য আয়</span><span className="font-semibold">+{fmtMoney(totalIncome, s.settings.currency)}</span></div>
                  <div className="flex justify-between"><span>মোট খরচ</span><span className="font-semibold">-{fmtMoney(totalExpense, s.settings.currency)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-bold">Net profit</span><span className={`font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMoney(netProfit, s.settings.currency)}</span></div>
                </div>
              </Card>
            )}
          </>
        )}

        {type === 'sales' && (
          <Card>
            <Table head={<><Th>Invoice</Th><Th>তারিখ</Th><Th>কাস্টমার</Th><Th>মোট</Th><Th>বাকি</Th></>}>
              {sales.map((x) => <tr key={x.id}><Td>{x.invoiceNo}</Td><Td>{fmtDate(x.date)}</Td><Td>{x.customerName}</Td><Td>{fmtMoney(x.total, s.settings.currency)}</Td><Td><Badge tone={x.due > 0 ? 'red' : 'green'}>{fmtMoney(x.due, s.settings.currency)}</Badge></Td></tr>)}
              {sales.length === 0 && <tr><Td colSpan={5}>কোনো বিক্রি নেই</Td></tr>}
            </Table>
          </Card>
        )}

        {type === 'purchase' && (
          <Card>
            <Table head={<><Th>তারিখ</Th><Th>সরবরাহকারী</Th><Th>মোট</Th><Th>বাকি</Th></>}>
              {purchases.map((x) => <tr key={x.id}><Td>{fmtDate(x.date)}</Td><Td>{x.supplierName}</Td><Td>{fmtMoney(x.total, s.settings.currency)}</Td><Td><Badge tone={x.due > 0 ? 'red' : 'green'}>{fmtMoney(x.due, s.settings.currency)}</Badge></Td></tr>)}
              {purchases.length === 0 && <tr><Td colSpan={4}>কোনো কেনাকাটা নেই</Td></tr>}
            </Table>
          </Card>
        )}

        {type === 'income-expense' && (
          <Card>
            <Table head={<><Th>তারিখ</Th><Th>ধরন</Th><Th>পরিমাণ</Th></>}>
              {[...incomes.map((x) => ({ d: x.date, c: x.category, a: x.amount, t: 'Income' })), ...expenses.map((x) => ({ d: x.date, c: x.category, a: x.amount, t: 'Expense' }))]
                .sort((a, b) => a.d.localeCompare(b.d))
                .map((x, i) => (
                  <tr key={i}><Td>{fmtDate(x.d)}</Td><Td>{x.c}</Td><Td className={x.t === 'Income' ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{x.t === 'Income' ? '+' : '-'}{fmtMoney(x.a, s.settings.currency)}</Td></tr>
                ))}
              {incomes.length + expenses.length === 0 && <tr><Td colSpan={3}>কোনো ডেটা নেই</Td></tr>}
            </Table>
          </Card>
        )}

        {type === 'customer-due' && (
          <Card>
            <Table head={<><Th>কাস্টমার</Th><Th>মোবাইল</Th><Th>বাকি</Th></>}>
              {s.parties.filter((p) => p.type === 'customer').map((p) => <tr key={p.id}><Td>{p.name}</Td><Td>{p.phone || '—'}</Td><Td><Badge tone={customerBalance(s, p.id) > 0 ? 'red' : 'green'}>{fmtMoney(customerBalance(s, p.id), s.settings.currency)}</Badge></Td></tr>)}
            </Table>
          </Card>
        )}

        {type === 'supplier-due' && (
          <Card>
            <Table head={<><Th>সরবরাহকারী</Th><Th>মোবাইল</Th><Th>দেনা</Th></>}>
              {s.parties.filter((p) => p.type === 'supplier').map((p) => <tr key={p.id}><Td>{p.name}</Td><Td>{p.phone || '—'}</Td><Td><Badge tone={supplierBalance(s, p.id) > 0 ? 'red' : 'green'}>{fmtMoney(supplierBalance(s, p.id), s.settings.currency)}</Badge></Td></tr>)}
            </Table>
          </Card>
        )}

        {type === 'stock' && (
          <Card>
            <Table head={<><Th>পণ্য</Th><Th>Stock</Th><Th>Min</Th><Th>Status</Th><Th>Stock value</Th></>}>
              {s.products.map((p) => (
                <tr key={p.id}>
                  <Td>{p.name}</Td><Td>{p.stock} {p.unit}</Td><Td>{p.minStock}</Td>
                  <Td><Badge tone={p.stock <= 0 ? 'red' : p.stock <= p.minStock ? 'amber' : 'green'}>{p.stock <= 0 ? 'Out of stock' : p.stock <= p.minStock ? 'Low' : 'OK'}</Badge></Td>
                  <Td>{fmtMoney(p.stock * p.purchasePrice, s.settings.currency)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        )}

        {type === 'cash-flow' && (
          <Card>
            <div className="grid grid-cols-3 gap-4 p-4">
              <StatCard label="Cash in" value={fmtMoney(totalSales + totalIncome, s.settings.currency)} icon={TrendingUp} tone="green" />
              <StatCard label="Cash out" value={fmtMoney(totalPurchase + totalExpense, s.settings.currency)} icon={TrendingDown} tone="red" />
              <StatCard label="Net cash flow" value={fmtMoney(totalSales + totalIncome - totalPurchase - totalExpense, s.settings.currency)} icon={Scale} tone="indigo" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
