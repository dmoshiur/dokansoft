import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function WhatsAppSessionManager() {
  const [status, setStatus] = useState<string>("checking...");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Hello from Lovely ERP WhatsApp Bot!",
  );
  const [isSending, setIsSending] = useState(false);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch("/api/whatsapp/status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setStatus(data.state);
      if (data.qr) {
        const url = await QRCode.toDataURL(data.qr);
        setQrCodeUrl(url);
      } else {
        setQrCodeUrl(null);
      }
    } catch (e) {
      setStatus("error fetching status");
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      await fetch("/api/whatsapp/disconnect", { 
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTest = async () => {
    setIsSending(true);
    try {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ number: testNumber, message: testMessage }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Message sent successfully!");
      } else {
        alert("Failed to send: " + data.error);
      }
    } catch (e: any) {
      alert("Error sending message: " + e.message);
    }
    setIsSending(false);
  };

  return (
    <div className="mt-4 border border-natural-border p-4 rounded-lg bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-bold text-slate-700">Session Status: </span>
          <span
            className={`px-2 py-1 rounded text-[10px] font-black uppercase ${status === "connected" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
          >
            {status}
          </span>
        </div>
        {status === "connected" && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold transition-all cursor-pointer"
          >
            Disconnect Session
          </button>
        )}
      </div>

      {status === "qr_ready" && qrCodeUrl && (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded border border-natural-border mb-4">
          <img
            src={qrCodeUrl}
            alt="WhatsApp QR Code"
            className="w-48 h-48 mb-2"
          />
          <p className="text-[10px] text-slate-500 font-medium">
            Scan with WhatsApp &gt; Linked Devices
          </p>
        </div>
      )}

      {status === "connected" && (
        <div className="mt-6 pt-4 border-t border-natural-border">
          <h4 className="font-bold text-sm mb-3 text-slate-800">
            Test Message
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
                Recipient Number (with country code)
              </label>
              <input
                type="text"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="e.g. 8801712345678"
                className="w-full px-3 py-2 bg-white border border-natural-border rounded focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
                Message Content
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-natural-border rounded focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTest}
              disabled={isSending || !testNumber}
              className="w-full bg-brand-800 hover:bg-brand-900 text-white font-bold py-2 rounded text-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSending ? "Sending..." : "Send Test WhatsApp Message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
