import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Mail,
  PhoneCall,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Copy,
  Activity,
  Send,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

type GatewayStatus = {
  enabled: boolean;
  lastTestedAt?: string;
};

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
  return res.json();
};

export function NotificationGateways() {
  const [status, setStatus] = useState<Record<string, GatewayStatus>>({});
  const [tab, setTab] = useState<"sms" | "email" | "voice" | "payment" | "queue">("sms");
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const data = await api("/api/gateways/status");
    setStatus(data);
  };

  useEffect(() => {
    loadStatus().catch(console.error);
  }, []);

  return (
    <div className="notification-gateways p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Notification &amp; Gateway Settings
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Toggle every external gateway independently. All sends are queued and processed
          by background workers, so a down/off gateway never slows or crashes the store.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["sms", "SMS / sms.net.bd", MessageSquare],
            ["email", "Email / SMTP", Mail],
            ["voice", "Voice Calls", PhoneCall],
            ["payment", "bKash Personal", CreditCard],
            ["queue", "Queue Monitor", Activity],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
              tab === id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200",
            )}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {tab === "sms" && <SmsGateway onSaved={loadStatus} />}
      {tab === "email" && <EmailGateway onSaved={loadStatus} />}
      {tab === "voice" && <VoiceGateway onSaved={loadStatus} />}
      {tab === "payment" && <PaymentGateway onSaved={loadStatus} />}
      {tab === "queue" && <QueueMonitor />}
    </div>
  );
}

interface GatewayProps {
  onSaved: () => void;
}

function SmsGateway({ onSaved }: GatewayProps) {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [contentId, setContentId] = useState("");
  const [testTo, setTestTo] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const cfg = await api("/api/gateways/sms/config");
    setEnabled(!!cfg.enabled);
    setApiKey(cfg.apiKey);
    setSenderId(cfg.senderId || "");
    setContentId(cfg.defaultContentId || "");
    const logsData = await api("/api/gateways/sms/logs");
    setLogs(logsData.slice(0, 30));
    const balanceData = await api("/api/gateways/sms/balance");
    setBalance(balanceData);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const save = async () => {
    setLoading(true);
    const res = await api("/api/gateways/sms/config", {
      method: "POST",
      body: JSON.stringify({ enabled, apiKey, senderId, defaultContentId: contentId }),
    });
    setLoading(false);
    if (res.success) {
      toast.success("SMS gateway saved");
      onSaved();
      load();
    } else toast.error(res.error || "Save failed");
  };

  const sendTest = async () => {
    if (!testTo) return toast.error("Enter a phone number");
    setLoading(true);
    const res = await api("/api/gateways/sms/test", {
      method: "POST",
      body: JSON.stringify({ to: testTo, apiKey, senderId, contentId }),
    });
    setLoading(false);
    if (res.success && !res.skipped) toast.success("Test SMS sent");
    else toast.error(res.error || "Test failed");
  };

  return (
    <Card>
      <Header icon={<MessageSquare size={20} />} title="SMS Gateway — sms.net.bd" enabled={enabled} setEnabled={setEnabled} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="API Key">
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sms.net.bd API key" />
        </Field>
        <Field label="Sender ID (optional)">
          <input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="e.g. LovelyEnt" />
        </Field>
        <Field label="Default Content ID (optional)">
          <input value={contentId} onChange={(e) => setContentId(e.target.value)} placeholder="e.g. 1" />
        </Field>
        {balance && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SMS Balance</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {balance.balance ?? 0} {balance.currency || "BDT"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Cache: 15 min</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
        <div className="flex items-center gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Test number 017XXXXXXXX" />
          <button onClick={sendTest} disabled={loading} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
            <Send size={14} className="inline mr-1" /> Test SMS
          </button>
        </div>
        <button onClick={save} disabled={loading} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
          {loading ? <RefreshCw size={14} className="inline animate-spin" /> : <CheckCircle2 size={14} className="inline mr-1" />} Save SMS Gateway
        </button>
      </div>
      <div className="mt-6">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">SMS Log</h4>
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="p-3">To</th><th className="p-3">Status</th><th className="p-3">Request ID</th><th className="p-3">Charge</th><th className="p-3">Time</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No SMS logged yet.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="p-3 font-semibold">{l.to}</td>
                  <td className="p-3"><Badge status={l.status} /></td>
                  <td className="p-3 font-mono text-slate-500">{l.requestId || "-"}</td>
                  <td className="p-3">{l.charge ?? 0}</td>
                  <td className="p-3 text-slate-400">{l.createdAt?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function EmailGateway({ onSaved }: GatewayProps) {
  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState<"smtp" | "api">("smtp");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [apiProvider, setApiProvider] = useState("generic");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testTo, setTestTo] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const cfg = await api("/api/gateways/email/config");
    setEnabled(!!cfg.enabled);
    setType(cfg.type || "smtp");
    setHost(cfg.host || "");
    setPort(String(cfg.port || 587));
    setUsername(cfg.username || "");
    setPassword(cfg.password || "");
    setFromName(cfg.fromName || "");
    setFromEmail(cfg.fromEmail || "");
    setApiProvider(cfg.apiProvider || "generic");
    setApiUrl(cfg.apiUrl || "");
    setApiKey(cfg.apiKey || "");
  };
  useEffect(() => { load().catch(console.error); }, []);

  const save = async () => {
    setLoading(true);
    const res = await api("/api/gateways/email/config", {
      method: "POST",
      body: JSON.stringify({ enabled, type, host, port, username, password, fromName, fromEmail, apiProvider, apiUrl, apiKey }),
    });
    setLoading(false);
    if (res.success) { toast.success("Email gateway saved"); onSaved(); load(); }
    else toast.error(res.error || "Save failed");
  };

  const sendTest = async () => {
    if (!testTo) return toast.error("Enter a recipient email");
    setLoading(true);
    const res = await api("/api/gateways/email/test", {
      method: "POST",
      body: JSON.stringify({ to: testTo, type, host, port, username, password, fromName, fromEmail, apiProvider, apiUrl, apiKey }),
    });
    setLoading(false);
    if (res.success) toast.success("Test email queued/sent");
    else toast.error(res.error || "Test failed");
  };

  return (
    <Card>
      <Header icon={<Mail size={20} />} title="Email / SMTP Gateway" enabled={enabled} setEnabled={setEnabled} />
      <div className="flex gap-2 mb-4">
        <button onClick={() => setType("smtp")} className={cn("px-4 py-2 rounded-xl text-xs font-bold", type === "smtp" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500")}>SMTP</button>
        <button onClick={() => setType("api")} className={cn("px-4 py-2 rounded-xl text-xs font-bold", type === "api" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500")}>Email API (SendGrid/Mailgun/Brevo)</button>
      </div>
      {type === "smtp" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="SMTP Host"><input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" /></Field>
          <Field label="Port"><input value={port} onChange={(e) => setPort(e.target.value)} /></Field>
          <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
          <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="From Name"><input value={fromName} onChange={(e) => setFromName(e.target.value)} /></Field>
          <Field label="From Email"><input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Provider">
            <select value={apiProvider} onChange={(e) => setApiProvider(e.target.value)}>
              <option value="generic">Generic HTTP API</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="brevo">Brevo</option>
            </select>
          </Field>
          <Field label="API URL"><input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.example.com/send" /></Field>
          <Field label="API Key"><input value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></Field>
          <Field label="From Email"><input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></Field>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
        <div className="flex items-center gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test@example.com" />
          <button onClick={sendTest} disabled={loading} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Test</button>
        </div>
        <button onClick={save} disabled={loading} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Save Email Gateway</button>
      </div>
    </Card>
  );
}

function VoiceGateway({ onSaved }: GatewayProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    const cfg = await api("/api/gateways/voice/config");
    setEnabled(!!cfg.enabled);
  };
  useEffect(() => { load().catch(console.error); }, []);

  const save = async () => {
    setLoading(true);
    const res = await api("/api/gateways/voice/config", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
    setLoading(false);
    if (res.success) { toast.success("Voice gateway saved"); onSaved(); }
    else toast.error(res.error || "Save failed");
  };

  return (
    <Card>
      <Header icon={<PhoneCall size={20} />} title="Voice Call Notification" enabled={enabled} setEnabled={setEnabled} />
      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-800 text-xs leading-relaxed">
        Voice calls are disabled by default. This module keeps a provider abstraction layer
        so any IVR/voice gateway can be plugged in later, but while disabled the system
        gracefully skips every call job with no error or delay in user flows.
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={save} disabled={loading} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Save Voice Toggle</button>
      </div>
    </Card>
  );
}

function PaymentGateway({ onSaved }: GatewayProps) {
  const [enabled, setEnabled] = useState(false);
  const [bkashNumber, setBkashNumber] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [amountTolerance, setAmountTolerance] = useState("0");
  const [expire, setExpire] = useState("30");
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const cfg = await api("/api/gateways/payment/config");
    setEnabled(!!cfg.enabled);
    setBkashNumber(cfg.bkashNumber || "");
    setWebhookToken(cfg.webhookToken || "");
    setWebhookUrl(cfg.webhookUrl || "");
    setAmountTolerance(String(cfg.amountTolerance ?? 0));
    setExpire(String(cfg.pendingOrderExpireMinutes ?? 30));
    setUnmatched(await api("/api/gateways/payment/unmatched"));
    setLogs(await api("/api/gateways/payment/incoming-logs"));
    setPayments(await api("/api/erp/payments"));
  };
  useEffect(() => { load().catch(console.error); }, []);

  const save = async () => {
    setLoading(true);
    const res = await api("/api/gateways/payment/config", {
      method: "POST",
      body: JSON.stringify({ enabled, bkashNumber, amountTolerance: Number(amountTolerance) || 0, pendingOrderExpireMinutes: Number(expire) || 30, webhookUrl }),
    });
    setLoading(false);
    if (res.success) { toast.success("Payment gateway saved"); onSaved(); load(); }
    else toast.error(res.error || "Save failed");
  };

  const regenerate = async () => {
    const res = await api("/api/gateways/payment/regenerate-token", { method: "POST", body: JSON.stringify({}) });
    if (res.success) { setWebhookToken(res.webhookToken); toast.success("Token regenerated"); }
    else toast.error(res.error || "Failed");
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => toast.success("Webhook URL copied"));
  };

  const match = async (unmatchedId: string, paymentId: string) => {
    const res = await api(`/api/gateways/payment/unmatched/${unmatchedId}/match`, {
      method: "POST",
      body: JSON.stringify({ paymentId }),
    });
    if (res.success) { toast.success("Matched & verified"); load(); }
    else toast.error(res.error || "Match failed");
  };

  const pendingPayments = payments.filter((p) => p.status === "PENDING");

  return (
    <Card>
      <Header icon={<CreditCard size={20} />} title="bKash Personal Payment Gateway" enabled={enabled} setEnabled={setEnabled} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="bKash Personal Number">
          <input value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" />
        </Field>
        <Field label="Amount Tolerance (BDT)">
          <input value={amountTolerance} onChange={(e) => setAmountTolerance(e.target.value)} />
        </Field>
        <Field label="Pending order expire (minutes)">
          <input value={expire} onChange={(e) => setExpire(e.target.value)} />
        </Field>
        <Field label="Webhook Token">
          <div className="flex gap-2">
            <input value={webhookToken} readOnly className="font-mono" />
            <button onClick={regenerate} className="px-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold"><RefreshCw size={14} /></button>
          </div>
        </Field>
      </div>
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Webhook URL for gateway_phone.py</p>
        <div className="flex items-center gap-2 mt-2">
          <code className="flex-1 text-xs font-mono text-slate-700 bg-white rounded-xl border border-slate-200 p-2.5 break-all">{webhookUrl}</code>
          <button onClick={copyUrl} className="p-2.5 rounded-xl bg-slate-900 text-white"><Copy size={14} /></button>
        </div>
      </div>
      <button onClick={save} disabled={loading} className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Save Payment Gateway</button>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Unmatched SMS Manual Queue</h4>
          <div className="space-y-2">
            {unmatched.length === 0 && <Empty text="No unmatched SMS." />}
            {unmatched.map((u) => (
              <div key={u.id} className="rounded-2xl border border-slate-100 p-4 bg-white">
                <p className="text-xs font-mono text-slate-600 break-words">{u.raw_message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <select className="flex-1" defaultValue="">
                    <option value="">-- Match to pending payment --</option>
                    {pendingPayments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.customerName} — {p.amount} BDT ({p.transactionId})
                      </option>
                    ))}
                  </select>
                  <button onClick={(e) => {
                    const select = (e.currentTarget.previousSibling as HTMLSelectElement);
                    if (select.value) match(u.id, select.value);
                  }} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Match</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Incoming SMS Audit Log</h4>
          <div className="space-y-2">
            {logs.length === 0 && <Empty text="No incoming webhook SMS." />}
            {logs.slice(0, 20).map((l) => (
              <div key={l.id} className="rounded-2xl border border-slate-100 p-4 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{l.createdAt?.slice(0, 16)}</span>
                  <Badge status={l.matched ? "VERIFIED" : "UNMATCHED"} />
                </div>
                <p className="text-xs font-mono text-slate-600 mt-1">{l.raw_message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Card>
  );
}

function QueueMonitor() {
  const [queue, setQueue] = useState<any[]>([]);
  const load = async () => setQueue(await api("/api/gateways/queue"));
  useEffect(() => { load().catch(console.error); }, []);

  return (
    <Card>
      <Header icon={<Activity size={20} />} title="Notification Queue Monitor" enabled={true} setEnabled={() => {}} />
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead><tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider">
            <th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Recipient</th><th className="p-3">Attempts</th><th className="p-3">Note</th><th className="p-3">Time</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {queue.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No queued notifications.</td></tr>}
            {queue.map((q) => (
              <tr key={q.id}>
                <td className="p-3 font-bold uppercase">{q.type}</td>
                <td className="p-3"><Badge status={q.status} /></td>
                <td className="p-3">{q.payload?.to || q.payload?.recipient || "-"}</td>
                <td className="p-3">{q.attempts}/{q.maxAttempts}</td>
                <td className="p-3 text-slate-500">{q.note || q.lastError || "-"}</td>
                <td className="p-3 text-slate-400">{q.createdAt?.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={load} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"><RefreshCw size={14} className="inline mr-1" /> Refresh</button>
      </div>
    </Card>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6">{children}</div>
);

function Header({ icon, title, enabled, setEnabled }: { icon: React.ReactNode; title: string; enabled: boolean; setEnabled: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-5 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">{icon}</div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", enabled ? "text-emerald-600" : "text-slate-400")}>
            {enabled ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{enabled ? "ON" : "OFF"}</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={cn("w-12 h-6 rounded-full transition-all flex items-center px-1 cursor-pointer", enabled ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start")}
        >
          <div className="w-4 h-4 bg-white rounded-full shadow-md" />
        </button>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
    <div className="w-full">{children}</div>
  </div>
);

const Badge = ({ status }: { status: string }) => {
  const s = String(status || "").toUpperCase();
  const color =
    s === "SENT" || s === "VERIFIED" || s === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "FAILED" || s === "REJECTED"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : s === "SKIPPED" || s === "DISABLED"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : s === "UNMATCHED"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold", color)}>{status || "PENDING"}</span>;
};

const Empty = ({ text }: { text: string }) => (
  <div className="rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-xs">{text}</div>
);
