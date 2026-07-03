/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Landmark,
  FileText,
  Smartphone,
  Mail,
  CreditCard,
  Clock,
  LogOut,
  CheckCircle,
  ArrowDownCircle,
  Printer,
  Download,
  Plus,
  AlertCircle,
  PhoneCall,
} from "lucide-react";
import { FullState } from "../types";

interface CustomerPortalProps {
  state: FullState;
  customerId: string;
  onLogout: () => void;
  onSubmitPayment: (payment: {
    customerId: string;
    customerName: string;
    amount: number;
    method: "bKash" | "Nagad" | "Upay" | "Bank Transfer";
    accountNo: string;
    transactionId: string;
    screenshotUrl?: string;
  }) => void;
}

export default function CustomerPortal({
  state,
  customerId,
  onLogout,
  onSubmitPayment,
}: CustomerPortalProps) {
  const { config, customers, ledger, halkhata, payments, notifications } =
    state;

  const customer = customers.find((c) => c.id === customerId);

  // Local states
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<
    "bKash" | "Nagad" | "Upay" | "Bank Transfer"
  >("bKash");
  const [payAccount, setPayAccount] = useState("");
  const [payTxid, setPayTxid] = useState("");
  const [paySuccessMsg, setPaySuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<
    "ledger" | "pay" | "halkhata" | "alerts" | "calls"
  >("ledger");

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <p className="mt-3 font-bold text-slate-800">
            Customer session expired.
          </p>
          <button
            onClick={onLogout}
            className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Filter Ledger Entries for this customer only
  const personalLedger = ledger.filter((l) => l.customerId === customerId);

  // Filter Payments submitted by this customer
  const personalPayments = payments.filter((p) => p.customerId === customerId);

  // Filter Notifications triggered for this customer (match phone or email)
  const personalNotifications = notifications.filter((n) => {
    const cleanPhone = (ph?: string) => ph?.replace(/[- ]/g, "") || "";
    const phoneMatch =
      customer.phone && cleanPhone(n.recipient) === cleanPhone(customer.phone);
    const emailMatch =
      customer.email &&
      n.recipient.toLowerCase() === customer.email.toLowerCase();
    return phoneMatch || emailMatch;
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!payAccount || !payTxid) {
      alert("Please complete all form fields.");
      return;
    }

    onSubmitPayment({
      customerId: customer.id,
      customerName: customer.name,
      amount: amountNum,
      method: payMethod,
      accountNo: payAccount,
      transactionId: payTxid,
      screenshotUrl: (window as any)._tempScreenshot,
    });

    // clear screenshot
    (window as any)._tempScreenshot = undefined;

    setPaySuccessMsg(
      "Payment submitted successfully! Our accounts administrator will audit and verify your transaction ID shortly.",
    );
    setPayAmount("");
    setPayAccount("");
    setPayTxid("");

    setTimeout(() => {
      setPaySuccessMsg("");
      setActiveTab("ledger");
    }, 5000);
  };

  // Compile Dynamic HalKhata letter
  const currentEvent = halkhata[0];
  let dynamicLetter = "";
  if (currentEvent) {
    dynamicLetter = currentEvent.invitationTemplate
      .replace(/{CustomerName}/g, customer.name)
      .replace(/{DueAmount}/g, customer.dueAmount.toLocaleString() + " BDT")
      .replace(/{ShopName}/g, config.shopName)
      .replace(/{ProprietorName}/g, config.proprietorName)
      .replace(/{ContactNumber}/g, config.phoneNumbers[0])
      .replace(/{EventDate}/g, currentEvent.date)
      .replace(/{Address}/g, customer.address);
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="customer_portal_root"
      className="min-h-screen bg-natural-light/60 flex flex-col font-sans"
    >
      {/* Top Navigation */}
      <header className="bg-brand-900 text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-850 text-white flex items-center justify-center font-bold font-sans border border-brand-800">
              LA
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {config.shopName}
              </h2>
              <p className="text-[10px] text-brand-300 font-bold uppercase tracking-widest font-sans">
                Customer Ledger Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold text-white">
                {customer.name}
              </p>
              <p className="text-[10px] text-brand-200 font-mono">
                {customer.phone || customer.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-brand-950 hover:bg-brand-900 border border-brand-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-natural-red"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Hero Overview */}
      <div className="bg-white border-b border-natural-border py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-natural-muted uppercase tracking-widest font-sans">
              SECURE SECTOR ACCESS
            </span>
            <h1 className="text-2xl font-black text-natural-text mt-1 font-serif">
              Sabaikum Swagotom, {customer.name}
            </h1>
            <p className="text-xs text-natural-muted mt-1 font-sans">
              Village Residence:{" "}
              <span className="text-natural-text font-semibold">
                {customer.address}
              </span>
            </p>
          </div>

          <div className="bg-natural-red/10 border border-natural-red/20 rounded-xl p-5 w-full md:w-auto flex items-center justify-between md:justify-start gap-12">
            <div>
              <p className="text-[10px] font-extrabold text-natural-red uppercase tracking-wider font-sans">
                Current Outstanding Due
              </p>
              <p className="text-2xl font-black text-natural-text mt-1 font-serif">
                {customer.dueAmount.toLocaleString()}{" "}
                <span className="text-sm font-bold text-natural-red">BDT</span>
              </p>
            </div>
            <div className="bg-natural-red/20 p-2.5 rounded-lg text-natural-red hidden sm:block">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Panel Links */}
        <aside className="lg:col-span-1 space-y-1.5">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${activeTab === "ledger" ? "bg-brand-800 text-white shadow-xs shadow-brand-800/10" : "bg-white hover:bg-natural-light text-natural-text border border-natural-border"}`}
          >
            <span className="flex items-center gap-2 font-sans">
              <FileText className="w-4 h-4" /> Personal Crop Ledger
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] ${activeTab === "ledger" ? "bg-brand-950/25 text-white font-bold" : "bg-natural-light text-natural-muted border border-natural-border font-medium"}`}
            >
              {personalLedger.length} Entries
            </span>
          </button>

          <button
            onClick={() => setActiveTab("pay")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${activeTab === "pay" ? "bg-brand-800 text-white shadow-xs shadow-brand-800/10" : "bg-white hover:bg-natural-light text-natural-text border border-natural-border"}`}
          >
            <span className="flex items-center gap-2 font-sans">
              <CreditCard className="w-4 h-4" /> Submit Payment
            </span>
            {personalPayments.filter((p) => p.status === "PENDING").length >
              0 && (
              <span className="bg-natural-accent text-brand-950 px-2 py-0.5 rounded text-[10px] font-bold border border-natural-border">
                1 Pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("halkhata")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${activeTab === "halkhata" ? "bg-brand-800 text-white shadow-xs shadow-brand-800/10" : "bg-white hover:bg-natural-light text-natural-text border border-natural-border"}`}
          >
            <span className="flex items-center gap-2 font-sans">
              <Printer className="w-4 h-4" /> HalKhata Invitation
            </span>
          </button>

          <button
            onClick={() => setActiveTab("calls")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${activeTab === "calls" ? "bg-brand-800 text-white shadow-xs shadow-brand-800/10" : "bg-white hover:bg-natural-light text-natural-text border border-natural-border"}`}
          >
            <span className="flex items-center gap-2 font-sans">
              <PhoneCall className="w-4 h-4" /> Call History (PBX)
            </span>
            <span className="bg-natural-light text-natural-muted px-2 py-0.5 rounded text-[10px] border border-natural-border font-medium">
              {
                (state.campaigns || [])
                  .flatMap((c) => c.calls)
                  .filter(
                    (c) =>
                      c.customerPhone &&
                      (c.customerPhone === customer.phone ||
                        c.customerId === customer.id),
                  ).length
              }{" "}
              Calls
            </span>
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${activeTab === "alerts" ? "bg-brand-800 text-white shadow-xs shadow-brand-800/10" : "bg-white hover:bg-natural-light text-natural-text border border-natural-border"}`}
          >
            <span className="flex items-center gap-2 font-sans">
              <Smartphone className="w-4 h-4" /> Alerts History
            </span>
            <span className="bg-natural-light text-natural-muted px-2 py-0.5 rounded text-[10px] border border-natural-border font-medium">
              {personalNotifications.length}
            </span>
          </button>
        </aside>

        {/* Right Dashboard Area */}
        <section className="lg:col-span-3">
          {/* TAB 1: LEDGER */}
          {activeTab === "ledger" && (
            <div className="bg-white rounded-xl shadow-xs border border-natural-border overflow-hidden">
              <div className="px-5 py-4 border-b border-natural-border flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-natural-text text-sm font-sans">
                    Automated Crop Balance Ledger
                  </h3>
                  <p className="text-[11px] text-natural-muted font-sans">
                    Every itemized credit memo and virtual payment log in
                    chronological order.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-natural-light hover:bg-natural-sage/20 border border-natural-border text-natural-text px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer font-sans"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-natural-light border-b border-natural-border text-[10px] font-bold text-natural-muted uppercase tracking-wider font-sans">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Details / Reference</th>
                      <th className="px-5 py-3 text-right">Debit (Purchase)</th>
                      <th className="px-5 py-3 text-right">Credit (Payment)</th>
                      <th className="px-5 py-3 text-right">
                        Running Balance Owed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-border text-natural-text">
                    {personalLedger.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-natural-light/40 transition-all font-medium"
                      >
                        <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-natural-muted">
                          {entry.date}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entry.type === "PURCHASE" ? "bg-natural-accent/15 text-natural-accent border border-natural-accent/30" : entry.type === "PAYMENT" ? "bg-brand-900/10 text-brand-800 border border-brand-800/25" : "bg-natural-light text-natural-muted border border-natural-border"}`}
                          >
                            {entry.type === "DUE_CARRY_FORWARD"
                              ? "OPENING DUE"
                              : entry.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-natural-text font-semibold">
                          {entry.description}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-natural-red">
                          {entry.type === "PURCHASE"
                            ? `+${entry.amount.toLocaleString()}`
                            : entry.type === "DUE_CARRY_FORWARD"
                              ? `+${entry.amount.toLocaleString()}`
                              : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-brand-800">
                          {entry.type === "PAYMENT"
                            ? `-${entry.amount.toLocaleString()}`
                            : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-natural-text">
                          {entry.runningBalance.toLocaleString()} BDT
                        </td>
                      </tr>
                    ))}
                    {personalLedger.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-12 text-natural-muted font-sans font-medium"
                        >
                          No ledger history found for this profile.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SUBMIT PAYMENT */}
          {activeTab === "pay" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-xs border border-natural-border p-6">
                <div>
                  <h3 className="font-extrabold text-natural-text text-sm font-sans">
                    Settle Balance via Mobile Banking / Bank Deposit
                  </h3>
                  <p className="text-[11px] text-natural-muted font-sans mt-0.5">
                    Submit your transaction code to clear dues. Our financial
                    department audits transactions within 1 hour.
                  </p>
                </div>

                {paySuccessMsg && (
                  <div className="bg-brand-900/15 border border-brand-800/25 text-brand-950 p-4 rounded-xl mt-4 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-brand-800 shrink-0" />
                    <p className="font-sans">{paySuccessMsg}</p>
                  </div>
                )}

                <form
                  onSubmit={handlePaymentSubmit}
                  className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                      Payment Gateway
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-800/10 focus:border-brand-800 text-natural-text"
                    >
                      <option value="bKash">bKash (01712-345678)</option>
                      <option value="Nagad">Nagad (01712-345678)</option>
                      <option value="Upay">Upay (01712-345678)</option>
                      <option value="Bank Transfer">
                        Dutch-Bangla Bank Ltd (A/C: 120-1493)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                      Transfer Amount (BDT)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-800/10 focus:border-brand-800 text-natural-text"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                      Your Account Number (Last 4/All)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 01715XXXX77"
                      value={payAccount}
                      onChange={(e) => setPayAccount(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-800/10 focus:border-brand-800 text-natural-text"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                      Transaction ID / Bank Reference Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BKX928438S"
                      value={payTxid}
                      onChange={(e) => setPayTxid(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-800/10 focus:border-brand-800 text-natural-text"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                      Transaction Screenshot (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            // In a real app this would upload to server
                            // Here we just store it in state (assumes a new state variable payScreenshot)
                            (window as any)._tempScreenshot =
                              reader.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-800/10 focus:border-brand-800 text-natural-text"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2">
                    <button
                      type="submit"
                      className="w-full bg-brand-800 hover:bg-brand-900 text-white font-bold py-2.5 rounded-lg text-sm shadow-xs cursor-pointer transition-all font-sans"
                    >
                      Verify Ledger Settlement
                    </button>
                  </div>
                </form>
              </div>

              {/* Outstanding submitted payments history */}
              <div className="bg-white rounded-xl shadow-xs border border-natural-border overflow-hidden">
                <div className="px-5 py-3.5 bg-natural-light border-b border-natural-border">
                  <h4 className="font-extrabold text-natural-text text-xs font-sans">
                    Submitted Settlements Audit History
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-natural-light border-b border-natural-border text-[10px] font-bold text-natural-muted uppercase tracking-wider">
                        <th className="px-5 py-3">TxID Reference</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3">Account</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-natural-border text-natural-text">
                      {personalPayments.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-natural-light/40 transition-all"
                        >
                          <td className="px-5 py-3 font-mono font-bold text-natural-text">
                            {p.transactionId}
                          </td>
                          <td className="px-5 py-3 font-semibold text-natural-text">
                            {p.method}
                          </td>
                          <td className="px-5 py-3 font-mono text-natural-muted">
                            {p.accountNo}
                          </td>
                          <td className="px-5 py-3 text-right font-extrabold text-natural-text">
                            {p.amount.toLocaleString()} BDT
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.status === "VERIFIED" ? "bg-brand-900/10 text-brand-800 border border-brand-800/25" : p.status === "PENDING" ? "bg-natural-accent/15 text-natural-accent border border-natural-accent/30" : "bg-natural-red/10 text-natural-red border border-natural-red/25"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {personalPayments.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-6 text-natural-muted font-medium font-sans"
                          >
                            No digital settlements submitted yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HALKHATA LETTER */}
          {activeTab === "halkhata" && (
            <div className="bg-white rounded-xl shadow-xs border border-natural-border p-6 md:p-12">
              <div className="flex items-center justify-between border-b border-natural-border pb-5 mb-8">
                <div>
                  <h3 className="font-extrabold text-natural-text text-sm font-sans">
                    Formal Invitation & PDF Register
                  </h3>
                  <p className="text-[11px] text-natural-muted font-sans mt-0.5">
                    This official invitation merges live database credentials
                    for crop auditing.
                  </p>
                </div>
                <div className="flex gap-2 font-sans">
                  <button
                    onClick={handlePrint}
                    className="bg-brand-800 hover:bg-brand-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-brand-800/10"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Letter
                  </button>
                  <button
                    onClick={() => {
                      alert(
                        "Simulating PDF Compilation... Download completed as lovely_invitation.pdf",
                      );
                    }}
                    className="bg-natural-light hover:bg-natural-sage/20 border border-natural-border text-natural-text px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
                </div>
              </div>

              {/* Card traditional styling for HalKhata Letter */}
              <div className="border-4 border-natural-accent/35 p-6 md:p-10 rounded-xl bg-natural-accent/5 shadow-xs relative overflow-hidden font-serif max-w-2xl mx-auto">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-900 via-natural-accent to-brand-900" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-brand-900 via-natural-accent to-brand-900" />

                <div className="text-center">
                  <span className="text-[10px] font-sans font-black text-brand-900 bg-natural-sage/30 px-3 py-1.5 rounded-full border border-natural-border uppercase tracking-widest">
                    शुभ হালখাতা ১৪৩৩
                  </span>
                  <h2 className="text-2xl font-black text-brand-950 mt-4 tracking-wide font-sans">
                    {config.shopName}
                  </h2>
                  <p className="text-xs text-natural-muted font-sans italic mt-1">
                    Dealer: Seeds, Fertilizers, & Insecticides
                  </p>
                  <p className="text-[11px] text-brand-800 font-sans font-bold mt-0.5">
                    Proprietorship: {config.proprietorName}
                  </p>
                </div>

                <div className="mt-8 border-t border-natural-accent/20 pt-8 text-sm text-natural-text leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {dynamicLetter || "No active HalKhata event cataloged."}
                </div>

                <div className="mt-12 border-t border-natural-accent/25 pt-6 flex justify-between items-center text-xs text-natural-muted font-sans font-semibold">
                  <div>
                    <p>Grand Banquet Venue:</p>
                    <p className="text-natural-text font-extrabold">
                      {currentEvent?.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>Official Contact:</p>
                    <p className="text-natural-text font-extrabold font-mono">
                      {config.phoneNumbers[0]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ALERTS HISTORY */}
          {activeTab === "alerts" && (
            <div className="bg-white rounded-xl shadow-xs border border-natural-border overflow-hidden">
              <div className="px-5 py-4 border-b border-natural-border">
                <h3 className="font-extrabold text-natural-text text-sm font-sans">
                  Dispatched System Alerts Log
                </h3>
                <p className="text-[11px] text-natural-muted font-sans">
                  Chronological history of SMS, Email, and WhatsApp alerts
                  delivered to your contact endpoint.
                </p>
              </div>

              <div className="divide-y divide-natural-border">
                {personalNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4.5 hover:bg-natural-light/40 flex items-start gap-4 transition-all"
                  >
                    <div
                      className={`p-2.5 rounded-lg shrink-0 ${n.type === "WhatsApp" ? "bg-brand-900/10 text-brand-800" : n.type === "SMS" ? "bg-natural-sage/20 text-brand-950" : "bg-natural-accent/15 text-natural-accent"}`}
                    >
                      <Smartphone className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0 font-sans">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold font-mono text-natural-muted">
                          {n.timestamp}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase bg-natural-light text-natural-muted px-2 py-0.5 rounded border border-natural-border">
                          {n.type} channel
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-natural-text mt-1.5 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                        <span className="text-brand-800 flex items-center gap-1">
                          ● Status: DELIVERED
                        </span>
                        <span className="text-natural-border">|</span>
                        <span className="text-natural-muted">
                          Trigger: {n.triggerEvent}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {personalNotifications.length === 0 && (
                  <div className="p-12 text-center text-natural-muted text-xs font-sans font-medium">
                    No system alerts dispatched to your profile endpoint yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "calls" && (
            <div className="bg-white rounded-xl shadow-xs border border-natural-border overflow-hidden">
              <div className="px-5 py-4 border-b border-natural-border">
                <h3 className="font-extrabold text-natural-text text-sm font-sans">
                  Voice Call History (PBX Integration)
                </h3>
                <p className="text-[11px] text-natural-muted font-sans">
                  Automated HalKhata campaign calls, due reminders, and direct
                  IVR interactions.
                </p>
              </div>

              <div className="divide-y divide-natural-border">
                {(state.campaigns || [])
                  .flatMap((c) => c.calls)
                  .filter(
                    (c) =>
                      c.customerPhone &&
                      (c.customerPhone === customer.phone ||
                        c.customerId === customer.id),
                  )
                  .map((call, i) => (
                    <div
                      key={i}
                      className="p-4.5 hover:bg-natural-light/40 flex items-start gap-4 transition-all"
                    >
                      <div className="p-2.5 rounded-lg shrink-0 bg-brand-900/10 text-brand-800">
                        <PhoneCall className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0 font-sans">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] font-bold font-mono text-natural-muted">
                            {call.timestamp}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${call.status === "Completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}
                          >
                            {call.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-natural-text mt-1.5 leading-relaxed">
                          IVR Dialer Campaign - Due Reminder / HalKhata
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                          <span className="text-natural-muted">
                            Duration: {call.duration || 0} seconds
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                {(state.campaigns || [])
                  .flatMap((c) => c.calls)
                  .filter(
                    (c) =>
                      c.customerPhone &&
                      (c.customerPhone === customer.phone ||
                        c.customerId === customer.id),
                  ).length === 0 && (
                  <div className="p-8 text-center text-natural-muted text-xs font-bold">
                    No active call logs found for this account.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
