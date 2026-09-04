import React, { useState } from 'react';
import { AdminLayout } from './Admin/AdminLayout';
import { Dashboard } from './Admin/Dashboard';
import { CommunicationCenter } from './Admin/CommunicationCenter';
import { Settings } from './Admin/Settings';
import { WhatsApp } from './Admin/WhatsApp';
import { Billing } from './Admin/Billing';
import { AwardsManagement } from './Admin/AwardsManagement';
import { AdminInbox } from './Admin/AdminInbox';
import { AdminManagement } from './Admin/AdminManagement';
import { NotificationGateways } from './Admin/NotificationGateways';
import { SmsLog } from './Admin/SmsLog';
import { DuplicateReport } from './Admin/DuplicateReport';
import { HisabHub } from './Admin/Hisab/HisabHub';
import { useERPStore } from '../store';
import { Toaster } from 'sonner';

interface AdminERPProps {
  onLogout: () => void;
  role: string;
}

const AdminERP: React.FC<AdminERPProps> = ({ onLogout, role }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('home');
  const { state, addInvoice } = useERPStore();

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    // Reset the sub-selection to a sensible default for grouped tabs.
    if (tab === 'hisab') setActiveSubTab('home');
    else if (tab === 'settings') setActiveSubTab('settings');
  };

  return (
    <>
      <AdminLayout
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        activeSubTab={activeSubTab}
        onSelectSubTab={setActiveSubTab}
        onLogout={onLogout}
        role={role}
      >
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'hisab' && <HisabHub active={activeSubTab} onNavigate={setActiveSubTab} />}
        {activeTab === 'billing' && <Billing state={state} onSaveInvoice={addInvoice} />}
        {activeTab === 'communication' && <CommunicationCenter />}
        {activeTab === 'whatsapp' && <WhatsApp />}
        {activeTab === 'awards' && <AwardsManagement />}
        {activeTab === 'inbox' && <AdminInbox />}
        {activeTab === 'settings' && activeSubTab === 'gateways' && <NotificationGateways />}
        {activeTab === 'settings' && activeSubTab === 'smsLog' && <SmsLog />}
        {activeTab === 'settings' && activeSubTab === 'duplicates' && <DuplicateReport />}
        {activeTab === 'settings' && !['gateways', 'smsLog', 'duplicates'].includes(activeSubTab) && <Settings />}
        {activeTab === 'adminManagement' && <AdminManagement />}
      </AdminLayout>
      <Toaster position="top-right" richColors />
    </>
  );
};

export default AdminERP;
