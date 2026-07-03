import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface Error500Props {
  errorDetails?: string;
  onRetry?: () => void;
}

export const Error500: React.FC<Error500Props> = ({ errorDetails, onRetry }) => {
  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  };

  const handleDefaultRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-10 rounded-[32px] border border-white/10 shadow-2xl text-center relative z-10"
      >
        {/* Animated Icon */}
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-lg shadow-rose-500/5">
          <AlertTriangle size={40} className="text-rose-500 animate-pulse" />
        </div>

        {/* Display Error Typography */}
        <h1 className="text-8xl font-black text-white tracking-tight leading-none mb-2 select-none">
          500
        </h1>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-4">
          Internal Server Error
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Something went wrong on our end. Please try again.
        </p>

        {errorDetails && (
          <div className="bg-rose-950/30 border border-rose-500/20 rounded-2xl p-4 text-left font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto mb-8 leading-normal">
            <span className="font-bold uppercase tracking-wider block mb-1">Error Trace:</span>
            {errorDetails}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleDefaultRetry}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-rose-600/20 cursor-pointer text-sm"
          >
            <RotateCcw size={16} />
            <span>Retry Operation</span>
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full bg-white/5 hover:bg-white/10 text-slate-200 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-white/10 cursor-pointer text-sm"
          >
            <Home size={16} />
            <span>Go to Homepage</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
export default Error500;
