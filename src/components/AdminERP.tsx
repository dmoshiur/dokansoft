import React, { useState, useEffect } from 'react';
import { AdminLayout } from './Admin/AdminLayout';
import { Dashboard } from './Admin/Dashboard';
import { CommunicationCenter } from './Admin/CommunicationCenter';
import { CRM } from './Admin/CRM';
import { Inventory } from './Admin/Inventory';
import { HalKhata } from './Admin/HalKhata';
import { Settings } from './Admin/Settings';
import { WhatsApp } from './Admin/WhatsApp';
import { Billing } from './Admin/Billing';
import { AwardsManagement } from './Admin/AwardsManagement';
import { AdminInbox } from './Admin/AdminInbox';
import { AdminManagement } from './Admin/AdminManagement';
import { useERPStore } from '../store';
import { Toaster, toast } from 'sonner';

interface AdminERPProps {
  onLogout: () => void;
  role: string;
}

const AdminERP: React.FC<AdminERPProps> = ({ onLogout, role }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { state, addInvoice } = useERPStore();

  return (
    <>
      <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} role={role}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'billing' && <Billing state={state} onSaveInvoice={addInvoice} />}
        {activeTab === 'communication' && <CommunicationCenter />}
        {activeTab === 'crm' && <CRM />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'halkhata' && <HalKhata />}
        {activeTab === 'whatsapp' && <WhatsApp />}
        {activeTab === 'awards' && <AwardsManagement />}
        {activeTab === 'inbox' && <AdminInbox />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'adminManagement' && <AdminManagement />}
      </AdminLayout>
      <Toaster position="top-right" richColors />
    </>
  );
};

export default AdminERP;
