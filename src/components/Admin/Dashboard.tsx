import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  ShoppingBag,
  CreditCard,
  PieChart,
  BarChart
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ totalRevenue: 0, activeCustomers: 0, totalSales: 0, inventoryItems: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token');
        const [statsRes, revenueRes, activityRes] = await Promise.all([
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/revenue', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/dashboard/activity', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (statsRes.status === 401 || statsRes.status === 403 || revenueRes.status === 401 || revenueRes.status === 403 || activityRes.status === 401 || activityRes.status === 403) {
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_user');
          window.location.href = '/login';
          return;
        }

        if (!statsRes.ok || !revenueRes.ok || !activityRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        setStats(await statsRes.json());
        setRevenueData(await revenueRes.json());
        setActivity(await activityRes.json());
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchData();
  }, []);

  const statsDisplay = [
    { label: 'Total Revenue', value: `৳ ${(stats?.totalRevenue || 0).toLocaleString()}`, trend: '', isUp: true, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Customers', value: (stats?.activeCustomers || 0).toLocaleString(), trend: '', isUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Sales', value: (stats?.totalSales || 0).toLocaleString(), trend: '', isUp: false, icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Inventory Items', value: (stats?.inventoryItems || 0).toLocaleString(), trend: '', isUp: true, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const getActiveName = () => {
    try {
      const userJson = localStorage.getItem('erp_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        const nameParts = (u.name || 'Admin').split(' ');
        return nameParts[0] || 'Admin';
      }
    } catch (e) {
      console.error(e);
    }
    return 'Admin';
  };

  const activeName = getActiveName();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enterprise Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {activeName}. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            Export Report
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200">
            View Analytics
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsDisplay.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.trend}
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black mt-1 text-slate-900 tracking-tight">{stat.value}</p>
            </div>
            {/* Background Decoration */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Revenue Overview</h3>
              <p className="text-sm text-slate-500">Sales vs Revenue for the past 7 days</p>
            </div>
            <select className="bg-slate-50 border-none text-xs font-bold text-slate-500 rounded-lg px-3 py-2 focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Live Activity</h3>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {activity.map((activity: any, i) => (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-default group">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-12", activity.type === 'LEDGER' ? 'bg-emerald-50' : 'bg-blue-50')}>
                  {activity.type === 'LEDGER' ? <ShoppingBag size={18} className="text-emerald-500" /> : <PhoneCall size={18} className="text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-slate-900 truncate">{activity.user}</p>
                    <p className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2 uppercase">{activity.time}</p>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activity.type}</p>
                    <p className={cn("text-xs font-bold", activity.type === 'LEDGER' ? 'text-emerald-500' : 'text-blue-500')}>{activity.amount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="p-4 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-t border-slate-50 transition-colors uppercase tracking-widest">
            View Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};

// Add PhoneCall import
import { PhoneCall } from 'lucide-react';
