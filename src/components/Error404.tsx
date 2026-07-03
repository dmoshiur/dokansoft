import React from 'react';
import { HelpCircle, ArrowLeft, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Error404: React.FC = () => {
  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  };

  const handleGoLogin = () => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[140px]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-10 rounded-[32px] border border-white/10 shadow-2xl text-center relative z-10"
      >
        {/* Animated Icon */}
        <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-lg shadow-amber-500/5">
          <HelpCircle size={40} className="text-amber-500 animate-bounce" />
        </div>

        {/* Display Error Typography */}
        <h1 className="text-8xl font-black text-white tracking-tight leading-none mb-2 select-none">
          404
        </h1>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-4">
          Page Not Found
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          The requested resource could not be found or you do not have permission to access this route.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20 cursor-pointer text-sm"
          >
            <ArrowLeft size={16} />
            <span>Go to Homepage</span>
          </button>
          
          <button
            onClick={handleGoLogin}
            className="w-full bg-white/5 hover:bg-white/10 text-slate-200 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-white/10 cursor-pointer text-sm"
          >
            <LogIn size={16} />
            <span>Go to Login Page</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
