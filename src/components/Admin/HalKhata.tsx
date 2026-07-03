import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Users, 
  Megaphone, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  ArrowRight,
  Filter,
  Search,
  Download,
  Share2,
  Trash2,
  ChevronRight,
  X,
  MapPin,
  Check,
  Send,
  PhoneCall,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useERPStore } from '../../store';
import { HalKhataEvent, HalKhataCustomerRecord } from '../../types';
import { toast } from 'sonner';

export const HalKhata: React.FC = () => {
  const store = useERPStore();
  const { state, addHalkhataEvent, deleteHalkhataEvent } = store;
  const events = state.halkhata || [];

  // Active state
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showInviteeList, setShowInviteeList] = useState(false);
  const [inviteeSearch, setInviteeSearch] = useState('');

  // Create event form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('10:00 AM');
  const [formEndTime, setFormEndTime] = useState('06:00 PM');
  const [formLocation, setFormLocation] = useState('Main Showroom, Dhaka');
  const [formDescription, setFormDescription] = useState('Annual collection festival & feast');
  const [formTemplate, setFormTemplate] = useState(
    'Dear {CustomerName}, you are cordially invited to our grand HalKhata feast at {ShopName}. Settle your outstanding due balance of ৳{DueAmount} BDT. Location: {Address} on {EventDate} starting from {StartTime}.'
  );
  const [formReminder, setFormReminder] = useState('Standard');

  // Selected event
  const activeEvent = events.find(e => e.id === activeEventId) || events[0] || null;

  // Global metrics based on DB
  const totalDuesAcrossCustomers = state.customers?.reduce((sum, c) => sum + (c.dueAmount || 0), 0) || 0;
  
  const totalHalkhataCollected = events.reduce((total, ev) => {
    const inviteeIds = new Set(ev.customerRecords.map(r => r.customerId));
    const eventCollected = state.payments
      ?.filter(p => p.status === 'VERIFIED' && inviteeIds.has(p.customerId))
      ?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return total + eventCollected;
  }, 0);

  // Active event calculations
  let inviteeIds = new Set<string>();
  let targetDebt = 0;
  let collected = 0;
  let inPipeline = 0;
  let inviteesCount = 0;
  let progress = 0;

  if (activeEvent) {
    inviteeIds = new Set(activeEvent.customerRecords.map(r => r.customerId));
    targetDebt = activeEvent.customerRecords.reduce((sum, r) => sum + (r.dueAmount || 0), 0);
    inviteesCount = activeEvent.customerRecords.length;

    collected = state.payments
      ?.filter(p => p.status === 'VERIFIED' && inviteeIds.has(p.customerId))
      ?.reduce((sum, p) => sum + p.amount, 0) || 0;

    inPipeline = state.payments
      ?.filter(p => p.status === 'PENDING' && inviteeIds.has(p.customerId))
      ?.reduce((sum, p) => sum + p.amount, 0) || 0;

    progress = targetDebt > 0 ? Math.round((collected / targetDebt) * 100) : 0;
  }

  // Handle Create Event Submit
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate) {
      toast.error('Please fill in at least the Title and Date of the event.');
      return;
    }

    const eligibleCount = state.customers?.filter(c => c.dueAmount > 0).length || 0;
    if (eligibleCount === 0) {
      toast.error('No customers with active outstanding dues found. Cannot schedule event.');
      return;
    }

    try {
      addHalkhataEvent({
        title: formTitle,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        location: formLocation,
        description: formDescription,
        invitationTemplate: formTemplate,
        reminderSchedule: formReminder,
      });

      toast.success(`Successfully scheduled ${formTitle} for ${eligibleCount} debtors!`);
      setIsCreateModalOpen(false);
      // Reset form
      setFormTitle('');
      setFormDate('');
    } catch (err: any) {
      toast.error(`Error scheduling event: ${err.message}`);
    }
  };

  const handleDeleteEvent = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteHalkhataEvent(id);
      toast.success(`Event "${title}" has been deleted.`);
      if (activeEventId === id) {
        setActiveEventId(null);
      }
    }
  };

  // Filter invitees
  const filteredInvitees = activeEvent
    ? activeEvent.customerRecords.filter(r => 
        r.customerName.toLowerCase().includes(inviteeSearch.toLowerCase()) ||
        (r.customerPhone && r.customerPhone.includes(inviteeSearch))
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">HalKhata Platform</h1>
          <p className="text-slate-500 mt-1">Organize collection festivals and automated debt reminders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm shadow-emerald-200 active:scale-95"
          >
            <Plus size={18} />
            Schedule New Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Events Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">HalKhata Events</h3>
            {events.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-2xl">
                <Calendar size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No scheduled events found.</p>
                <p className="text-[10px] text-slate-400 mt-1">Click "Schedule New Event" to register a live festival and invite debtors.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const evInviteeIds = new Set(event.customerRecords.map(r => r.customerId));
                  const evTarget = event.customerRecords.reduce((sum, r) => sum + (r.dueAmount || 0), 0);
                  const evColl = state.payments
                    ?.filter(p => p.status === 'VERIFIED' && evInviteeIds.has(p.customerId))
                    ?.reduce((sum, p) => sum + p.amount, 0) || 0;
                  const evProgress = evTarget > 0 ? Math.round((evColl / evTarget) * 100) : 0;

                  return (
                    <button 
                      key={event.id}
                      onClick={() => {
                        setActiveEventId(event.id);
                        setShowInviteeList(false);
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden",
                        activeEvent && activeEvent.id === event.id 
                          ? "border-emerald-500 bg-emerald-50/20" 
                          : "border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/10"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                          event.status === 'UPCOMING' ? "bg-amber-100 text-amber-700" :
                          event.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {event.status}
                        </span>
                        <ChevronRight size={14} className={cn(
                          "text-slate-300 group-hover:translate-x-1 transition-transform",
                          activeEvent && activeEvent.id === event.id && "text-emerald-500 translate-x-1"
                        )} />
                      </div>
                      <h4 className="font-bold text-slate-900 mt-2">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <Calendar size={12} />
                        {event.date}
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>COLLECTION PROGRESS</span>
                          <span>{evProgress}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${evProgress}%` }} 
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-bold text-lg">Halkhata Analytics</h4>
              <p className="text-slate-400 text-xs mt-1">Overall collection health this season.</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-3xl font-black">৳ {(totalHalkhataCollected || 0).toLocaleString()}</span>
                <span className="text-emerald-400 text-xs font-bold">
                  {events.length > 0 ? `From ${events.length} event(s)` : 'No active festivals'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Total active due portfolio outstanding is <span className="text-white font-bold">৳ {totalDuesAcrossCustomers.toLocaleString()}</span> BDT.
              </p>
            </div>
            <TrendingUp size={80} className="absolute -right-4 -bottom-4 text-white/5 pointer-events-none" />
          </div>
        </div>

        {/* Event Detail / Campaign Control */}
        <div className="lg:col-span-2 space-y-6">
          {!activeEvent ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
              <Calendar size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">No Event Selected</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
                Select a scheduled event from the sidebar or click "Schedule New Event" to initialize a grand collection festival.
              </p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                <Plus size={16} />
                Create New Event Now
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{activeEvent.title}</h2>
                    <p className="text-slate-500 text-sm mt-1">{activeEvent.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" /> Date: {activeEvent.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" /> Hours: {activeEvent.startTime} - {activeEvent.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400" /> Location: {activeEvent.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button 
                      onClick={() => handleDeleteEvent(activeEvent.id, activeEvent.title)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete event"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Debt</p>
                    <p className="text-lg font-black text-slate-900 mt-1">৳ {targetDebt.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Collected</p>
                    <p className="text-lg font-black text-emerald-700 mt-1">৳ {collected.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">In Pipeline</p>
                    <p className="text-lg font-black text-amber-700 mt-1">৳ {inPipeline.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invitees</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{inviteesCount}</p>
                  </div>
                </div>
              </div>

              {!showInviteeList ? (
                <div className="p-8 space-y-6">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Megaphone size={18} className="text-emerald-600" />
                    Automated Communication Flow Queues
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Phase 1 */}
                    {activeEvent.queues?.whatsApp && (
                      <CommunicationStep 
                        title="Phase 1: Invitation Broadcast" 
                        desc={`Sends instant invitations via WhatsApp and SMS containing the personalized ledger access token links.`}
                        status={activeEvent.queues.whatsApp.some(q => q.status === 'Sent') ? "COMPLETED" : "ACTIVE"}
                        time="At Scheduling"
                        isActionable={activeEvent.queues.whatsApp.length > 0}
                        total={activeEvent.queues.whatsApp.length}
                        completed={activeEvent.queues.whatsApp.filter(q => q.status === 'Sent' || q.status === 'COMPLETED').length}
                      />
                    )}

                    {/* Phase 2 */}
                    {activeEvent.queues?.calls && (
                      <CommunicationStep 
                        title="Phase 2: Automated Voice Campaign" 
                        desc="Triggers personalized robocall broadcasts using the registered TTS template configuration."
                        status={activeEvent.queues.calls.some(c => c.status === 'Success' || c.status === 'Completed') ? "COMPLETED" : "ACTIVE"}
                        time="Scheduled"
                        isActionable={activeEvent.queues.calls.length > 0}
                        total={activeEvent.queues.calls.length}
                        completed={activeEvent.queues.calls.filter(c => c.status === 'Success' || c.status === 'Completed' || c.status === 'COMPLETED').length}
                      />
                    )}

                    {/* Phase 3 */}
                    {activeEvent.queues?.emails && (
                      <CommunicationStep 
                        title="Phase 3: Backup Email Communications" 
                        desc="Dispatches secure digital invitation backups and invoice statements directly to billing emails."
                        status={activeEvent.queues.emails.length > 0 ? "ACTIVE" : "PENDING"}
                        time="In parallel"
                        isActionable={activeEvent.queues.emails.length > 0}
                        total={activeEvent.queues.emails.length}
                        completed={activeEvent.queues.emails.filter(e => e.status === 'Sent' || e.status === 'COMPLETED').length}
                      />
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      onClick={() => setShowInviteeList(true)}
                      className="px-6 py-2 bg-slate-100 text-slate-800 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all active:scale-95"
                    >
                      View Invitee & Ledger Status List
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowInviteeList(false)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <h4 className="font-bold text-slate-900 text-base">Invitee Ledger Directory</h4>
                    </div>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search invitees..."
                        value={inviteeSearch}
                        onChange={(e) => setInviteeSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 w-full sm:w-60 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs font-medium border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3 text-right">Dues Portfolio</th>
                          <th className="px-4 py-3 text-center">Verification Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredInvitees.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium">
                              No invitees matching the search query.
                            </td>
                          </tr>
                        ) : (
                          filteredInvitees.map((record) => {
                            // Find real customer payment status
                            const customerPayments = state.payments?.filter(p => p.customerId === record.customerId) || [];
                            const verifiedPayment = customerPayments.find(p => p.status === 'VERIFIED');
                            const pendingPayment = customerPayments.find(p => p.status === 'PENDING');

                            let displayStatus = record.verificationStatus;
                            if (verifiedPayment) displayStatus = "Verified";
                            else if (pendingPayment) displayStatus = "Pending";

                            return (
                              <tr key={record.customerId} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-bold text-slate-900">{record.customerName}</td>
                                <td className="px-4 py-3 text-slate-500 font-mono">{record.customerPhone || "N/A"}</td>
                                <td className="px-4 py-3 text-right font-black text-slate-800">৳ {record.dueAmount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-bold",
                                    displayStatus === 'Verified' ? "bg-emerald-100 text-emerald-800" :
                                    displayStatus === 'Pending' ? "bg-amber-100 text-amber-800" :
                                    "bg-slate-100 text-slate-600"
                                  )}>
                                    {displayStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <p className="text-[10px] text-slate-400 font-medium">
                      Showing {filteredInvitees.length} out of {activeEvent.customerRecords.length} debtors invited.
                    </p>
                    <button 
                      onClick={() => setShowInviteeList(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
                    >
                      Back to Flow Queues
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Event Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Schedule HalKhata Event</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Initialize a collection feast campaign and invite debtors with active balances.</p>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Event Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Annual Year-End Closing 2026"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Event Date</label>
                    <input 
                      type="date" 
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Start Time</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 10:00 AM"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">End Time</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 06:00 PM"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Main Showroom Office, Dhaka"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Brief details about feast or session..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all font-semibold text-slate-700 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Invitation TTS/WhatsApp Template</label>
                    <span className="text-[10px] text-emerald-600 font-bold">Placeholders supported: {'{CustomerName}, {DueAmount}'}</span>
                  </div>
                  <textarea 
                    rows={3}
                    placeholder="Write a warm custom invitation..."
                    value={formTemplate}
                    onChange={(e) => setFormTemplate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition-all font-medium text-slate-700 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 shadow-sm shadow-emerald-200"
                  >
                    Schedule Festival
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CommunicationStep = ({ title, desc, status, time, isActionable, total, completed }: any) => (
  <div className={cn(
    "p-4 rounded-2xl border flex items-start gap-4 transition-all",
    status === 'ACTIVE' ? "border-emerald-200 bg-emerald-50/30" : 
    status === 'COMPLETED' ? "border-slate-100 bg-slate-50/50 opacity-70" :
    "border-slate-100 bg-white"
  )}>
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
      status === 'ACTIVE' ? "bg-emerald-600 text-white animate-pulse" : 
      status === 'COMPLETED' ? "bg-slate-200 text-slate-500" :
      "bg-slate-100 text-slate-400"
    )}>
      {status === 'COMPLETED' ? <CheckCircle2 size={16} /> : <div className="w-2 h-2 bg-current rounded-full" />}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <h5 className="font-bold text-slate-900 text-sm">{title}</h5>
        <span className="text-[10px] font-bold text-slate-400">{time}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
      {isActionable && total > 0 && (
        <div className="mt-3 flex items-center gap-4">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.round((completed / total) * 100)}%` }} 
            />
          </div>
          <span className="text-[10px] font-black text-emerald-600 whitespace-nowrap">
            {completed} / {total} DISPATCHED ({Math.round((completed / total) * 100)}%)
          </span>
        </div>
      )}
    </div>
  </div>
);
