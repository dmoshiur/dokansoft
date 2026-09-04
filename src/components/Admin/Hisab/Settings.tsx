/**
 * Settings — business profile, invoice/tax, notifications, appearance, my account.
 */
import React, { useState } from 'react';
import { Building2, Receipt, Bell, Palette, UserRound, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAccountingStore } from '../../../accounting/store';
import { Card, SectionTitle, Button, Field, Input, Select, TextArea, Tabs } from './ui';

type Store = ReturnType<typeof useAccountingStore>;

export const SettingsModule: React.FC<{ store: Store }> = ({ store }) => {
  const { state: s, saveProfile, saveSettings } = store;
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(s.profile);
  const [settings, setSettings] = useState(s.settings);
  const [acct, setAcct] = useState({ name: 'Md Abu Masum', email: 'abumasumpunot@gmail.com', phone: '+8801712-345678', password: '', pin: '' });

  const saveProfileNow = () => { saveProfile(profile); toast.success('প্রোফাইল সংরক্ষিত'); };
  const saveSettingsNow = () => { saveSettings(settings); toast.success('সেটিংস সংরক্ষিত'); };
  const saveAccount = () => { toast.success('অ্যাকাউন্ট আপডেট হয়েছে'); };

  return (
    <div>
      <SectionTitle title="সেটিংস / Settings" subtitle="ব্যবসার তথ্য, ইনভয়েস, নোটিফিকেশন ও অ্যাকাউন্ট" />

      <Tabs
        tabs={[
          { id: 'profile', label: 'Business Profile', icon: Building2 },
          { id: 'invoice', label: 'Invoice & Tax', icon: Receipt },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'appearance', label: 'Language & Theme', icon: Palette },
          { id: 'account', label: 'My Account', icon: UserRound },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {tab === 'profile' && (
          <Card className="p-5 max-w-2xl space-y-4">
            <Field label="ব্যবসার নাম"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="মালিকের নাম"><Input value={profile.ownerName} onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })} /></Field>
              <Field label="মোবাইল নম্বর"><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            </div>
            <Field label="ঠিকানা"><Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ইমেইল"><Input value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
              <Field label="মুদ্রা (Currency)"><Input value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} /></Field>
            </div>
            <Field label="Logo URL"><Input value={profile.logo || ''} onChange={(e) => setProfile({ ...profile, logo: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Invoice-এ দেখানোর নোট"><TextArea value={profile.invoiceNote || ''} onChange={(e) => setProfile({ ...profile, invoiceNote: e.target.value })} /></Field>
            <Button onClick={saveProfileNow}><Save size={16} /> সংরক্ষণ</Button>
          </Card>
        )}

        {tab === 'invoice' && (
          <Card className="p-5 max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice prefix"><Input value={settings.invoicePrefix} onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })} /></Field>
              <Field label="Tax rate (%)"><Input type="number" value={String(settings.taxRate)} onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="VAT rate (%)"><Input type="number" value={String(settings.vatRate)} onChange={(e) => setSettings({ ...settings, vatRate: parseFloat(e.target.value) || 0 })} /></Field>
              <Field label="Invoice footer"><Input value={settings.invoiceFooter} onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })} /></Field>
            </div>
            <Button onClick={saveSettingsNow}><Save size={16} /> সংরক্ষণ</Button>
          </Card>
        )}

        {tab === 'notifications' && (
          <Card className="p-5 max-w-2xl space-y-4">
            {[
              ['lowStockAlert', 'Low stock alert'],
              ['dueReminder', 'Due reminder'],
              ['dailySummary', 'Daily summary'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-2 border-b border-slate-100 cursor-pointer">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <input type="checkbox" className="w-5 h-5 accent-emerald-600" checked={Boolean((settings as any)[key])} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} />
              </label>
            ))}
            <Button onClick={saveSettingsNow}><Save size={16} /> সংরক্ষণ</Button>
          </Card>
        )}

        {tab === 'appearance' && (
          <Card className="p-5 max-w-2xl space-y-4">
            <Field label="Language / ভাষা">
              <Select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value as 'bn' | 'en' })}>
                <option value="bn">বাংলা</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label="Theme">
              <Select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
                <option value="emerald">Emerald (সবুজ)</option>
                <option value="blue">Blue</option>
                <option value="rose">Rose</option>
                <option value="slate">Slate</option>
              </Select>
            </Field>
            <Button onClick={saveSettingsNow}><Save size={16} /> সংরক্ষণ</Button>
          </Card>
        )}

        {tab === 'account' && (
          <Card className="p-5 max-w-2xl space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-lg">{acct.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div>
                <p className="font-bold text-slate-900">{acct.name}</p>
                <p className="text-sm text-slate-500">{acct.role || 'Admin'} · Login history: আজ {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <Field label="নাম"><Input value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="মোবাইল"><Input value={acct.phone} onChange={(e) => setAcct({ ...acct, phone: e.target.value })} /></Field>
              <Field label="ইমেইল"><Input value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="পাসওয়ার্ড পরিবর্তন"><Input type="password" value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} placeholder="নতুন পাসওয়ার্ড" /></Field>
              <Field label="PIN"><Input type="password" value={acct.pin} onChange={(e) => setAcct({ ...acct, pin: e.target.value })} placeholder="৪-সংখ্যার PIN" /></Field>
            </div>
            <Button onClick={saveAccount}><Save size={16} /> সংরক্ষণ</Button>
          </Card>
        )}
      </div>
    </div>
  );
};
