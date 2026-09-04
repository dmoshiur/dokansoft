/**
 * Users & Permissions — roles, view/change permissions, delete/report permissions.
 */
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SystemUser, UserRole, PERMISSIONS, Permission, rolePresets } from '../../../accounting/types';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

const ROLES: UserRole[] = ['Admin', 'Manager', 'Cashier', 'Salesman', 'Staff'];

const PERM_GROUPS: { label: string; items: Permission[] }[] = [
  { label: 'View', items: ['dashboard.view', 'customers.view', 'suppliers.view', 'products.view', 'sales.view', 'purchases.view', 'income.view', 'expense.view', 'payments.view', 'cashbook.view', 'bank.view', 'reports.view', 'employees.view'] },
  { label: 'Manage', items: ['customers.manage', 'suppliers.manage', 'products.manage', 'sales.manage', 'purchases.manage', 'income.manage', 'expense.manage', 'payments.manage', 'employees.manage'] },
  { label: 'Advanced', items: ['users.manage', 'settings.manage', 'backup.manage', 'trash.delete', 'reports.delete'] },
];

export const Users: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addUser, updateUser, deleteUser } = store;
  const [modal, setModal] = useState(false);
  const [target, setTarget] = useState<SystemUser | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'Staff' as UserRole, email: '', phone: '' });
  const [perms, setPerms] = useState<Permission[]>([]);

  const openAdd = () => {
    setTarget(null);
    setForm({ name: '', username: '', password: '', role: 'Staff', email: '', phone: '' });
    setPerms([...rolePresets.Staff]);
    setModal(true);
  };
  const openEdit = (u: SystemUser) => {
    setTarget(u);
    setForm({ name: u.name, username: u.username, password: '', role: u.role, email: u.email || '', phone: u.phone || '' });
    setPerms([...u.permissions]);
    setModal(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) { toast.error('নাম ও username দিন'); return; }
    const payload = { name: form.name, username: form.username, role: form.role, email: form.email, phone: form.phone, permissions: perms, status: 'Active' as const };
    if (target) {
      updateUser(target.id, { ...payload, ...(form.password ? { password: form.password } : {}) });
      toast.success('আপডেট হয়েছে');
    } else {
      addUser({ ...payload, ...(form.password ? { password: form.password } : {}) });
      toast.success('ইউজার যোগ হয়েছে');
    }
    setModal(false);
  };

  const togglePerm = (p: Permission) => setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <div>
      <SectionTitle
        title="ইউজার ও পারমিশন / Users & Permissions"
        subtitle="কে কী দেখতে ও পরিবর্তন করতে পারবে"
        right={<Button onClick={openAdd}><Plus size={16} /> নতুন ইউজার</Button>}
      />

      <Card>
        {s.users.length === 0 ? (
          <EmptyState title="কোনো ইউজার নেই" />
        ) : (
          <Table head={<><Th>নাম</Th><Th>Username</Th><Th>Role</Th><Th>Permissions</Th><Th>Status</Th><Th className="text-right">Action</Th></>}>
            {s.users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <Td className="font-semibold">{u.name}</Td>
                <Td>{u.username}</Td>
                <Td><Badge tone={u.role === 'Admin' ? 'red' : u.role === 'Manager' ? 'indigo' : u.role === 'Cashier' ? 'blue' : 'amber'}>{u.role}</Badge></Td>
                <Td className="text-slate-500">{u.permissions.length} টি পারমিশন</Td>
                <Td><Badge tone={u.status === 'Active' ? 'green' : 'slate'}>{u.status}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil size={15} /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm(`Delete ${u.name}?`)) { deleteUser(u.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={target ? 'ইউজার এডিট' : 'নতুন ইউজার'} width="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="নাম *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Username *"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Role">
              <Select value={form.role} onChange={(e) => { const r = e.target.value as UserRole; setForm({ ...form, role: r }); setPerms([...rolePresets[r]]); }}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="পাসওয়ার্ড"><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={target ? '(খালি রাখলে অপরিবর্তিত)' : ''} /></Field>
            <Field label="মোবাইল"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="ইমেইল"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>

          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1"><ShieldCheck size={14} /> পারমিশন</span>
            <div className="space-y-3 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto">
              {PERM_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1">{g.label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {g.items.map((p) => (
                      <label key={p} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg cursor-pointer ${perms.includes(p) ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="accent-emerald-600" />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setModal(false)}>বাতিল</Button><Button type="submit">সংরক্ষণ</Button></div>
        </form>
      </Modal>
    </div>
  );
};
