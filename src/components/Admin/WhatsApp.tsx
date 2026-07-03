import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCheck, 
  AlertCircle, 
  Search,
  QrCode,
  Link,
  Power,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useERPStore } from '../../store';
import { toast } from 'sonner';
import QRCode from "qrcode";

export const WhatsApp: React.FC = () => {
  const store = useERPStore();
  
  const [connectionState, setConnectionState] = useState<string>("checking...");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Test Message form state
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Hello from Lovely ERP Baileys integration!");

  // Search logs state
  const [searchQuery, setSearchQuery] = useState("");

  const logs = store.state.waLogs || [];

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch('/api/whatsapp/status', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setConnectionState(data.state || "disconnected");
      if (data.qr) {
        const url = await QRCode.toDataURL(data.qr);
        setQrCodeUrl(url);
      } else {
        setQrCodeUrl(null);
      }
    } catch (e) {
      console.error("Failed to fetch WhatsApp status:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ activeProvider: "Baileys" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("WhatsApp connection initiated. Scanning ready.");
        fetchStatus();
      } else {
        toast.error("Failed to connect: " + data.error);
      }
    } catch (error: any) {
      toast.error("Connection error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("WhatsApp session logged out and cleared.");
        setConnectionState("disconnected");
        setQrCodeUrl(null);
      } else {
        toast.error("Failed to disconnect: " + data.error);
      }
    } catch (error: any) {
      toast.error("Disconnect error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnect = async () => {
    setIsLoading(true);
    try {
      toast.info("Reconnecting WhatsApp session...");
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ activeProvider: "Baileys" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Reconnection initiated successfully!");
        fetchStatus();
      } else {
        toast.error("Failed to reconnect: " + data.error);
      }
    } catch (error: any) {
      toast.error("Reconnection error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber) {
      toast.error("Please enter a recipient number.");
      return;
    }
    setIsSending(true);
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ number: testNumber, message: testMessage })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Test message sent successfully!");
        // Record log locally
        store.addWhatsAppLog({
          recipient: testNumber,
          messageType: "Manual Test",
          provider: "Baileys",
          status: "Delivered",
        });
        setTestNumber("");
      } else {
        toast.error("Failed to send test message: " + (data.error || "Unknown error"));
      }
    } catch (error: any) {
      toast.error("Error sending message: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.error && log.error.toLowerCase().includes(searchQuery.toLowerCase())) ||
    log.messageType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">WhatsApp Messaging</h1>
          <p className="text-slate-500 mt-1">Manage and monitor your automated Baileys gateway for notifications and login codes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStatus}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            title="Refresh Connection Status"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Baileys Status & Action Panels */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner",
              connectionState === "connected" ? "bg-emerald-50 text-emerald-600" : 
              connectionState === "qr_ready" ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-400"
            )}>
              <MessageSquare size={32} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Baileys Gateway Status</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {connectionState === "connected" 
                ? "Your local WhatsApp socket is fully authenticated and running." 
                : connectionState === "qr_ready"
                ? "An active QR code is ready for scanning to authorize your session."
                : "Your WhatsApp session is currently disconnected. Click 'Connect' to initialize."}
            </p>
            
            <div className="mt-6 w-full space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provider Engine</span>
                <span className="text-[10px] font-black text-slate-900">Baileys (WebSockets)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  connectionState === "connected" ? "text-emerald-600" : 
                  connectionState === "qr_ready" ? "text-amber-500" : "text-rose-500"
                )}>
                  {connectionState.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 w-full flex flex-col gap-2">
              {connectionState === "disconnected" && (
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-100"
                >
                  <Link size={14} />
                  <span>Connect WhatsApp</span>
                </button>
              )}
              {connectionState !== "disconnected" && (
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Power size={14} />
                  <span>Disconnect Session</span>
                </button>
              )}
              {connectionState === "connected" && (
                <button
                  onClick={handleReconnect}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  <span>Reconnect Device</span>
                </button>
              )}
            </div>
          </div>

          {/* QR Code Scan Panel */}
          {connectionState === "qr_ready" && qrCodeUrl && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <QrCode size={16} className="text-amber-500" />
                Scan Authorization Code
              </h3>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-3">
                <img 
                  src={qrCodeUrl} 
                  alt="WhatsApp Web QR Code" 
                  className="w-48 h-48 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold leading-normal uppercase tracking-wide">
                Open WhatsApp &gt; Linked Devices &gt; Link a Device to synchronize Lovely ERP.
              </p>
            </div>
          )}
        </div>

        {/* Message Logs & Test Sender */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Sender */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Send size={16} className="text-slate-900" />
              Quick test message (Baileys)
            </h3>
            <form onSubmit={handleSendTestMessage} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient Number</label>
                <input 
                  type="text"
                  required
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="e.g. 8801712345678"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message content</label>
                <input 
                  type="text"
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="md:col-span-2">
                <button 
                  type="submit"
                  disabled={isSending || !testNumber}
                  className="w-full md:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-100"
                >
                  <Send size={12} />
                  {isSending ? "Sending..." : "Send Test WhatsApp Message"}
                </button>
              </div>
            </form>
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">WhatsApp Log Ledger</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time tracking of message dispatch with Baileys websocket gateway.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs..." 
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-3">Recipient</th>
                    <th className="px-6 py-3">Type / Event</th>
                    <th className="px-6 py-3">Provider</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">
                        No WhatsApp logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-800 text-xs">{log.recipient}</td>
                        <td className="px-6 py-3.5">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                            {log.messageType}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 font-semibold">{log.provider}</td>
                        <td className="px-6 py-3.5">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                            log.status === 'Delivered' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[10px] text-slate-400 font-mono">
                          {log.timestamp}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
