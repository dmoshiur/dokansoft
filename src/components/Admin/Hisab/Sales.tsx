/**
 * Sales — POS-style new sale, product selection, discount, cash/due, invoice.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { TxnItem } from '../../../accounting/types';
import { fmtMoney, fmtDate, fmtDateTime, todayISO, round2, shareText } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Sales: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addSale, deleteSale, updateProduct } = store;
  const [modal, setModal] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [method, setMethod] = useState('Cash');
  const [discount, setDiscount] = useState('0');
  const [vat, setVat] = useState('0');
  const [paid, setPaid] = useState('');
  const [rows, setRows] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([]);

  const customers = s.parties.filter((p) => p.type === 'customer');
  const products = s.products;

  const items: TxnItem[] = rows
    .map((r) => {
      const p = products.find((x) => x.id === r.productId);
      if (!p) return null;
      const qty = parseFloat(r.quantity) || 0;
      const price = parseFloat(r.unitPrice) || p.salePrice;
      return { productId: p.id, productName: p.name, quantity: qty, unitPrice: price, total: round2(qty * price) };
    })
    .filter(Boolean) as TxnItem[];

  const subtotal = round2(items.reduce((a, i) => a + i.total, 0));
  const disc = parseFloat(discount) || 0;
  const vatAmt = round2(((subtotal - disc) * (parseFloat(vat) || 0)) / 100);
  const total = round2(subtotal - disc + vatAmt);
  const paidAmt = parseFloat(paid) || 0;
  const due = round2(total - paidAmt);

  const openNew = () => {
    setCustomerId(customers[0]?.id || '');
    setMethod('Cash'); setDiscount('0'); setVat('0'); setPaid('');
    setRows([{ productId: products[0]?.id || '', quantity: '1', unitPrice: products[0] ? String(products[0].salePrice) : '' }]);
    setModal(true);
  };

  const addRow = () => setRows([...rows, { productId: products[0]?.id || '', quantity: '1', unitPrice: '' }]);

  const nextInvoiceNo = () => {
    const nums = s.sales.map((x) => parseInt(x.invoiceNo.replace(/\D/g, ''), 10) || 0);
    const max = nums.length ? Math.max(...nums) : 1000;
    return `${s.settings.invoicePrefix || 'INV'}-${max + 1}`;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0 || items.some((i) => i.quantity <= 0)) { toast.error('কাস্টমার ও পণ্য ঠিকমতো দিন'); return; }
    const cust = customers.find((c) => c.id === customerId);
    const status = due <= 0 ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Due';
    const sale = {
      invoiceNo: nextInvoiceNo(), customerId, customerName: cust?.name || '', date: todayISO(),
      items, subtotal, discount: disc, vat: vatAmt, total, paid: paidAmt, due, paymentMethod: method, status: status as 'Paid' | 'Partial' | 'Due',
    };
    addSale(sale);
    // reduce stock
    items.forEach((i) => {
      const p = products.find((x) => x.id === i.productId);
      if (p) updateProduct(p.id, { stock: Math.max(0, p.stock - i.quantity) });
    });
    toast.success(`বিক্রি সম্পন্ন — ${sale.invoiceNo}`);
    setModal(false);
  };

  const printInvoice = (id: string) => {
    setView(id);
    setTimeout(() => window.print(), 300);
  };
  const shareInvoice = (id: string) => {
    const sale = s.sales.find((x) => x.id === id);
    if (!sale) return;
    const text = `${s.profile.name}\nInvoice: ${sale.invoiceNo}\nCustomer: ${sale.customerName}\nDate: ${fmtDate(sale.date)}\n` +
      sale.items.map((i) => `${i.productName} x${i.quantity} = ৳${i.total.toLocaleString()}`).join('\n') +
      `\nTotal: ৳${sale.total.toLocaleString()}\nPaid: ৳${sale.paid.toLocaleString()}\nDue: ৳${sale.due.toLocaleString()}`;
    shareText(`Invoice ${sale.invoiceNo}`, text);
    toast.success('ইনভয়েস শেয়ার করা হয়েছে');
  };

  const totalSales = s.sales.reduce((a, x) => a + x.total, 0);

  return (
    <div>
      <SectionTitle
        title="বিক্রি / Sales"
        subtitle={`${s.sales.length} টি বিক্রি · মোট ${fmtMoney(totalSales, s.settings.currency)}`}
        right={<Button onClick={openNew}><Plus size={16} /> নতুন বিক্রি</Button>}
      />

      <Card>
        {s.sales.length === 0 ? (
          <EmptyState title="কোনো বিক্রি নেই" action={<Button onClick={openNew}><Plus size={16} /> নতুন বিক্রি</Button>} />
        ) : (
          <Table head={<><Th>Invoice</Th><Th>তারিখ</Th><Th>কাস্টমার</Th><Th>মোট</Th><Th>পরিশোধ</Th><Th>বাকি</Th><Th>Status</Th><Th className="text-right">Action</Th></>}>
            {s.sales.map((x) => (
              <tr key={x.id} className="hover:bg-slate-50">
                <Td className="font-semibold">{x.invoiceNo}</Td>
                <Td>{fmtDate(x.date)}</Td>
                <Td>{x.customerName}</Td>
                <Td>{fmtMoney(x.total, s.settings.currency)}</Td>
                <Td className="text-emerald-600">{fmtMoney(x.paid, s.settings.currency)}</Td>
                <Td><Badge tone={x.due > 0 ? 'red' : 'green'}>{fmtMoney(x.due, s.settings.currency)}</Badge></Td>
                <Td><Badge tone={x.status === 'Paid' ? 'green' : x.status === 'Partial' ? 'amber' : 'red'}>{x.status}</Badge></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => printInvoice(x.id)}><Printer size={15} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => shareInvoice(x.id)}><Share2 size={15} /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Delete invoice?')) { deleteSale(x.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* New sale modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="নতুন বিক্রি" width="max-w-3xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="কাস্টমার">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {customers.length === 0 && <option value="">কোনো কাস্টমার নেই</option>}
              </Select>
            </Field>
            <Field label="Payment method">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {['Cash', 'Bank', 'bKash', 'Nagad', 'Rocket'].map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">পণ্য</span>
              <Button type="button" size="sm" variant="outline" onClick={addRow}><Plus size={14} /> পণ্য যোগ</Button>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
                    value={r.productId}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      setRows(rows.map((x, j) => j === i ? { ...x, productId: e.target.value, unitPrice: p ? String(p.salePrice) : x.unitPrice } : x));
                    }}
                  >
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
                  </select>
                  <Input type="number" className="w-20" placeholder="Qty" value={r.quantity} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                  <Input type="number" className="w-28" placeholder="Price" value={r.unitPrice} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))} />
                  <Button type="button" size="sm" variant="ghost" className="text-red-500" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Discount (৳)"><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
            <Field label="VAT/Tax (%)"><Input type="number" value={vat} onChange={(e) => setVat(e.target.value)} /></Field>
            <Field label="মোট"><Input value={fmtMoney(total, s.settings.currency)} disabled className="bg-slate-50" /></Field>
            <Field label="Cash / Paid"><Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></Field>
          </div>

          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">বাকি (Due)</span>
            <span className={`text-lg font-black ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmtMoney(due, s.settings.currency)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>বাতিল</Button>
            <Button type="submit">বিক্রি সম্পন্ন করুন</Button>
          </div>
        </form>
      </Modal>

      {/* Print view */}
      {view && (() => {
        const sale = s.sales.find((x) => x.id === view);
        if (!sale) return null;
        return (
          <div className="hidden print:block fixed inset-0 bg-white p-8">
            <div className="max-w-md mx-auto text-sm">
              <div className="text-center mb-4">
                <h1 className="text-xl font-black">{s.profile.name}</h1>
                <p className="text-xs text-slate-500">{s.profile.address}</p>
                <p className="text-xs text-slate-500">{s.profile.phone}</p>
              </div>
              <div className="border-t border-b border-dashed py-2 mb-3 flex justify-between text-xs">
                <span>Invoice: {sale.invoiceNo}</span>
                <span>{fmtDateTime(sale.date)}</span>
              </div>
              <p className="text-sm font-semibold mb-1">Customer: {sale.customerName}</p>
              <table className="w-full text-xs mb-3">
                <thead><tr className="border-b"><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {sale.items.map((i, idx) => (
                    <tr key={idx} className="border-b border-slate-100"><td>{i.productName}</td><td className="text-right">{i.quantity}</td><td className="text-right">{i.unitPrice}</td><td className="text-right">{i.total}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(sale.subtotal, s.settings.currency)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{fmtMoney(sale.discount, s.settings.currency)}</span></div>
                <div className="flex justify-between"><span>VAT</span><span>{fmtMoney(sale.vat, s.settings.currency)}</span></div>
                <div className="flex justify-between font-black text-base border-t pt-1"><span>Total</span><span>{fmtMoney(sale.total, s.settings.currency)}</span></div>
                <div className="flex justify-between"><span>Paid</span><span>{fmtMoney(sale.paid, s.settings.currency)}</span></div>
                <div className="flex justify-between font-bold"><span>Due</span><span>{fmtMoney(sale.due, s.settings.currency)}</span></div>
              </div>
              <p className="text-center text-xs text-slate-400 mt-4">{s.settings.invoiceFooter || 'ধন্যবাদ!'}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
