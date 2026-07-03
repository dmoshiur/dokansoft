import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  Search,
  X,
  Check,
  AlertCircle,
  Phone,
  Mail,
  User,
  CheckSquare,
  Square,
  ShieldCheck,
  Calendar,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useERPStore } from '../../store';
import { AdminUser } from '../../types';
import { toast } from 'sonner';

export const AdminManagement: React.FC = () => {
  const { state, addAdmin, updateAdmin, deleteAdmin, resetAdminPassword } = useERPStore();
  const admins = state.admins || [];
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<AdminUser['role']>('Admin');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formProfileImage, setFormProfileImage] = useState('');
  
  const [formPermissions, setFormPermissions] = useState<AdminUser['permissions']>({
    dashboard: false, products: false, awards: false, licenses: false,
    crm: false, inventory: false, billing: false, memo: false,
    halkhata: false, communication: false, whatsapp: false, settings: false,
    contactMessages: false, adminManagement: false
  });

  const availablePermissions = [
    { key: 'dashboard', label: 'Dashboard View', description: 'Access and view main analytical dashboard charts' },
    { key: 'products', label: 'Manage Products', description: 'Add, edit, delete, and list seed or hardware products' },
    { key: 'awards', label: 'Manage Awards', description: 'Create and update honorary business awards' },
    { key: 'licenses', label: 'Manage Licenses', description: 'Register, edit, and display distribution certificates' },
    { key: 'crm', label: 'CRM Panel', description: 'View and manage customers, and their ledgers' },
    { key: 'inventory', label: 'Inventory Controls', description: 'Verify stock levels and stock alert thresholds' },
    { key: 'billing', label: 'Invoice & Billing', description: 'Generate receipts, invoices, and process transactions' },
    { key: 'memo', label: 'Due Memo Management', description: 'Track digital collection sheets and credit bounds' },
    { key: 'halkhata', label: 'HalKhata Event', description: 'Settle annual ledgers and organize collector feasts' },
    { key: 'communication', label: 'Voice Broadcasting', description: 'Initiate robocalls, TTS campaigns, or custom notifications' },
    { key: 'whatsapp', label: 'WhatsApp Portal', description: 'Manage permanent sessions, QR pairings, and chat logs' },
    { key: 'settings', label: 'System Settings', description: 'Configure general metadata, secondary trade licenses' },
    { key: 'contactMessages', label: 'Customer Inquiry Messages', description: 'Manage public web inquiries, delete or reply to messages' },
    { key: 'adminManagement', label: 'Admin Management', description: 'Manage multiple role-based administrator user access' },
  ] as const;

  const handleRoleChange = (role: AdminUser['role']) => {
    setFormRole(role);
    
    // Auto-populate recommended permissions based on role guidelines
    if (role === 'Super Admin') {
      const fullPerms = { ...formPermissions };
      Object.keys(fullPerms).forEach(k => {
        fullPerms[k as keyof AdminUser['permissions']] = true;
      });
      setFormPermissions(fullPerms);
    } else if (role === 'Admin') {
      setFormPermissions({
        dashboard: true,
        products: true,
        awards: true,
        licenses: true,
        crm: true,
        inventory: true,
        billing: true,
        memo: true,
        halkhata: true,
        communication: false,
        whatsapp: false,
        settings: true,
        contactMessages: true,
        adminManagement: false
      });
    } else if (role === 'Manager') {
      setFormPermissions({
        dashboard: true,
        products: true,
        awards: false,
        licenses: false,
        crm: true,
        inventory: true,
        billing: true,
        memo: true,
        halkhata: true,
        communication: false,
        whatsapp: false,
        settings: false,
        contactMessages: false,
        adminManagement: false
      });
    } else if (role === 'Staff') {
      setFormPermissions({
        dashboard: true,
        products: false,
        awards: false,
        licenses: false,
        crm: false,
        inventory: false,
        billing: false,
        memo: false,
        halkhata: false,
        communication: false,
        whatsapp: false,
        settings: false,
        contactMessages: false,
        adminManagement: false
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormProfileImage('');
    setFormRole('Admin');
    setFormStatus('ACTIVE');
    setFormPermissions({
      dashboard: true, products: true, awards: true, licenses: true,
      crm: true, inventory: true, billing: true, memo: true,
      halkhata: true, communication: false, whatsapp: false, settings: true,
      contactMessages: true, adminManagement: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormPhone(admin.phone || '');
    setFormPassword('');
    setFormProfileImage(admin.profileImage || '');
    setFormRole(admin.role);
    setFormStatus(admin.status);
    setFormPermissions(admin.permissions || {
      dashboard: false, products: false, awards: false, licenses: false,
      crm: false, inventory: false, billing: false, memo: false,
      halkhata: false, communication: false, whatsapp: false, settings: false,
      contactMessages: false, adminManagement: false
    });
    setIsModalOpen(true);
  };

  const togglePermission = (key: keyof AdminUser['permissions']) => {
    if (formRole === 'Super Admin') return; // Super admin has permanent access
    setFormPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error('Name and Email are required.');
      return;
    }

    try {
      const payload: any = {
        name: formName,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        status: formStatus,
        permissions: formPermissions,
        profileImage: formProfileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formName)}`
      };

      if (!editingAdmin && formPassword) {
        payload.password = formPassword;
      }

      if (editingAdmin) {
        await updateAdmin(editingAdmin.id, payload);
        if (formPassword) {
          await resetAdminPassword(editingAdmin.id, formPassword);
        }
        toast.success(`Admin '${formName}' updated successfully.`);
      } else {
        await addAdmin(payload);
        toast.success(`Admin '${formName}' created successfully.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save admin user.');
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete administrator ${name}? This action cannot be undone.`)) {
      try {
        await deleteAdmin(id);
        toast.success('Admin user deleted successfully.');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete admin.');
      }
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Management</h1>
          <p className="text-slate-500 mt-1">
            Supervise role-based permissions, configure status limits, and manage credential parameters.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 cursor-pointer"
        >
          <UserPlus size={18} />
          Add Administrator
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search admins by name, email, or system role..." 
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-medium text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Admin List Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100/80">
                <th className="px-6 py-4">User Identity</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Security Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No administrators matched the current search criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(admin.name)}`;
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/30 transition-all">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={admin.profileImage || fallbackAvatar} 
                            alt={admin.name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-100 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = fallbackAvatar;
                            }}
                          />
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">{admin.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Shield size={10} />
                              ID: {admin.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="space-y-0.5">
                          <p className="text-slate-600 font-medium flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" />
                            {admin.email}
                          </p>
                          {admin.phone && (
                            <p className="text-slate-400 text-xs flex items-center gap-1.5">
                              <Phone size={13} className="text-slate-400" />
                              {admin.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase",
                          admin.role === 'Super Admin' && "bg-purple-50 text-purple-700 border border-purple-100",
                          admin.role === 'Admin' && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                          admin.role === 'Manager' && "bg-blue-50 text-blue-700 border border-blue-100",
                          admin.role === 'Staff' && "bg-slate-100 text-slate-700 border border-slate-200"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            admin.role === 'Super Admin' && "bg-purple-500",
                            admin.role === 'Admin' && "bg-emerald-500",
                            admin.role === 'Manager' && "bg-blue-500",
                            admin.role === 'Staff' && "bg-slate-400"
                          )}></span>
                          {admin.role}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-extrabold",
                          admin.status === 'ACTIVE' 
                            ? "bg-emerald-100/75 text-emerald-800" 
                            : "bg-rose-100/75 text-rose-800"
                        )}>
                          {admin.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenEdit(admin)} 
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                            title="Edit Admin"
                          >
                            <Edit size={16} />
                          </button>
                          
                          {admin.email !== 'mdmoshiurrahmanmohi1@gmail.com' && admin.role !== 'Super Admin' && (
                            <button 
                              onClick={() => handleDeleteAdmin(admin.id, admin.name)} 
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              title="Delete Admin"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingAdmin ? 'Edit Administrator Details' : 'Register New Administrator'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {editingAdmin ? 'Modify structural access bounds or refresh security passwords.' : 'Assign explicit system permissions to restrict operational scopes.'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <form onSubmit={handleSaveAdmin} className="overflow-y-auto p-6 space-y-6 flex-1">
                {/* Section 1: Basic Identity */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Basic Identification
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Full Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Moshiur Rahman" 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Email Address</label>
                      <input 
                        type="email" 
                        required
                        placeholder="e.g. admin@lovelygroup.com" 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        disabled={!!editingAdmin && editingAdmin.email === 'mdmoshiurrahmanmohi1@gmail.com'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. +8801700000000" 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Profile Image URL (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="e.g. https://images.unsplash.com/..." 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        value={formProfileImage}
                        onChange={(e) => setFormProfileImage(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Security & Roles */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Role & Password Config
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Security Role</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        value={formRole}
                        onChange={(e) => handleRoleChange(e.target.value as any)}
                        disabled={!!editingAdmin && editingAdmin.email === 'mdmoshiurrahmanmohi1@gmail.com'}
                      >
                        <option value="Super Admin">Super Admin</option>
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">
                        {editingAdmin ? 'New Password (Optional)' : 'Default Password'}
                      </label>
                      <input 
                        type="password" 
                        required={!editingAdmin}
                        placeholder={editingAdmin ? 'Leave blank to retain current' : 'Enter default password'} 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Status Bounds</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        disabled={!!editingAdmin && editingAdmin.email === 'mdmoshiurrahmanmohi1@gmail.com'}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Fine-grained permissions */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Operational Permissions
                    </h3>
                    {formRole === 'Super Admin' && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 uppercase tracking-wider">
                        Full Access Enabled
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {availablePermissions.map((perm) => {
                      const isChecked = formRole === 'Super Admin' ? true : formPermissions[perm.key];
                      return (
                        <div 
                          key={perm.key}
                          onClick={() => togglePermission(perm.key)}
                          className={cn(
                            "p-3 rounded-2xl border flex items-start gap-3 transition-all",
                            formRole === 'Super Admin' ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:bg-slate-50/50",
                            isChecked 
                              ? "bg-slate-50/80 border-slate-200/80 shadow-xs" 
                              : "bg-white border-slate-100"
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isChecked ? (
                              <CheckSquare size={16} className="text-slate-800" />
                            ) : (
                              <Square size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className={cn(
                              "text-xs font-bold leading-tight",
                              isChecked ? "text-slate-800" : "text-slate-500"
                            )}>
                              {perm.label}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl font-bold text-sm transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-100 cursor-pointer"
                  >
                    {editingAdmin ? 'Apply Modifications' : 'Register Administrator'}
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
