import React, { useState } from 'react';
import { User, Mail, Smartphone, MapPin, Landmark, ShieldCheck, KeyRound, ArrowLeft, LogOut, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { Toaster, toast } from 'sonner';

interface AccountProps {
  user: {
    email: string;
    role: string;
    customerId?: string;
  };
  state: any; // FullState from store
  onLogout: () => void;
}

export const Account: React.FC<AccountProps> = ({ user, state, onLogout }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Find customer details from state if role is user
  const customer = state?.customers?.find((c: any) => c.id === user.customerId || c.email?.toLowerCase() === user.email?.toLowerCase());

  const handleGoDashboard = () => {
    if (user.role === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/dashboard');
    }
    window.dispatchEvent(new Event('popstate'));
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !currentPassword) {
      toast.error('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    setIsChanging(true);
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Failed to change password.');
      }
    } catch (err) {
      toast.error('Connection timed out. Please retry.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Upper Navigation Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoDashboard}
            className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-slate-900 tracking-tight text-lg">My Account</h1>
            <p className="text-xs text-slate-400">Manage security settings and review your billing profiles.</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-1.5 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </header>

      {/* Main Grid container */}
      <main className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Profil summary */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner text-emerald-600">
              <User size={38} />
            </div>
            <h3 className="font-black text-slate-900 text-base">
              {customer ? customer.name : "System Administrator"}
            </h3>
            <span className="text-[10px] uppercase font-extrabold tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-500 mt-1">
              Role: {user.role}
            </span>

            {customer && (
              <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance Owed</span>
                  <span className="text-sm font-black text-rose-600">৳{customer.dueAmount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                    {customer.status || "ACTIVE"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Profile details & Password Change */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Customer Details */}
          {customer && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
              <h3 className="font-black text-slate-950 text-sm mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</span>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-2 mt-1">
                    <Mail size={14} className="text-slate-400" />
                    {customer.email || "No email linked"}
                  </span>
                </div>
                
                <div className="space-y-1 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Phone Number</span>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-2 mt-1">
                    <Smartphone size={14} className="text-slate-400" />
                    {customer.phone || "No phone linked"}
                  </span>
                </div>

                <div className="space-y-1 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Address</span>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-2 mt-1">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    {customer.address || "No address listed"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Password Reset Form */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
            <h3 className="font-black text-slate-950 text-sm mb-4 flex items-center gap-2">
              <KeyRound size={16} className="text-emerald-600" />
              Credentials Management
            </h3>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative mt-1">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative mt-1">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChanging}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
              >
                {isChanging ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <KeyRound size={14} />
                )}
                <span>Update Password</span>
              </button>
            </form>
          </div>

        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};
export default Account;
