import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Megaphone, 
  ListOrdered, 
  Mic2, 
  FileAudio, 
  Settings2, 
  History, 
  Activity,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  Download,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Database,
  Volume2,
  UserPlus,
  AlertCircle,
  Trash2,
  Save,
  VolumeX,
  User,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Campaign, CallLog, VoiceTemplate, AudioAsset } from '../../types';
import { toast } from 'sonner';

const tabs = [
  { id: 'live', label: 'Live Dashboard', icon: Activity },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'logs', label: 'Call Logs', icon: History },
  { id: 'templates', label: 'Voice Templates', icon: Mic2 },
  { id: 'library', label: 'Audio Library', icon: FileAudio },
  { id: 'queue', label: 'Queue', icon: ListOrdered },
  { id: 'config', label: 'API Configuration', icon: Settings2 },
];

export const CommunicationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('live');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [templates, setTemplates] = useState<VoiceTemplate[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({
    activeCalls: 0,
    waitingQueue: 0,
    answeredToday: 0,
    failedBusy: 0,
    recentCalls: [],
    liveQueue: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };

      if (activeTab === 'live') {
        const res = await fetch('/api/communication/dashboard', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load dashboard data');
        setDashboardData(data);
      } else if (activeTab === 'campaigns') {
        const res = await fetch('/api/communication/campaigns', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load campaigns');
        setCampaigns(Array.isArray(data) ? data : []);
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/communication/logs', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load logs');
        setLogs(Array.isArray(data) ? data : []);
      } else if (activeTab === 'templates') {
        const res = await fetch('/api/communication/templates', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load templates');
        setTemplates(Array.isArray(data) ? data : []);
      } else if (activeTab === 'queue') {
        const res = await fetch('/api/communication/queue', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load voice queue');
        setQueue(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error fetching data from server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Communication Center</h1>
          <p className="text-slate-500 mt-1">Manage automated voice call broadcasts, campaigns, and live call routing queues.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (activeTab !== 'campaigns') {
                setActiveTab('campaigns');
              }
              setShowCreateCampaign(true);
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 text-sm shadow-sm"
          >
            <Plus size={18} />
            <span>New Campaign</span>
          </button>
          <button 
            onClick={fetchData}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white transition-all active:scale-95"
            title="Refresh current tab"
          >
            <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Internal Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 flex flex-wrap gap-1 shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setShowCreateCampaign(false);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === tab.id 
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main View Area */}
      <div className="min-h-[450px]">
        {activeTab === 'live' && <LiveDashboard data={dashboardData} isLoading={isLoading} onRefresh={fetchData} />}
        {activeTab === 'campaigns' && (
          <CampaignsList 
            campaigns={campaigns} 
            isLoading={isLoading} 
            showCreateForm={showCreateCampaign} 
            onCloseForm={() => setShowCreateCampaign(false)}
            onRefresh={fetchData} 
          />
        )}
        {activeTab === 'logs' && <CallLogs logs={logs} isLoading={isLoading} onRefresh={fetchData} />}
        {activeTab === 'templates' && <VoiceTemplatesList templates={templates} isLoading={isLoading} onRefresh={fetchData} />}
        {activeTab === 'library' && <AudioLibrary />}
        {activeTab === 'queue' && <QueueManager queue={queue} isLoading={isLoading} onRefresh={fetchData} />}
        {activeTab === 'config' && <ApiConfiguration />}
      </div>
    </div>
  );
};

/* --- LIVE DASHBOARD COMPONENT --- */
const LiveDashboard = ({ data, isLoading, onRefresh }: { data: any; isLoading: boolean; onRefresh: () => void }) => {
  const stats = [
    { label: 'Active Calls', value: data.activeCalls ?? 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Waiting in Queue', value: data.waitingQueue ?? 0, icon: ListOrdered, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Answered Today', value: data.answeredToday ?? 0, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Failed/Busy', value: data.failedBusy ?? 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <RefreshCw className="animate-spin text-slate-800" size={32} />
        <p className="text-sm font-semibold text-slate-500">Loading call stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300/80 transition-all duration-300"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-extrabold mt-1 text-slate-900">{stat.value.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <History size={18} className="text-slate-500" />
              <span>Recent Calls Log</span>
            </h3>
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              LIVE GATEWAY FEED
            </span>
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
            {!data.recentCalls || data.recentCalls.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <VolumeX size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No recent calls found in database.</p>
              </div>
            ) : (
              data.recentCalls.map((call: any, idx: number) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold",
                      call.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                      call.status === "FAILED" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                      call.status === "BUSY" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                      "bg-blue-50 text-blue-700 border border-blue-100"
                    )}>
                      {call.status === "COMPLETED" ? <CheckCircle2 size={18} /> : 
                       call.status === "FAILED" ? <XCircle size={18} /> : <PhoneCall size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{call.customerName || "Manual Customer"}</p>
                      <p className="text-xs text-slate-500 font-semibold">{call.phone} • {call.duration ? `${call.duration}s` : 'no answer'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border",
                      call.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      call.status === 'FAILED' ? "bg-rose-50 text-rose-700 border-rose-100" :
                      call.status === 'BUSY' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {call.status}
                    </span>
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5">{new Date(call.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ListOrdered size={18} className="text-slate-500" />
              <span>Live Queue Feed</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[350px]">
            {!data.liveQueue || data.liveQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-400 my-auto">
                <ListOrdered size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">Queue is empty.</p>
                <p className="text-xs text-slate-400 mt-1">Manual triggers or automated schedules populate this feed.</p>
              </div>
            ) : (
              data.liveQueue.map((item: any, idx: number) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500 font-semibold">{item.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-bold">
                      ৳{item.dueAmount?.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Due: {item.dueDate || 'No Date'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- CAMPAIGNS LIST & CREATE FORM --- */
interface CampaignsListProps {
  campaigns: Campaign[];
  isLoading: boolean;
  showCreateForm: boolean;
  onCloseForm: () => void;
  onRefresh: () => void;
}

const CampaignsList = ({ campaigns, isLoading, showCreateForm, onCloseForm, onRefresh }: CampaignsListProps) => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(showCreateForm);
  const [templates, setTemplates] = useState<VoiceTemplate[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Create Campaign State
  const [cName, setCName] = useState('');
  const [cType, setCType] = useState<'HALKHATA' | 'PROMOTIONAL' | 'REMINDER'>('REMINDER');
  const [cTemplate, setCTemplate] = useState('');
  const [selectedCusts, setSelectedCusts] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setShowCreate(showCreateForm);
  }, [showCreateForm]);

  useEffect(() => {
    if (showCreate) {
      loadCampaignFormResources();
    }
  }, [showCreate]);

  const loadCampaignFormResources = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const tRes = await fetch('/api/communication/templates', { headers });
      const tData = await tRes.json();
      setTemplates(Array.isArray(tData) ? tData : []);

      const cRes = await fetch('/api/erp/customers', { headers });
      const cData = await cRes.json();
      setCustomers(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load customers or templates for creation');
    }
  };

  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return toast.error('Campaign name is required.');
    if (!cTemplate) return toast.error('Please select a voice template.');
    if (selectedCusts.length === 0) return toast.error('Select at least one customer.');

    setIsCreating(true);
    try {
      const res = await fetch('/api/communication/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: cName,
          type: cType,
          voiceTemplateId: cTemplate,
          customerIds: selectedCusts,
          metrics: {
            total: selectedCusts.length,
            answered: 0,
            busy: 0,
            failed: 0,
            noAnswer: 0,
            avgDuration: 0
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register campaign');
      
      toast.success(`Successfully created campaign: ${cName}`);
      setCName('');
      setCTemplate('');
      setSelectedCusts([]);
      setShowCreate(false);
      onCloseForm();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while creating campaign.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartCampaign = async (id: string, name: string) => {
    const confirmStart = window.confirm(`Are you sure you want to trigger automated calls for campaign "${name}" immediately?`);
    if (!confirmStart) return;

    try {
      const res = await fetch('/api/communication/campaigns/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ campaignId: id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to launch calling campaign');

      toast.success(`Campaign "${name}" has been launched successfully! Calls are queued.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error triggering campaign calling system.');
    }
  };

  const selectAllCustomers = () => {
    setSelectedCusts(customers.map(c => c.id));
  };

  const selectCustomersWithDue = () => {
    const dueCusts = customers.filter(c => (c.dueAmount || c.due || 0) > 0);
    if (dueCusts.length === 0) {
      toast.info('No customers currently have an outstanding due amount.');
      return;
    }
    setSelectedCusts(dueCusts.map(c => c.id));
    toast.success(`Selected ${dueCusts.length} customers with outstanding dues.`);
  };

  const toggleCust = (id: string) => {
    setSelectedCusts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showCreate && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Create Automated Call Campaign</h3>
              <button 
                onClick={() => {
                  setShowCreate(false);
                  onCloseForm();
                }}
                className="text-slate-400 hover:text-slate-600 font-semibold text-sm px-2.5 py-1 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campaign Name</label>
                  <input 
                    type="text" 
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="e.g., June HalKhata Invitation Reminder"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campaign Type</label>
                    <select 
                      value={cType}
                      onChange={(e) => setCType(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-medium text-slate-700"
                    >
                      <option value="REMINDER">Due Reminder</option>
                      <option value="HALKHATA">HalKhata Feast</option>
                      <option value="PROMOTIONAL">Promo Broadcast</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Voice Template</label>
                    <select 
                      value={cTemplate}
                      onChange={(e) => setCTemplate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-medium text-slate-700"
                    >
                      <option value="">Select Template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {cTemplate && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 text-xs text-slate-600">
                    <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Mic2 size={14} />
                      Selected Template Speech:
                    </p>
                    <p className="italic bg-white p-2.5 rounded-lg border border-slate-100">
                      "{templates.find(t => t.id === cTemplate)?.text}"
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 flex flex-col">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Recipients ({selectedCusts.length})</label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={selectAllCustomers} 
                      className="text-[11px] font-bold text-slate-800 hover:underline"
                    >
                      All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      type="button" 
                      onClick={selectCustomersWithDue} 
                      className="text-[11px] font-bold text-emerald-600 hover:underline"
                    >
                      Only Due Customers
                    </button>
                    <span className="text-slate-300">|</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCusts([])} 
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden flex-1 max-h-[180px] overflow-y-auto bg-slate-50/50">
                  {customers.length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 text-center">No active customers found to select.</p>
                  ) : (
                    customers.map(c => {
                      const custDue = c.dueAmount || c.due || 0;
                      return (
                        <div 
                          key={c.id} 
                          onClick={() => toggleCust(c.id)}
                          className={cn(
                            "flex items-center justify-between p-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors text-xs font-medium",
                            selectedCusts.includes(c.id) ? "bg-slate-100" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={selectedCusts.includes(c.id)}
                              onChange={() => {}} // Click handled by parent div
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            <div>
                              <p className="font-bold text-slate-800">{c.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{c.phone}</p>
                            </div>
                          </div>
                          {custDue > 0 && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold">
                              ৳{custDue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full mt-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Creating Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone size={16} />
                      <span>Launch Campaign Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search campaigns..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300"
            />
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus size={14} />
            CREATE CAMPAIGN
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="animate-spin text-slate-800" size={24} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Campaign Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Metrics</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                       <Megaphone size={48} className="mx-auto mb-4 opacity-10" />
                       <p className="text-sm font-semibold text-slate-500">No voice campaigns registered yet.</p>
                       <p className="text-xs text-slate-400 mt-1">Register a new campaign and assign it a template to queue robocalls.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((c) => {
                    const total = c.metrics?.total || c.customerIds?.length || 0;
                    const ans = c.metrics?.answered || 0;
                    const fail = (c.metrics?.failed || 0) + (c.metrics?.busy || 0);
                    const percent = total > 0 ? Math.round((ans / total) * 100) : 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group text-sm font-medium">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                              <Clock size={12} />
                              Type: {c.type} • Created: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Draft'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                            c.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                            c.status === 'PAUSED' ? "bg-amber-50 text-amber-700 border-amber-100" :
                            c.status === 'PENDING' ? "bg-slate-50 text-slate-600 border-slate-200" :
                            "bg-blue-50 text-blue-700 border-blue-100"
                          )}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[130px]">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                              <span>{percent}%</span>
                              <span>{ans}/{total}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-900 rounded-full" 
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-4 text-xs">
                              <div className="text-emerald-600">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Ans</p>
                                <span className="font-bold">{ans}</span>
                              </div>
                              <div className="text-rose-600">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Fail</p>
                                <span className="font-bold">{fail}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          {c.status === 'PENDING' ? (
                            <button 
                              onClick={() => handleStartCampaign(c.id, c.name)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                            >
                              <Play size={12} fill="currentColor" />
                              <span>START</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold italic">Processing</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- CALL LOGS TAB --- */
const CallLogs = ({ logs, isLoading, onRefresh }: { logs: CallLog[]; isLoading: boolean; onRefresh: () => void }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(l => 
    l.customerName.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search call logs by phone or customer..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="animate-spin text-slate-800" size={24} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Call Status</th>
                  <th className="px-6 py-4">Call Duration</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <History size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-sm font-semibold text-slate-500">No communication call records found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700">
                      <td className="px-6 py-4 font-bold text-slate-900">{log.customerName}</td>
                      <td className="px-6 py-4 text-slate-600">{log.phone}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border",
                          log.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          log.status === 'FAILED' ? "bg-rose-50 text-rose-700 border-rose-100" :
                          log.status === 'BUSY' ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-blue-50 text-blue-700 border-blue-100"
                        )}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-bold">{log.duration ? `${log.duration} seconds` : '-'}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {log.recordingUrl ? (
                          <a 
                            href={log.recordingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline text-xs font-bold flex items-center gap-1.5"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>LISTEN</span>
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- VOICE TEMPLATES TAB --- */
const VoiceTemplatesList = ({ templates, isLoading, onRefresh }: { templates: VoiceTemplate[]; isLoading: boolean; onRefresh: () => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState<'TTS' | 'RECORDED'>('TTS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Template name is required.');
    if (!text.trim()) return toast.error('Template speech text is required.');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/communication/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, text, type })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register template');

      toast.success('Voice template successfully registered!');
      setName('');
      setText('');
      setShowAdd(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred registering template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Add New Voice Template</h3>
              <button 
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold text-sm px-2.5 py-1 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Halkhata Feast Invitation"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Speech Text (TTS System)</label>
                <textarea 
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Hello {CustomerName}, this is a friendly call from Lovely Enterprise to invite you..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <p className="text-[11px] text-slate-400 font-bold mt-1.5 uppercase">Variables supported: {"{CustomerName}"}, {"{DueAmount}"}</p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Mic2 size={18} className="text-slate-500" />
            <span>Voice Broadcast Templates</span>
          </h3>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            <Plus size={14} />
            ADD TEMPLATE
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-slate-800" size={24} />
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              <Mic2 size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm font-semibold">No voice templates saved in MongoDB.</p>
              <p className="text-xs text-slate-400 mt-1">Add a new template to use in calling campaigns.</p>
            </div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 text-sm">{t.name}</h4>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-extrabold uppercase">
                      {t.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-3 italic leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                    "{t.text}"
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-4 pt-3 border-t border-slate-100">
                  ID: {t.id}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* --- AUDIO LIBRARY TAB --- */
const AudioLibrary = () => {
  const [audios, setAudios] = useState<AudioAsset[]>([
    { id: 'aud-1', name: 'Standard HalKhata FEAST Background Music', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 180, createdAt: '2026-06-25' },
    { id: 'aud-2', name: 'Urgent Due Payment Tone (Ambient)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 150, createdAt: '2026-06-26' }
  ]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePlay = (audio: AudioAsset) => {
    if (playingId === audio.id) {
      audioElement?.pause();
      setPlayingId(null);
    } else {
      audioElement?.pause();
      const el = new Audio(audio.url);
      el.play();
      el.onended = () => setPlayingId(null);
      setAudioElement(el);
      setPlayingId(audio.id);
    }
  };

  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <FileAudio size={18} className="text-slate-500" />
          <span>Background Audio Library</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">Upload ambient sounds, chime recordings, or feast announcement music files to overlay during robocalls.</p>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {audios.map(audio => (
          <div key={audio.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Volume2 size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 line-clamp-1">{audio.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{Math.floor(audio.duration || 0 / 60)}m : {audio.duration ? audio.duration % 60 : '00'}s • Created: {audio.createdAt}</p>
              </div>
            </div>

            <button
              onClick={() => handlePlay(audio)}
              className={cn(
                "p-2.5 rounded-full transition-all active:scale-90",
                playingId === audio.id ? "bg-rose-100 text-rose-700" : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              {playingId === audio.id ? <VolumeX size={16} /> : <Play size={16} fill="currentColor" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- QUEUE MANAGER TAB --- */
const QueueManager = ({ queue, isLoading, onRefresh }: { queue: any[]; isLoading: boolean; onRefresh: () => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required.');
    if (!phone.trim()) return toast.error('Phone number is required.');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/communication/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          phone,
          dueAmount: dueAmount ? Number(dueAmount) : 0,
          dueDate,
          status: 'Queued'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit queue item');

      toast.success('Successfully added contact to live call queue!');
      setName('');
      setPhone('');
      setDueAmount('');
      setDueDate('');
      setShowAdd(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while adding to queue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <UserPlus size={18} />
                <span>Queue Customer Manually</span>
              </h3>
              <button 
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold text-sm px-2.5 py-1 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleQueueSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Milon Hasan"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 01712345678"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Amount (৳)</label>
                <input 
                  type="number" 
                  value={dueAmount}
                  onChange={(e) => setDueAmount(e.target.value)}
                  placeholder="e.g., 2500"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Date</label>
                  <input 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 h-[42px]"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                  <span>Queue</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <ListOrdered size={18} className="text-slate-500" />
            <span>Voice Broadcast Live Queue</span>
          </h3>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            <UserPlus size={14} />
            QUEUE MANUALLY
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="animate-spin text-slate-800" size={24} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Due Amount</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Queue Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <ListOrdered size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-sm font-semibold text-slate-500">Live communication queue is empty.</p>
                      <p className="text-xs text-slate-400 mt-1">Manual entries and pending campaign calls list here before initiation.</p>
                    </td>
                  </tr>
                ) : (
                  queue.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span>{item.name}</span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2 py-5">
                        <Phone size={14} className="text-slate-400" />
                        <span>{item.phone}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-bold">
                        {item.dueAmount ? `৳${item.dueAmount.toLocaleString()}` : '৳0'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {item.dueDate || 'Immediate'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 border border-blue-100 text-blue-700">
                          {item.status || 'Queued'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- API CONFIGURATION TAB --- */
const ApiConfiguration = () => {
  const [apiUrl, setApiUrl] = useState('https://api.infosoftbd.com');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [callerId, setCallerId] = useState('');
  const [defaultVoice, setDefaultVoice] = useState('en-US-Standard-C');
  const [language, setLanguage] = useState('en-US');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [retryCount, setRetryCount] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/communication/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load configuration');

      setApiUrl(data.apiUrl || 'https://api.infosoftbd.com');
      setApiKey(data.apiKey || '');
      setApiSecret(data.apiSecret || '');
      setCallerId(data.callerId || '');
      setDefaultVoice(data.defaultVoice || 'en-US-Standard-C');
      setLanguage(data.language || 'en-US');
      setWebhookUrl(data.webhookUrl || '');
      setRetryCount(data.retryCount || 3);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error loading database config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/communication/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: 'infosoft_config',
          name: 'InfoSoft BD Voice Gateway',
          apiUrl,
          apiKey,
          apiSecret,
          callerId,
          defaultVoice,
          language,
          webhookUrl,
          retryCount: Number(retryCount)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');

      toast.success('InfosoftBD Voice API settings updated and initialized!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <RefreshCw className="animate-spin text-slate-800" size={24} />
        <p className="text-xs font-semibold text-slate-400">Loading configurations...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden max-w-3xl">
      <div className="p-6 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Settings2 size={18} className="text-slate-500" />
          <span>InfosoftBD Voice API Settings</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">Configure credentials for the InfosoftBD Voice Call API Gateway. These are persisted securely on MongoDB Atlas.</p>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Base API URL</label>
            <input 
              type="text" 
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.infosoftbd.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Key</label>
            <input 
              type="text" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API Key"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Secret Key</label>
            <input 
              type="password" 
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Caller ID / Masking</label>
            <input 
              type="text" 
              value={callerId}
              onChange={(e) => setCallerId(e.target.value)}
              placeholder="e.g., 8809612345678"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Default TTS Voice</label>
            <input 
              type="text" 
              value={defaultVoice}
              onChange={(e) => setDefaultVoice(e.target.value)}
              placeholder="e.g., en-US-Standard-C"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Language Locale</label>
            <input 
              type="text" 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g., en-US"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-semibold"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Webhook Status URL</label>
            <input 
              type="text" 
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yourlovely-erp.com/api/voice/webhook"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 text-[11px] font-bold">
            <AlertCircle size={14} />
            DATABASE-ACTIVE STATE
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
