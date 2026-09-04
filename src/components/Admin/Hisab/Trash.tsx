/**
 * Trash — deleted data, restore, permanently delete.
 */
import React from 'react';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDateTime } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Badge, Table, Th, Td, EmptyState } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Trash: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, restoreTrash, purgeTrash, emptyTrash } = store;

  return (
    <div>
      <SectionTitle
        title="ট্র্যাশ / Deleted Data"
        subtitle={`${s.trash.length} টি ডিলিট করা আইটেম`}
        right={s.trash.length > 0 ? <Button variant="danger" onClick={() => { if (confirm('ট্র্যাশ খালি করবেন?')) { emptyTrash(); toast.success('ট্র্যাশ খালি হয়েছে'); } }}><Trash2 size={16} /> ট্র্যাশ খালি করুন</Button> : undefined}
      />

      <Card>
        {s.trash.length === 0 ? (
          <EmptyState title="ট্র্যাশ খালি" subtitle="ডিলিট করা ডেটা এখানে আসবে।" />
        ) : (
          <Table head={<><Th>ধরন</Th><Th>নাম</Th><Th>ডিলিট হয়েছে</Th><Th className="text-right">Action</Th></>}>
            {s.trash.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td><Badge>{t.entityType}</Badge></Td>
                <Td className="font-semibold">{t.entityName}</Td>
                <Td className="text-slate-500">{fmtDateTime(t.deletedAt)}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => { restoreTrash(t.id); toast.success('পুনরুদ্ধার হয়েছে'); }}><RotateCcw size={15} /> Restore</Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('স্থায়ীভাবে ডিলিট করবেন?')) { purgeTrash(t.id); toast.success('Deleted permanently'); } }}><X size={15} /> Delete</Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};
