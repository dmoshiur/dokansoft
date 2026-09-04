/**
 * Products & Categories — list, add/edit, stock adjustment, barcode, image,
 * category-wise sales & stock.
 */
import React, { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Barcode, Boxes, Tags, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Category, Product } from '../../../accounting/types';
import { fmtMoney } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, TextArea, Table, Th, Td, EmptyState, Tabs } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

const emptyProduct = { name: '', categoryId: '', barcode: '', unit: 'pcs', purchasePrice: '', salePrice: '', stock: '0', minStock: '5', image: '' };

export const Products: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addProduct, updateProduct, deleteProduct, adjustStock, addCategory, updateCategory, deleteCategory } = store;
  const [tab, setTab] = useState('products');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'stock' | 'cat' | 'catedit' | null>(null);
  const [target, setTarget] = useState<Product | null>(null);
  const [catTarget, setCatTarget] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [stockDelta, setStockDelta] = useState('');
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const categories = s.categories;
  const filtered = useMemo(
    () => s.products.filter((p) => (p.name + (p.barcode || '')).toLowerCase().includes(q.toLowerCase())),
    [s.products, q],
  );

  const catName = (id: string) => categories.find((c) => c.id === id)?.name || '—';

  const submitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.categoryId) { toast.error('নাম ও ক্যাটাগরি দিন'); return; }
    const payload = {
      name: form.name, categoryId: form.categoryId, barcode: form.barcode, unit: form.unit || 'pcs',
      purchasePrice: parseFloat(form.purchasePrice) || 0, salePrice: parseFloat(form.salePrice) || 0,
      stock: parseFloat(form.stock) || 0, minStock: parseFloat(form.minStock) || 0, image: form.image,
    };
    if (modal === 'add') { addProduct(payload); toast.success('পণ্য যোগ হয়েছে'); }
    else if (modal === 'edit' && target) { updateProduct(target.id, payload); toast.success('পণ্য আপডেট হয়েছে'); }
    setModal(null);
  };

  const submitStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const d = parseInt(stockDelta, 10);
    if (!d) { toast.error('পরিমাণ দিন'); return; }
    adjustStock(target.id, d);
    toast.success('স্টক আপডেট হয়েছে');
    setModal(null);
  };

  const submitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) { toast.error('ক্যাটাগরির নাম দিন'); return; }
    if (modal === 'cat') { addCategory({ name: catForm.name, description: catForm.description }); toast.success('ক্যাটাগরি যোগ হয়েছে'); }
    else if (modal === 'catedit' && catTarget) { updateCategory(catTarget.id, { name: catForm.name, description: catForm.description }); toast.success('ক্যাটাগরি আপডেট হয়েছে'); }
    setModal(null);
  };

  return (
    <div>
      <SectionTitle
        title="পণ্য / Products & Categories"
        subtitle={`${s.products.length} টি পণ্য · ${categories.length} টি ক্যাটাগরি`}
        right={
          <>
            <Button variant="outline" onClick={() => { setCatForm({ name: '', description: '' }); setModal('cat'); }}><Tags size={16} /> নতুন ক্যাটাগরি</Button>
            <Button onClick={() => { setForm({ ...emptyProduct, categoryId: categories[0]?.id || '' }); setModal('add'); }}><Plus size={16} /> নতুন পণ্য</Button>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: 'products', label: 'Product list', icon: Boxes },
          { id: 'categories', label: 'Category', icon: Tags },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4 space-y-4">
        {tab === 'products' && (
          <>
            <Card className="p-3">
              <div className="flex items-center gap-2 px-2">
                <Search size={17} className="text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম বা barcode দিয়ে খুঁজুন…" className="flex-1 bg-transparent border-none focus:outline-none text-sm" />
              </div>
            </Card>
            <Card>
              {filtered.length === 0 ? (
                <EmptyState title="কোনো পণ্য নেই" />
              ) : (
                <Table head={<><Th>পণ্য</Th><Th>Category</Th><Th>Barcode</Th><Th>ক্রয় মূল্য</Th><Th>বিক্রয় মূল্য</Th><Th>Stock</Th><Th className="text-right">Action</Th></>}>
                  {filtered.map((p) => {
                    const low = p.stock <= p.minStock;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <Td>
                          <div className="flex items-center gap-2">
                            {p.image ? <img src={p.image} className="w-8 h-8 rounded-lg object-cover" alt="" /> : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><Boxes size={15} /></div>}
                            <span className="font-semibold">{p.name}</span>
                          </div>
                        </Td>
                        <Td>{catName(p.categoryId)}</Td>
                        <Td><span className="flex items-center gap-1 text-slate-500 text-xs"><Barcode size={13} />{p.barcode || '—'}</span></Td>
                        <Td>{fmtMoney(p.purchasePrice, s.settings.currency)}</Td>
                        <Td className="font-semibold">{fmtMoney(p.salePrice, s.settings.currency)}</Td>
                        <Td><Badge tone={p.stock <= 0 ? 'red' : low ? 'amber' : 'green'}>{p.stock} {p.unit}</Badge></Td>
                        <Td>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setTarget(p); setStockDelta(''); setModal('stock'); }} title="Stock adjustment"><ArrowUpDown size={15} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { setTarget(p); setForm({ name: p.name, categoryId: p.categoryId, barcode: p.barcode || '', unit: p.unit, purchasePrice: String(p.purchasePrice), salePrice: String(p.salePrice), stock: String(p.stock), minStock: String(p.minStock), image: p.image || '' }); setModal('edit'); }}><Pencil size={15} /></Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm(`Delete ${p.name}?`)) { deleteProduct(p.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Card>
          </>
        )}

        {tab === 'categories' && (
          <Card>
            <Table head={<><Th>নাম</Th><Th>বিবরণ</Th><Th>পণ্য সংখ্যা</Th><Th>মোট বিক্রি</Th><Th>মোট স্টক</Th><Th className="text-right">Action</Th></>}>
              {categories.map((c) => {
                const prods = s.products.filter((p) => p.categoryId === c.id);
                const salesVal = s.sales.reduce((a, sale) => a + sale.items.filter((i) => prods.some((p) => p.id === i.productId)).reduce((x, i) => x + i.total, 0), 0);
                const stock = prods.reduce((a, p) => a + p.stock, 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td className="font-semibold">{c.name}</Td>
                    <Td className="text-slate-500">{c.description || '—'}</Td>
                    <Td>{prods.length}</Td>
                    <Td className="text-emerald-600">{fmtMoney(salesVal, s.settings.currency)}</Td>
                    <Td>{stock}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setCatTarget(c); setCatForm({ name: c.name, description: c.description || '' }); setModal('catedit'); }}><Pencil size={15} /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm(`Delete ${c.name}?`)) { deleteCategory(c.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {categories.length === 0 && <tr><Td colSpan={6}><EmptyState title="কোনো ক্যাটাগরি নেই" /></Td></tr>}
            </Table>
          </Card>
        )}
      </div>

      {/* Product add/edit modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'নতুন পণ্য' : 'পণ্য এডিট'} width="max-w-xl">
        <form onSubmit={submitProduct} className="space-y-4">
          <Field label="পণ্যের নাম *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category *">
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Barcode"><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ক্রয় মূল্য"><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></Field>
            <Field label="বিক্রয় মূল্য"><Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Stock"><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
            <Field label="Minimum stock"><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></Field>
            <Field label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          </div>
          <Field label="Product image URL"><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ</Button>
          </div>
        </form>
      </Modal>

      {/* Stock adjustment */}
      <Modal open={modal === 'stock' && !!target} onClose={() => setModal(null)} title={target ? `স্টক সমন্বয় — ${target.name}` : ''}>
        <form onSubmit={submitStock} className="space-y-4">
          <p className="text-sm text-slate-500">বর্তমান স্টক: <b>{target?.stock}</b> {target?.unit}</p>
          <Field label="পরিবর্তন (+ যোগ / - বাদ)"><Input type="number" value={stockDelta} onChange={(e) => setStockDelta(e.target.value)} placeholder="e.g. 10 or -5" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ</Button>
          </div>
        </form>
      </Modal>

      {/* Category add/edit modal */}
      <Modal open={modal === 'cat' || modal === 'catedit'} onClose={() => setModal(null)} title={modal === 'cat' ? 'নতুন ক্যাটাগরি' : 'ক্যাটাগরি এডিট'}>
        <form onSubmit={submitCategory} className="space-y-4">
          <Field label="নাম *"><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></Field>
          <Field label="বিবরণ"><TextArea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
