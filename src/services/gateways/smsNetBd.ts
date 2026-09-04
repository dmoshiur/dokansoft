import { repository } from "../db/repository.ts";
import { encryptSecret, decryptSecret } from "../security/gatewaySecrets.ts";

export interface SmsNetBdConfig {
  id: string;
  enabled: boolean;
  apiKey: string;
  senderId?: string;
  defaultContentId?: string;
  lastTestedAt?: string;
  balanceCache?: {
    balance: number;
    currency: string;
    fetchedAt: string;
  };
}

export interface SmsSendOptions {
  to: string;
  msg: string;
  schedule?: string;
  senderId?: string;
  contentId?: string;
}

const BASE_URL = "https://api.sms.net.bd";

const DEFAULT_CONFIG: SmsNetBdConfig = {
  id: "sms_net_bd",
  enabled: false,
  apiKey: "",
  senderId: "",
  defaultContentId: "",
};

let passwordCache: string | null = null;
let balanceCache: { balance: number; fetchedAt: number } | null = null;
const BALANCE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export class SmsNetBdService {
  static async getConfig(): Promise<SmsNetBdConfig> {
    const config = await repository.getGatewayConfig<SmsNetBdConfig>(
      "sms_net_bd",
    );
    return {
      ...DEFAULT_CONFIG,
      ...(config || {}),
      apiKey: decryptSecret(config?.apiKey || ""),
    };
  }

  static async saveConfig(
    config: Partial<SmsNetBdConfig>,
  ): Promise<SmsNetBdConfig> {
    const current = await this.getConfig();
    const next: SmsNetBdConfig = {
      ...current,
      ...config,
      id: "sms_net_bd",
    };
    if (config.apiKey && config.apiKey !== "••••••" && config.apiKey !== "••••••••") {
      next.apiKey = encryptSecret(config.apiKey);
    } else {
      // Preserve existing encrypted key when masked value is submitted.
      const raw = await repository.getGatewayConfig<SmsNetBdConfig>("sms_net_bd");
      next.apiKey = raw?.apiKey || encryptSecret(current.apiKey || "");
    }
    await repository.saveGatewayConfig(next);
    return next;
  }

  static async send(options: SmsSendOptions, override?: Partial<SmsNetBdConfig>): Promise<{
    success: boolean;
    requestId?: string;
    status?: string;
    charge?: number;
    error?: string;
    skipped?: boolean;
    raw?: any;
  }> {
    const current = await this.getConfig();
    const config: SmsNetBdConfig = { ...current, ...(override || {}) };
    const to = (options.to || "").replace(/[\s-]/g, "");

    // Master toggle: when off we still create an audit log but never call
    // the external provider. This ensures SMS downtime never crashes or slows
    // the core product flow.
    if (!config.enabled || !config.apiKey) {
      await repository.addDocument("sms_logs", {
        to,
        msg: options.msg,
        status: "DISABLED",
        requestId: "",
        charge: 0,
        schedule: options.schedule || "",
        error: "SMS gateway disabled or API key missing",
        createdAt: new Date().toISOString(),
      });
      return {
        success: false,
        skipped: true,
        error: "SMS gateway disabled or API key missing",
      };
    }

    const params = new URLSearchParams({
      api_key: config.apiKey,
      msg: options.msg,
      to,
    });
    if (options.schedule) params.set("schedule", options.schedule);
    if (options.senderId || config.senderId)
      params.set("sender_id", options.senderId || config.senderId!);
    if (options.contentId || config.defaultContentId)
      params.set("content_id", options.contentId || config.defaultContentId!);

    try {
      const response = await fetch(`${BASE_URL}/sendsms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const rawText = await response.text();
      let raw: any = rawText;
      try {
        raw = JSON.parse(rawText);
      } catch {
        // Some gateways return plain text; keep as-is
      }

      const requestId =
        raw?.request_id || raw?.requestId || raw?.id || raw?.RequestID || "";
      const status = raw?.status || raw?.Status || (response.ok ? "SENT" : "FAILED");
      const charge =
        Number(raw?.charge || raw?.price || raw?.Cost || 0) || 0;
      const success =
        response.ok &&
        (!["FAILED", "ERROR", "REJECTED"].includes(String(status).toUpperCase()) ||
          String(status).toUpperCase() === "SENT");
      const error =
        raw?.error || raw?.message || raw?.msg || (!response.ok
          ? `HTTP ${response.status}`
          : "");

      await repository.addDocument("sms_logs", {
        to,
        msg: options.msg,
        status: success ? "SENT" : "FAILED",
        requestId,
        charge,
        schedule: options.schedule || "",
        error,
        raw,
        createdAt: new Date().toISOString(),
      });

      return { success, requestId, status, charge, error, raw };
    } catch (err: any) {
      await repository.addDocument("sms_logs", {
        to,
        msg: options.msg,
        status: "FAILED",
        requestId: "",
        charge: 0,
        schedule: options.schedule || "",
        error: err.message || "Network error",
        createdAt: new Date().toISOString(),
      });
      return { success: false, error: err.message || "Network error" };
    }
  }

  static async getReport(requestId: string): Promise<{
    success: boolean;
    raw?: any;
    status?: string;
    error?: string;
  }> {
    const config = await this.getConfig();
    if (!config.apiKey) return { success: false, error: "API key missing" };
    try {
      const url = `${BASE_URL}/report/request/${encodeURIComponent(
        requestId,
      )}/?api_key=${encodeURIComponent(config.apiKey)}`;
      const response = await fetch(url);
      const raw = await response.json();
      return { success: response.ok, raw, status: raw?.status || raw?.Status };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getBalance(forceRefresh = false): Promise<{
    balance: number;
    currency: string;
    fetchedAt: string;
    error?: string;
  }> {
    const config = await this.getConfig();
    if (!config.enabled || !config.apiKey) {
      return {
        balance: 0,
        currency: "BDT",
        fetchedAt: new Date().toISOString(),
        error: "SMS gateway disabled",
      };
    }

    if (
      !forceRefresh &&
      balanceCache &&
      Date.now() - balanceCache.fetchedAt < BALANCE_CACHE_TTL
    ) {
      return {
        balance: balanceCache.balance,
        currency: "BDT",
        fetchedAt: new Date(balanceCache.fetchedAt).toISOString(),
      };
    }

    try {
      const url = `${BASE_URL}/user/balance/?api_key=${encodeURIComponent(
        config.apiKey,
      )}`;
      const response = await fetch(url);
      const raw = await response.json();
      const balance = Number(raw?.balance ?? raw?.Balance ?? raw?.remaining ?? 0);
      const currency = raw?.currency || raw?.Currency || "BDT";
      balanceCache = { balance, fetchedAt: Date.now() };
      await this.saveConfig({ balanceCache: { balance, currency, fetchedAt: new Date().toISOString() } });
      return {
        balance,
        currency,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        balance: 0,
        currency: "BDT",
        fetchedAt: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  static async getLogs(): Promise<any[]> {
    const logs = await repository.getCollection<any>("sms_logs");
    return logs.sort((a: any, b: any) =>
      ((b.createdAt || "") as string).localeCompare(a.createdAt || ""),
    );
  }

  static async syncReports(): Promise<{ synced: number; failed: number }> {
    const logs = await this.getLogs();
    const candidates = logs.filter(
      (l) => l.requestId && !["FAILED", "DISABLED", "DELIVERED"].includes(l.status),
    );
    let synced = 0;
    let failed = 0;
    for (const log of candidates.slice(0, 100)) {
      const report = await this.getReport(log.requestId);
      if (report.success) {
        const status = report.status || log.status;
        const rawStatus = String(status || "").toUpperCase();
        const mapped =
          ["DELIVERED", "SENT", "FAILED", "CANCELLED"].includes(rawStatus)
            ? rawStatus
            : rawStatus === "PENDING" || rawStatus === "QUEUED"
              ? "PENDING"
              : log.status;
        await repository.updateDocument("sms_logs", log.id, {
          status: mapped,
          report: report.raw,
          charge: Number(report.raw?.charge ?? report.raw?.cost ?? log.charge ?? 0),
          syncedAt: new Date().toISOString(),
        });
        synced++;
      } else {
        failed++;
      }
    }
    return { synced, failed };
  }
}

export const smsNetBdService = SmsNetBdService;
export const getSmsNetBdPasswordCache = () => passwordCache;
