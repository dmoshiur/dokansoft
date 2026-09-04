#!/usr/bin/env tsx
/**
 * Admin duplicate-finder — READ ONLY.
 *
 * Lists duplicate customers (same mobile number, or same name when no number)
 * and duplicate hisab entries (identical ledger rows / repeated transaction
 * references) so they can be reviewed and merged by hand.
 *
 * This script NEVER deletes, merges or modifies any record.
 *
 *   npx tsx scripts/find-duplicates.ts            # human readable report
 *   npx tsx scripts/find-duplicates.ts --json     # machine readable
 *   npx tsx scripts/find-duplicates.ts --csv out.csv
 */
import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs/promises";
import { connectMongoDB } from "../src/services/db/mongodb.ts";
import { buildDuplicateReport, DuplicateGroup } from "../src/services/db/dedupe.ts";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const csvIdx = args.indexOf("--csv");
const csvPath = csvIdx !== -1 ? args[csvIdx + 1] : null;

function printGroups(title: string, groups: DuplicateGroup[], render: (r: any) => string) {
  console.log(`\n${"=".repeat(78)}\n${title}\n${"=".repeat(78)}`);
  if (!groups.length) {
    console.log("  ✔ কোনো ডুপ্লিকেট পাওয়া যায়নি / no duplicates found");
    return;
  }
  groups.forEach((g, i) => {
    console.log(`\n  ${i + 1}. ${g.reason}  (${g.count} copies)  key=${g.key}`);
    g.records.forEach((r: any) => console.log(`       - ${render(r)}`));
  });
}

async function main() {
  const conn = await connectMongoDB();
  if (!conn.success) {
    console.error("Database connection failed:", conn.error);
    process.exit(1);
  }

  const report = await buildDuplicateReport();

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const s = report.summary;
    console.log(`\nDuplicate report — generated ${report.generatedAt}`);
    console.log("READ ONLY: this tool never deletes or merges anything.\n");
    console.log(`  Customers scanned : ${s.customersScanned}  → ${s.duplicateCustomerGroups} duplicate group(s), ${s.duplicateCustomerRecords} record(s)`);
    console.log(`  Ledger scanned    : ${s.ledgerScanned}  → ${s.duplicateLedgerGroups} duplicate group(s), ${s.duplicateLedgerRecords} record(s)`);
    console.log(`  Payments scanned  : ${s.paymentsScanned}  → ${s.duplicatePaymentGroups} duplicate group(s), ${s.duplicatePaymentRecords} record(s)`);

    printGroups(
      "DUPLICATE CUSTOMERS / ডুপ্লিকেট কাস্টমার",
      report.customers,
      (r) => `id=${r.id}  name="${r.name}"  phone=${r.phone || "-"}  due=${r.dueAmount ?? 0}  created=${r.createdAt || "-"}`,
    );
    printGroups(
      "DUPLICATE HISAB / LEDGER ENTRIES",
      report.ledger,
      (r) => `id=${r.id}  customer=${r.customerId}  ${r.type}  amount=${r.amount}  date=${r.date}  "${r.description || ""}"`,
    );
    printGroups(
      "DUPLICATE PAYMENTS / TRANSACTIONS",
      report.payments,
      (r) => `id=${r.id}  txn=${r.transactionId || "-"}  customer=${r.customerId}  amount=${r.amount}  date=${r.date || r.createdAt || "-"}`,
    );
    console.log("\nReview these manually, then merge/delete from the admin panel.\n");
  }

  if (csvPath) {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = ["entity,group_key,reason,duplicate_count,record_id,name_or_desc,phone_or_amount,date"];
    for (const g of report.customers)
      for (const r of g.records)
        rows.push(["customer", g.key, g.reason, g.count, r.id, r.name, r.phone, r.createdAt].map(esc).join(","));
    for (const g of report.ledger)
      for (const r of g.records)
        rows.push(["ledger", g.key, g.reason, g.count, r.id, r.description, r.amount, r.date].map(esc).join(","));
    for (const g of report.payments)
      for (const r of g.records)
        rows.push(["payment", g.key, g.reason, g.count, r.id, r.transactionId, r.amount, r.date || r.createdAt].map(esc).join(","));
    await fs.writeFile(csvPath, "\uFEFF" + rows.join("\n"), "utf8");
    console.error(`CSV written to ${csvPath}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Duplicate scan failed:", err);
  process.exit(1);
});
