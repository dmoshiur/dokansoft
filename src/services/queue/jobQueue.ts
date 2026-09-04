import { repository } from "../db/repository.ts";

/**
 * Lightweight persistent job queue backed by MongoDB (or the local JSON mock
 * database). This keeps every third-party gateway call (SMS, SMTP, voice,
 * payment webhook processing) off the request-response path so one slow or
 * disabled provider can never block checkout, order placement or admin actions.
 */
export interface Job {
  id: string;
  type: string;
  payload: any;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  lastError?: string;
  note?: string;
}

export const jobQueue = {
  async enqueue(type: string, payload: any): Promise<string> {
    const job: Job = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      payload,
      status: "PENDING",
      attempts: 0,
      maxAttempts: 5,
      createdAt: new Date().toISOString(),
    };
    await repository.addDocument("job_queue", job);
    return job.id;
  },

  async pending(types?: string[], limit = 50): Promise<Job[]> {
    const jobs = await repository.getCollection<Job>("job_queue");
    const filtered = (types && types.length
      ? jobs.filter((j) => types.includes(j.type))
      : jobs
    ).filter((j) => j.status === "PENDING" && j.attempts < j.maxAttempts);
    return filtered
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
      .slice(0, limit);
  },

  async mark(jobId: string, patch: Partial<Job>): Promise<void> {
    await repository.updateDocument("job_queue", jobId, {
      ...patch,
      finishedAt: patch.status && ["SENT", "FAILED", "SKIPPED"].includes(patch.status)
        ? new Date().toISOString()
        : undefined,
    });
  },

  async stats(types?: string[]): Promise<Record<string, number>> {
    const jobs = await repository.getCollection<Job>("job_queue");
    const filtered = types && types.length
      ? jobs.filter((j) => types.includes(j.type))
      : jobs;
    return filtered.reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  },
};
