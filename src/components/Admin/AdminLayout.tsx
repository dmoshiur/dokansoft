import React, { useState } from 'react';
import { LogOut, Bell, Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useERPStore } from '../../store';
import { MenuItem, getMenuItems, groupChildren } from './adminMenu';
import { MobileBottomNav, MobileMoreSheet } from './MobileNavigation';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  activeSubTab: string;
  onSelectSubTab: (sub: string) => void;
  onLogout: () => void;
  role: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
  activeSubTab,
  onSelectSubTab,
  onLogout,
  role,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { state } = useERPStore();

  const shopName = state.config?.shopName || 'M/S Mahi and Muhi Traders';
  const brandShort = shopName.toUpperCase().includes('MAHI') ? 'Mahi & Muhi Traders' : shopName;
  const monogram = brandShort.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() || 'MM';

  const menuItems = getMenuItems(role);

  const getActiveUser = () => {
    try {
      const userJson = localStorage.getItem('erp_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        const adminFromStore = state.admins.find((a) => a.email.toLowerCase() === u.email?.toLowerCase());
        if (adminFromStore) {
          return {
            name: adminFromStore.name,
            role: adminFromStore.role,
            email: adminFromStore.email,
            profileImage: adminFromStore.profileImage,
          };
        }
        return {
          name: u.name || 'Admin User',
          role: u.role === 'admin' ? 'Super Admin' : u.role || 'Staff',
          email: u.email || '',
          profileImage: u.profileImage,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      name: 'Moshiur Rahman',
      role: 'Super Admin',
      email: 'mdmoshiurrahmanmohi1@gmail.com',
      profileImage: null,
    };
  };

  const activeUser = getActiveUser();

  const getInitials = (name: string) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleParentClick = (item: MenuItem) => {
    if (!item.children || !item.children.length) {
      onSelectTab(item.id);
      setExpanded(null);
      return;
    }
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpanded(item.id);
      return;
    }
    setExpanded((prev) => (prev === item.id ? null : item.id));
  };

  const handleChildClick = (parentId: string, childId: string) => {
    onSelectTab(parentId);
    onSelectSubTab(childId);
    setExpanded(parentId);
  };

  // Shared nav renderer used by the desktop sidebar.
  const renderNav = (opts: { collapsed: boolean; onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const hasChildren = !!item.children?.length;
        const isActiveTab = activeTab === item.id;
        const isExpanded = expanded === item.id;

        return (
          <div key={item.id}>
            <button
              onClick={() => {
                handleParentClick(item);
                if (!hasChildren) opts.onNavigate?.();
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                isActiveTab
                  ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActiveTab ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600')} />
              {!opts.collapsed && (
                <span className="flex-1 text-left min-w-0">
                  <span className="block text-sm leading-tight truncate">{item.label}</span>
                  {item.sub && <span className="block text-[10px] font-medium text-slate-400 leading-tight truncate">{item.sub}</span>}
                </span>
              )}
              {!opts.collapsed && hasChildren && (
                <ChevronDown size={16} className={cn('text-slate-400 transition-transform', isExpanded && 'rotate-180')} />
              )}
              {isActiveTab && (
                <motion.div layoutId="activeTab" className="absolute left-0 w-1 h-8 bg-emerald-600 rounded-r-full" />
              )}
              {opts.collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </button>

            {/* Inline accordion submenu */}
            {!opts.collapsed && hasChildren && isExpanded && (
              <div className="ml-4 pl-4 border-l border-slate-200 my-1 space-y-0.5">
                {groupChildren(item.children!).map((g) => (
                  <div key={g.group}>
                    <span className="block px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {g.group}
                    </span>
                    {g.items.map((child) => {
                      const isActiveChild = isActiveTab && activeSubTab === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => {
                            handleChildClick(item.id, child.id);
                            opts.onNavigate?.();
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors',
                            isActiveChild ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                          )}
                        >
                          <child.icon size={15} className={isActiveChild ? 'text-white' : 'text-slate-400'} />
                          <span className="flex-1 text-left leading-tight">
                            <span className="block truncate">{child.label}</span>
                            {child.sub && <span className={cn('block text-[10px] font-medium truncate', isActiveChild ? 'text-emerald-100' : 'text-slate-400')}>{child.sub}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className={cn(
          'hidden md:flex flex-col bg-white border-r border-slate-200 z-30 relative transition-all duration-300 ease-in-out',
          isCollapsed ? 'items-center' : '',
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2 font-bold text-xl text-emerald-600 tracking-tight">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-black">{monogram}</div>
              <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]">{brandShort}</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-base">{monogram}</div>
          )}
        </div>

        <div className="flex-1 px-4 mt-2 overflow-y-auto custom-scrollbar">
          {renderNav({ collapsed: isCollapsed })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /><span className="text-sm">Collapse Menu</span></div>}
          </button>

          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={20} />
            {!isCollapsed && <span className="text-sm font-medium">লগআউট</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile brand mark — replaces the old hamburger (navigation now
                lives in the bottom bar below md breakpoint) */}
            <div className="flex md:hidden items-center gap-2 font-bold text-emerald-600">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-xs font-black">
                {monogram}
              </div>
              <span className="text-sm truncate max-w-[150px]">{brandShort}</span>
            </div>
            <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 w-full max-w-md gap-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 transition-all">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="খুঁজুন…"
                className="bg-transparent border-none focus:outline-none text-sm w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold leading-none">{activeUser.name}</p>
                <p className="text-xs text-slate-500 mt-1">{activeUser.role}</p>
              </div>
              {activeUser.profileImage ? (
                <img
                  src={activeUser.profileImage}
                  alt={activeUser.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/20 shadow-inner"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-700 font-bold shadow-inner">
                  {getInitials(activeUser.name)}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Container — extra bottom padding below md so content is never
            hidden behind the fixed mobile bottom navigation bar. */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-md:pb-28 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${activeSubTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom navigation + "More" sheet (hidden on desktop, where
          the sidebar above is used instead). */}
      <MobileBottomNav
        activeTab={activeTab}
        isMoreOpen={isMoreOpen}
        onSelectTab={onSelectTab}
        onToggleMore={() => setIsMoreOpen((v) => !v)}
      />
      <MobileMoreSheet
        open={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        menuItems={menuItems}
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onSelectTab={onSelectTab}
        onSelectSubTab={onSelectSubTab}
        onLogout={onLogout}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        /* Max height for the "More" bottom sheet — dvh where supported so it
           tracks the dynamic iOS toolbar, vh as a universal fallback. */
        .more-sheet-max-h {
          max-height: 85vh;
          max-height: 85dvh;
        }
      `}</style>
    </div>
  );
};
