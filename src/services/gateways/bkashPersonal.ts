import { repository } from "../db/repository.ts";
import { getDb } from "../db/mongodb.ts";
import { encryptSecret, decryptSecret } from "../security/gatewaySecrets.ts";

export interface BkashPersonalConfig {
  id: string;
  enabled: boolean;
  bkashNumber: string;
  webhookToken: string;
  amountTolerance: number;
  pendingOrderExpireMinutes: number;
  lastTestedAt?: string;
}

export interface IncomingSms {
  raw_message: string;
  amount?: string | number;
  trx_id?: string;
  sender_number?: string;
  reference?: string;
  received_at?: string;
}

export interface BkashIncomingRecord {
  id: string;
  raw_message: string;
  amount?: number;
  trx_id?: string;
  sender_number?: string;
  reference?: string;
  received_at?: string;
  matched: boolean;
  matched_order_id?: string;
  matched_by?: "auto" | "manual";
  createdAt: string;
}

const DEFAULT_CONFIG: BkashPersonalConfig = {
  id: "bkash_personal",
  enabled: false,
  bkashNumber: "",
  webhookToken: "",
  amountTolerance: 0,
  pendingOrderExpireMinutes: 30,
};

function normalizeAmount(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === "") return NaN;
  const num = Number(String(v).replace(/,/g, "").replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : NaN;
}

function matchMinuteWindow(
  created: string,
  expireMinutes: number,
): boolean {
  if (!created) return true;
  const t = new Date(created).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= expireMinutes * 60 * 1000;
}

const AMOUNT_RE =
  /(?:৳|Tk|TK|BDT|Taka|Amount)[.\s:]*([\d,]+(?:\.\d{1,2})?)/i;
const TRX_RE =
  /(?:TrxID|Trx ID|Transaction[.\s]*ID|TxID)[:\s]*([A-Z0-9]{6,30})/i;
const SENDER_RE =
  /(?:From|Sender)[:\s]*(\+?88)?(01[3-9]\d{8})/i;
const REF_RE =
  /(?:Ref|Reference|Note)[:\s]*([A-Za-z0-9-]{4,40})/i;
const NUMBER_RE = /(\+?88|0)?(01[3-9]\d{8})/;

export class BkashPersonalGateway {
  static parseSms(rawMessage: string) {
    const amountMatch = rawMessage.match(AMOUNT_RE);
    const trxMatch = rawMessage.match(TRX_RE);
    const senderMatch = rawMessage.match(SENDER_RE);
    const refMatch = rawMessage.match(REF_RE);
    const rawSender = rawMessage.match(NUMBER_RE);

    const amount = amountMatch ? normalizeAmount(amountMatch[1]) : NaN;
    const trx_id = trxMatch ? trxMatch[1].toUpperCase() : undefined;
    const sender_number = senderMatch
      ? (senderMatch[1] || "") + senderMatch[2]
      : rawSender
        ? (rawSender[1] || "") + rawSender[2]
        : undefined;

    return {
      amount: Number.isFinite(amount) ? amount : undefined,
      trx_id,
      sender_number,
      reference: refMatch ? refMatch[1] : undefined,
    };
  }

  static async getConfig(): Promise<BkashPersonalConfig> {
    const config = await repository.getGatewayConfig<BkashPersonalConfig>(
      "bkash_personal",
    );
    return {
      ...DEFAULT_CONFIG,
      ...(config || {}),
      webhookToken: decryptSecret(config?.webhookToken || ""),
    };
  }

  static async saveConfig(
    config: Partial<BkashPersonalConfig>,
  ): Promise<BkashPersonalConfig> {
    const current = await this.getConfig();
    const next: BkashPersonalConfig = {
      ...current,
      ...config,
      id: "bkash_personal",
    };
    if (config.webhookToken && config.webhookToken.includes("enc:v1:")) {
      next.webhookToken = config.webhookToken;
    } else if (config.webhookToken && config.webhookToken !== "••••••" && config.webhookToken.length > 8) {
      next.webhookToken = encryptSecret(config.webhookToken);
    } else {
      const raw = await repository.getGatewayConfig<BkashPersonalConfig>("bkash_personal");
      next.webhookToken = raw?.webhookToken || encryptSecret(current.webhookToken || "");
    }
    await repository.saveGatewayConfig(next);
    return next;
  }

  static async generateToken(): Promise<string> {
    const token =
      "bkash_" +
      Math.random().toString(36).substring(2, 12) +
      Date.now().toString(36);
    const config = await this.getConfig();
    await this.saveConfig({ ...config, webhookToken: token });
    return token;
  }

  static async truncateToken(token: string): Promise<string> {
    if (!token) return "";
    return token.slice(0, 8) + "••••••••••••" + token.slice(-4);
  }

  /**
   * Main webhook handler: dedupe + parse fallback + match + save logs.
   */
  static async processIncoming(payload: IncomingSms): Promise<{
    success: boolean;
    matched: boolean;
    paymentId?: string;
    reason?: string;
    recordId?: string;
  }> {
    const config = await this.getConfig();
    if (!config.enabled) {
      return {
        success: false,
        matched: false,
        reason: "bKash Personal gateway is disabled",
      };
    }

    const rawMessage = payload.raw_message || "";
    const parsedFromBackend = this.parseSms(rawMessage);
    const incoming: BkashIncomingRecord = {
      id: `bkash-in-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      raw_message: rawMessage,
      amount: normalizeAmount(payload.amount ?? parsedFromBackend.amount),
      trx_id: (payload.trx_id ?? (parsedFromBackend.trx_id || "")).toUpperCase()
        || undefined,
      sender_number: payload.sender_number || parsedFromBackend.sender_number,
      reference: payload.reference || parsedFromBackend.reference,
      received_at: payload.received_at,
      matched: false,
      createdAt: new Date().toISOString(),
    };

    // Idempotency / replay protection
    if (incoming.trx_id) {
      const existing = await repository.getCollection<BkashIncomingRecord>(
        "bkash_incoming_sms",
      );
      if (existing.some((r) => r.trx_id === incoming.trx_id)) {
        return {
          success: false,
          matched: false,
          reason: "Duplicate trx_id. Replay attack blocked.",
        };
      }
    }

    const payments = await repository.getCollection<any>("payments");
    const pending = payments
      .filter((p) => p.status === "PENDING")
      .filter((p) => matchMinuteWindow(p.timestamp, config.pendingOrderExpireMinutes));

    // Build candidate list. Exact trx/reference match gets priority, then
    // amount-with-tolerance matches.
    const candidates = pending
      .map((p) => {
        let score = 0;
        if (
          incoming.trx_id &&
          String(p.transactionId || "").toUpperCase() === incoming.trx_id
        ) {
          score += 100;
        }
        if (
          incoming.reference &&
          (String(p.reference || "").toUpperCase() === incoming.reference.toUpperCase() ||
            String(p.id || "").toUpperCase() === incoming.reference.toUpperCase())
        ) {
          score += 80;
        }
        const amount = Number(p.amount || 0);
        if (!Number.isNaN(incoming.amount)) {
          const diff = Math.abs(amount - incoming.amount);
          if (diff === 0) score += 50;
          else if (diff <= config.amountTolerance) score += 30;
          else return null;
        }
        if (incoming.sender_number) {
          const clean = String(incoming.sender_number).replace(/\D/g, "").replace(/^88/, "");
          const cust = clean.endsWith(String(p.accountNo || "").replace(/\D/g, "").slice(-7))
            ? 1
            : 0;
          score += cust * 20;
        }
        return { payment: p, score };
      })
      .filter((c): c is { payment: any; score: number } => c !== null && c.score > 0)
      .sort((a, b) => b.score - a.score);

    const match = candidates[0]?.payment;
    if (!match) {
      await repository.addDocument("bkash_incoming_sms", incoming);
      await repository.addDocument("bkash_unmatched_sms", {
        ...incoming,
        status: "UNMATCHED",
      });
      return {
        success: true,
        matched: false,
        reason: "No pending payment matched the incoming SMS.",
        recordId: incoming.id,
      };
    }

    incoming.matched = true;
    incoming.matched_order_id = match.id;
    incoming.matched_by = "auto";
    await repository.addDocument("bkash_incoming_sms", incoming);

    await this.verifyPayment(match.id, incoming.trx_id, "auto");

    return {
      success: true,
      matched: true,
      paymentId: match.id,
      recordId: incoming.id,
    };
  }

  static async verifyPayment(
    paymentId: string,
    trxId: string | undefined,
    matchedBy: "auto" | "manual",
  ): Promise<boolean> {
    const dbRaw = await repository.getCollection<any>("payments");
    const payment = dbRaw.find((p) => p.id === paymentId);
    if (!payment) return false;

    const db = getDb();
    await db.collection("payments").updateOne(
      { id: paymentId },
      {
        $set: {
          status: "VERIFIED",
          verifiedBy: "bKash Personal SMS Gateway",
          verifiedAt: new Date().toISOString(),
          matched_by: matchedBy,
          gateway_trx_id: trxId || "",
        },
      },
    );

    const ledgerId = `led-bkash-${Date.now()}`;
    const date = new Date().toISOString().split("T")[0];
    const customerId = payment.customerId;
    await db.collection("ledger").insertOne({
      _id: ledgerId as any,
      id: ledgerId,
      customerId,
      date,
      type: "PAYMENT",
      description: `bKash Personal auto-verification (TxID: ${trxId || "N/A"})`,
      amount: Number(payment.amount || 0),
      runningBalance: 0,
    });

    const entries = await db.collection("ledger").find({ customerId }).toArray();
    const balance = entries.reduce((sum, item) => {
      if (item.type === "PURCHASE" || item.type === "DUE_CARRY_FORWARD") {
        return sum + item.amount;
      } else {
        return sum - item.amount;
      }
    }, 0);

    await db.collection("ledger").updateOne(
      { id: ledgerId },
      { $set: { runningBalance: balance } },
    );
    await db.collection("customers").updateOne(
      { id: customerId },
      { $set: { dueAmount: balance } },
    );

    return true;
  }

  static async manualMatch(unmatchedId: string, paymentId: string) {
    const unmatched = await repository.getCollection<BkashIncomingRecord>(
      "bkash_unmatched_sms",
    );
    const record = unmatched.find((r) => r.id === unmatchedId);
    if (!record) throw new Error("Unmatched SMS not found");

    await repository.updateDocument("bkash_incoming_sms", record.id, {
      matched: true,
      matched_order_id: paymentId,
      matched_by: "manual",
    });
    await repository.updateDocument("bkash_unmatched_sms", unmatchedId, {
      status: "MATCHED_MANUALLY",
      matched_order_id: paymentId,
    });
    const ok = await this.verifyPayment(paymentId, record.trx_id, "manual");
    if (!ok) throw new Error("Payment not found while matching manually");
    return { success: true };
  }

  static async getIncomingLogs(): Promise<any[]> {
    const logs = await repository.getCollection<any>("bkash_incoming_sms");
    return logs.sort((a, b) =>
      ((b.createdAt || "") as string).localeCompare(a.createdAt || ""),
    );
  }

  static async getUnmatched(): Promise<any[]> {
    const logs = await repository.getCollection<any>("bkash_unmatched_sms");
    return logs.sort((a, b) =>
      ((b.createdAt || "") as string).localeCompare(a.createdAt || ""),
    );
  }
}

export const bkashPersonalGateway = BkashPersonalGateway;
