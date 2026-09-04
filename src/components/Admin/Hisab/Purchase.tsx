/**
 * Purchase — new purchase, supplier, product, purchase price, cash/due, history.
 */
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TxnItem } from '../../../accounting/types';
import { fmtMoney, fmtDate, todayISO, round2 } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { useSubmitGuard } from '../../../lib/useSubmitGuard';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Purchase: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addPurchase, deletePurchase, updateProduct } = store;
  const [modal, setModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [method, setMethod] = useState('Cash');
  const [paid, setPaid] = useState('');
  const [rows, setRows] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([]);

  const suppliers = s.parties.filter((p) => p.type === 'supplier');
  const products = s.products;

  const items: TxnItem[] = rows
    .map((r) => {
      const p = products.find((x) => x.id === r.productId);
      if (!p) return null;
      const qty = parseFloat(r.quantity) || 0;
      const price = parseFloat(r.unitPrice) || p.purchasePrice;
      return { productId: p.id, productName: p.name, quantity: qty, unitPrice: price, total: round2(qty * price) };
    })
    .filter(Boolean) as TxnItem[];

  const subtotal = round2(items.reduce((a, i) => a + i.total, 0));
  const total = subtotal;
  const paidAmt = parseFloat(paid) || 0;
  const due = round2(total - paidAmt);

  const openNew = () => {
    setSupplierId(suppliers[0]?.id || '');
    setMethod('Cash'); setPaid('');
    setRows([{ productId: products[0]?.id || '', quantity: '1', unitPrice: products[0] ? String(products[0].purchasePrice) : '' }]);
    setModal(true);
  };

  const addRow = () => setRows([...rows, { productId: products[0]?.id || '', quantity: '1', unitPrice: '' }]);

  const purGuard = useSubmitGuard();

  const submit = purGuard.guard(() => {
    if (!supplierId || items.length === 0 || items.some((i) => i.quantity <= 0)) { toast.error('সরবরাহকারী ও পণ্য ঠিকমতো দিন'); return; }
    const sup = suppliers.find((c) => c.id === supplierId);
    const status = due <= 0 ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Due';
    const res = addPurchase({ supplierId, supplierName: sup?.name || '', date: todayISO(), items, subtotal, discount: 0, total, paid: paidAmt, due, paymentMethod: method, status: status as 'Paid' | 'Partial' | 'Due' });
    if (!res.ok) { toast.error(res.reason || 'ডুপ্লিকেট ক্রয় এন্ট্রি'); return; }
    items.forEach((i) => {
      const p = products.find((x) => x.id === i.productId);
      if (p) updateProduct(p.id, { stock: p.stock + i.quantity });
    });
    toast.success('কেনাকাটা সম্পন্ন হয়েছে');
    purGuard.resetKey();
    setModal(false);
  });

  const totalPurchases = s.purchases.reduce((a, x) => a + x.total, 0);

  return (
    <div>
      <SectionTitle
        title="কেনাকাটা / Purchase"
        subtitle={`${s.purchases.length} টি কেনাকাটা · মোট ${fmtMoney(totalPurchases, s.settings.currency)}`}
        right={<Button onClick={openNew}><Plus size={16} /> নতুন কেনাকাটা</Button>}
      />

      <Card>
        {s.purchases.length === 0 ? (
          <EmptyState title="কোনো কেনাকাটা নেই" action={<Button onClick={openNew}><Plus size={16} /> নতুন কেনাকাটা</Button>} />
        ) : (
          <Table head={<><Th>তারিখ</Th><Th>সরবরাহকারী</Th><Th>পণ্য</Th><Th>মোট</Th><Th>পরিশোধ</Th><Th>বাকি</Th><Th>Status</Th><Th className="text-right">Action</Th></>}>
            {s.purchases.map((x) => (
              <tr key={x.id} className="hover:bg-slate-50">
                <Td>{fmtDate(x.date)}</Td>
                <Td className="font-semibold">{x.supplierName}</Td>
                <Td className="max-w-[200px] truncate">{x.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}</Td>
                <Td>{fmtMoney(x.total, s.settings.currency)}</Td>
                <Td className="text-emerald-600">{fmtMoney(x.paid, s.settings.currency)}</Td>
                <Td><Badge tone={x.due > 0 ? 'red' : 'green'}>{fmtMoney(x.due, s.settings.currency)}</Badge></Td>
                <Td><Badge tone={x.status === 'Paid' ? 'green' : x.status === 'Partial' ? 'amber' : 'red'}>{x.status}</Badge></Td>
                <Td>
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Delete purchase?')) { deletePurchase(x.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="নতুন কেনাকাটা" width="max-w-3xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="সরবরাহকারী">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {suppliers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {suppliers.length === 0 && <option value="">কোনো সরবরাহকারী নেই</option>}
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
                      setRows(rows.map((x, j) => j === i ? { ...x, productId: e.target.value, unitPrice: p ? String(p.purchasePrice) : x.unitPrice } : x));
                    }}
                  >
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Input type="number" className="w-20" placeholder="Qty" value={r.quantity} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                  <Input type="number" className="w-28" placeholder="ক্রয় মূল্য" value={r.unitPrice} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))} />
                  <Button type="button" size="sm" variant="ghost" className="text-red-500" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="মোট"><Input value={fmtMoney(total, s.settings.currency)} disabled className="bg-slate-50" /></Field>
            <Field label="Cash / Paid"><Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></Field>
          </div>

          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">বাকি (Due)</span>
            <span className={`text-lg font-black ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmtMoney(due, s.settings.currency)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>বাতিল</Button>
            <Button type="submit" disabled={purGuard.submitting}>{purGuard.submitting ? 'সেভ হচ্ছে…' : 'কেনাকাটা সম্পন্ন করুন'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
