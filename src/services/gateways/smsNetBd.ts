import { repository } from "../db/repository.ts";
import { encryptSecret, decryptSecret } from "../security/gatewaySecrets.ts";
import {
  normalizeRecipients,
  describeSmsError,
  cleanNumber,
} from "./smsPhone.ts";

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
  /**
   * Optional context recorded on the log row so the admin SMS Log page can show
   * *why* a message was sent (due reminder, test, campaign …).
   */
  source?: string;
}

export interface SmsSendResult {
  success: boolean;
  requestId?: string;
  status?: string;
  charge?: number;
  error?: string;
  errorCode?: string | number;
  skipped?: boolean;
  raw?: any;
  logId?: string;
}

// Overridable only for local testing / self-hosted proxies; defaults to the
// real gateway.
const BASE_URL = (process.env.SMS_NET_BD_BASE_URL || "https://api.sms.net.bd").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 20000;

const DEFAULT_CONFIG: SmsNetBdConfig = {
  id: "sms_net_bd",
  enabled: false,
  apiKey: "",
  senderId: "",
  defaultContentId: "",
};

let balanceCache: { balance: number; currency: string; fetchedAt: number } | null = null;
const BALANCE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/** Redact an api key so it never lands in the logs table or console. */
const maskKey = (key: string): string =>
  !key ? "(empty)" : key.length <= 8 ? "****" : `${key.slice(0, 4)}…${key.slice(-4)}`;

async function writeLog(entry: Record<string, any>): Promise<string> {
  try {
    return await repository.addDocument("sms_logs", {
      ...entry,
      createdAt: entry.createdAt || new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[SMS] Failed to persist sms_logs entry:", err?.message);
    return "";
  }
}

export class SmsNetBdService {
  static async getConfig(): Promise<SmsNetBdConfig> {
    const config = await repository.getGatewayConfig<SmsNetBdConfig>(
      "sms_net_bd",
    );
    return {
      ...DEFAULT_CONFIG,
      ...(config || {}),
      apiKey: decryptSecret(config?.apiKey || "").trim(),
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
    const submitted = (config.apiKey || "").trim();
    const isMasked = /^[•*]+$/.test(submitted);
    if (submitted && !isMasked) {
      next.apiKey = encryptSecret(submitted);
    } else {
      // Preserve existing encrypted key when a masked/blank value is submitted.
      const raw = await repository.getGatewayConfig<SmsNetBdConfig>("sms_net_bd");
      next.apiKey = raw?.apiKey || encryptSecret(current.apiKey || "");
    }
    await repository.saveGatewayConfig(next);
    return next;
  }

  /**
   * Configuration health check used by the admin diagnostics endpoint.
   * Tells the operator exactly which precondition is missing.
   */
  static async diagnose(): Promise<{
    ok: boolean;
    enabled: boolean;
    apiKeyPresent: boolean;
    apiKeyMasked: string;
    senderId: string;
    problems: string[];
    balance?: any;
    queue?: Record<string, number>;
    pendingSms?: number;
  }> {
    const config = await this.getConfig();
    const problems: string[] = [];
    if (!config.enabled) problems.push("SMS gateway toggle is OFF (Settings → Notification Gateways → SMS → Enable).");
    if (!config.apiKey) problems.push("API key is not saved for sms.net.bd.");

    let balance: any;
    if (config.apiKey) {
      balance = await this.getBalance(true);
      if (balance?.error) problems.push(`Balance check failed: ${balance.error}`);
      else if (Number(balance?.balance) <= 0) problems.push("Account balance is 0 — sms.net.bd will reject sends with error 417.");
    }

    let queue: Record<string, number> | undefined;
    let pendingSms: number | undefined;
    try {
      const jobs = await repository.getCollection<any>("job_queue");
      const smsJobs = jobs.filter((j) => j.type === "sms");
      queue = smsJobs.reduce((acc: Record<string, number>, j: any) => {
        acc[j.status] = (acc[j.status] || 0) + 1;
        return acc;
      }, {});
      pendingSms = smsJobs.filter((j) => j.status === "PENDING").length;
      if ((pendingSms || 0) > 0) {
        problems.push(`${pendingSms} SMS job(s) are still PENDING in the queue — check that the gateway worker is running.`);
      }
    } catch {
      /* queue table may not exist yet */
    }

    return {
      ok: problems.length === 0,
      enabled: !!config.enabled,
      apiKeyPresent: !!config.apiKey,
      apiKeyMasked: maskKey(config.apiKey),
      senderId: config.senderId || "",
      problems,
      balance,
      queue,
      pendingSms,
    };
  }

  static async send(
    options: SmsSendOptions,
    override?: Partial<SmsNetBdConfig>,
  ): Promise<SmsSendResult> {
    const current = await this.getConfig();
    const config: SmsNetBdConfig = { ...current, ...(override || {}) };
    const source = options.source || "manual";

    // --- 1. Recipient normalisation (spaces/dashes/+88/০১… all handled) ---
    const { to, valid, invalid } = normalizeRecipients(options.to);
    if (!valid.length) {
      const reason =
        invalid[0]?.reason ||
        "কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি / no valid recipient number";
      const logId = await writeLog({
        to: cleanNumber(options.to),
        msg: options.msg,
        status: "FAILED",
        requestId: "",
        charge: 0,
        errorCode: "416",
        error: reason,
        source,
      });
      console.error(`[SMS] Rejected before send — ${reason}`);
      return { success: false, error: reason, errorCode: "416", logId };
    }
    if (invalid.length) {
      console.warn(
        `[SMS] Skipping ${invalid.length} invalid recipient(s): ${invalid
          .map((i) => i.input)
          .join(", ")}`,
      );
    }

    // --- 2. Preconditions: toggle + api key ---
    if (!config.enabled || !config.apiKey) {
      const error = !config.enabled
        ? "SMS gateway is disabled in Admin Settings (toggle it ON)"
        : "sms.net.bd API key is missing in Admin Settings";
      const logId = await writeLog({
        to,
        msg: options.msg,
        status: "DISABLED",
        requestId: "",
        charge: 0,
        schedule: options.schedule || "",
        error,
        source,
      });
      console.warn(`[SMS] Not sent — ${error}`);
      return { success: false, skipped: true, error, logId };
    }

    if (!options.msg || !String(options.msg).trim()) {
      const error = "Message body is empty (sms.net.bd error 414)";
      const logId = await writeLog({
        to, msg: options.msg, status: "FAILED", requestId: "", charge: 0,
        errorCode: "414", error, source,
      });
      return { success: false, error, errorCode: "414", logId };
    }

    // --- 3. Build the request exactly as documented by sms.net.bd ---
    const params = new URLSearchParams({
      api_key: config.apiKey,
      msg: String(options.msg),
      to,
    });
    if (options.schedule) params.set("schedule", options.schedule);
    const senderId = options.senderId || config.senderId;
    if (senderId) params.set("sender_id", senderId);
    const contentId = options.contentId || config.defaultContentId;
    if (contentId) params.set("content_id", contentId);

    console.log(
      `[SMS] POST ${BASE_URL}/sendsms to=${to} sender_id=${senderId || "-"} ` +
        `content_id=${contentId || "-"} api_key=${maskKey(config.apiKey)} len=${String(options.msg).length}`,
    );

    // Log the attempt as PENDING first, so a crash/timeout still leaves a trace.
    const logId = await writeLog({
      to,
      msg: options.msg,
      status: "PENDING",
      requestId: "",
      charge: 0,
      schedule: options.schedule || "",
      senderId: senderId || "",
      contentId: contentId || "",
      source,
      error: "",
    });

    const finish = async (patch: Record<string, any>) => {
      if (logId) {
        await repository.updateDocument("sms_logs", logId, {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
      }
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${BASE_URL}/sendsms`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const rawText = await response.text();
      let raw: any = rawText;
      try {
        raw = JSON.parse(rawText);
      } catch {
        // sms.net.bd should return JSON; keep the plain text for the log.
      }

      // sms.net.bd contract: { error: 0, msg: "...", data: { request_id } }
      // `error === 0` is the ONLY success signal — HTTP 200 is returned even
      // for failures, which is why sends previously appeared to "work".
      const errorCode = raw && typeof raw === "object" ? raw.error : undefined;
      const gatewayMsg = raw && typeof raw === "object" ? raw.msg : rawText;
      const requestId = String(raw?.data?.request_id ?? raw?.request_id ?? "");
      const charge = Number(raw?.data?.request_charge ?? raw?.charge ?? 0) || 0;

      const httpOk = response.ok;
      const success = httpOk && String(errorCode) === "0";
      const error = success
        ? ""
        : !httpOk
          ? `HTTP ${response.status} ${response.statusText} — ${String(rawText).slice(0, 200)}`
          : describeSmsError(errorCode, gatewayMsg);

      if (success) {
        console.log(`[SMS] Sent OK to=${to} request_id=${requestId} charge=${charge}`);
      } else {
        console.error(`[SMS] Send FAILED to=${to} → ${error}`, { raw });
      }

      await finish({
        status: success ? "SENT" : "FAILED",
        requestId,
        charge,
        errorCode: errorCode ?? "",
        error,
        gatewayMsg: gatewayMsg || "",
        raw,
        invalidRecipients: invalid.map((i) => i.input),
      });

      // A successful send changes the balance — invalidate the cache.
      if (success) balanceCache = null;

      return {
        success,
        requestId,
        status: success ? "SENT" : "FAILED",
        charge,
        error,
        errorCode,
        raw,
        logId,
      };
    } catch (err: any) {
      const error =
        err?.name === "AbortError"
          ? `Request to sms.net.bd timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
          : `Network error contacting sms.net.bd: ${err?.message || err}`;
      console.error(`[SMS] ${error}`);
      await finish({ status: "FAILED", error, errorCode: "NETWORK" });
      return { success: false, error, errorCode: "NETWORK", logId };
    }
  }

  static async getReport(requestId: string): Promise<{
    success: boolean;
    raw?: any;
    status?: string;
    charge?: number;
    error?: string;
  }> {
    const config = await this.getConfig();
    if (!config.apiKey) return { success: false, error: "API key missing" };
    try {
      const url = `${BASE_URL}/report/request/${encodeURIComponent(
        requestId,
      )}/?api_key=${encodeURIComponent(config.apiKey)}`;
      const response = await fetch(url);
      const text = await response.text();
      let raw: any = text;
      try { raw = JSON.parse(text); } catch { /* keep text */ }
      if (!response.ok || String(raw?.error) !== "0") {
        return {
          success: false,
          raw,
          error: describeSmsError(raw?.error, raw?.msg || text),
        };
      }
      return {
        success: true,
        raw,
        status: raw?.data?.request_status,
        charge: Number(raw?.data?.request_charge || 0) || 0,
      };
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
    if (!config.apiKey) {
      return {
        balance: 0,
        currency: "BDT",
        fetchedAt: new Date().toISOString(),
        error: "sms.net.bd API key is not configured",
      };
    }

    if (
      !forceRefresh &&
      balanceCache &&
      Date.now() - balanceCache.fetchedAt < BALANCE_CACHE_TTL
    ) {
      return {
        balance: balanceCache.balance,
        currency: balanceCache.currency,
        fetchedAt: new Date(balanceCache.fetchedAt).toISOString(),
      };
    }

    try {
      const url = `${BASE_URL}/user/balance/?api_key=${encodeURIComponent(
        config.apiKey,
      )}`;
      const response = await fetch(url);
      const text = await response.text();
      let raw: any = text;
      try { raw = JSON.parse(text); } catch { /* keep text */ }

      if (!response.ok || String(raw?.error) !== "0") {
        const error = describeSmsError(raw?.error, raw?.msg || text);
        console.error(`[SMS] Balance check failed: ${error}`);
        return { balance: 0, currency: "BDT", fetchedAt: new Date().toISOString(), error };
      }

      const balance = Number(raw?.data?.balance ?? raw?.balance ?? 0) || 0;
      const currency = raw?.data?.currency || raw?.currency || "BDT";
      balanceCache = { balance, currency, fetchedAt: Date.now() };
      await this.saveConfig({
        balanceCache: { balance, currency, fetchedAt: new Date().toISOString() },
      });
      return { balance, currency, fetchedAt: new Date().toISOString() };
    } catch (err: any) {
      const error = `Network error contacting sms.net.bd: ${err.message}`;
      console.error(`[SMS] ${error}`);
      return { balance: 0, currency: "BDT", fetchedAt: new Date().toISOString(), error };
    }
  }

  static async getLogs(limit = 500): Promise<any[]> {
    const logs = await repository.getCollection<any>("sms_logs");
    return logs
      .sort((a: any, b: any) =>
        ((b.createdAt || "") as string).localeCompare(a.createdAt || ""),
      )
      .slice(0, limit);
  }

  static async logStats(): Promise<Record<string, number>> {
    const logs = await repository.getCollection<any>("sms_logs");
    return logs.reduce((acc: Record<string, number>, l: any) => {
      const key = String(l.status || "UNKNOWN").toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      acc.TOTAL = (acc.TOTAL || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  static async syncReports(): Promise<{ synced: number; failed: number }> {
    const logs = await this.getLogs();
    const candidates = logs.filter(
      (l) =>
        l.requestId &&
        !["FAILED", "DISABLED", "DELIVERED", "CANCELLED"].includes(
          String(l.status || "").toUpperCase(),
        ),
    );
    let synced = 0;
    let failed = 0;
    for (const log of candidates.slice(0, 100)) {
      const report = await this.getReport(log.requestId);
      if (report.success) {
        const rawStatus = String(report.status || "").toUpperCase();
        const mapped =
          rawStatus === "COMPLETE"
            ? "DELIVERED"
            : ["DELIVERED", "SENT", "FAILED", "CANCELLED"].includes(rawStatus)
              ? rawStatus
              : ["PENDING", "QUEUED", "PROCESSING"].includes(rawStatus)
                ? "PENDING"
                : log.status;
        await repository.updateDocument("sms_logs", log.id, {
          status: mapped,
          report: report.raw,
          charge: Number(report.charge ?? log.charge ?? 0),
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
