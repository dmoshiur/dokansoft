import { getDb } from "./mongodb.ts";
import { 
  Customer, 
  Campaign, 
  CallLog, 
  FullState,
} from "../../types.ts";

export class Repository {
  private static instance: Repository;

  private constructor() {}

  static getInstance(): Repository {
    if (!Repository.instance) {
      Repository.instance = new Repository();
    }
    return Repository.instance;
  }

  // Generic helpers
  async getCollection<T>(collectionName: string): Promise<T[]> {
    const db = getDb();
    const items = await db.collection(collectionName).find().toArray();
    // Map _id to id if missing
    return items.map((item: any) => {
      const { _id, ...rest } = item;
      return { id: item.id || _id, ...rest } as unknown as T;
    });
  }

  async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    const db = getDb();
    const item = await db.collection(collectionName).findOne({ id });
    if (item) {
      const { _id, ...rest } = item;
      return { id: item.id || _id, ...rest } as unknown as T;
    }
    return null;
  }

  async updateDocument(collectionName: string, id: string, updateData: any): Promise<void> {
    const db = getDb();
    await db.collection(collectionName).updateOne(
      { id },
      { $set: updateData },
      { upsert: true }
    );
  }

  async addDocument(collectionName: string, docData: any): Promise<string> {
    const id = docData.id || Math.random().toString(36).substring(7);
    const finalDoc = { ...docData, id };

    const db = getDb();
    await db.collection(collectionName).insertOne({
      _id: id,
      ...finalDoc
    });

    return id;
  }

  // Specialized methods
  async getCustomers(): Promise<Customer[]> {
    return this.getCollection<Customer>("customers");
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.getCollection<Campaign>("voice_campaigns");
  }

  async getCallLogs(campaignId?: string): Promise<CallLog[]> {
    const logs = await this.getCollection<CallLog>("voice_call_logs");
    if (campaignId) {
      return logs.filter(log => log.campaignId === campaignId);
    }
    return logs;
  }

  async getVoiceQueue(): Promise<any[]> {
    return this.getCollection<any>("voice_queue");
  }

  async addVoiceQueueItem(item: any): Promise<string> {
    return this.addDocument("voice_queue", item);
  }

  async getVoiceTemplates(): Promise<any[]> {
    return this.getCollection<any>("voice_templates");
  }

  async addVoiceTemplate(template: any): Promise<string> {
    return this.addDocument("voice_templates", template);
  }

  async getApiConfigs(): Promise<any[]> {
    return this.getCollection<any>("api_configs");
  }

  async updateApiConfig(config: any): Promise<void> {
    await this.updateDocument("api_configs", "infosoft_config", config);
  }

  async getSettings(): Promise<Partial<FullState>> {
    const db = getDb();
    const doc = await db.collection("settings").findOne({ key: "global" });
    if (doc) return doc.value;
    return {};
  }

  async saveSettings(settings: any): Promise<void> {
    const db = getDb();
    await db.collection("settings").updateOne(
      { key: "global" },
      { $set: { value: settings } },
      { upsert: true }
    );
  }

  async deleteDocument(collectionName: string, id: string): Promise<void> {
    const db = getDb();
    await db.collection(collectionName).deleteOne({ id });
  }
}

export const repository = Repository.getInstance();
