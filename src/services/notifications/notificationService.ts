import { jobQueue } from "../queue/jobQueue.ts";
import { repository } from "../db/repository.ts";
import { Mailer, EmailGatewayConfig, EmailOptions } from "../mailer.ts";
import { smsNetBdService } from "../gateways/smsNetBd.ts";
import { voiceManager } from "../voice/manager.ts";
import { decryptSecret } from "../security/gatewaySecrets.ts";

export interface EmailJobPayload extends EmailOptions {}

export interface SmsJobPayload {
  to: string;
  msg: string;
  schedule?: string;
}

export interface VoiceJobPayload {
  to: string;
  text?: string;
  audioUrl?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

/**
 * Central NotificationService. All outgoing notifications (email, SMS, voice)
 * must go through this service so that:
 *
 * 1. No third-party call happens in the request-response cycle.
 * 2. Any gateway being disabled simply queues a SKIPPED job (no crash/slowdown).
 * 3. Every deliverable has a first-class admin queue monitor.
 */
export class NotificationService {
  static async enqueueEmail(payload: EmailJobPayload): Promise<string> {
    return jobQueue.enqueue("email", payload);
  }

  static async enqueueSms(payload: SmsJobPayload): Promise<string> {
    return jobQueue.enqueue("sms", payload);
  }

  static async enqueueVoice(payload: VoiceJobPayload): Promise<string> {
    return jobQueue.enqueue("voice", payload);
  }

  static async enqueueNotification(
    channel: "email" | "sms" | "voice",
    payload: EmailJobPayload | SmsJobPayload | VoiceJobPayload,
  ): Promise<string> {
    return jobQueue.enqueue(channel, payload);
  }

  static async processPending(limit = 25): Promise<{ processed: number }> {
    const jobs = await jobQueue.pending(["email", "sms", "voice"], limit);
    let processed = 0;

    for (const job of jobs) {
      processed++;
      await jobQueue.mark(job.id, {
        status: "PENDING",
        attempts: job.attempts + 1,
        startedAt: new Date().toISOString(),
      });

      try {
        if (job.type === "email") {
          const gateway = await repository.getGatewayConfig<EmailGatewayConfig>(
            "email_gateway",
          );
          const emailGateway: EmailGatewayConfig = {
            id: "email_gateway",
            type: "smtp",
            enabled: true,
            ...(gateway || {}),
            password: decryptSecret(gateway?.password || ""),
            apiKey: decryptSecret(gateway?.apiKey || ""),
          };
          if (!emailGateway.enabled) {
            await jobQueue.mark(job.id, {
              status: "SKIPPED",
              note: "Email gateway disabled; job skipped silently",
            });
            continue;
          }

          const ok = await Mailer.sendEmailWithConfig(
            job.payload as EmailOptions,
            emailGateway,
          );
          await jobQueue.mark(job.id, {
            status: ok ? "SENT" : "FAILED",
            lastError: ok ? undefined : "Email provider returned failure",
          });
        } else if (job.type === "sms") {
          const result = await smsNetBdService.send(job.payload as SmsJobPayload);
          if (result.skipped) {
            await jobQueue.mark(job.id, {
              status: "SKIPPED",
              note: result.error || "SMS gateway disabled",
            });
          } else {
            await jobQueue.mark(job.id, {
              status: result.success ? "SENT" : "FAILED",
              lastError: result.error,
            });
          }
        } else if (job.type === "voice") {
          if (!voiceManager.isEnabled()) {
            await jobQueue.mark(job.id, {
              status: "SKIPPED",
              note: "Voice call gateway disabled; job skipped gracefully",
            });
            continue;
          }
          let provider;
          try {
            provider = voiceManager.getProvider();
          } catch (err: any) {
            await jobQueue.mark(job.id, {
              status: "FAILED",
              lastError: err.message,
            });
            continue;
          }
          const result = await provider.sendCall(job.payload as VoiceJobPayload);
          await jobQueue.mark(job.id, {
            status: result.success ? "SENT" : "FAILED",
            lastError: result.error,
          });
        }
      } catch (err: any) {
        await jobQueue.mark(job.id, {
          status: "FAILED",
          lastError: err.message || "Processing failed",
        });
      }
    }

    return { processed };
  }

  static async listQueue(): Promise<any[]> {
    const jobs = await repository.getCollection<any>("job_queue");
    return jobs.sort((a, b) =>
      ((b.createdAt || "") as string).localeCompare(a.createdAt || ""),
    );
  }

  static async stats(): Promise<Record<string, number>> {
    return jobQueue.stats(["email", "sms", "voice"]);
  }
}

export const notificationService = NotificationService;
