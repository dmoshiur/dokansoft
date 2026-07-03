import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  PhoneCall, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Receipt,
  Trophy,
  Inbox,
  UserCog
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useERPStore } from '../../store';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  role: string;
}

const getMenuItems = (role: string) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing / Memo', icon: Receipt },
    { id: 'communication', label: 'Communication', icon: PhoneCall },
    { id: 'crm', label: 'CRM / Customers', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'halkhata', label: 'HalKhata', icon: TrendingUp },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'awards', label: 'Awards Management', icon: Trophy },
    { id: 'inbox', label: 'Admin Inbox', icon: Inbox },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (role === 'Super Admin' || role === 'admin') {
    items.push({ id: 'adminManagement', label: 'Admin Management', icon: UserCog });
  }

  return items;
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, setActiveTab, onLogout, role }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { state } = useERPStore();
  
  const menuItems = getMenuItems(role);

  const getActiveUser = () => {
    try {
      const userJson = localStorage.getItem('erp_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        const adminFromStore = state.admins.find(a => a.email.toLowerCase() === u.email?.toLowerCase());
        if (adminFromStore) {
          return {
            name: adminFromStore.name,
            role: adminFromStore.role,
            email: adminFromStore.email,
            profileImage: adminFromStore.profileImage
          };
        }
        return {
          name: u.name || 'Admin User',
          role: u.role === 'admin' ? 'Super Admin' : (u.role || 'Staff'),
          email: u.email || '',
          profileImage: u.profileImage
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      name: 'Moshiur Rahman',
      role: 'Super Admin',
      email: 'mdmoshiurrahmanmohi1@gmail.com',
      profileImage: null
    };
  };

  const activeUser = getActiveUser();

  const getInitials = (name: string) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className={cn(
          "hidden md:flex flex-col bg-white border-r border-slate-200 z-30 relative transition-all duration-300 ease-in-out",
          isCollapsed ? "items-center" : ""
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-bold text-xl text-emerald-600 tracking-tight"
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">L</div>
              <span>Lovely ERP</span>
            </motion.div>
          )}
          {isCollapsed && (
             <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">L</div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                activeTab === item.id 
                  ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600")} />
              {!isCollapsed && <span className="text-sm">{item.label}</span>}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute left-0 w-1 h-6 bg-emerald-600 rounded-r-full"
                />
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /><span className="text-sm">Collapse Menu</span></div>}
          </button>
          
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={20} />
            {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 w-full max-w-md gap-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 transition-all">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
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

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
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

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 font-bold text-xl text-emerald-600">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">L</div>
                  <span>Lovely ERP</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              <nav className="flex-1 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                      activeTab === item.id 
                        ? "bg-emerald-50 text-emerald-700 font-medium" 
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <item.icon size={20} className={activeTab === item.id ? "text-emerald-600" : "text-slate-400"} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-slate-100">
                 <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <LogOut size={20} />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
      `}</style>
    </div>
  );
};
