import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard,
  Download,
  Trash2,
  Edit,
  ExternalLink,
  History,
  X,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  TrendingDown,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useERPStore } from '../../store';
import { Customer, LedgerEntry, PaymentTransaction } from '../../types';
import { toast } from 'sonner';

export const CRM: React.FC = () => {
  const store = useERPStore();
  const { state, addCustomer, updateCustomer, deleteCustomer, addLedgerEntry } = store;

  const rawCustomers = state.customers || [];

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'due' | 'regular'>('all');
  
  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  
  // Ledger adjustments inside CRM
  const [isAdjustLedgerOpen, setIsAdjustLedgerOpen] = useState(false);
  const [ledgerType, setLedgerType] = useState<'PURCHASE' | 'PAYMENT'>('PURCHASE');
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerDescription, setLedgerDescription] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<string | null>(null);

  const handleVerifyPayment = async (paymentId: string, action: 'APPROVE' | 'REJECT') => {
    setIsVerifyingPayment(paymentId);
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch(`/api/erp/payments/${paymentId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Payment transaction has been ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
        if (store.loadRemoteState) {
          await store.loadRemoteState();
        }
      } else {
        toast.error(data.error || 'Failed to verify payment transaction');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    } finally {
      setIsVerifyingPayment(null);
    }
  };

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formNid, setFormNid] = useState('');
  const [formArea, setFormArea] = useState<'Area 1' | 'Area 2' | 'Area 3'>('Area 1');
  const [formSerial, setFormSerial] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Filter customers based on search query & due categories
  const filteredCustomers = rawCustomers.filter(customer => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      customer.name.toLowerCase().includes(query) ||
      (customer.phone && customer.phone.includes(query)) ||
      customer.id.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (selectedCategory === 'due') {
      return customer.dueAmount > 0;
    } else if (selectedCategory === 'regular') {
      return customer.dueAmount <= 0;
    }
    return true;
  });

  // Open modal for new customer
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
    setFormNid('');
    setFormArea('Area 1');
    setFormSerial('');
    setFormStatus('ACTIVE');
    setIsAddEditOpen(true);
  };

  // Open modal for editing existing customer
  const handleOpenEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening profile view
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address);
    setFormNotes(customer.notes || '');
    setFormNid(customer.nidNumber || '');
    setFormArea(customer.area || 'Area 1');
    setFormSerial(customer.serialNumber || '');
    setFormStatus(customer.status);
    setIsAddEditOpen(true);
  };

  // Save Customer (Add or Edit)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Customer name is required.');
      return;
    }

    if (editingCustomer) {
      // Edit mode
      const updated: Customer = {
        ...editingCustomer,
        name: formName,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        notes: formNotes,
        nidNumber: formNid,
        area: formArea,
        serialNumber: formSerial,
        status: formStatus
      };
      await updateCustomer(updated);
      toast.success(`Updated customer details for ${formName}`);
      if (viewingCustomer?.id === editingCustomer.id) {
        setViewingCustomer(updated);
      }
    } else {
      // Add mode
      await addCustomer({
        name: formName,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        notes: formNotes,
        nidNumber: formNid,
        area: formArea,
        serialNumber: formSerial,
        status: formStatus
      });
      toast.success(`Successfully registered customer ${formName}`);
    }

    setIsAddEditOpen(false);
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete customer ${name}? All associated ledger transactions will be removed.`)) {
      await deleteCustomer(id);
      toast.info(`Deleted customer ${name}`);
      if (viewingCustomer?.id === id) {
        setViewingCustomer(null);
      }
    }
  };

  // Handle manual ledger entry from viewing profile
  const handleAddLedgerAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCustomer) return;
    const amount = parseFloat(ledgerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive transaction amount.');
      return;
    }
    if (!ledgerDescription.trim()) {
      toast.error('Please provide a description.');
      return;
    }

    await addLedgerEntry(viewingCustomer.id, ledgerType, ledgerDescription, amount);
    toast.success(`Ledger transaction of ৳${amount.toLocaleString()} registered successfully!`);
    
    // Refresh viewing customer to reflect new dueAmount
    const freshCustomer = state.customers.find(c => c.id === viewingCustomer.id);
    if (freshCustomer) {
      setViewingCustomer(freshCustomer);
    }
    
    // Reset inputs
    setLedgerAmount('');
    setLedgerDescription('');
    setIsAdjustLedgerOpen(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Address', 'Current Due', 'Status', 'Notes'];
    const rows = rawCustomers.map(c => [
      c.id,
      c.name,
      c.phone || '',
      c.email || '',
      c.address.replace(/,/g, ' '),
      c.dueAmount,
      c.status,
      (c.notes || '').replace(/,/g, ' ')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lovely_enterprise_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Customer list exported successfully.');
  };

  // Helper for customer activity details
  const getCustomerLedger = (customerId: string) => {
    return (state.ledger || []).filter(item => item.customerId === customerId);
  };

  const getCustomerPayments = (customerId: string) => {
    return (state.payments || []).filter(item => item.customerId === customerId);
  };

  return (
    <div id="crm-page-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer CRM & Ledgers</h1>
          <p className="text-slate-500 mt-1">Manage corporate clients, track credit books, record collection events, and check live due amounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            id="export-customers-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button 
            id="add-customer-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm shadow-emerald-200 active:scale-95 cursor-pointer"
          >
            <UserPlus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customers by name, phone number, or ID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'all', label: 'All Clients' },
              { id: 'due', label: 'With Outstanding Due' },
              { id: 'regular', label: 'Settled/No Due' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                  selectedCategory === cat.id 
                    ? "bg-white text-emerald-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 lg:border-none">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Customers Grid and Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Outstanding Due</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={36} className="text-slate-300" />
                      <p className="font-semibold text-slate-500">No customers found</p>
                      <p className="text-xs text-slate-400">Add a new customer profile to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const hasDue = customer.dueAmount > 0;
                  return (
                    <tr 
                      key={customer.id} 
                      onClick={() => setViewingCustomer(customer)}
                      className="hover:bg-slate-50/30 transition-all group cursor-pointer border-b border-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm uppercase">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{customer.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {customer.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Phone size={12} className="text-slate-400" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail size={12} className="text-slate-400" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-xs text-slate-500 max-w-[200px] truncate">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span>{customer.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-sm",
                          customer.dueAmount > 15000 
                            ? "bg-rose-50 text-rose-600 font-bold" 
                            : hasDue 
                              ? "bg-amber-50 text-amber-600 font-bold" 
                              : "bg-emerald-50 text-emerald-600 font-bold"
                        )}>
                          ৳ {customer.dueAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          customer.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            title="View Profile Book" 
                            onClick={(e) => { e.stopPropagation(); setViewingCustomer(customer); }}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <ExternalLink size={18} />
                          </button>
                          <button 
                            title="Edit Info" 
                            onClick={(e) => handleOpenEdit(customer, e)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            title="Delete Profile" 
                            onClick={(e) => handleDeleteCustomer(customer.id, customer.name, e)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW CUSTOMER PROFILE DRAWER / MODAL */}
      <AnimatePresence>
        {viewingCustomer && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
            {/* Backdrop close click */}
            <div className="absolute inset-0" onClick={() => setViewingCustomer(null)} />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-slate-50 h-full shadow-2xl overflow-y-auto flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg uppercase">
                    {viewingCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{viewingCustomer.name}</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {viewingCustomer.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingCustomer(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Outstanding Credit Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Outstanding Credit Book Due</p>
                      <p className={cn(
                        "text-2xl font-black mt-1",
                        viewingCustomer.dueAmount > 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        ৳ {viewingCustomer.dueAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      viewingCustomer.dueAmount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <CreditCard size={24} />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Credit Transactions</p>
                      <p className="text-2xl font-black mt-1 text-slate-900">
                        {getCustomerLedger(viewingCustomer.id).length} Entries
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                      <History size={24} />
                    </div>
                  </div>
                </div>

                {/* Profile Actions Bar */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setLedgerType('PURCHASE'); setIsAdjustLedgerOpen(true); }}
                    className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus size={16} />
                    Create Purchase Invoice
                  </button>
                  <button 
                    onClick={() => { setLedgerType('PAYMENT'); setIsAdjustLedgerOpen(true); }}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <TrendingDown size={16} />
                    Record Cash Payment
                  </button>
                </div>

                {/* Profile Detail Specs */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-50 pb-2">Client Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block mb-1">PHONE NUMBER</span>
                      <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400" />
                        {viewingCustomer.phone || 'Not available'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-1">EMAIL ADDRESS</span>
                      <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400" />
                        {viewingCustomer.email || 'Not available'}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-bold block mb-1">BILLING ADDRESS</span>
                      <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        {viewingCustomer.address}
                      </span>
                    </div>
                    {viewingCustomer.notes && (
                      <div className="sm:col-span-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-slate-400 font-bold block mb-1">ADMIN MEMO / NOTES</span>
                        <span className="text-slate-700 italic font-medium">{viewingCustomer.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ledger / Purchase Book History */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">Ledger Book Statements</h3>
                    <span className="text-[10px] font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">REALTIME DEBIT/CREDIT</span>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                    {getCustomerLedger(viewingCustomer.id).length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No transactions registered yet. Use the buttons above to generate purchase memos or record payments.
                      </div>
                    ) : (
                      getCustomerLedger(viewingCustomer.id).reverse().map((entry) => {
                        const isPurchase = entry.type === 'PURCHASE' || entry.type === 'DUE_CARRY_FORWARD';
                        return (
                          <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase",
                                  isPurchase ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                  {entry.type}
                                </span>
                                <span className="text-xs font-bold text-slate-800">{entry.description}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                Date: {entry.date} • ID: {entry.id}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "font-black text-sm block",
                                isPurchase ? "text-rose-600 animate-none" : "text-emerald-600"
                              )}>
                                {isPurchase ? '+' : '-'} ৳ {entry.amount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold block">
                                Balance: ৳ {entry.runningBalance?.toLocaleString() || '0'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Submissions & Online Mobile Payments */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">Online Payments History</h3>
                    <span className="text-[10px] font-black tracking-widest text-slate-500">PORTAL ATTEMPTS</span>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100">
                    {getCustomerPayments(viewingCustomer.id).length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No online payment gateway submissions recorded.
                      </div>
                    ) : (
                      getCustomerPayments(viewingCustomer.id).reverse().map((pay) => (
                        <div key={pay.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800">৳ {pay.amount.toLocaleString()} via {pay.method}</p>
                            <p className="text-[10px] text-slate-400">
                              TxID: {pay.transactionId} • Acc: {pay.accountNo}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                              pay.status === 'VERIFIED' ? "bg-emerald-100 text-emerald-700" :
                              pay.status === 'REJECTED' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {pay.status}
                            </span>
                            {pay.status === 'PENDING' && (
                              <div className="flex gap-1.5 ml-2">
                                <button
                                  onClick={() => handleVerifyPayment(pay.id, 'APPROVE')}
                                  disabled={isVerifyingPayment !== null}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleVerifyPayment(pay.id, 'REJECT')}
                                  disabled={isVerifyingPayment !== null}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT CUSTOMER MODAL */}
      <AnimatePresence>
        {isAddEditOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingCustomer ? `Edit Customer Details` : `Register New Customer`}
                </h3>
                <button 
                  onClick={() => setIsAddEditOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter customer name..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. client@example.com"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Billing Address *</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="Enter complete village, thana, district, post code..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">NID Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1234567890"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formNid}
                      onChange={(e) => setFormNid(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Area</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value as 'Area 1' | 'Area 2' | 'Area 3')}
                    >
                      <option value="Area 1">Area 1</option>
                      <option value="Area 2">Area 2</option>
                      <option value="Area 3">Area 3</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Serial</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 001"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Administrative Memo Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="E.g. payment behaviors, credit limits, special arrangements..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Status</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 w-full">
                      <button
                        type="button"
                        onClick={() => setFormStatus('ACTIVE')}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer",
                          formStatus === 'ACTIVE' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                        )}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormStatus('INACTIVE')}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer",
                          formStatus === 'INACTIVE' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"
                        )}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsAddEditOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest cursor-pointer shadow-sm shadow-emerald-200"
                  >
                    {editingCustomer ? 'Update Profile' : 'Save Customer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK LEDGER ENTRY IN CRM (PURCHASE MEMO / RECORD PAYMENT) */}
      <AnimatePresence>
        {isAdjustLedgerOpen && viewingCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-100 shadow-2xl"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                    ledgerType === 'PURCHASE' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {ledgerType}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg">Record Transaction</h3>
                </div>
                <button onClick={() => setIsAdjustLedgerOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddLedgerAdjust} className="p-6 space-y-4">
                <p className="text-xs text-slate-500 font-medium">
                  Adding an entry will automatically adjust the customer's outstanding debit balance in MongoDB in real-time.
                </p>
                
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amount (BDT) *</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="Enter amount in Taka..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={ledgerAmount}
                    onChange={(e) => setLedgerAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Memo/Description *</label>
                  <input 
                    type="text" 
                    required
                    placeholder={ledgerType === 'PURCHASE' ? "e.g. Purchase of PVC Pipes, 10 units" : "e.g. Paid in Cash, Memo reference #512"}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={ledgerDescription}
                    onChange={(e) => setLedgerDescription(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsAdjustLedgerOpen(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={cn(
                      "flex-1 py-2 text-white text-xs font-bold rounded-xl uppercase cursor-pointer shadow-sm",
                      ledgerType === 'PURCHASE' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                    )}
                  >
                    Submit Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
