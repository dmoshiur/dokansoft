/**
 * Backup & Restore — manual/auto backup, cloud, export, restore.
 */
import React, { useRef, useState } from 'react';
import { Download, Upload, Cloud, RefreshCw, Database, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDateTime, downloadCSV } from '../../../accounting/format';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const Backup: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, resetAll } = store;
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const manualBackup = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hisab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackup(fmtDateTime(new Date().toISOString()));
    toast.success('ব্যাকআপ ডাউনলোড হয়েছে');
  };

  const exportExcel = () => {
    downloadCSV('hisab-export.csv', [
      ['Type', 'Name', 'Amount'],
      ...s.sales.map((x) => ['Sale', x.invoiceNo, x.total]),
      ...s.purchases.map((x) => ['Purchase', x.supplierName, x.total]),
      ...s.moneyTxns.map((x) => [x.type, x.category, x.amount]),
      ...s.payments.map((x) => ['Payment', x.partyName, x.amount]),
    ]);
    toast.success('Excel/CSV এক্সপোর্ট হয়েছে');
  };

  const exportFull = () => {
    downloadCSV('hisab-parties.csv', [
      ['Type', 'Name', 'Phone', 'Address', 'Balance'],
      ...s.parties.map((p) => [p.type, p.name, p.phone || '', p.address || '', p.openingBalance]),
    ]);
  };

  const restore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        localStorage.setItem('dokan_hisab_accounting_v1', JSON.stringify(data));
        toast.success('ডেটা পুনরুদ্ধার হয়েছে — পেজ রিলোড করুন');
        setTimeout(() => window.location.reload(), 800);
      } catch (e) {
        toast.error('ভুল ফাইল ফরম্যাট');
      }
    };
    reader.readAsText(file);
  };

  const cloudBackup = () => toast.info('Google Drive ব্যাকআপের জন্য cloud integration লাগবে — JSON ফাইল ডাউনলোড করে Drive-এ আপলোড করুন');

  return (
    <div>
      <SectionTitle title="ব্যাকআপ ও রিস্টোর / Backup & Restore" subtitle="ডেটা নিরাপদ রাখুন" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Download size={22} /></div>
          <h3 className="font-bold text-slate-900">Manual backup</h3>
          <p className="text-sm text-slate-500 mb-3">সম্পূর্ণ ডেটা JSON ফাইলে ডাউনলোড করুন।</p>
          <Button onClick={manualBackup}><Download size={16} /> Backup now</Button>
          {lastBackup && <p className="text-xs text-slate-400 mt-2">শেষ ব্যাকআপ: {lastBackup}</p>}
        </Card>

        <Card className="p-5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><Cloud size={22} /></div>
          <h3 className="font-bold text-slate-900">Google Drive / Cloud</h3>
          <p className="text-sm text-slate-500 mb-3">JSON ফাইল Google Drive-এ আপলোড করে রাখুন।</p>
          <Button variant="outline" onClick={cloudBackup}><Cloud size={16} /> Cloud backup</Button>
        </Card>

        <Card className="p-5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3"><Upload size={22} /></div>
          <h3 className="font-bold text-slate-900">Restore data</h3>
          <p className="text-sm text-slate-500 mb-3">আগের ব্যাকআপ ফাইল থেকে ডেটা ফিরিয়ে আনুন।</p>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && restore(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore</Button>
        </Card>

        <Card className="p-5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3"><FileSpreadsheet size={22} /></div>
          <h3 className="font-bold text-slate-900">Export data</h3>
          <p className="text-sm text-slate-500 mb-3">Excel/CSV ও PDF-এ এক্সপোর্ট করুন।</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel}><FileSpreadsheet size={16} /> Excel/CSV</Button>
            <Button variant="outline" onClick={exportFull}><Database size={16} /> Parties</Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3"><RefreshCw size={22} /></div>
          <h3 className="font-bold text-slate-900">Automatic backup</h3>
          <p className="text-sm text-slate-500 mb-3">ডেটা প্রতি পরিবর্তনে ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।</p>
          <p className="text-xs text-slate-400">LocalStorage auto-save চালু আছে।</p>
        </Card>

        <Card className="p-5 border-red-200">
          <h3 className="font-bold text-red-600">Danger zone</h3>
          <p className="text-sm text-slate-500 mb-3">সব ডেটা মুছে ডেমো অবস্থায় ফিরে যান।</p>
          <Button variant="danger" onClick={() => { if (confirm('সব ডেটা রিসেট হবে। নিশ্চিত?')) { resetAll(); toast.success('রিসেট হয়েছে'); } }}>Reset all data</Button>
        </Card>
      </div>
    </div>
  );
};
