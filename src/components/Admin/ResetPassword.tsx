import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Parse token from window location
  const getQueryToken = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  };

  const token = getQueryToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing password recovery token. Please request a new link.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your typing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to reset password. The link may have expired.');
      }
    } catch (e) {
      setError('Network communication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    // Clear URL query parameters and redirect to default ERP dashboard login
    window.location.href = window.location.origin + '/';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -right-40 w-80 h-80 bg-emerald-600/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 transform -rotate-3">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Lovely Enterprise</h1>
            <p className="text-slate-400 text-sm mt-1">Digital ERP Security System</p>
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.form 
                key="reset-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-bold text-white">Reset Password</h2>
                  <p className="text-slate-400 text-xs px-2">
                    Please provide a secure, high-entropy password for your super administrator account.
                  </p>
                </div>

                {!token && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>Error: Reset token was not found in the URL. Please re-open the link from your email inbox.</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">New Secure Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      disabled={!token}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm font-medium disabled:opacity-50"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                      type="password" 
                      value={confirmPassword}
                      disabled={!token}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm font-medium disabled:opacity-50"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <span>Update Secret Password</span>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Password Updated!</h2>
                  <p className="text-slate-400 text-sm px-4">
                    Your password has been successfully overwritten. A security confirmation email was sent to your inbox.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  Proceed to Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
