/**
 * Duplicate Report — read-only admin tool.
 *
 * Lists duplicate customers (same mobile / same name) and duplicate hisab
 * entries (identical ledger rows, repeated transaction references) so they can
 * be reviewed and merged manually. This screen NEVER deletes anything.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Copy, RefreshCw, Users, Receipt, CreditCard, Download, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { cn } from "../../lib/utils";

const token = () =>
  localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token") || "";

type Group = { key: string; reason: string; count: number; records: any[] };
type Report = {
  generatedAt: string;
  summary: Record<string, number>;
  customers: Group[];
  ledger: Group[];
  payments: Group[];
};

export const DuplicateReport: React.FC = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"customers" | "ledger" | "payments">("customers");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/duplicates", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setReport(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const downloadCsv = async () => {
    const res = await fetch("/api/admin/duplicates/export.csv", {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "duplicate-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = report?.summary || {};
  const groups = report ? report[tab] : [];

  const renderRecord = (r: any) => {
    if (tab === "customers") {
      return (
        <>
          <Cell label="ID" value={r.id} mono />
          <Cell label="নাম" value={r.name} />
          <Cell label="মোবাইল" value={r.phone || "—"} />
          <Cell label="বাকি" value={String(r.dueAmount ?? 0)} />
          <Cell label="তৈরি" value={r.createdAt || "—"} />
        </>
      );
    }
    if (tab === "ledger") {
      return (
        <>
          <Cell label="ID" value={r.id} mono />
          <Cell label="কাস্টমার" value={r.customerId} mono />
          <Cell label="ধরন" value={r.type} />
          <Cell label="পরিমাণ" value={String(r.amount)} />
          <Cell label="তারিখ" value={r.date} />
          <Cell label="বিবরণ" value={r.description || "—"} />
        </>
      );
    }
    return (
      <>
        <Cell label="ID" value={r.id} mono />
        <Cell label="TxID" value={r.transactionId || "—"} mono />
        <Cell label="কাস্টমার" value={r.customerId || "—"} mono />
        <Cell label="পরিমাণ" value={String(r.amount)} />
        <Cell label="তারিখ" value={r.date || r.createdAt || "—"} />
      </>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ডুপ্লিকেট রিপোর্ট / Duplicate Report
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            একই কাস্টমার বা একই হিসাব এন্ট্রি দুইবার আছে কিনা দেখুন — রিভিউ করে ম্যানুয়ালি মার্জ করুন।
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> আবার স্ক্যান করুন
          </button>
          <button onClick={downloadCsv} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 flex items-start gap-3">
        <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-900">
          <strong>কোনো ডাটা মুছে ফেলা হবে না।</strong> এটি শুধু একটি রিপোর্ট — কোন রেকর্ডগুলো
          ডুপ্লিকেট মনে হচ্ছে তা দেখায়। মার্জ বা ডিলিট করতে হলে সংশ্লিষ্ট পেজ থেকে ম্যানুয়ালি করুন।
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Summary icon={Users} label="কাস্টমার" scanned={s.customersScanned} groups={s.duplicateCustomerGroups} records={s.duplicateCustomerRecords} />
        <Summary icon={Receipt} label="হিসাব এন্ট্রি (ledger)" scanned={s.ledgerScanned} groups={s.duplicateLedgerGroups} records={s.duplicateLedgerRecords} />
        <Summary icon={CreditCard} label="পেমেন্ট" scanned={s.paymentsScanned} groups={s.duplicatePaymentGroups} records={s.duplicatePaymentRecords} />
      </div>

      <div className="flex gap-1.5">
        {([
          ["customers", "কাস্টমার", report?.customers.length ?? 0],
          ["ledger", "হিসাব এন্ট্রি", report?.ledger.length ?? 0],
          ["payments", "পেমেন্ট", report?.payments.length ?? 0],
        ] as const).map(([id, label, n]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold border",
              tab === id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
            )}
          >
            {label} ({n})
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-10 text-center">
          <CheckCircle2 className="mx-auto text-emerald-600 mb-2" size={28} />
          <p className="font-bold text-emerald-900">কোনো ডুপ্লিকেট পাওয়া যায়নি</p>
          <p className="text-sm text-emerald-700 mt-1">No duplicates detected in this collection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g, i) => (
            <div key={`${g.key}-${i}`} className="rounded-2xl border border-red-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
                <Copy size={15} className="text-red-600" />
                <span className="text-sm font-bold text-red-800">{g.reason}</span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                  {g.count} copies
                </span>
                <span className="ml-auto text-[11px] font-mono text-red-400 truncate max-w-xs">{g.key}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {g.records.map((r: any) => (
                  <div key={r.id} className="px-4 py-3 grid grid-cols-2 md:grid-cols-6 gap-3">
                    {renderRecord(r)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Cell: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className={cn("text-sm text-slate-800 truncate", mono && "font-mono text-xs")} title={value}>{value}</p>
  </div>
);

const Summary: React.FC<{ icon: React.ElementType; label: string; scanned?: number; groups?: number; records?: number }> = ({
  icon: Icon, label, scanned = 0, groups = 0, records = 0,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={16} className="text-slate-400" />
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    </div>
    <p className={cn("text-2xl font-black", groups > 0 ? "text-red-600" : "text-emerald-600")}>
      {groups} <span className="text-sm font-bold text-slate-400">group(s)</span>
    </p>
    <p className="text-xs text-slate-400 mt-1">{records} duplicate record(s) · {scanned} scanned</p>
  </div>
);

export default DuplicateReport;
