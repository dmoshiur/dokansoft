/**
 * Employees — list, add/edit, role/permission, salary, attendance, activity log.
 */
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, UserCog, History, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Employee } from '../../../accounting/types';
import { fmtMoney, fmtDate, fmtDateTime, todayISO } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Modal, Field, Input, Select, Table, Th, Td, EmptyState, Tabs } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

const ROLES = ['Manager', 'Salesman', 'Cashier', 'Accountant', 'Staff'];

export const Employees: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, addEmployee, updateEmployee, deleteEmployee, markAttendance } = store;
  const [tab, setTab] = useState('list');
  const [modal, setModal] = useState(false);
  const [target, setTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '', role: 'Salesman', phone: '', salary: '', joinDate: todayISO() });

  const openAdd = () => { setTarget(null); setForm({ name: '', role: 'Salesman', phone: '', salary: '', joinDate: todayISO() }); setModal(true); };
  const openEdit = (e: Employee) => { setTarget(e); setForm({ name: e.name, role: e.role, phone: e.phone || '', salary: String(e.salary), joinDate: e.joinDate }); setModal(true); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('নাম দিন'); return; }
    const payload = { name: form.name, role: form.role, phone: form.phone, salary: parseFloat(form.salary) || 0, joinDate: form.joinDate, status: 'Active' as const };
    if (target) { updateEmployee(target.id, payload); toast.success('আপডেট হয়েছে'); }
    else { addEmployee(payload); toast.success('কর্মচারী যোগ হয়েছে'); }
    setModal(false);
  };

  const today = todayISO();
  const attStatus = (e: Employee) => e.attendance.find((a) => a.date === today)?.status || null;

  return (
    <div>
      <SectionTitle
        title="কর্মচারী / Employees"
        subtitle={`${s.employees.length} জন কর্মচারী`}
        right={<Button onClick={openAdd}><Plus size={16} /> নতুন কর্মচারী</Button>}
      />

      <Tabs
        tabs={[
          { id: 'list', label: 'Employee list', icon: UserCog },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'activity', label: 'Activity / Audit', icon: History },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {tab === 'list' && (
          <Card>
            {s.employees.length === 0 ? (
              <EmptyState title="কোনো কর্মচারী নেই" />
            ) : (
              <Table head={<><Th>নাম</Th><Th>Role</Th><Th>মোবাইল</Th><Th>Salary</Th><Th>যোগদান</Th><Th>Status</Th><Th className="text-right">Action</Th></>}>
                {s.employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td className="font-semibold">{e.name}</Td>
                    <Td><Badge tone="blue">{e.role}</Badge></Td>
                    <Td>{e.phone || '—'}</Td>
                    <Td>{fmtMoney(e.salary, s.settings.currency)}</Td>
                    <Td>{fmtDate(e.joinDate)}</Td>
                    <Td><Badge tone={e.status === 'Active' ? 'green' : 'slate'}>{e.status}</Badge></Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil size={15} /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm(`Delete ${e.name}?`)) { deleteEmployee(e.id); toast.success('Deleted'); } }}><Trash2 size={15} /></Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        )}

        {tab === 'attendance' && (
          <Card>
            <p className="px-4 pt-4 text-sm text-slate-500">আজকের ({fmtDate(today)}) উপস্থিতি</p>
            <Table head={<><Th>নাম</Th><Th>Role</Th><Th>স্ট্যাটাস</Th><Th className="text-right">মার্ক করুন</Th></>}>
              {s.employees.map((e) => {
                const st = attStatus(e);
                return (
                  <tr key={e.id}>
                    <Td className="font-semibold">{e.name}</Td>
                    <Td>{e.role}</Td>
                    <Td>
                      {st ? <Badge tone={st === 'Present' ? 'green' : st === 'Absent' ? 'red' : 'amber'}>{st}</Badge> : <Badge>Unmarked</Badge>}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {(['Present', 'Absent', 'Leave'] as const).map((x) => (
                          <Button key={x} size="sm" variant={st === x ? 'primary' : 'outline'} onClick={() => { markAttendance(e.id, today, x); toast.success(`${e.name}: ${x}`); }}>{x}</Button>
                        ))}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {s.employees.length === 0 && <tr><Td colSpan={4}>কোনো কর্মচারী নেই</Td></tr>}
            </Table>
          </Card>
        )}

        {tab === 'activity' && (
          <Card>
            <p className="px-4 pt-4 text-sm text-slate-500">কে কোন হিসাব পরিবর্তন করেছে</p>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {s.activity.length === 0 && <EmptyState title="কোনো কার্যকলাপ নেই" />}
              {s.activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><History size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{a.action}</p>
                    <p className="text-xs text-slate-400">{fmtDateTime(a.timestamp)} · {a.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={target ? 'কর্মচারী এডিট' : 'নতুন কর্মচারী'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="নাম *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Role / Permission">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="মোবাইল"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Salary"><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
          </div>
          <Field label="যোগদানের তারিখ"><Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setModal(false)}>বাতিল</Button><Button type="submit">সংরক্ষণ</Button></div>
        </form>
      </Modal>
    </div>
  );
};
