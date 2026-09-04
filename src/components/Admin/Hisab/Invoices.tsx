/**
 * Invoices — list, detail, print / PDF / share.
 */
import React, { useMemo, useState } from 'react';
import { Search, Printer, Share2, FileDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fmtMoney, fmtDate, fmtDateTime, shareText } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Invoices: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s } = store;
  const [q, setQ] = useState('');
  const [view, setView] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  const filtered = useMemo(
    () => s.sales.filter((x) => (x.invoiceNo + x.customerName).toLowerCase().includes(q.toLowerCase())),
    [s.sales, q],
  );

  const sale = view ? s.sales.find((x) => x.id === view) : null;

  const doPrint = (id: string) => {
    setPrintId(id);
    setTimeout(() => { window.print(); setPrintId(null); }, 300);
  };

  const doPDF = (id: string) => {
    setPrintId(id);
    toast.info('ব্রাউজারের print ডায়ালগে "Save as PDF" নির্বাচন করুন');
    setTimeout(() => { window.print(); setPrintId(null); }, 300);
  };

  const doShare = (id: string) => {
    const x = s.sales.find((v) => v.id === id);
    if (!x) return;
    const text = `${s.profile.name}\nInvoice: ${x.invoiceNo}\nCustomer: ${x.customerName}\nDate: ${fmtDate(x.date)}\n` +
      x.items.map((i) => `${i.productName} x${i.quantity} = ৳${i.total.toLocaleString()}`).join('\n') +
      `\nSubtotal: ৳${x.subtotal.toLocaleString()}\nDiscount: ৳${x.discount.toLocaleString()}\nVAT/Tax: ৳${x.vat.toLocaleString()}\nTotal: ৳${x.total.toLocaleString()}\nPaid: ৳${x.paid.toLocaleString()}\nDue: ৳${x.due.toLocaleString()}`;
    shareText(`Invoice ${x.invoiceNo}`, text);
    toast.success('শেয়ার করা হয়েছে');
  };

  return (
    <div>
      <SectionTitle title="রসিদ / Invoices" subtitle={`${s.sales.length} টি ইনভয়েস`} />

      <Card className="p-3 mb-4">
        <div className="flex items-center gap-2 px-2">
          <Search size={17} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice নম্বর বা কাস্টমার দিয়ে খুঁজুন…" className="flex-1 bg-transparent border-none focus:outline-none text-sm" />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="কোনো ইনভয়েস নেই" subtitle="Sales থেকে নতুন ইনভয়েস তৈরি করুন।" />
        ) : (
          <Table head={<><Th>Invoice</Th><Th>তারিখ</Th><Th>কাস্টমার</Th><Th>মোট</Th><Th>Paid</Th><Th>Due</Th><Th>Status</Th><Th className="text-right">Action</Th></>}>
            {filtered.map((x) => (
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
                    <Button size="sm" variant="ghost" onClick={() => setView(x.id)}><Eye size={15} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => doPrint(x.id)} title="Print"><Printer size={15} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => doPDF(x.id)} title="PDF"><FileDown size={15} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => doShare(x.id)} title="Share"><Share2 size={15} /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!sale} onClose={() => setView(null)} title={sale ? `Invoice ${sale.invoiceNo}` : ''} width="max-w-xl">
        {sale && (
          <div>
            <div className="text-center mb-4">
              <h3 className="text-lg font-black">{s.profile.name}</h3>
              <p className="text-xs text-slate-500">{s.profile.address} · {s.profile.phone}</p>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mb-3 border-b pb-2">
              <span>Customer: <b className="text-slate-700">{sale.customerName}</b></span>
              <span>{fmtDateTime(sale.date)}</span>
            </div>
            <table className="w-full text-sm mb-3">
              <thead><tr className="border-b text-xs text-slate-400"><th className="text-left py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {sale.items.map((i, idx) => (
                  <tr key={idx} className="border-b border-slate-100"><td className="py-2">{i.productName}</td><td className="text-right">{i.quantity}</td><td className="text-right">{i.unitPrice}</td><td className="text-right">{i.total}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm space-y-1 ml-auto max-w-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(sale.subtotal, s.settings.currency)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{fmtMoney(sale.discount, s.settings.currency)}</span></div>
              <div className="flex justify-between"><span>VAT/Tax</span><span>{fmtMoney(sale.vat, s.settings.currency)}</span></div>
              <div className="flex justify-between font-black text-base border-t pt-1"><span>Total</span><span>{fmtMoney(sale.total, s.settings.currency)}</span></div>
              <div className="flex justify-between"><span>Paid</span><span className="text-emerald-600">{fmtMoney(sale.paid, s.settings.currency)}</span></div>
              <div className="flex justify-between"><span>Due</span><span className="text-red-600">{fmtMoney(sale.due, s.settings.currency)}</span></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => doPrint(sale.id)}><Printer size={15} /> Print</Button>
              <Button size="sm" variant="outline" onClick={() => doPDF(sale.id)}><FileDown size={15} /> PDF</Button>
              <Button size="sm" variant="outline" onClick={() => doShare(sale.id)}><Share2 size={15} /> Share</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print block */}
      {printId && (() => {
        const x = s.sales.find((v) => v.id === printId);
        if (!x) return null;
        return (
          <div className="hidden print:block fixed inset-0 bg-white p-8">
            <div className="max-w-md mx-auto text-sm">
              <div className="text-center mb-4">
                <h1 className="text-xl font-black">{s.profile.name}</h1>
                <p className="text-xs text-slate-500">{s.profile.address}</p>
                <p className="text-xs text-slate-500">{s.profile.phone}</p>
              </div>
              <div className="border-t border-b border-dashed py-2 mb-3 flex justify-between text-xs">
                <span>Invoice: {x.invoiceNo}</span>
                <span>{fmtDateTime(x.date)}</span>
              </div>
              <p className="text-sm font-semibold mb-1">Customer: {x.customerName}</p>
              <table className="w-full text-xs mb-3">
                <thead><tr className="border-b"><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {x.items.map((i, idx) => (
                    <tr key={idx} className="border-b border-slate-100"><td className="py-1">{i.productName}</td><td className="text-right">{i.quantity}</td><td className="text-right">{i.unitPrice}</td><td className="text-right">{i.total}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(x.subtotal, s.settings.currency)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{fmtMoney(x.discount, s.settings.currency)}</span></div>
                <div className="flex justify-between"><span>VAT/Tax</span><span>{fmtMoney(x.vat, s.settings.currency)}</span></div>
                <div className="flex justify-between font-black text-base border-t pt-1"><span>Total</span><span>{fmtMoney(x.total, s.settings.currency)}</span></div>
                <div className="flex justify-between"><span>Paid</span><span>{fmtMoney(x.paid, s.settings.currency)}</span></div>
                <div className="flex justify-between font-bold"><span>Due</span><span>{fmtMoney(x.due, s.settings.currency)}</span></div>
              </div>
              <p className="text-center text-xs text-slate-400 mt-4">{s.settings.invoiceFooter || 'ধন্যবাদ!'}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
