/**
 * Mobile navigation pattern for the admin panel:
 *
 *  - <MobileBottomNav/>  — a fixed bottom navigation bar (phones / small
 *    tablets only, hidden at the `md` breakpoint where the desktop sidebar
 *    takes over). Holds the three most-used modules — Dashboard, হিসাব
 *    (হালখাতা) and বিলিং — plus a "আরও / More" entry.
 *
 *  - <MobileMoreSheet/>  — a native-app style bottom sheet that slides up
 *    from the bottom when "More" is tapped. It contains every remaining
 *    menu entry, grouped with the same structure as the sidebar menu
 *    (Hisab sub-modules grouped by HISAB_NAV groups, Communication &
 *    messaging, Management, Settings incl. Notification Gateways, Logout).
 *    Inventory/CRM & Customers live inside the merged হিসাব (হালখাতা)
 *    module, so they appear in its groups (স্টক / পক্ষ).
 *
 * The sheet dims the background, closes on outside tap, swipe-down on the
 * handle, the Escape key, or the close button. All existing routes keep
 * working — only the navigation UI pattern changes.
 */
import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Calculator,
  Receipt,
  MoreHorizontal,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { cn } from '../../lib/utils';
import { MenuItem, MenuChild, groupChildren } from './adminMenu';

/* ------------------------------------------------------------------ */
/* Bottom navigation bar                                              */
/* ------------------------------------------------------------------ */

interface MobileBottomNavProps {
  activeTab: string;
  isMoreOpen: boolean;
  onSelectTab: (tab: string) => void;
  onToggleMore: () => void;
}

const PRIMARY_TABS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { id: 'hisab', label: 'হালখাতা', icon: Calculator },
  { id: 'billing', label: 'বিলিং', icon: Receipt },
];

// Module-scope so React keeps a stable component identity between renders
// (required for the shared layoutId indicator animation to stay smooth).
const NavButton: React.FC<{
  active: boolean;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}> = ({ active, label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    aria-label={label}
    className="relative flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[44px] select-none touch-manipulation transition-transform duration-150 active:scale-[0.93]"
  >
    {/* active indicator dot */}
    {active && (
      <motion.span
        layoutId="mobile-nav-active-dot"
        className="absolute -top-[3px] w-1.5 h-1.5 rounded-full bg-emerald-600"
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    )}
    <span
      className={cn(
        'flex items-center justify-center w-12 h-7 rounded-full transition-colors duration-200',
        active ? 'bg-emerald-100' : 'bg-transparent',
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} className={active ? 'text-emerald-700' : 'text-slate-400'} />
    </span>
    <span
      className={cn(
        'text-[10px] leading-none font-bold transition-colors duration-200',
        active ? 'text-emerald-700' : 'text-slate-500',
      )}
    >
      {label}
    </span>
  </button>
);

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  isMoreOpen,
  onSelectTab,
  onToggleMore,
}) => {
  const moreActive = isMoreOpen || !PRIMARY_TABS.some((t) => t.id === activeTab);

  return (
    <nav
      aria-label="মোবাইল নেভিগেশন"
      className="mobile-bottom-nav fixed bottom-0 inset-x-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
        {PRIMARY_TABS.map((tab) => (
          <NavButton
            key={tab.id}
            active={activeTab === tab.id}
            label={tab.label}
            icon={tab.icon}
            onClick={() => onSelectTab(tab.id)}
          />
        ))}
        <NavButton
          active={moreActive}
          label={isMoreOpen ? 'বন্ধ' : 'আরও'}
          icon={isMoreOpen ? X : MoreHorizontal}
          onClick={onToggleMore}
        />
      </div>
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/* "More" bottom sheet                                                */
/* ------------------------------------------------------------------ */

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  activeTab: string;
  activeSubTab: string;
  onSelectTab: (tab: string) => void;
  onSelectSubTab: (sub: string) => void;
  onLogout: () => void;
}

const SectionHeader: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div className="px-1 pt-5 pb-1.5 flex items-baseline justify-between gap-2">
    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{title}</span>
    {sub && <span className="text-[10px] font-semibold text-slate-300 truncate">{sub}</span>}
  </div>
);

const SheetRow: React.FC<{
  icon: React.ElementType;
  label: string;
  sub?: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, sub, active, danger, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2 rounded-xl min-h-[48px] text-left transition-colors duration-150 touch-manipulation',
      active
        ? 'bg-emerald-600 text-white shadow-sm'
        : danger
          ? 'text-red-500 hover:bg-red-50 active:bg-red-100'
          : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
    )}
  >
    <Icon size={18} className={cn('shrink-0', active ? 'text-white' : danger ? 'text-red-400' : 'text-slate-400')} />
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-semibold leading-tight truncate">{label}</span>
      {sub && (
        <span
          className={cn(
            'block text-[10px] font-medium leading-tight truncate',
            active ? 'text-emerald-100' : 'text-slate-400',
          )}
        >
          {sub}
        </span>
      )}
    </span>
    {active && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
    {!active && !danger && <ChevronRight size={15} className="text-slate-300 shrink-0" />}
  </button>
);

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  open,
  onClose,
  menuItems,
  activeTab,
  activeSubTab,
  onSelectTab,
  onSelectSubTab,
  onLogout,
}) => {
  const dragControls = useDragControls();

  // Close with the Escape key while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const byId = (id: string) => menuItems.find((i) => i.id === id);
  const hisab = byId('hisab');
  const settings = byId('settings');

  // Grouped exactly like the sidebar menu — never a random list.
  const communicationGroup = [byId('communication'), byId('whatsapp')].filter(Boolean) as MenuItem[];
  const managementGroup = [byId('awards'), byId('inbox'), byId('adminManagement')].filter(Boolean) as MenuItem[];

  const goTo = (tab: string, sub?: string) => {
    onSelectTab(tab);
    if (sub) onSelectSubTab(sub);
    onClose();
  };

  const renderChildRow = (parentId: string, child: MenuChild) => (
    <SheetRow
      key={`${parentId}-${child.id}`}
      icon={child.icon}
      label={child.label}
      sub={child.sub}
      active={activeTab === parentId && activeSubTab === child.id}
      onClick={() => goTo(parentId, child.id)}
    />
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="more-sheet-root"
          className="fixed inset-0 z-40 md:hidden"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Dimmed backdrop — tap outside to close */}
          <motion.div
            key="more-sheet-backdrop"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
          />

          {/* Sliding sheet */}
          <motion.div
            key="more-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="আরও মেনু"
            variants={{ hidden: { y: '100%' }, visible: { y: 0 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.8 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
            className="absolute inset-x-0 bottom-0 bg-slate-50 rounded-t-3xl shadow-[0_-12px_40px_rgba(15,23,42,0.25)] flex flex-col more-sheet-max-h"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle + header (drag anywhere here to swipe the sheet down) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-slate-300" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2 pt-1">
                <div>
                  <p className="text-sm font-black text-slate-800">আরও মেনু</p>
                  <p className="text-[10px] font-semibold text-slate-400">More — বাকি সব মডিউল</p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="মেনু বন্ধ করুন"
                  className="p-2.5 -mr-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable grouped menu */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-3 pb-4">
              {/* হিসাব (হালখাতা) — merged CRM/Customers, inventory & the rest of the module, grouped */}
              {hisab?.children && (
                <>
                  <SectionHeader title="হিসাব — হালখাতা মডিউল" sub="Hisab · CRM, Inventory, লেনদেন" />
                  {groupChildren(hisab.children).map((g) => (
                    <div key={g.group} className="mb-1">
                      <p className="px-3 pt-2 pb-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600/70">
                        {g.group}
                      </p>
                      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-1 space-y-0.5">
                        {g.items.map((child) => renderChildRow('hisab', child))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Communication & messaging */}
              {communicationGroup.length > 0 && (
                <>
                  <SectionHeader title="যোগাযোগ ও মেসেজিং" sub="Communication" />
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-1 space-y-0.5">
                    {communicationGroup.map((item) => (
                      <SheetRow
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        sub={item.sub}
                        active={activeTab === item.id}
                        onClick={() => goTo(item.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Management */}
              {managementGroup.length > 0 && (
                <>
                  <SectionHeader title="ব্যবস্থাপনা" sub="Management" />
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-1 space-y-0.5">
                    {managementGroup.map((item) => (
                      <SheetRow
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        sub={item.sub}
                        active={activeTab === item.id}
                        onClick={() => goTo(item.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Settings group (incl. Notification Gateways) */}
              {settings?.children && (
                <>
                  <SectionHeader title="সেটিংস ও ডায়াগনস্টিকস" sub="Settings" />
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-1 space-y-0.5">
                    {settings.children.map((child) => renderChildRow('settings', child))}
                  </div>
                </>
              )}

              {/* Logout */}
              <div className="mt-5 mb-1">
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-1">
                  <SheetRow
                    icon={LogOut}
                    label="লগআউট"
                    sub="Logout"
                    danger
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
