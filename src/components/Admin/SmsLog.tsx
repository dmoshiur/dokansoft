/**
 * SMS Log — admin visibility for every SMS the system tried to send.
 *
 * Shows recipient, status (Sent / Failed / Pending / Disabled), the real
 * sms.net.bd error reason, request id and charge, plus a live diagnostics
 * panel (toggle, API key, balance, queue backlog) and a test-send box.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  MessageSquare, RefreshCw, Send, CheckCircle2, XCircle, Clock,
  AlertTriangle, Wallet, Search, Activity, PowerOff, Play,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

const token = () =>
  localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token") || "";

const api = async (path: string, opts: RequestInit = {}) => {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(opts.headers || {}),
    },
  });
  return res.json().catch(() => ({}));
};

type SmsLogRow = {
  id: string;
  to: string;
  msg: string;
  status: string;
  requestId?: string;
  charge?: number;
  error?: string;
  errorCode?: string | number;
  source?: string;
  createdAt?: string;
};

const STATUS_STYLES: Record<string, { cls: string; Icon: React.ElementType }> = {
  SENT: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  DELIVERED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  FAILED: { cls: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
  PENDING: { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock },
  DISABLED: { cls: "bg-slate-100 text-slate-600 border-slate-200", Icon: PowerOff },
  CANCELLED: { cls: "bg-slate-100 text-slate-600 border-slate-200", Icon: PowerOff },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const key = String(status || "").toUpperCase();
  const { cls, Icon } = STATUS_STYLES[key] || {
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: AlertTriangle,
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border", cls)}>
      <Icon size={12} />
      {key || "UNKNOWN"}
    </span>
  );
};

export const SmsLog: React.FC = () => {
  const [logs, setLogs] = useState<SmsLogRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [diag, setDiag] = useState<any>(null);
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState(
    "টেস্ট SMS — M/S Mahi and Muhi Traders ERP. আপনি এটি পেলে sms.net.bd ঠিকভাবে কাজ করছে।",
  );
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      if (q.trim()) params.set("q", q.trim());
      const data = await api(`/api/gateways/sms/logs?${params.toString()}`);
      setLogs(Array.isArray(data) ? data : data.logs || []);
      setStats(data.stats || {});
    } finally {
      setLoading(false);
    }
  }, [filter, q]);

  const loadDiagnostics = useCallback(async () => {
    const d = await api("/api/gateways/sms/diagnostics");
    setDiag(d);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    loadDiagnostics().catch(console.error);
  }, [loadDiagnostics]);

  const sendTest = async () => {
    if (!testTo.trim()) return toast.error("একটি মোবাইল নাম্বার দিন");
    setSending(true);
    try {
      const res = await api("/api/gateways/sms/send", {
        method: "POST",
        body: JSON.stringify({ to: testTo, msg: testMsg }),
      });
      if (res.success) toast.success(`SMS পাঠানো হয়েছে — request id ${res.requestId || "-"}`);
      else toast.error(res.error || "SMS পাঠানো যায়নি");
    } finally {
      setSending(false);
      await load();
      await loadDiagnostics();
    }
  };

  const syncReports = async () => {
    const res = await api("/api/gateways/sms/report-sync", { method: "POST" });
    toast.success(`Delivery reports synced: ${res.synced ?? 0}`);
    await load();
  };

  const drainQueue = async () => {
    const res = await api("/api/gateways/sms/process-queue", { method: "POST" });
    toast.success(`Queue processed: ${res.processed ?? 0} job(s)`);
    await load();
    await loadDiagnostics();
  };

  const counts = (k: string) => stats[k] ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SMS লগ / SMS Log
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            প্রতিটি SMS এর স্ট্যাটাস ও ব্যর্থতার আসল কারণ — sms.net.bd
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { load(); loadDiagnostics(); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> রিফ্রেশ
          </button>
          <button onClick={syncReports} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Activity size={14} /> Delivery Report Sync
          </button>
          <button onClick={drainQueue} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">
            <Play size={14} /> Queue এখনই চালান
          </button>
        </div>
      </div>

      {/* Diagnostics */}
      {diag && (
        <div className={cn(
          "rounded-2xl border p-4",
          diag.ok ? "bg-emerald-50/50 border-emerald-200" : "bg-amber-50/60 border-amber-200",
        )}>
          <div className="flex items-start gap-3">
            {diag.ok
              ? <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              : <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 text-sm">
                {diag.ok ? "SMS গেটওয়ে প্রস্তুত / gateway healthy" : "SMS গেটওয়েতে সমস্যা আছে"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <Info label="Gateway toggle" value={diag.enabled ? "Enabled" : "DISABLED"} bad={!diag.enabled} />
                <Info label="API key" value={diag.apiKeyPresent ? diag.apiKeyMasked : "Missing"} bad={!diag.apiKeyPresent} />
                <Info label="Balance" value={diag.balance ? `${diag.balance.balance} ${diag.balance.currency || "BDT"}` : "—"} bad={!!diag.balance?.error || Number(diag.balance?.balance) <= 0} />
                <Info label="Queue pending" value={String(diag.pendingSms ?? 0)} bad={(diag.pendingSms ?? 0) > 0} />
              </div>
              {!!diag.problems?.length && (
                <ul className="mt-3 space-y-1 text-xs text-amber-900 list-disc list-inside">
                  {diag.problems.map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="মোট" value={counts("TOTAL")} tone="slate" icon={MessageSquare} />
        <Tile label="Sent" value={counts("SENT") + counts("DELIVERED")} tone="green" icon={CheckCircle2} />
        <Tile label="Failed" value={counts("FAILED")} tone="red" icon={XCircle} />
        <Tile label="Pending" value={counts("PENDING")} tone="amber" icon={Clock} />
        <Tile label="Disabled" value={counts("DISABLED")} tone="slate" icon={PowerOff} />
      </div>

      {/* Test send */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          টেস্ট SMS পাঠান
        </h3>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="01XXXXXXXXX বা 8801XXXXXXXXX"
            className="md:w-64 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <input
            value={testMsg}
            onChange={(e) => setTestMsg(e.target.value)}
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            onClick={sendTest}
            disabled={sending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-60 hover:bg-emerald-700"
          >
            {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            পাঠান
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
          <Search size={16} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="নাম্বার, মেসেজ বা এরর দিয়ে খুঁজুন…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["ALL", "SENT", "DELIVERED", "FAILED", "PENDING", "DISABLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold border",
                filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-3">সময় / Time</th>
                <th className="p-3">নাম্বার</th>
                <th className="p-3">Status</th>
                <th className="p-3">কারণ / Error reason</th>
                <th className="p-3">Message</th>
                <th className="p-3">Request ID</th>
                <th className="p-3 text-right">Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {logs.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400">কোনো SMS লগ নেই।</td></tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70 align-top">
                  <td className="p-3 whitespace-nowrap text-xs text-slate-400">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString("en-GB") : "—"}
                    {l.source && <span className="block text-[10px] text-slate-300">{l.source}</span>}
                  </td>
                  <td className="p-3 font-semibold whitespace-nowrap">{l.to || "—"}</td>
                  <td className="p-3"><StatusBadge status={l.status} /></td>
                  <td className="p-3 text-xs text-red-600 max-w-xs">{l.error || <span className="text-slate-300">—</span>}</td>
                  <td className="p-3 text-xs text-slate-500 max-w-sm truncate" title={l.msg}>{l.msg}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{l.requestId || "—"}</td>
                  <td className="p-3 text-right text-xs">{l.charge ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string; bad?: boolean }> = ({ label, value, bad }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className={cn("text-sm font-bold", bad ? "text-red-600" : "text-slate-900")}>{value}</p>
  </div>
);

const Tile: React.FC<{ label: string; value: number; tone: string; icon: React.ElementType }> = ({ label, value, tone, icon: Icon }) => {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tones[tone])}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
};

export default SmsLog;
