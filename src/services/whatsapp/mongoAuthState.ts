import {
  initAuthCreds,
  BufferJSON,
  proto,
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { getDb } from "../db/mongodb";
import * as fs from "fs";
import * as path from "path";

/**
 * Custom Baileys Authentication State Adapter using MongoDB.
 * Replaces useMultiFileAuthState with durable cloud persistence.
 */
export async function useMongoAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const db = getDb();
  const collection = db.collection("whatsapp_sessions");

  // Helper to read data from MongoDB
  const readData = async (key: string) => {
    try {
      const doc = await collection.findOne({ _id: key as any });
      if (!doc || !doc.data) return null;
      return JSON.parse(doc.data, BufferJSON.reviver);
    } catch (err: any) {
      console.error(`[MongoAuthState] Error reading key ${key}:`, err.message);
      return null;
    }
  };

  // Helper to write data to MongoDB
  const writeData = async (data: any, key: string) => {
    try {
      const jsonStr = JSON.stringify(data, BufferJSON.replacer);
      await collection.updateOne(
        { _id: key as any },
        { $set: { data: jsonStr, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (err: any) {
      console.error(`[MongoAuthState] Error writing key ${key}:`, err.message);
    }
  };

  // Helper to remove data from MongoDB
  const removeData = async (key: string) => {
    try {
      await collection.deleteOne({ _id: key as any });
    } catch (err: any) {
      console.error(`[MongoAuthState] Error deleting key ${key}:`, err.message);
    }
  };

  // Automated migration logic
  const authFolder = path.join(process.cwd(), "baileys_auth_info");
  if (fs.existsSync(authFolder)) {
    try {
      const files = fs.readdirSync(authFolder);
      if (files.length > 0) {
        console.log(`[MongoAuthState] Local 'baileys_auth_info' directory found with ${files.length} files. Migrating to MongoDB...`);
        for (const file of files) {
          const filePath = path.join(authFolder, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile() && file.endsWith(".json")) {
            try {
              const fileContent = fs.readFileSync(filePath, "utf-8");
              const parsed = JSON.parse(fileContent, BufferJSON.reviver);
              // Store directly under file name (e.g. "creds.json" or "pre-key-1.json")
              await writeData(parsed, file);
            } catch (err: any) {
              console.error(`[MongoAuthState] Error migrating file ${file}:`, err.message);
            }
          }
        }
        console.log("[MongoAuthState] Migration completed successfully. Deleting local 'baileys_auth_info' directory...");
        fs.rmSync(authFolder, { recursive: true, force: true });
        console.log("[MongoAuthState] Local 'baileys_auth_info' directory deleted permanently.");
      }
    } catch (migErr: any) {
      console.error("[MongoAuthState] Failed to run automated migration:", migErr.message);
    }
  }

  // Load primary creds from MongoDB or initialize new ones
  let creds: AuthenticationCreds = (await readData("creds.json")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}.json`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]![id];
              const file = `${category}-${id}.json`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, "creds.json");
    },
  };
}

/**
 * Utility to completely clear the Baileys session from MongoDB.
 */
export async function clearMongoAuthState(): Promise<void> {
  try {
    const db = getDb();
    const result = await db.collection("whatsapp_sessions").deleteMany({});
    console.log(`[MongoAuthState] Wiped session from MongoDB. Deleted ${result.deletedCount} documents.`);
  } catch (err: any) {
    console.error("[MongoAuthState] Failed to clear session from MongoDB:", err.message);
  }
}
