import React, { useEffect, useState } from "react";
import { Download, Smartphone, Apple, ShieldCheck, RefreshCw, ArrowRight, Home } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } else {
      alert(
        "Install prompt is not available on this browser. On iOS Safari tap Share → Add to Home Screen.",
      );
    }
  };

  const goDash = () => {
    window.history.pushState({}, "", "/dash");
    window.dispatchEvent(new Event("popstate"));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-2xl p-8 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Smartphone size={38} />
        </div>
        <h1 className="text-2xl font-extrabold mt-5">Install Mahi and Muhi Traders App</h1>
        <p className="text-slate-400 text-sm mt-2">
          Install the PWA on your phone for fast access, offline static assets and a full-screen app experience.
        </p>

        <div className="mt-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-left text-xs space-y-3">
          <div className="flex items-center gap-3">
            <Download size={18} className="text-emerald-400 shrink-0" />
            <span>Tap <strong>Install App</strong> below (Android/Chrome/Edge).</span>
          </div>
          <div className="flex items-center gap-3">
            <Apple size={18} className="text-emerald-400 shrink-0" />
            <span>On <strong>iPhone/iPad (Safari)</strong>: tap Share → Add to Home Screen.</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <span>API data always loads fresh. Static UI stays cached for fast opens.</span>
          </div>
        </div>

        <button
          onClick={install}
          disabled={installed}
          className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {installed ? (
            <><RefreshCw size={18} /> Already Installed</>
          ) : (
            <><Download size={18} /> Install App</>
          )}
        </button>

        <button
          onClick={goDash}
          className="mt-3 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home size={16} /> Continue to Dashboard
          <ArrowRight size={16} />
        </button>

        <p className="text-[10px] text-slate-500 mt-6">
          When installed, the app opens straight to your dashboard at <span className="font-mono text-emerald-400">/dash</span>.
        </p>
      </div>
    </div>
  );
}
