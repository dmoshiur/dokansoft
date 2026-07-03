import { MongoClient, Db } from "mongodb";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

// Load environment variables immediately
dotenv.config();

const DB_PATH = path.join(process.cwd(), "db.json");

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

export interface URIValidationResult {
  isValid: boolean;
  error?: string;
  isAtlas: boolean;
  hasDbName: boolean;
  hasUnencodedPassword?: boolean;
}

/**
 * Validates a MongoDB connection string to detect malformed URIs,
 * missing database names, incorrect credentials, and unencoded special characters.
 */
export function validateMongoDBURI(uri: string): URIValidationResult {
  if (!uri) {
    const alternateNames = ["MONGO_URI", "MONGODB_URL", "DATABASE_URL", "MONGO_URL"];
    const foundAlternates = alternateNames.filter(name => process.env[name]);
    let hint = "";
    if (foundAlternates.length > 0) {
      hint = ` Found alternate environment variables: ${foundAlternates.join(", ")}. Please rename them to MONGODB_URI.`;
    }
    return {
      isValid: false,
      error: `MONGODB_URI environment variable is missing, empty, or undefined.${hint}`,
      isAtlas: false,
      hasDbName: false
    };
  }

  const isSrv = uri.startsWith("mongodb+srv://");
  const isStandard = uri.startsWith("mongodb://");
  
  if (!isSrv && !isStandard) {
    return {
      isValid: false,
      error: `Invalid protocol in MONGODB_URI. Connection string must start with 'mongodb://' or 'mongodb+srv://'. Found: "${uri.substring(0, 15)}..."`,
      isAtlas: false,
      hasDbName: false
    };
  }

  let hasDbName = false;
  let hasUnencodedPassword = false;

  try {
    const withoutProtocol = uri.substring(isSrv ? 14 : 10);
    const [connectionPart] = withoutProtocol.split("?");
    const slashParts = connectionPart.split("/");
    
    // If there is a slash, the part after it is the database name
    if (slashParts.length > 1) {
      const dbNameWithAuth = slashParts[1];
      if (dbNameWithAuth && dbNameWithAuth.trim().length > 0) {
        hasDbName = true;
      }
    }

    // Check for unencoded special characters in password
    if (connectionPart.includes("@")) {
      const credentialsBlock = connectionPart.split("@")[0];
      const colonSplit = credentialsBlock.split(":");
      if (colonSplit.length > 1) {
        const rawPassword = colonSplit.slice(1).join(":");
        const decoded = decodeURIComponent(rawPassword);
        const specialCharacters = /[@:/?#\[\]%]/;
        if (rawPassword === decoded && specialCharacters.test(rawPassword)) {
          hasUnencodedPassword = true;
        }
      }
    }
  } catch (err: any) {
    // Non-fatal warning during custom parsing fallback
    console.warn(`[validateMongoDBURI] Non-fatal custom parsing warning: ${err.message}`);
  }

  return {
    isValid: true,
    isAtlas: isSrv,
    hasDbName,
    hasUnencodedPassword
  };
}

/**
 * Checks for environment files, loading order, and variable configurations.
 */
export async function debugEnvironment(): Promise<void> {
  console.log("----------------------------------------------------------------------");
  console.log("[MongoDB Debug] Initiating environment checks...");

  // 1. Check for multiple environment files or conflicts
  const envFiles = [".env", ".env.local", ".env.development", ".env.production"];
  for (const file of envFiles) {
    try {
      const filePath = path.join(process.cwd(), file);
      const stats = await fs.stat(filePath);
      console.log(`[MongoDB Debug] Environment file detected: "${file}" (${stats.size} bytes)`);
      
      const content = await fs.readFile(filePath, "utf8");
      if (content.includes("MONGODB_URI=")) {
        console.log(`[MongoDB Debug]   -> MONGODB_URI is explicitly defined inside "${file}"`);
      }
    } catch {
      // File does not exist
    }
  }

  // 2. Validate current MONGODB_URI value
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    console.log("[MongoDB Debug] MONGODB_URI is not set in process.env. Using local fallback.");
    console.log("----------------------------------------------------------------------");
    return;
  }

  // Mask password for safe logging
  const maskedUri = rawUri.replace(
    /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.*)/,
    (_, prefix, password, suffix) => {
      return `${prefix}********${suffix}`;
    }
  );
  console.log(`[MongoDB Debug] Resolved MONGODB_URI: "${maskedUri}"`);

  // Run validation
  const validation = validateMongoDBURI(rawUri);
  if (!validation.isValid) {
    console.log(`[MongoDB Debug] Validation status: ${validation.error}`);
  } else {
    console.log("[MongoDB Debug] Connection string protocol structure is VALID.");
    console.log(`[MongoDB Debug]   - Is Atlas/Cloud cluster: ${validation.isAtlas ? "YES (mongodb+srv://)" : "NO"}`);
    console.log(`[MongoDB Debug]   - Database name specified in URI: ${validation.hasDbName ? "YES" : "NO (defaults to 'test')"}`);
    
    if (validation.hasUnencodedPassword) {
      console.warn(
        `[MongoDB Debug] WARNING: Password contains raw special characters that are NOT URL-encoded. ` +
        `This can cause connection timeouts or ECONNREFUSED. Please URL-encode your password.`
      );
    }
  }
  console.log("----------------------------------------------------------------------");
}

let mockData: Record<string, any[]> = {};
let isMockActive = false;

function matchesQuery(doc: any, query: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;
  for (const key of Object.keys(query)) {
    const queryVal = query[key];
    const docVal = doc[key];
    if (queryVal && typeof queryVal === "object" && !Array.isArray(queryVal)) {
      let matched = true;
      for (const op of Object.keys(queryVal)) {
        const val = queryVal[op];
        if (op === "$ne") {
          if (docVal === val) matched = false;
        } else if (op === "$eq") {
          if (docVal !== val) matched = false;
        } else if (op === "$in") {
          if (!Array.isArray(val) || !val.includes(docVal)) matched = false;
        } else if (op === "$nin") {
          if (!Array.isArray(val) || val.includes(docVal)) matched = false;
        } else if (op === "$gt") {
          if (!(docVal > val)) matched = false;
        } else if (op === "$gte") {
          if (!(docVal >= val)) matched = false;
        } else if (op === "$lt") {
          if (!(docVal < val)) matched = false;
        } else if (op === "$lte") {
          if (!(docVal <= val)) matched = false;
        }
      }
      if (!matched) return false;
    } else {
      if (docVal !== queryVal) return false;
    }
  }
  return true;
}

function applyUpdate(doc: any, update: any): any {
  if (!update) return doc;
  const newDoc = { ...doc };
  if (update.$set) {
    for (const k of Object.keys(update.$set)) {
      newDoc[k] = update.$set[k];
    }
  }
  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) {
      delete newDoc[k];
    }
  }
  if (update.$inc) {
    for (const k of Object.keys(update.$inc)) {
      newDoc[k] = (newDoc[k] || 0) + update.$inc[k];
    }
  }
  return newDoc;
}

async function saveMockDb() {
  if (!isMockActive) return;
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(mockData, null, 2), "utf8");
  } catch (err: any) {
    console.error("[MockMongoDB] Error saving database file:", err.message);
  }
}

class MockCollection {
  constructor(private name: string, private data: any[]) {}

  find(query?: any) {
    const filtered = this.data.filter(doc => matchesQuery(doc, query));
    const cursor = {
      _data: filtered,
      sort(sortSpec: any) {
        const keys = Object.keys(sortSpec);
        if (keys.length > 0) {
          const key = keys[0];
          const order = sortSpec[key]; // 1 or -1
          this._data = [...this._data].sort((a, b) => {
            if (a[key] < b[key]) return -1 * order;
            if (a[key] > b[key]) return 1 * order;
            return 0;
          });
        }
        return this;
      },
      limit(limitCount: number) {
        this._data = this._data.slice(0, limitCount);
        return this;
      },
      async toArray() {
        return this._data;
      }
    };
    return cursor;
  }

  async findOne(query: any) {
    const item = this.data.find(doc => matchesQuery(doc, query));
    return item ? { ...item } : null;
  }

  async insertOne(doc: any) {
    const newDoc = { ...doc };
    if (newDoc._id === undefined && newDoc.id !== undefined) {
      newDoc._id = newDoc.id;
    } else if (newDoc._id === undefined) {
      newDoc._id = Math.random().toString(36).substring(7);
    }
    if (newDoc.id === undefined) {
      newDoc.id = newDoc._id;
    }
    this.data.push(newDoc);
    await saveMockDb();
    return { insertedId: newDoc._id };
  }

  async insertMany(docs: any[]) {
    const insertedIds: any = {};
    for (const doc of docs) {
      const newDoc = { ...doc };
      if (newDoc._id === undefined && newDoc.id !== undefined) {
        newDoc._id = newDoc.id;
      } else if (newDoc._id === undefined) {
        newDoc._id = Math.random().toString(36).substring(7);
      }
      if (newDoc.id === undefined) {
        newDoc.id = newDoc._id;
      }
      this.data.push(newDoc);
      insertedIds[this.data.length - 1] = newDoc._id;
    }
    await saveMockDb();
    return { insertedCount: docs.length, insertedIds };
  }

  async updateOne(query: any, update: any, options?: any) {
    const idx = this.data.findIndex(doc => matchesQuery(doc, query));
    if (idx !== -1) {
      this.data[idx] = applyUpdate(this.data[idx], update);
      await saveMockDb();
      return { modifiedCount: 1, matchedCount: 1 };
    } else if (options && options.upsert) {
      let newDoc = { ...query };
      newDoc = applyUpdate(newDoc, update);
      if (newDoc._id === undefined && newDoc.id !== undefined) {
        newDoc._id = newDoc.id;
      } else if (newDoc._id === undefined) {
        newDoc._id = Math.random().toString(36).substring(7);
      }
      if (newDoc.id === undefined) {
        newDoc.id = newDoc._id;
      }
      this.data.push(newDoc);
      await saveMockDb();
      return { modifiedCount: 1, matchedCount: 0, upsertedId: newDoc._id };
    }
    return { modifiedCount: 0, matchedCount: 0 };
  }

  async updateMany(query: any, update: any, options?: any) {
    let modifiedCount = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (matchesQuery(this.data[i], query)) {
        this.data[i] = applyUpdate(this.data[i], update);
        modifiedCount++;
      }
    }
    if (modifiedCount > 0) {
      await saveMockDb();
    }
    return { modifiedCount, matchedCount: modifiedCount };
  }

  async deleteOne(query: any) {
    const idx = this.data.findIndex(doc => matchesQuery(doc, query));
    if (idx !== -1) {
      this.data.splice(idx, 1);
      await saveMockDb();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(query: any) {
    const initialLen = this.data.length;
    const remaining = this.data.filter(doc => !matchesQuery(doc, query));
    const deletedCount = initialLen - remaining.length;
    if (deletedCount > 0) {
      this.data.length = 0;
      this.data.push(...remaining);
      await saveMockDb();
    }
    return { deletedCount };
  }

  async countDocuments(query?: any) {
    if (!query || Object.keys(query).length === 0) {
      return this.data.length;
    }
    return this.data.filter(doc => matchesQuery(doc, query)).length;
  }

  async createIndex(keys: any, options?: any) {
    return "mock-index";
  }
}

class MockDb {
  constructor(public databaseName: string = "lovely_erp_mock") {}

  collection(name: string) {
    if (!mockData[name]) {
      mockData[name] = [];
    }
    return new MockCollection(name, mockData[name]);
  }
}

async function initializeMockDatabase(): Promise<void> {
  isMockActive = true;
  console.warn("[MockMongoDB] Initializing JSON-file-backed local database fallback...");
  
  try {
    const fileContent = await fs.readFile(DB_PATH, "utf8");
    mockData = JSON.parse(fileContent);
    console.log("[MockMongoDB] Successfully loaded existing data from db.json");
  } catch (e) {
    console.log("[MockMongoDB] No db.json found or failed to parse. Initializing clean database.");
    mockData = {};
  }

  // Seed default entries if empty/missing
  if (!mockData.settings) mockData.settings = [];
  if (mockData.settings.length === 0) {
    mockData.settings.push({
      _id: "global",
      key: "global",
      value: {
        businessName: "Lovely Enterprise",
        ownerName: "Moshiur Rahman",
        phone: "01712345678",
        email: "contact@lovelyenterprise.com",
        address: "Dhaka, Bangladesh",
        currency: "BDT",
        lowStockThreshold: 10
      }
    });
  }

  if (!mockData.api_configs) mockData.api_configs = [];
  if (mockData.api_configs.length === 0) {
    mockData.api_configs.push({
      _id: "infosoft_config",
      id: "infosoft_config",
      name: "InfoSoft BD Voice Gateway",
      apiUrl: "https://api.infosoftbd.com",
      apiKey: "test-api-key-12345",
      apiSecret: "test-api-secret-12345",
      callerId: "8809612345678",
      defaultVoice: "en-US-Standard-C",
      language: "en-US",
      webhookUrl: "https://yourdomain.com/api/voice/webhook",
      retryCount: 3
    });
  }

  if (!mockData.voice_templates) mockData.voice_templates = [];
  if (mockData.voice_templates.length === 0) {
    mockData.voice_templates.push(
      {
        _id: "tpl-halkhata",
        id: "tpl-halkhata",
        name: "HalKhata Event Invitation",
        text: "Dear {CustomerName}, you are cordially invited to our grand HalKhata feast. Your outstanding due is ৳{DueAmount}. Please join us to celebrate.",
        type: "TTS"
      },
      {
        _id: "tpl-due-reminder",
        id: "tpl-due-reminder",
        name: "Urgent Due Reminder",
        text: "Hello {CustomerName}, this is a gentle reminder that your pending due balance of ৳{DueAmount} is overdue. Please settle your account.",
        type: "TTS"
      }
    );
  }

  if (!mockData.payment_methods) mockData.payment_methods = [];
  if (mockData.payment_methods.length === 0) {
    mockData.payment_methods.push(
      {
        _id: "pm-bkash",
        id: "pm-bkash",
        methodName: "bKash",
        logo: "https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?w=100&h=100&fit=crop",
        personalNumber: "01712345678",
        instructions: "Send Money to our personal bKash number manually, then submit your bKash account number and 10-character Transaction ID (TxID) below.",
        status: true
      },
      {
        _id: "pm-nagad",
        id: "pm-nagad",
        methodName: "Nagad",
        logo: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=100&h=100&fit=crop",
        personalNumber: "01911223344",
        instructions: "Send Money manually to our Nagad personal number, then input your Nagad account number and Transaction ID.",
        status: true
      },
      {
        _id: "pm-upay",
        id: "pm-upay",
        methodName: "Upay",
        logo: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&h=100&fit=crop",
        personalNumber: "01855667788",
        instructions: "Use Send Money to our Upay personal number, then submit your Upay mobile number and payment reference.",
        status: true
      }
    );
  }

  if (!mockData.categories) mockData.categories = [];
  if (mockData.categories.length === 0) {
    mockData.categories.push(
      { _id: "cat-1", id: "cat-1", name: "Pesticide", description: "Gadgets and devices" },
      { _id: "cat-2", id: "cat-2", name: "Fertilizer", description: "Daily essentials" }
    );
  }   

  if (!mockData.ledger) mockData.ledger = [];
  if (!mockData.campaigns) mockData.campaigns = [];
  if (!mockData.voice_campaigns) mockData.voice_campaigns = [];
  if (!mockData.voice_call_logs) mockData.voice_call_logs = [];
  if (!mockData.otps) mockData.otps = [];
  if (!mockData.staff) mockData.staff = [];
  if (!mockData.invoices) mockData.invoices = [];
  if (!mockData.payments) mockData.payments = [];

  db = new MockDb() as unknown as Db;
  isConnected = true;
  await saveMockDb();
  console.log("[MockMongoDB] Local mock database initialized and fully seeded!");
}

/**
 * Connects to MongoDB, sets up indexes, and migrates local data.
 */
export async function connectMongoDB(): Promise<{ success: boolean; error?: string }> {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log("[MongoDB] MONGODB_URI is not provided. Initializing local database fallback...");
      await initializeMockDatabase();
      return { success: true };
    }

    // Run diagnostics first
    await debugEnvironment();

    const validation = validateMongoDBURI(uri);
    if (!validation.isValid) {
      console.log(`[MongoDB] Invalid connection string: ${validation.error}. Initializing local database fallback...`);
      await initializeMockDatabase();
      return { success: true };
    }

    console.log(`[MongoDB] Attempting to establish a connection to ${validation.isAtlas ? "MongoDB Atlas Cloud Cluster" : "local MongoDB instance"}...`);

    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db();
    isConnected = true;
    console.log(`[MongoDB] Connection successful! Database in use: "${db.databaseName}"`);

    // Setup indexes
    await setupIndexes();

    // Check if migration is needed
    await runAutoMigration();

    return { success: true };
  } catch (e: any) {
    console.log(`[MongoDB] Unable to connect to server: ${e.message}. Initializing local database fallback...`);
    await initializeMockDatabase();
    return { success: true };
  }
}

/**
 * Accesses the active database instance. Throws detailed diagnostics if disconnected.
 */
export function getDb(): Db {
  if (!db || !isConnected) {
    const errorMsg = 
      `[MongoDB Critical Error] Database access attempted but MongoDB is not connected!\n` +
      `Current connection state: Disconnected.\n` +
      `Please verify that:\n` +
      `1. MONGODB_URI is correctly configured in your .env file or production environment variables.\n` +
      `2. Your MongoDB Atlas cluster is online and running.\n` +
      `3. Your network IP access list (IP Whitelist) in MongoDB Atlas allows connections from this environment.\n` +
      `4. Database password does not contain unencoded special characters.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return db;
}

export function isMongoActive(): boolean {
  return isConnected;
}

async function setupIndexes() {
  if (!db) return;
  try {
    await db.collection("customers").createIndex({ id: 1 }, { unique: true });
    await db.collection("campaigns").createIndex({ id: 1 }, { unique: true });
    await db.collection("callLogs").createIndex({ id: 1 }, { unique: true });
    await db.collection("voice_campaigns").createIndex({ id: 1 }, { unique: true });
    await db.collection("voice_call_logs").createIndex({ id: 1 }, { unique: true });
    await db.collection("voice_queue").createIndex({ id: 1 }, { unique: true });
    await db.collection("voice_templates").createIndex({ id: 1 }, { unique: true });
    await db.collection("api_configs").createIndex({ id: 1 }, { unique: true });
    await db.collection("settings").createIndex({ key: 1 }, { unique: true });
    await db.collection("payment_methods").createIndex({ id: 1 }, { unique: true });
    try {
      // Drop legacy/incorrect index if it exists in production
      await db.collection("otps").dropIndex("email_1").catch(() => {});
    } catch (e) {
      // Ignore if index doesn't exist or drop fails
    }
    await db.collection("otps").createIndex({ identifier: 1 });
    await db.collection("otps").createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 }); // TTL index for OTPs (5 mins)
    await db.collection("admins").createIndex({ id: 1 }, { unique: true });
    await db.collection("admins").createIndex({ email: 1 }, { unique: true });
    console.log("[MongoDB] Indexes verified/created.");

    // Copy legacy data if empty
    try {
      const vCamCount = await db.collection("voice_campaigns").countDocuments();
      const legacyCamCount = await db.collection("campaigns").countDocuments();
      if (vCamCount === 0 && legacyCamCount > 0) {
        console.log("[MongoDB Migration] Copying legacy campaigns into voice_campaigns...");
        const legacyCams = await db.collection("campaigns").find().toArray();
        await db.collection("voice_campaigns").insertMany(legacyCams);
      }

      const vLogsCount = await db.collection("voice_call_logs").countDocuments();
      const legacyLogsCount = await db.collection("callLogs").countDocuments();
      if (vLogsCount === 0 && legacyLogsCount > 0) {
        console.log("[MongoDB Migration] Copying legacy callLogs into voice_call_logs...");
        const legacyLogs = await db.collection("callLogs").find().toArray();
        await db.collection("voice_call_logs").insertMany(legacyLogs);
      }
    } catch (migErr: any) {
      console.warn("[MongoDB Migration Warning] Failed to copy legacy campaigns/logs:", migErr.message);
    }

    // Seed default voice templates
    try {
      const templatesCount = await db.collection("voice_templates").countDocuments();
      if (templatesCount === 0) {
        console.log("[MongoDB Seed] Seeding default voice templates...");
        await db.collection("voice_templates").insertMany([
          {
            _id: "tpl-halkhata" as any,
            id: "tpl-halkhata",
            name: "HalKhata Event Invitation",
            text: "Dear {CustomerName}, you are cordially invited to our grand HalKhata feast. Your outstanding due is ৳{DueAmount}. Please join us to celebrate.",
            type: "TTS"
          },
          {
            _id: "tpl-due-reminder" as any,
            id: "tpl-due-reminder",
            name: "Urgent Due Reminder",
            text: "Hello {CustomerName}, this is a gentle reminder that your pending due balance of ৳{DueAmount} is overdue. Please settle your account.",
            type: "TTS"
          }
        ]);
      }
    } catch (err: any) {
      console.error("[MongoDB Seed Error] voice_templates:", err.message);
    }

    // Seed default api config
    try {
      const apiConfigsCount = await db.collection("api_configs").countDocuments();
      if (apiConfigsCount === 0) {
        console.log("[MongoDB Seed] Seeding default InfosoftBD api config...");
        await db.collection("api_configs").insertOne({
          _id: "infosoft_config" as any,
          id: "infosoft_config",
          name: "InfoSoft BD Voice Gateway",
          apiUrl: "https://api.infosoftbd.com",
          apiKey: "test-api-key-12345",
          apiSecret: "test-api-secret-12345",
          callerId: "8809612345678",
          defaultVoice: "en-US-Standard-C",
          language: "en-US",
          webhookUrl: "https://yourdomain.com/api/voice/webhook",
          retryCount: 3
        });
      }
    } catch (err: any) {
      console.error("[MongoDB Seed Error] api_configs:", err.message);
    }

    // Seed default payment methods
    const paymentMethodsCount = await db.collection("payment_methods").countDocuments();
    if (paymentMethodsCount === 0) {
      console.log("[MongoDB Seed] Seeding default payment methods (bKash, Nagad, Upay)...");
      await db.collection("payment_methods").insertMany([
        {
          _id: "pm-bkash" as any,
          id: "pm-bkash",
          methodName: "bKash",
          logo: "https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?w=100&h=100&fit=crop",
          personalNumber: "01712345678",
          instructions: "Send Money to our personal bKash number manually, then submit your bKash account number and 10-character Transaction ID (TxID) below.",
          status: true
        },
        {
          _id: "pm-nagad" as any,
          id: "pm-nagad",
          methodName: "Nagad",
          logo: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=100&h=100&fit=crop",
          personalNumber: "01911223344",
          instructions: "Send Money manually to our Nagad personal number, then input your Nagad account number and Transaction ID.",
          status: true
        },
        {
          _id: "pm-upay" as any,
          id: "pm-upay",
          methodName: "Upay",
          logo: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&h=100&fit=crop",
          personalNumber: "01855667788",
          instructions: "Use Send Money to our Upay personal number, then submit your Upay mobile number and payment reference.",
          status: true
        }
      ]);
      console.log("[MongoDB Seed] Default payment methods seeded successfully.");
    }

    // Seed default achievements
    const achievementsCount = await db.collection("achievements").countDocuments();
    if (achievementsCount === 0) {
      console.log("[MongoDB Seed] Seeding default achievements...");
      await db.collection("achievements").insertMany([
        {
          _id: "ach-1" as any,
          id: "ach-1",
          title: "Best Retail Trader of the Year 2025",
          description: "Recognized by Bangladesh Trader's Association for outstanding supply chain efficiency.",
          date: "2025-11-10",
          issuedBy: "Bangladesh Trader's Association"
        },
        {
          _id: "ach-2" as any,
          id: "ach-2",
          title: "Top Sales Excellence Award",
          description: "Honored for achieving record-breaking sales of construction and hardware materials.",
          date: "2026-02-15",
          issuedBy: "National Business Alliance"
        }
      ]);
    }

    // Seed default certificates
    const certificatesCount = await db.collection("certificates").countDocuments();
    if (certificatesCount === 0) {
      console.log("[MongoDB Seed] Seeding default certificates...");
      await db.collection("certificates").insertMany([
        {
          _id: "cert-1" as any,
          id: "cert-1",
          title: "ISO 9001:2015 Quality Management Certificate",
          description: "Certified for maintaining high standards in distribution of hardware goods and customer support.",
          issueDate: "2024-05-20",
          imageUrl: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=600&auto=format&fit=crop"
        },
        {
          _id: "cert-2" as any,
          id: "cert-2",
          title: "Trade License Certificate",
          description: "Authorized trade and operations approval under Government of Bangladesh.",
          issueDate: "2025-07-01",
          imageUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=600&auto=format&fit=crop"
        }
      ]);
    }

    // Seed default gallery items
    const galleryCount = await db.collection("gallery").countDocuments();
    if (galleryCount === 0) {
      console.log("[MongoDB Seed] Seeding default gallery...");
      await db.collection("gallery").insertMany([
        {
          _id: "gal-1" as any,
          id: "gal-1",
          title: "Main Distribution Warehouse",
          description: "Fully stocked central inventory hub facilitating quick distribution across Bangladesh.",
          imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop"
        },
        {
          _id: "gal-2" as any,
          id: "gal-2",
          title: "Halkhata Celebration Festival",
          description: "Welcoming our long-term retail dealers during our traditional annual collection feast.",
          imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop"
        }
      ]);
    }

    // Seed default awards items
    const awardsCount = await db.collection("awards").countDocuments();
    if (awardsCount === 0) {
      console.log("[MongoDB Seed] Seeding default awards...");
      await db.collection("awards").insertMany([
        {
          _id: "award-1" as any,
          id: "award-1",
          title: "Best Dealer Award",
          year: "2025",
          company: "Lovely Group",
          description: "Recognized as the topmost hardware dealer in the region for exceptional distribution and client trust.",
          image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=600&auto=format&fit=crop",
          createdAt: new Date().toISOString()
        },
        {
          _id: "award-2" as any,
          id: "award-2",
          title: "National Business Excellence Award",
          year: "2026",
          company: "Bangladesh Commerce Association",
          description: "Conferred for outstanding financial compliance, technological integration, and growth in distribution channels.",
          image: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=600&auto=format&fit=crop",
          createdAt: new Date().toISOString()
        }
      ]);
    }

    // Seed default Super Admin
    const adminsCount = await db.collection("admins").countDocuments();
    if (adminsCount === 0) {
      console.log("[MongoDB Seed] Seeding default Super Admin...");
      await db.collection("admins").insertOne({
        _id: "admin-super" as any,
        id: "admin-super",
        name: "Moshiur Rahman Mohi",
        email: "mdmoshiurrahmanmohi1@gmail.com",
        phone: "01700000000",
        password: "admin", // fallback plain password
        password_hash: "admin",
        role: "Super Admin",
        status: "ACTIVE",
        permissions: {
          dashboard: true,
          products: true,
          awards: true,
          licenses: true,
          crm: true,
          inventory: true,
          billing: true,
          memo: true,
          halkhata: true,
          communication: true,
          whatsapp: true,
          settings: true,
          contactMessages: true,
          adminManagement: true
        },
        profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error("[MongoDB] Error setting up indexes or seeding:", e);
  }
}

async function runAutoMigration() {
  if (!db) return;

  try {
    let fileContent;
    try {
      fileContent = await fs.readFile(DB_PATH, "utf8");
    } catch (e) {
      console.log("[MongoDB Migration] No db.json found. Skipping migration.");
      return;
    }

    const localData = JSON.parse(fileContent);
    const collections = ["customers", "campaigns", "callLogs"];

    for (const colName of collections) {
      const count = await db.collection(colName).countDocuments();
      const localList = localData[colName] || [];

      if (count === 0 && localList.length > 0) {
        console.log(`[MongoDB Migration] Migrating ${localList.length} items to collection '${colName}'...`);
        const itemsToInsert = localList.map((item: any) => ({
          ...item,
          _id: item.id || Math.random().toString(36).substring(7),
        }));
        await db.collection(colName).insertMany(itemsToInsert);
        console.log(`[MongoDB Migration] Completed migration for '${colName}'.`);
      }
    }

    const settingsCount = await db.collection("settings").countDocuments();
    if (settingsCount === 0 && localData.settings?.global) {
      console.log("[MongoDB Migration] Migrating global settings...");
      await db.collection("settings").insertOne({
        key: "global",
        value: localData.settings.global,
      });
      console.log("[MongoDB Migration] Settings migrated.");
    }
  } catch (e) {
    console.error("[MongoDB Migration] Error during automatic migration:", e);
  }
}
