#!/usr/bin/env tsx
/**
 * End-to-end verification of the SMS pipeline.
 *
 * Runs the *real* SmsNetBdService against a gateway endpoint (the live
 * sms.net.bd, or the local mock in scripts/mock-sms-net-bd.mjs) and prints the
 * resulting log rows, so we can prove the fix actually sends and that failures
 * are reported with the real cause.
 *
 *   SMS_NET_BD_BASE_URL=http://127.0.0.1:8899 npx tsx scripts/test-sms.ts 01712345678
 */
import dotenv from "dotenv";
dotenv.config();

import { connectMongoDB } from "../src/services/db/mongodb.ts";
import { smsNetBdService } from "../src/services/gateways/smsNetBd.ts";
import { normalizeBdNumber } from "../src/services/gateways/smsPhone.ts";
import { notificationService } from "../src/services/notifications/notificationService.ts";

const to = process.argv[2] || process.env.SMS_TEST_TO || "01712345678";
const apiKey = process.env.SMS_TEST_API_KEY || "VALID_TEST_KEY";

const line = (t: string) => console.log(`\n─── ${t} ${"─".repeat(Math.max(0, 60 - t.length))}`);

async function main() {
  const conn = await connectMongoDB();
  if (!conn.success) throw new Error(conn.error);

  line("1. Phone normalisation");
  for (const raw of ["01712-345678", " +880 1712 345678 ", "8801712345678", "০১৭১২৩৪৫৬৭৮", "12345", ""]) {
    const n = normalizeBdNumber(raw);
    console.log(`  ${JSON.stringify(raw).padEnd(24)} → ${n.valid ? n.value : `INVALID (${n.reason})`}`);
  }

  line("2. Send while gateway is DISABLED (must not throw, must log why)");
  await smsNetBdService.saveConfig({ enabled: false, apiKey });
  console.log("  ", await smsNetBdService.send({ to, msg: "should be skipped", source: "test" }));

  line("3. Send with a WRONG api key (must surface the real error)");
  await smsNetBdService.saveConfig({ enabled: true, apiKey: "WRONG_KEY" });
  console.log("  ", (await smsNetBdService.send({ to, msg: "bad key", source: "test" })).error);

  line("4. Send to an INVALID number (must surface error 416 reason)");
  await smsNetBdService.saveConfig({ enabled: true, apiKey });
  console.log("  ", (await smsNetBdService.send({ to: "12345", msg: "bad number", source: "test" })).error);

  line("5. Balance check");
  console.log("  ", await smsNetBdService.getBalance(true));

  line("6. REAL SEND");
  const result = await smsNetBdService.send({
    to,
    msg: "টেস্ট SMS — M/S Mahi and Muhi Traders ERP. sms.net.bd ঠিকভাবে কাজ করছে।",
    source: "test-script",
  });
  console.log("  ", result);
  if (!result.success) {
    console.error("\n  ❌ SEND FAILED:", result.error);
  } else {
    console.log("\n  ✅ SEND SUCCEEDED — request id", result.requestId);
  }

  line("7. Queued send via NotificationService + worker drain");
  await notificationService.enqueueSms({ to, msg: "queued test sms" });
  console.log("  processed:", await notificationService.processPending(10));

  line("8. Delivery report sync");
  console.log("  ", await smsNetBdService.syncReports());

  line("9. Diagnostics");
  console.log("  ", JSON.stringify(await smsNetBdService.diagnose(), null, 2));

  line("10. SMS log (most recent first)");
  const logs = await smsNetBdService.getLogs(12);
  for (const l of logs) {
    console.log(
      `  ${String(l.status).padEnd(9)} ${String(l.to).padEnd(14)} req=${String(l.requestId || "-").padEnd(6)} ${l.error || ""}`,
    );
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
