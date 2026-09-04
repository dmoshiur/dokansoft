import { notificationService } from "../notifications/notificationService.ts";
import { smsNetBdService } from "./smsNetBd.ts";
import { repository } from "../db/repository.ts";
import { voiceManager } from "../voice/manager.ts";

/**
 * Background workers for every toggle-able gateway. These are the only
 * processes that should call external SMS/SMTP/Voice APIs, so request cycles
 * never block or fail because a gateway is slow/down/off.
 */
export function startGatewayWorkers() {
  // Notification queue: process a batch periodically.
  const jobTimer = setInterval(async () => {
    try {
      await notificationService.processPending(25);
    } catch (err: any) {
      console.error("[Gateway Worker] Notification batch failed:", err.message);
    }
  }, 30 * 1000);

  // SMS report sync: keep pending SMS statuses fresh.
  const reportTimer = setInterval(async () => {
    try {
      const result = await smsNetBdService.syncReports();
      if (result.synced > 0 || result.failed > 0) {
        console.log(
          `[Gateway Worker] SMS reports synced: ${result.synced}, failed: ${result.failed}`,
        );
      }
    } catch (err: any) {
      console.error("[Gateway Worker] SMS report sync failed:", err.message);
    }
  }, 5 * 60 * 1000);

  // Voice/call provider sync with admin toggle (default OFF).
  const voiceTimer = setInterval(async () => {
    try {
      const config = await repository.getGatewayConfig<any>("voice_gateway");
      const enabled = config?.enabled === true;
      voiceManager.setEnabled(enabled);
    } catch {
      voiceManager.setEnabled(false);
    }
  }, 60 * 1000);

  console.log("[Gateway Workers] Notification/SMS/Voice workers started");
  return { jobTimer, reportTimer, voiceTimer };
}

export async function refreshVoiceToggleFromConfig() {
  try {
    const config = await repository.getGatewayConfig<any>("voice_gateway");
    voiceManager.setEnabled(config?.enabled === true);
  } catch {
    voiceManager.setEnabled(false);
  }
}
