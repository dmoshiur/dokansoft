/**
 * Data-integrity helpers that stop duplicate customers / hisab entries from
 * being written, and that find the duplicates already sitting in the database.
 *
 * Nothing in this module ever deletes data — the admin report is read-only.
 */
import { getDb } from "./mongodb.ts";
import { repository } from "./repository.ts";

/** Canonical phone key: digits only, without country code, for comparison. */
export function phoneKey(phone: any): string {
  const digits = String(phone ?? "")
    .replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d).toString())
    .replace(/\D/g, "");
  if (!digits) return "";
  // 8801XXXXXXXXX / 01XXXXXXXXX / 1XXXXXXXXX all collapse to 1XXXXXXXXX
  if (digits.length >= 13 && digits.startsWith("880")) return digits.slice(3);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Canonical name key: lowercase, collapsed whitespace, no punctuation. */
export function nameKey(name: any): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Look for an existing customer that matches on mobile number, or on
 * name when no phone is present. Returns the matching document or null.
 */
export async function findExistingCustomer(
  data: { name?: string; phone?: string; id?: string },
): Promise<any | null> {
  const customers = await repository.getCustomers();
  const pk = phoneKey(data.phone);
  const nk = nameKey(data.name);

  for (const c of customers as any[]) {
    if (data.id && c.id === data.id) continue; // updating itself
    if (pk && phoneKey(c.phone) === pk) return c;
  }
  if (!pk && nk) {
    for (const c of customers as any[]) {
      if (data.id && c.id === data.id) continue;
      if (!phoneKey(c.phone) && nameKey(c.name) === nk) return c;
    }
  }
  return null;
}

/**
 * Idempotency guard for write endpoints. A client sends the same
 * `idempotencyKey` when it retries; the first response is replayed instead of
 * inserting a second row.
 *
 * TTL is 24h — long enough to cover double taps, offline retries and refreshes.
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyRecord {
  id: string;
  scope: string;
  key: string;
  response: any;
  createdAt: string;
}

export async function getIdempotentResponse(
  scope: string,
  key: string,
): Promise<any | null> {
  if (!key) return null;
  const db = getDb();
  const doc: any = await db
    .collection("idempotency_keys")
    .findOne({ id: `${scope}:${key}` });
  if (!doc) return null;
  if (Date.now() - new Date(doc.createdAt).getTime() > IDEMPOTENCY_TTL_MS) return null;
  return doc.response;
}

export async function saveIdempotentResponse(
  scope: string,
  key: string,
  response: any,
): Promise<void> {
  if (!key) return;
  await repository.updateDocument("idempotency_keys", `${scope}:${key}`, {
    id: `${scope}:${key}`,
    scope,
    key,
    response,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Content-hash fallback for clients that do not send an idempotency key:
 * if the exact same ledger/transaction payload was written in the last
 * `windowMs`, treat the second write as a duplicate submission.
 */
export function contentFingerprint(parts: (string | number | undefined | null)[]): string {
  return parts.map((p) => String(p ?? "")).join("|");
}

export async function findRecentDuplicateLedger(
  entry: any,
  windowMs = 60 * 1000,
): Promise<any | null> {
  const db = getDb();
  const all: any[] = await db
    .collection("ledger")
    .find({ customerId: entry.customerId })
    .toArray();
  const fp = contentFingerprint([
    entry.customerId,
    entry.type,
    entry.amount,
    entry.date,
    entry.description,
  ]);
  const now = Date.now();
  for (const e of all) {
    const efp = contentFingerprint([e.customerId, e.type, e.amount, e.date, e.description]);
    if (efp !== fp) continue;
    const created = new Date(e.createdAt || e.date || 0).getTime();
    // `createdAt` may be absent on legacy rows; fall back to the numeric part
    // of the generated id (led-<timestamp>) when possible.
    const idTs = Number(String(e.id || "").match(/(\d{10,})/)?.[1] || 0);
    const ts = created || idTs;
    if (!ts || now - ts <= windowMs) return e;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Duplicate REPORT (read-only)
// ---------------------------------------------------------------------------

export interface DuplicateGroup {
  key: string;
  reason: string;
  count: number;
  records: any[];
}

export interface DuplicateReport {
  generatedAt: string;
  summary: {
    customersScanned: number;
    duplicateCustomerGroups: number;
    duplicateCustomerRecords: number;
    ledgerScanned: number;
    duplicateLedgerGroups: number;
    duplicateLedgerRecords: number;
    paymentsScanned: number;
    duplicatePaymentGroups: number;
    duplicatePaymentRecords: number;
  };
  customers: DuplicateGroup[];
  ledger: DuplicateGroup[];
  payments: DuplicateGroup[];
}

function groupBy<T>(items: T[], keyFn: (x: T) => string | null) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    const list = map.get(k) || [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

function toGroups<T>(map: Map<string, T[]>, reason: string): DuplicateGroup[] {
  const out: DuplicateGroup[] = [];
  for (const [key, records] of map.entries()) {
    if (records.length > 1) {
      out.push({ key, reason, count: records.length, records: records as any[] });
    }
  }
  return out.sort((a, b) => b.count - a.count);
}

/**
 * Scan customers / ledger / payments for duplicates.
 * REPORT ONLY — this never mutates or deletes anything.
 */
export async function buildDuplicateReport(): Promise<DuplicateReport> {
  const db = getDb();
  const customers: any[] = await db.collection("customers").find().toArray();
  const ledger: any[] = await db.collection("ledger").find().toArray();
  const payments: any[] = await db.collection("payments").find().toArray();

  const slim = (c: any) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    dueAmount: c.dueAmount,
    createdAt: c.createdAt,
  });

  // Customers: same mobile number, or same normalised name+address.
  const byPhone = groupBy(customers, (c) => phoneKey(c.phone) || null);
  const byNamePhone = groupBy(
    customers,
    (c) => (nameKey(c.name) ? `${nameKey(c.name)}#${phoneKey(c.phone)}` : null),
  );

  const phoneGroups = toGroups(byPhone, "একই মোবাইল নম্বর / same mobile number").map((g) => ({
    ...g,
    records: g.records.map(slim),
  }));
  const seenIds = new Set(phoneGroups.flatMap((g) => g.records.map((r: any) => r.id)));
  const nameGroups = toGroups(byNamePhone, "একই নাম ও নম্বর / same name + number")
    .filter((g) => !g.records.every((r: any) => seenIds.has(r.id)))
    .map((g) => ({ ...g, records: g.records.map(slim) }));

  const customerGroups = [...phoneGroups, ...nameGroups];

  // Ledger: identical customer + type + amount + date + description.
  const ledgerGroups = toGroups(
    groupBy(ledger, (l) =>
      contentFingerprint([l.customerId, l.type, l.amount, l.date, l.description]),
    ),
    "একই হিসাব এন্ট্রি / identical ledger entry",
  );

  // Payments: same transaction reference, or same customer+amount+date.
  const byTxn = toGroups(
    groupBy(payments, (p) => (p.transactionId ? String(p.transactionId).trim().toUpperCase() : null)),
    "একই transaction reference",
  );
  const byAmount = toGroups(
    groupBy(payments, (p) => contentFingerprint([p.customerId, p.amount, p.date || p.createdAt, p.method])),
    "একই কাস্টমার, পরিমাণ ও তারিখ",
  );
  const txnIds = new Set(byTxn.flatMap((g) => g.records.map((r: any) => r.id)));
  const paymentGroups = [
    ...byTxn,
    ...byAmount.filter((g) => !g.records.every((r: any) => txnIds.has(r.id))),
  ];

  const countRecords = (groups: DuplicateGroup[]) =>
    groups.reduce((a, g) => a + g.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      customersScanned: customers.length,
      duplicateCustomerGroups: customerGroups.length,
      duplicateCustomerRecords: countRecords(customerGroups),
      ledgerScanned: ledger.length,
      duplicateLedgerGroups: ledgerGroups.length,
      duplicateLedgerRecords: countRecords(ledgerGroups),
      paymentsScanned: payments.length,
      duplicatePaymentGroups: paymentGroups.length,
      duplicatePaymentRecords: countRecords(paymentGroups),
    },
    customers: customerGroups,
    ledger: ledgerGroups,
    payments: paymentGroups,
  };
}

/**
 * Best-effort unique indexes. On a real MongoDB this enforces one customer per
 * mobile number at the storage layer; on the JSON mock it is a no-op, so the
 * application-level guard above is the real safety net in both cases.
 *
 * A partial index is used so that customers legitimately saved *without* a
 * phone number are not blocked, and existing duplicates never break startup.
 */
export async function ensureIntegrityIndexes(): Promise<void> {
  const db = getDb();
  try {
    await db.collection("customers").createIndex(
      { phoneKey: 1 },
      {
        unique: true,
        name: "uniq_customer_phoneKey",
        partialFilterExpression: { phoneKey: { $type: "string" } },
      },
    );
    console.log("[Integrity] Unique index on customers.phoneKey ensured");
  } catch (err: any) {
    console.warn(
      "[Integrity] Could not create unique index on customers.phoneKey " +
        "(existing duplicates? run the duplicate report and merge them first): " +
        err?.message,
    );
  }
  try {
    await db.collection("idempotency_keys").createIndex({ id: 1 }, { unique: true });
    await db.collection("sms_logs").createIndex({ createdAt: -1 });
  } catch (err: any) {
    console.warn("[Integrity] Index creation skipped:", err?.message);
  }
}
