import React, { useState } from 'react';
import { useERPStore } from '../../store';
import { ContactMessage } from '../../types';
import { 
  Inbox, 
  Search, 
  Mail, 
  MailOpen, 
  Trash2, 
  X, 
  User, 
  Phone, 
  Calendar, 
  Filter, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const AdminInbox: React.FC = () => {
  const { state, updateContactMessageStatus, deleteContactMessage } = useERPStore();
  const messages = state.contactMessages || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleOpenMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setIsViewerOpen(true);
    if (msg.status === 'UNREAD') {
      try {
        await updateContactMessageStatus(msg.id, 'READ');
      } catch (err: any) {
        console.error("Failed to mark message as read:", err);
      }
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent, msg: ContactMessage) => {
    e.stopPropagation();
    const nextStatus = msg.status === 'READ' ? 'UNREAD' : 'READ';
    try {
      await updateContactMessageStatus(msg.id, nextStatus);
      toast.success(`Message marked as ${nextStatus.toLowerCase()}.`);
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage({ ...msg, status: nextStatus });
      }
    } catch (err: any) {
      toast.error("Failed to change message status.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this contact message?")) {
      try {
        await deleteContactMessage(id);
        toast.success("Inquiry deleted successfully.");
        if (selectedMessage?.id === id) {
          setIsViewerOpen(false);
          setSelectedMessage(null);
        }
      } catch (err: any) {
        toast.error("Failed to delete inquiry.");
      }
    }
  };

  // Filter & Search Messages
  const filteredMessages = messages.filter((msg) => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && msg.status === statusFilter;
  });

  const unreadCount = messages.filter(m => m.status === 'UNREAD').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Inbox className="w-6 h-6" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Inbox</h1>
            <p className="text-sm text-slate-500 mt-1">Review, organize, and reply to client inquiries received from your public website contact form.</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('UNREAD')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              statusFilter === 'UNREAD'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('READ')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              statusFilter === 'READ'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text"
          placeholder="Search sender name, email, phone, keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 font-medium focus:border-emerald-500 shadow-sm"
        />
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Mail className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No Messages Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">There are no contact inquiries matching your search parameters or filter options.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 w-12 text-center">Status</th>
                  <th className="py-4 px-6 w-60">Sender</th>
                  <th className="py-4 px-6">Inquiry Details</th>
                  <th className="py-4 px-6 w-44">Received Date</th>
                  <th className="py-4 px-6 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMessages.map((msg) => (
                  <tr 
                    key={msg.id}
                    onClick={() => handleOpenMessage(msg)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors group ${
                      msg.status === 'UNREAD' ? 'bg-emerald-50/15 font-semibold text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {/* Status Badge */}
                    <td className="py-4 px-6 text-center" onClick={(e) => handleToggleStatus(e, msg)}>
                      <div className="flex justify-center">
                        {msg.status === 'UNREAD' ? (
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors" title="Mark as Read">
                            <Mail className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors" title="Mark as Unread">
                            <MailOpen className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Sender Info */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className={`text-sm ${msg.status === 'UNREAD' ? 'font-bold text-slate-900' : 'text-slate-800 font-medium'}`}>
                          {msg.name}
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5">{msg.email || "No Email"}</span>
                        {msg.phone && <span className="text-[11px] text-slate-400 font-mono mt-0.5">{msg.phone}</span>}
                      </div>
                    </td>

                    {/* Content Details */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col max-w-xl">
                        <span className={`text-sm line-clamp-1 ${msg.status === 'UNREAD' ? 'text-slate-900 font-bold' : 'text-slate-700 font-medium'}`}>
                          {msg.subject || "No Subject"}
                        </span>
                        <span className="text-xs text-slate-400 line-clamp-1 mt-1 font-normal">
                          {msg.message}
                        </span>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{msg.createdAt || msg.timestamp || "N/A"}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => handleToggleStatus(e, msg)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title={msg.status === 'READ' ? "Mark as Unread" : "Mark as Read"}
                        >
                          {msg.status === 'READ' ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, msg.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Message Reader Drawer / Modal */}
      <AnimatePresence>
        {isViewerOpen && selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsViewerOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            {/* Viewer Panel */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <MailOpen className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inquiry Message Viewer</span>
                </div>
                <button 
                  onClick={() => setIsViewerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-150 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sender Details Cards */}
              <div className="p-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sender Name</p>
                    <p className="text-sm font-bold text-slate-800">{selectedMessage.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email Address</p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedMessage.email ? (
                        <a href={`mailto:${selectedMessage.email}`} className="text-emerald-600 hover:underline">{selectedMessage.email}</a>
                      ) : (
                        "Not Provided"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Phone / Contact</p>
                    <p className="text-sm font-bold text-slate-800">{selectedMessage.phone || "Not Provided"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Submitted Date</p>
                    <p className="text-sm font-bold text-slate-800">{selectedMessage.createdAt || selectedMessage.timestamp || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Message Details */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inquiry Subject</p>
                  <p className="text-base font-bold text-slate-900 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                    {selectedMessage.subject || "No Subject Specified"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Message Content</p>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap min-h-36 max-h-60 overflow-y-auto custom-scrollbar">
                    {selectedMessage.message}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this message permanently?")) {
                      deleteContactMessage(selectedMessage.id);
                      setIsViewerOpen(false);
                      toast.success("Message deleted.");
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-semibold transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Message</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      const nextStatus = selectedMessage.status === 'READ' ? 'UNREAD' : 'READ';
                      updateContactMessageStatus(selectedMessage.id, nextStatus);
                      setSelectedMessage({ ...selectedMessage, status: nextStatus });
                      toast.success(`Message marked as ${nextStatus.toLowerCase()}.`);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all"
                  >
                    {selectedMessage.status === 'READ' ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                    <span>Mark as {selectedMessage.status === 'READ' ? 'Unread' : 'Read'}</span>
                  </button>

                  <button
                    onClick={() => setIsViewerOpen(false)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
