/**
 * Shared UI primitives for the Hisab (accounting) module.
 */
import React from 'react';
import { X, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('bg-white rounded-2xl border border-slate-200 shadow-sm', className)}>{children}</div>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="text-slate-500 mt-0.5 text-sm">{subtitle}</p>}
    </div>
    {right && <div className="flex items-center gap-2">{right}</div>}
  </div>
);

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

const btnStyles: Record<BtnVariant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
  outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }
> = ({ variant = 'primary', size = 'md', className, children, ...rest }) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
      btnStyles[variant],
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

export const Badge: React.FC<{ tone?: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'indigo'; children: React.ReactNode }> = ({ tone = 'slate', children }) => {
  const map = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  } as const;
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border', map[tone])}>{children}</span>;
};

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, children, width = 'max-w-lg' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className={cn('bg-white rounded-2xl shadow-2xl w-full my-8', width)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <label className={cn('block', className)}>
    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input ref={ref} className={cn(inputCls, props.className)} {...props} />,
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) => <select ref={ref} className={cn(inputCls, props.className)} {...props} />,
);
Select.displayName = 'Select';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => <textarea ref={ref} className={cn(inputCls, 'min-h-[80px]', props.className)} {...props} />,
);
TextArea.displayName = 'TextArea';

export const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'indigo' | 'slate';
}> = ({ label, value, sub, icon: Icon, tone = 'green' }) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600',
  } as const;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', tones[tone])}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="text-xl font-black text-slate-900 truncate">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
    </Card>
  );
};

export const EmptyState: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
      <Inbox size={26} className="text-slate-400" />
    </div>
    <p className="font-semibold text-slate-700">{title}</p>
    {subtitle && <p className="text-sm text-slate-400 mt-1 max-w-sm">{subtitle}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <th className={cn('px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap', className)}>{children}</th>
);

export const Td: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={cn('px-4 py-3 text-sm text-slate-700', className)}>{children}</td>
);

export const Table: React.FC<{ head: React.ReactNode; children: React.ReactNode }> = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="border-b border-slate-100 bg-slate-50/50">
        <tr>{head}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const Tabs: React.FC<{ tabs: { id: string; label: string; icon?: React.ElementType }[]; active: string; onChange: (id: string) => void }> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors',
          active === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
        )}
      >
        {t.icon && <t.icon size={16} />}
        {t.label}
      </button>
    ))}
  </div>
);
