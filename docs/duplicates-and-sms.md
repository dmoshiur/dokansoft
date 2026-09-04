# Duplicate records & SMS delivery — fixes and runbook

## 1. Duplicate Customer / Duplicate Hisab

### Root causes found

| # | Cause | Where | Fix |
|---|---|---|---|
| 1 | Submit buttons had **no disabled/loading state** — a double-click or double-tap fired the handler twice. | every Hisab form, `CRM.tsx` | `useSubmitGuard()` (`src/lib/useSubmitGuard.ts`) blocks re-entry with a **ref** (synchronous, so the 2nd click in the same tick is dropped before React re-renders) and exposes `submitting` for the disabled state + spinner. |
| 2 | Store actions inserted **unconditionally** inside `setState`. React 18 `StrictMode` (enabled in `main.tsx`) runs updaters twice in dev, and the id was generated *inside* the updater, so each run produced a different id → two rows. | `src/accounting/store.ts` | Ids are now generated **outside** the updater and the updater is idempotent (`s.sales.some(x => x.id === id) ? s : …`). |
| 3 | No **idempotency** on the create APIs — a retried request (slow network, user re-taps) inserted a second row. | `POST /api/erp/customers`, `POST /api/erp/ledger` | `X-Idempotency-Key` header; the first response is replayed instead of re-inserting. Keys live in `idempotency_keys` with a 24h TTL. |
| 4 | No **uniqueness check** on mobile number. | server | `findExistingCustomer()` matches on a normalised phone key, so `01711-001122`, `+8801711001122` and `8801711001122` all collide → HTTP 409 `"এই মোবাইল নাম্বারে কাস্টমার আগে থেকেই আছে"`. |
| 5 | `store.ts` added the customer/ledger row to local state **before** the server call, so a server-rejected duplicate still appeared in the UI. | `src/store.ts` | Customer is added to state only after the server accepts; a duplicate-rejected ledger entry is rolled back. |
| 6 | No DB-level constraint. | `dedupe.ts` | `ensureIntegrityIndexes()` creates a **partial unique index** on `customers.phoneKey` at boot (partial so customers without a number are still allowed, and pre-existing duplicates don't break startup). |

Content-hash fallback: even with no idempotency key, an identical ledger payload
(`customer + type + amount + date + description`) written within 60s is rejected.

### Finding the duplicates already in the database

**Nothing is ever deleted — these are report-only tools.**

```bash
npm run find-duplicates              # human readable
npm run find-duplicates -- --json    # machine readable
npm run find-duplicates -- --csv report.csv
```

Or in the admin panel: **Settings → ডুপ্লিকেট রিপোর্ট / Duplicate Report**
(also exports CSV). It groups by:

* customers — same mobile number, or same name when no number is stored
* ledger — identical customer + type + amount + date + description
* payments — same transaction reference (case-insensitive), or same customer + amount + date

Review each group and merge/delete manually from the relevant page.

## 2. SMS not sending (sms.net.bd)

### Root cause

`sms.net.bd` returns **HTTP 200 even for failures**; the real result is the
`error` field in the JSON body (`{ "error": 0, "msg": …, "data": { request_id } }`).
The old code did:

```ts
const status = raw?.status || (response.ok ? "SENT" : "FAILED");
const success = response.ok && …
```

`status` does not exist in the sms.net.bd response, so **every call looked
successful**, the `request_id` was never parsed (it is nested under `data`), and
the actual reason — wrong API key (405), bad number format (416), no balance
(417) — was silently discarded. That is why SMS "went" but never arrived.

### What was fixed

* Success is now `error === 0` only; `request_id` is read from `data.request_id`.
* Every documented error code is mapped to a readable cause (`smsPhone.ts`).
* Balance API also parses `data.balance` (was reading a non-existent top-level field).
* Numbers are normalised: spaces, dashes, brackets, Bangla digits, `+88`, `00880`,
  `01X` and bare `1X` all become `8801XXXXXXXXX`; invalid numbers fail fast with a reason.
* Each attempt is logged as `PENDING` **before** the HTTP call, then updated — so a
  timeout or crash still leaves a trace. 20s timeout added.
* API keys are masked in all logs.

### Admin visibility

**Settings → SMS লগ / SMS Log** shows every SMS with status
(Sent/Delivered/Failed/Pending/Disabled), the real error reason, request id and
charge, plus a diagnostics panel (toggle, API key, balance, queue backlog), a
test-send box, a delivery-report sync button and a "run queue now" button.

API: `GET /api/gateways/sms/diagnostics`, `GET /api/gateways/sms/logs?status=&q=`,
`POST /api/gateways/sms/process-queue`.

### Queue worker

SMS queued through `NotificationService` is drained by `startGatewayWorkers()`
every 30s (started in `server.ts`). If the worker is down, jobs pile up as
`PENDING` — the diagnostics panel now reports this explicitly, and the queue can
be drained manually from the SMS Log page.

### Verifying

`api.sms.net.bd` is not reachable from every environment, so a faithful mock of
the gateway is included:

```bash
node scripts/mock-sms-net-bd.mjs                                   # terminal 1
SMS_NET_BD_BASE_URL=http://127.0.0.1:8899 npx tsx scripts/test-sms.ts 01712345678
```

The test covers normalisation, disabled gateway, wrong API key, invalid number,
balance, a real send, a queued send + worker drain, report sync and diagnostics.

Against the **live** gateway just set the API key in Admin Settings, omit
`SMS_NET_BD_BASE_URL`, and run `npx tsx scripts/test-sms.ts <your-number>` or use
the test box on the SMS Log page.
