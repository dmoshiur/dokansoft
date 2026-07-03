import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, KeyRound, ArrowLeft, Send } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

type AuthView = 'login' | 'otp' | 'forgot' | 'forgot_success';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginType, setLoginType] = useState<'admin' | 'customer'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [view, setView] = useState<AuthView>('login');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handler for primary Login submit (Step 1)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (loginType === 'customer') {
        const res = await fetch('/api/customer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (res.ok) {
          setView('otp');
          setCooldown(60);
          setInfoMessage(data.message || 'OTP verification code has been sent to your phone.');
        } else {
          setError(data.error || 'Failed to send OTP. Please check your phone number.');
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
          if (data.otpRequired) {
            setView('otp');
            setCooldown(60); // 60s resend cooldown
            setInfoMessage(data.message || 'OTP verification code has been dispatched.');
          } else {
            // Direct login fallback if OTP not triggered
            onLogin(data.token, data.user);
          }
        } else {
          setError(data.error || 'Login failed. Please check your credentials.');
        }
      }
    } catch (e) {
      setError('Connection error. Please verify your server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for OTP Verification (Step 2)
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter a complete 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (loginType === 'customer') {
        const res = await fetch('/api/customer/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp }),
        });
        const data = await res.json();
        if (res.ok) {
          onLogin(data.token, data.user);
        } else {
          setError(data.error || 'Invalid or expired OTP verification code.');
        }
      } else {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp }),
        });

        const data = await res.json();

        if (res.ok) {
          onLogin(data.token, data.user);
        } else {
          setError(data.error || 'Invalid or expired OTP verification code.');
        }
      }
    } catch (e) {
      setError('Network communication failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for OTP Resend
  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (loginType === 'customer') {
        const res = await fetch('/api/customer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (res.ok) {
          setCooldown(60);
          setInfoMessage(data.message || 'A fresh verification code was sent.');
        } else {
          setError(data.error || 'Failed to resend verification code.');
        }
      } else {
        const res = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (res.ok) {
          setCooldown(60);
          setInfoMessage('A fresh verification code was sent to your email.');
        } else {
          setError(data.error || 'Failed to resend verification code.');
        }
      }
    } catch (e) {
      setError('Failed to reach the resend service. Retry later.');
    } finally {
      setIsResending(false);
    }
  };

  // Handler for Forgot Password (SMTP reset request)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setView('forgot_success');
        setInfoMessage(data.message || 'Recovery email successfully sent.');
      } else {
        setError(data.error || 'Failed to submit forgot password request.');
      }
    } catch (e) {
      setError('SMTP relay error. Please check your system configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Premium Ambient Background Orbs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-emerald-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 transform rotate-3 hover:rotate-0 transition-transform">
              {view === 'otp' ? (
                <KeyRound size={32} className="text-white animate-pulse" />
              ) : (
                <ShieldCheck size={32} className="text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Lovely Enterprise</h1>
            <p className="text-slate-400 text-sm mt-1">Enterprise Portal & Control Panel</p>
          </div>

          {/* Tab selectors for Customer Portal vs Admin Portal */}
          {view === 'login' && (
            <div className="flex bg-white/5 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setLoginType('customer'); setError(null); }}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${loginType === 'customer' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Customer Portal
              </button>
              <button
                type="button"
                onClick={() => { setLoginType('admin'); setError(null); }}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${loginType === 'admin' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Admin ERP
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* VIEW 1: EMAIL & PASSWORD OR PHONE LOGIN */}
            {view === 'login' && (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLoginSubmit} 
                className="space-y-6"
              >
                {loginType === 'customer' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm font-medium"
                        placeholder="e.g. 017XXXXXXXX"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm font-medium"
                          placeholder="your-email@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Secure Password</label>
                        <button 
                          type="button"
                          onClick={() => { setView('forgot'); setError(null); }}
                          className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm font-medium"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <>
                      <span>{loginType === 'customer' ? 'Send OTP Code' : 'Submit Credentials'}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* VIEW 2: OTP VERIFICATION */}
            {view === 'otp' && (
              <motion.form 
                key="otp-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleOtpVerify} 
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-bold text-white">Enter OTP Code</h2>
                  <p className="text-slate-400 text-xs px-2">
                    {loginType === 'customer' 
                      ? "A secure 6-digit random verification code was sent to your phone number."
                      : "A secure 6-digit random verification code was dispatched to your registered admin inbox."}
                  </p>
                </div>

                {infoMessage && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs text-center">
                    {infoMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                    <span>6-Digit Security OTP</span>
                    <span className="text-[10px] text-slate-400 font-normal normal-case">Expires in 5 minutes</span>
                  </label>
                  <div className="relative group">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="text" 
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-center tracking-[12px] font-bold text-xl"
                      placeholder="000000"
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

                <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <>
                        <span>Verify Secure OTP</span>
                        <ShieldCheck size={18} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs px-1">
                    <button
                      type="button"
                      onClick={() => { setView('login'); setError(null); setInfoMessage(null); }}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to credentials</span>
                    </button>

                    <button
                      type="button"
                      disabled={cooldown > 0 || isResending}
                      onClick={handleResendOtp}
                      className={`font-bold flex items-center gap-1 ${cooldown > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-emerald-500 hover:text-emerald-400 cursor-pointer'}`}
                    >
                      {isResending ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : cooldown > 0 ? (
                        <span>Resend in {cooldown}s</span>
                      ) : (
                        <span>Resend Code</span>
                      )}
                    </button>
                  </div>
                </div>
              </motion.form>
            )}

            {/* VIEW 3: FORGOT PASSWORD REQUEST */}
            {view === 'forgot' && (
              <motion.form 
                key="forgot-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleForgotPassword} 
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-bold text-white">Forgot Password</h2>
                  <p className="text-slate-400 text-xs px-2">
                    Enter your registered email address and we will dispatch a secure recovery link via SMTP.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm font-medium"
                      placeholder="your-email@example.com"
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

                <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <>
                        <span>Dispatch Recovery Link</span>
                        <Send size={16} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(null); }}
                    className="text-slate-400 hover:text-white flex items-center justify-center gap-1 text-xs py-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to sign in</span>
                  </button>
                </div>
              </motion.form>
            )}

            {/* VIEW 4: FORGOT PASSWORD SUCCESS ALERT */}
            {view === 'forgot_success' && (
              <motion.div 
                key="forgot-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <Mail size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Check Your Inbox</h2>
                  <p className="text-slate-400 text-sm px-4">
                    A secure, single-use password recovery URL was successfully transmitted to <strong>{email}</strong>.
                  </p>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs leading-relaxed">
                  The link will automatically expire in 1 hour for your security. Please check your spam folder if the email does not arrive.
                </div>

                <button
                  type="button"
                  onClick={() => { setView('login'); setError(null); setInfoMessage(null); }}
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer"
                >
                  Return to sign in
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 pt-8 border-t border-white/5 text-center space-y-3">
             <button
               type="button"
               onClick={() => {
                 window.history.pushState({}, '', '/');
                 window.dispatchEvent(new Event('popstate'));
               }}
               className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 font-semibold"
             >
               <ArrowLeft size={12} />
               <span>Back to Homepage</span>
             </button>
             <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block">
                Protected by Lovely Enterprise Security Node v2.4
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
