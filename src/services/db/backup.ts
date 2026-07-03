import fs from "fs/promises";
import path from "path";
import { getDb } from "./mongodb.ts";

const BACKUP_DIR = path.join(process.cwd(), "backups");

export interface BackupMetadata {
  filename: string;
  timestamp: string;
  size: number;
  collections: {
    customers: number;
    campaigns: number;
    callLogs: number;
  };
  databaseType: "mongodb";
}

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (e) {
    // Already exists
  }
}

// Convert JSON array of objects to CSV string
export function convertToCSV(data: any[]): string {
  if (!data || !data.length) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","), // header row
    ...data.map(row => 
      headers.map(fieldName => {
        const val = row[fieldName];
        const stringVal = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
        // Escape quotes
        return `"${stringVal.replace(/"/g, '""')}"`;
      }).join(",")
    )
  ];
  return csvRows.join("\n");
}

export class BackupService {
  // Create a backup
  static async createBackup(isAuto = false): Promise<BackupMetadata> {
    await ensureBackupDir();
    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, "-");
    const prefix = isAuto ? "auto-backup" : "manual-backup";
    const filename = `${prefix}-${safeTimestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    const db = getDb();
    const backupData: any = {
      customers: await db.collection("customers").find().toArray(),
      campaigns: await db.collection("campaigns").find().toArray(),
      callLogs: await db.collection("callLogs").find().toArray(),
      settings: { global: {} }
    };

    const settingsDoc = await db.collection("settings").findOne({ key: "global" });
    backupData.settings = { global: settingsDoc?.value || {} };

    // Clean MongoDB specific _id fields from serialized backup to prevent issues during restore
    const cleanCollection = (arr: any[]) => arr.map(({ _id, ...rest }) => rest);
    backupData.customers = cleanCollection(backupData.customers);
    backupData.campaigns = cleanCollection(backupData.campaigns);
    backupData.callLogs = cleanCollection(backupData.callLogs);

    const serialized = JSON.stringify(backupData, null, 2);
    await fs.writeFile(filepath, serialized, "utf8");

    const stat = await fs.stat(filepath);

    const metadata: BackupMetadata = {
      filename,
      timestamp,
      size: stat.size,
      collections: {
        customers: backupData.customers.length,
        campaigns: backupData.campaigns.length,
        callLogs: backupData.callLogs.length,
      },
      databaseType: "mongodb"
    };

    // Save backup metadata list
    await this.updateBackupList(metadata);

    return metadata;
  }

  // Verify backup integrity
  static async verifyBackupIntegrity(filename: string): Promise<boolean> {
    try {
      const filepath = path.join(BACKUP_DIR, filename);
      const content = await fs.readFile(filepath, "utf8");
      const parsed = JSON.parse(content);

      // Verify necessary fields/collections exist
      if (!parsed || typeof parsed !== "object") return false;
      const requiredKeys = ["customers", "campaigns", "callLogs"];
      for (const key of requiredKeys) {
        if (!Array.isArray(parsed[key])) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Restore database from backup
  static async restoreBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    const filepath = path.join(BACKUP_DIR, filename);
    const isValid = await this.verifyBackupIntegrity(filename);
    if (!isValid) {
      return { success: false, error: "Backup file is corrupt or invalid." };
    }

    try {
      const content = await fs.readFile(filepath, "utf8");
      const parsed = JSON.parse(content);

      const db = getDb();
      // Overwrite collections
      await db.collection("customers").deleteMany({});
      if (parsed.customers.length > 0) {
        await db.collection("customers").insertMany(parsed.customers.map((c: any) => ({ ...c, _id: c.id })));
      }

      await db.collection("campaigns").deleteMany({});
      if (parsed.campaigns.length > 0) {
        await db.collection("campaigns").insertMany(parsed.campaigns.map((c: any) => ({ ...c, _id: c.id })));
      }

      await db.collection("callLogs").deleteMany({});
      if (parsed.callLogs.length > 0) {
        await db.collection("callLogs").insertMany(parsed.callLogs.map((c: any) => ({ ...c, _id: c.id })));
      }

      await db.collection("settings").deleteMany({});
      await db.collection("settings").insertOne({
        key: "global",
        value: parsed.settings?.global || {}
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // Get backup list
  static async getBackups(): Promise<BackupMetadata[]> {
    await ensureBackupDir();
    try {
      const listPath = path.join(BACKUP_DIR, "backups-meta.json");
      const content = await fs.readFile(listPath, "utf8");
      return JSON.parse(content);
    } catch (e) {
      return [];
    }
  }

  private static async updateBackupList(meta: BackupMetadata) {
    const listPath = path.join(BACKUP_DIR, "backups-meta.json");
    let currentList: BackupMetadata[] = [];
    try {
      const content = await fs.readFile(listPath, "utf8");
      currentList = JSON.parse(content);
    } catch (e) {
      // Create new list
    }
    currentList.unshift(meta);
    await fs.writeFile(listPath, JSON.stringify(currentList, null, 2), "utf8");
  }

  // Automated backup routine (checks and runs once a day)
  static startAutoBackupScheduler() {
    console.log("[Backup Scheduler] Initialized automatic daily backups.");
    // Run an auto-backup every 24 hours
    setInterval(async () => {
      try {
        console.log("[Backup Scheduler] Triggering automatic database backup...");
        const meta = await this.createBackup(true);
        console.log(`[Backup Scheduler] Automatic backup successful: ${meta.filename}`);
      } catch (e) {
        console.error("[Backup Scheduler] Automatic backup failed:", e);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}
